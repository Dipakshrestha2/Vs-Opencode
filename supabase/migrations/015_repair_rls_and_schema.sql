-- =============================================
-- REPAIR MIGRATION (safe to re-run)
-- Fixes the live project without destroying data:
--   1. Ensures the 'head_teacher' role exists in the user_role enum.
--   2. Ensures head_teachers / head_teacher_teachers tables exist.
--   3. Recreates attendance + attendance_records RLS policies that
--      previously caused "infinite recursion detected in policy".
--   4. Recreates process_overdue_items() against the head_teacher schema.
-- =============================================

-- ------------------------------------------------------------------
-- 1) Ensure the 'head_teacher' role value exists
-- ------------------------------------------------------------------
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head_teacher';

-- ------------------------------------------------------------------
-- 2) Ensure the head teacher tables exist (older projects used
--    'supervisors' / 'supervisor_teachers')
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS head_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS head_teacher_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  head_teacher_id UUID REFERENCES head_teachers(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(head_teacher_id, teacher_id, academic_year_id)
);

-- Old projects that predate the teacher assignment tables still need them:
-- the attendance / students RLS policies reference teacher_classes.
CREATE TABLE IF NOT EXISTS teacher_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, section_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE head_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE head_teacher_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 3) RLS helpers
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_head_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM head_teachers WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_supervisor_id()
RETURNS UUID AS $$
  SELECT get_head_teacher_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------
-- 4) Fix attendance / attendance_records policies
--    The old policies cross-referenced each other's tables, causing
--    Postgres to abort with "infinite recursion detected in policy".
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can read attendance for linked children" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage records for their classes" ON attendance_records;
DROP POLICY IF EXISTS "Supervisors can read attendance for assigned classes" ON attendance;
DROP POLICY IF EXISTS "Admin full access on attendance" ON attendance;
DROP POLICY IF EXISTS "Admin full access on attendance_records" ON attendance_records;

CREATE POLICY "Admin full access on attendance" ON attendance
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can manage attendance for their classes" ON attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = get_teacher_id() AND tc.class_id = attendance.class_id AND tc.section_id = attendance.section_id)
  );

CREATE POLICY "Head teachers can read attendance for assigned classes" ON attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st JOIN teacher_classes tc ON tc.teacher_id = st.teacher_id WHERE st.head_teacher_id = get_head_teacher_id() AND tc.class_id = attendance.class_id)
  );

CREATE POLICY "Parents can read attendance for linked children" ON attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps JOIN students s ON s.id = ps.student_id WHERE ps.parent_id = get_parent_id() AND s.class_id = attendance.class_id AND s.section_id = attendance.section_id)
  );

CREATE POLICY "Admin full access on attendance_records" ON attendance_records
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can manage records for their classes" ON attendance_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM attendance a JOIN teacher_classes tc ON tc.teacher_id = get_teacher_id() WHERE a.id = attendance_records.attendance_id AND tc.class_id = a.class_id AND tc.section_id = a.section_id)
  );

CREATE POLICY "Parents can read records for linked children" ON attendance_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = get_parent_id() AND ps.student_id = attendance_records.student_id)
  );

-- ------------------------------------------------------------------
-- 5) Recreate the overdue-processing function against head_teacher tables
-- ------------------------------------------------------------------
DROP FUNCTION IF EXISTS process_overdue_items();

CREATE OR REPLACE FUNCTION process_overdue_items()
RETURNS void AS $$
DECLARE
  v_escalation_days INTEGER;
  v_task RECORD;
BEGIN
  SELECT COALESCE(value::INTEGER, 5) INTO v_escalation_days
  FROM system_settings WHERE key = 'escalation_days';

  UPDATE tasks SET status = 'in_progress'
  WHERE status = 'assigned' AND due_date < CURRENT_DATE;

  FOR v_task IN
    SELECT t.*, h.profile_id AS head_teacher_id
    FROM tasks t
    JOIN teachers tt ON tt.profile_id = t.assigned_to
    JOIN head_teacher_teachers htt ON htt.teacher_id = tt.id
    JOIN head_teachers h ON h.id = htt.head_teacher_id
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