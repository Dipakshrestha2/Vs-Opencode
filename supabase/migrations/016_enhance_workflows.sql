-- =============================================
-- 016 ENHANCED WORKFLOWS
-- Result approval workflow, announcements,
-- task comments, notification preferences,
-- feedback due-date tracking, RLS fixes.
-- Idempotent: safe to run on any environment.
-- =============================================

-- ------------------------------------------------------------------
-- 1) ENUM EXTENSIONS
-- ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE result_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ------------------------------------------------------------------
-- 2) RESULTS APPROVAL WORKFLOW
-- DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED (or REJECTED)
-- ------------------------------------------------------------------
ALTER TABLE results ADD COLUMN IF NOT EXISTS status result_status NOT NULL DEFAULT 'draft';
ALTER TABLE results ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE results ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ------------------------------------------------------------------
-- 3) FEEDBACK DUE-DATE / RESOLUTION TRACKING
-- ------------------------------------------------------------------
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ------------------------------------------------------------------
-- 4) ANNOUNCEMENTS
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- 5) NOTIFICATION PREFERENCES (per user)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  task_assigned BOOLEAN NOT NULL DEFAULT true,
  task_reminder BOOLEAN NOT NULL DEFAULT true,
  task_overdue BOOLEAN NOT NULL DEFAULT true,
  task_escalated BOOLEAN NOT NULL DEFAULT true,
  feedback_received BOOLEAN NOT NULL DEFAULT true,
  result_submitted BOOLEAN NOT NULL DEFAULT true,
  result_approved BOOLEAN NOT NULL DEFAULT true,
  result_rejected BOOLEAN NOT NULL DEFAULT true,
  homework_published BOOLEAN NOT NULL DEFAULT true,
  announcement BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- 6) TASK COMMENTS
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 7) RESULTS VISIBILITY FIX
-- Parents may only ever read PUBLISHED results. This replaces the
-- permissive policy created in migration 011.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can read results for linked children" ON results;
DROP POLICY IF EXISTS "Parents can read published results for linked children" ON results;

CREATE POLICY "Parents can read published results for linked children" ON results
  FOR SELECT USING (
    results.status = 'published' AND EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = get_parent_id() AND ps.student_id = results.student_id
    )
  );

-- Head teachers may review (read + update) results of their assigned
-- teachers' exams.
DROP POLICY IF EXISTS "Head teachers review results for assigned teachers" ON results;
CREATE POLICY "Head teachers review results for assigned teachers" ON results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM exams e
      JOIN head_teacher_teachers st ON st.teacher_id = e.teacher_id
      WHERE e.id = results.exam_id AND st.head_teacher_id = get_head_teacher_id()
    )
  );

-- ------------------------------------------------------------------
-- 8) RLS POLICIES FOR NEW TABLES
-- ------------------------------------------------------------------
CREATE POLICY "Authenticated users can read announcements" ON announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage announcements" ON announcements
  FOR ALL USING (is_admin());

CREATE POLICY "Users manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Task participants can read comments" ON task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid()))
  );

CREATE POLICY "Task participants can comment" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid()))
  );

CREATE POLICY "Admins manage task comments" ON task_comments
  FOR ALL USING (is_admin());

-- ------------------------------------------------------------------
-- 9) INDEXES
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_results_status ON results(status);
CREATE INDEX IF NOT EXISTS idx_results_exam_status ON results(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_results_student_status ON results(student_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_due ON feedback(due_date, status);
CREATE INDEX IF NOT EXISTS idx_feedback_to_status ON feedback(to_user, status);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalations_open_task ON escalations(task_id, status) WHERE status NOT IN ('approved', 'completed', 'rejected');
CREATE INDEX IF NOT EXISTS idx_escalations_open_feedback ON escalations(feedback_id, status) WHERE status NOT IN ('approved', 'completed', 'rejected');