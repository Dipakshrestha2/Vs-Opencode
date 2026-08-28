-- =============================================
-- 017 AUTOMATION ENGINE (REMINDERS + ESCALATION)
-- Idempotent, duplicate-safe escalation kernel.
-- Handles:
--   * Teacher tasks    -> assigned Head Teacher
--   * Feedback items   -> assigned Head Teacher
--   * Head Teacher items -> an Admin (never back to self)
--   * Auto-resolves escalations once items close
--   * Registers the pg_cron schedule (once)
-- =============================================

-- ------------------------------------------------------------------
-- Escalation target resolution
-- Returns the profiles.id that should receive an escalation about a
-- task/feedback whose owner is the given profile_id.
--   owner is a teacher       -> that teacher's head teacher
--   owner is a head teacher  -> an admin
--   otherwise                -> an admin
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_escalation_target(p_owner_id UUID)
RETURNS UUID AS $$
DECLARE
  v_role        user_role;
  v_teacher_id  UUID;
  v_ht_profile  UUID;
  v_admin       UUID;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_owner_id;

  IF v_role = 'teacher' THEN
    SELECT t.id INTO v_teacher_id FROM teachers t WHERE t.profile_id = p_owner_id;
    IF v_teacher_id IS NOT NULL THEN
      SELECT h.profile_id INTO v_ht_profile
      FROM head_teacher_teachers htl
      JOIN head_teachers h ON h.id = htl.head_teacher_id
      WHERE htl.teacher_id = v_teacher_id
      ORDER BY htl.created_at
      LIMIT 1;
    END IF;
  END IF;

  IF v_ht_profile IS NOT NULL THEN
    RETURN v_ht_profile;
  END IF;

  -- Fall back to an admin (covers head-teacher owners and unassigned teachers)
  SELECT id INTO v_admin FROM profiles
  WHERE role = 'admin' AND is_active IS NOT FALSE
  ORDER BY created_at LIMIT 1;

  RETURN v_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------
-- Idempotent escalation creator.
-- Refuses to create a duplicate while an open escalation already
-- exists for the same task / feedback.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_escalation(
  p_from_user UUID,
  p_to_user UUID,
  p_reason TEXT,
  p_task_id UUID DEFAULT NULL,
  p_feedback_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_exists UUID;
BEGIN
  IF p_to_user IS NULL THEN
    p_to_user := resolve_escalation_target(p_from_user);
  END IF;
  IF p_to_user IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_task_id IS NOT NULL THEN
    SELECT id INTO v_exists FROM escalations
    WHERE task_id = p_task_id AND status NOT IN ('approved', 'completed', 'rejected')
    LIMIT 1;
  ELSIF p_feedback_id IS NOT NULL THEN
    SELECT id INTO v_exists FROM escalations
    WHERE feedback_id = p_feedback_id AND status NOT IN ('approved', 'completed', 'rejected')
    LIMIT 1;
  END IF;

  IF v_exists IS NOT NULL THEN
    RETURN v_exists;
  END IF;

  INSERT INTO escalations (task_id, feedback_id, from_user, to_user, reason)
  VALUES (p_task_id, p_feedback_id, p_from_user, p_to_user, p_reason)
  RETURNING id INTO v_id;

  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_to_user, 'Escalation Alert', p_reason, 'warning', '#/escalations');

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------
-- Core automation routine. Called by pg_cron nightly.
-- Idempotent: safe to run twice without side effects.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_overdue_items()
RETURNS void AS $$
DECLARE
  v_escalation_days INTEGER;
  v_target          UUID;
  v_task            RECORD;
  v_fb              RECORD;
BEGIN
  SELECT COALESCE(value::INTEGER, 5) INTO v_escalation_days
  FROM system_settings WHERE key = 'escalation_days';

  -- 1) Mark overdue tasks as in_progress (reminder state)
  UPDATE tasks SET status = 'in_progress'
  WHERE status = 'assigned' AND due_date < CURRENT_DATE;

  -- 2) Escalate tasks overdue beyond the threshold
  FOR v_task IN
    SELECT * FROM tasks
    WHERE status IN ('assigned', 'in_progress')
      AND due_date < CURRENT_DATE - (v_escalation_days || ' days')::INTERVAL
      AND escalation_level = 0
  LOOP
    v_target := resolve_escalation_target(v_task.assigned_to);
    PERFORM create_escalation(
      p_task_id    := v_task.id,
      p_from_user  := v_task.assigned_to,
      p_to_user    := v_target,
      p_reason     := 'Task "' || v_task.title || '" is overdue by ' ||
                      (CURRENT_DATE - v_task.due_date) || ' days'
    );
    UPDATE tasks SET escalation_level = 1 WHERE id = v_task.id;
  END LOOP;

  -- 3) Escalate feedback overdue beyond the threshold
  FOR v_fb IN
    SELECT * FROM feedback
    WHERE status IN ('assigned', 'in_progress')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE - (v_escalation_days || ' days')::INTERVAL
  LOOP
    v_target := resolve_escalation_target(v_fb.to_user);
    PERFORM create_escalation(
      p_feedback_id := v_fb.id,
      p_from_user   := v_fb.to_user,
      p_to_user     := v_target,
      p_reason      := 'Feedback "' || v_fb.subject || '" is overdue by ' ||
                       (CURRENT_DATE - v_fb.due_date) || ' days'
    );
  END LOOP;

  -- 4) Auto-resolve escalations whose item has been closed
  UPDATE escalations e SET status = 'completed', resolved_at = NOW()
  WHERE e.status NOT IN ('approved', 'completed', 'rejected')
    AND (
      (e.task_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM tasks t WHERE t.id = e.task_id
         AND t.status IN ('approved', 'completed', 'rejected', 'cancelled')
      ))
      OR
      (e.feedback_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM feedback f WHERE f.id = e.feedback_id
         AND f.status IN ('approved', 'completed', 'rejected') AND f.resolved_at IS NOT NULL
      ))
    );

  -- 5) Overdue reminder notifications (fire once per item per day state)
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT assigned_to, 'Task Overdue',
         'Task "' || title || '" was due on ' || due_date || ' and is now overdue.',
         'warning', '#/tasks'
  FROM tasks
  WHERE status IN ('assigned', 'in_progress')
    AND due_date < CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM notifications n
                    WHERE n.user_id = tasks.assigned_to
                      AND n.title = 'Task Overdue'
                      AND n.message LIKE '%' || tasks.title || '%'
                      AND n.created_at::date = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------
-- RLS: allow the escalation recipient to resolve/close it.
-- (Admins already have full access; this lets head teachers close
--  escalations sent to them without bypassing security.)
-- ------------------------------------------------------------------
CREATE POLICY "Recipients can resolve escalations sent to them"
  ON escalations FOR UPDATE USING (to_user = auth.uid());

-- ------------------------------------------------------------------
-- Cron registration (idempotent: drop existing named job, then add)
-- ------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Safely attempt to unschedule, ignoring the error if the job does not exist yet
    BEGIN
      PERFORM cron.unschedule('process-overdue-daily');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('process-overdue-daily', '0 0 * * *', 'SELECT process_overdue_items()');
  END IF;
END $$;