-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER results_updated_at BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create escalation
CREATE OR REPLACE FUNCTION create_escalation(
  p_from_user UUID,
  p_to_user UUID,
  p_reason TEXT,
  p_task_id UUID DEFAULT NULL,
  p_feedback_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_escalation_id UUID;
BEGIN
  INSERT INTO escalations (task_id, feedback_id, from_user, to_user, reason)
  VALUES (p_task_id, p_feedback_id, p_from_user, p_to_user, p_reason)
  RETURNING id INTO v_escalation_id;

  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_to_user, 'Escalation Alert', p_reason, 'warning', '#/escalations');

  RETURN v_escalation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and process overdue tasks
CREATE OR REPLACE FUNCTION process_overdue_items()
RETURNS void AS $$
DECLARE
  v_escalation_days INTEGER;
  v_task RECORD;
BEGIN
  -- Get escalation days from settings
  SELECT COALESCE(value::INTEGER, 5) INTO v_escalation_days
  FROM system_settings WHERE key = 'escalation_days';

  -- Update overdue tasks
  UPDATE tasks SET status = 'in_progress'
  WHERE status IN ('assigned')
    AND due_date < CURRENT_DATE
    AND status != 'in_progress';

  -- Create escalation for tasks overdue beyond threshold
  FOR v_task IN
    SELECT t.*, s.profile_id as head_teacher_id
    FROM tasks t
    JOIN head_teacher_teachers st ON st.teacher_id = (
      SELECT id FROM teachers WHERE profile_id = t.assigned_to
    )
    JOIN head_teachers s ON s.id = st.head_teacher_id
    WHERE t.status IN ('assigned', 'in_progress')
      AND t.due_date < CURRENT_DATE - (v_escalation_days || ' days')::INTERVAL
      AND t.escalation_level = 0
  LOOP
    PERFORM create_escalation(
      p_task_id := v_task.id,
      p_from_user := v_task.assigned_to,
      p_to_user := v_task.head_teacher_id,
      p_reason := 'Task "' || v_task.title || '" is overdue by ' || (CURRENT_DATE - v_task.due_date) || ' days'
    );
    UPDATE tasks SET escalation_level = 1 WHERE id = v_task.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task notifications
CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.assigned_to, 'New Task Assigned', 'You have been assigned: ' || NEW.title, 'info', '#/tasks');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_created
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_on_task_assignment();

-- Trigger for feedback notifications
CREATE OR REPLACE FUNCTION notify_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.to_user, 'New Feedback', 'You received feedback: ' || NEW.subject, 'info', '#/feedback');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION notify_on_feedback();
