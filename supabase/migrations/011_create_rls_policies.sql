-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's teacher ID
CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM teachers WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's head teacher ID
CREATE OR REPLACE FUNCTION get_head_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM head_teachers WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Backward-compatible alias for old installations
CREATE OR REPLACE FUNCTION get_supervisor_id()
RETURNS UUID AS $$
  SELECT get_head_teacher_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's parent ID
CREATE OR REPLACE FUNCTION get_parent_id()
RETURNS UUID AS $$
  SELECT id FROM parents WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES
-- =============================================
CREATE POLICY "Admin full access on profiles" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- =============================================
-- SCHOOLS
-- =============================================
CREATE POLICY "Authenticated users can read schools" ON schools
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages schools" ON schools
  FOR ALL USING (is_admin());

-- =============================================
-- ACADEMIC YEARS
-- =============================================
CREATE POLICY "Authenticated users can read academic years" ON academic_years
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages academic years" ON academic_years
  FOR ALL USING (is_admin());

-- =============================================
-- CLASSES
-- =============================================
CREATE POLICY "Authenticated users can read classes" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages classes" ON classes
  FOR ALL USING (is_admin());

-- =============================================
-- SECTIONS
-- =============================================
CREATE POLICY "Authenticated users can read sections" ON sections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages sections" ON sections
  FOR ALL USING (is_admin());

-- =============================================
-- SUBJECTS
-- =============================================
CREATE POLICY "Authenticated users can read subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages subjects" ON subjects
  FOR ALL USING (is_admin());

-- =============================================
-- TEACHERS
-- =============================================
CREATE POLICY "Admin full access on teachers" ON teachers
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can read assigned teachers" ON teachers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st WHERE st.head_teacher_id = get_head_teacher_id() AND st.teacher_id = teachers.id)
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Teachers can read own record" ON teachers
  FOR SELECT USING (profile_id = auth.uid());

-- =============================================
-- HEAD TEACHERS
-- =============================================
CREATE POLICY "Admin manages head_teachers" ON head_teachers
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can read own record" ON head_teachers
  FOR SELECT USING (profile_id = auth.uid());

-- =============================================
-- TEACHER_CLASSES
-- =============================================
CREATE POLICY "Admin full access on teacher_classes" ON teacher_classes
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can read own assignments" ON teacher_classes
  FOR SELECT USING (teacher_id = get_teacher_id());

CREATE POLICY "Head teachers can read assigned teacher classes" ON teacher_classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st WHERE st.head_teacher_id = get_head_teacher_id() AND st.teacher_id = teacher_classes.teacher_id)
  );

-- =============================================
-- TEACHER_SUBJECTS
-- =============================================
CREATE POLICY "Admin full access on teacher_subjects" ON teacher_subjects
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can read own subject assignments" ON teacher_subjects
  FOR SELECT USING (teacher_id = get_teacher_id());

-- =============================================
-- HEAD_TEACHER_TEACHERS
-- =============================================
CREATE POLICY "Admin manages head_teacher_teachers" ON head_teacher_teachers
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can read own assignments" ON head_teacher_teachers
  FOR SELECT USING (head_teacher_id = get_head_teacher_id());

-- =============================================
-- STUDENTS
-- =============================================
CREATE POLICY "Admin full access on students" ON students
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can read students in their classes" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = get_teacher_id() AND tc.class_id = students.class_id AND tc.section_id = students.section_id)
  );

CREATE POLICY "Head teachers can read students in assigned teachers classes" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st JOIN teacher_classes tc ON tc.teacher_id = st.teacher_id WHERE st.head_teacher_id = get_head_teacher_id() AND tc.class_id = students.class_id)
  );

CREATE POLICY "Parents can read linked children" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = get_parent_id() AND ps.student_id = students.id)
  );

-- =============================================
-- PARENTS
-- =============================================
CREATE POLICY "Admin manages parents" ON parents
  FOR ALL USING (is_admin());

CREATE POLICY "Parents can read own record" ON parents
  FOR SELECT USING (profile_id = auth.uid());

-- =============================================
-- PARENT_STUDENTS
-- =============================================
CREATE POLICY "Admin manages parent_students" ON parent_students
  FOR ALL USING (is_admin());

CREATE POLICY "Parents can read own links" ON parent_students
  FOR SELECT USING (parent_id = get_parent_id());

-- =============================================
-- ATTENDANCE
-- NOTE: these policies deliberately do NOT reference attendance_records
-- (and vice versa) to avoid the "infinite recursion" RLS error.
-- =============================================
CREATE POLICY "Admin full access on attendance" ON attendance
  FOR ALL USING (is_admin());

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

-- =============================================
-- ATTENDANCE_RECORDS
-- =============================================
CREATE POLICY "Admin full access on attendance_records" ON attendance_records
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can manage records for their classes" ON attendance_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM attendance a JOIN teacher_classes tc ON tc.teacher_id = get_teacher_id() WHERE a.id = attendance_records.attendance_id AND tc.class_id = a.class_id AND tc.section_id = a.section_id)
  );

CREATE POLICY "Parents can read records for linked children" ON attendance_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = get_parent_id() AND ps.student_id = attendance_records.student_id)
  );

-- =============================================
-- HOMEWORK
-- =============================================
CREATE POLICY "Admin full access on homework" ON homework
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can manage own homework" ON homework
  FOR ALL USING (teacher_id = get_teacher_id());

CREATE POLICY "Parents can read homework for linked children classes" ON homework
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps JOIN students s ON s.id = ps.student_id WHERE ps.parent_id = get_parent_id() AND s.class_id = homework.class_id AND s.section_id = homework.section_id)
  );

CREATE POLICY "Head teachers can read homework for assigned teachers" ON homework
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st WHERE st.head_teacher_id = get_head_teacher_id() AND st.teacher_id = homework.teacher_id)
  );

-- =============================================
-- HOMEWORK_SUBMISSIONS
-- =============================================
CREATE POLICY "Admin full access on homework_submissions" ON homework_submissions
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can manage submissions for own homework" ON homework_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM homework h WHERE h.id = homework_submissions.homework_id AND h.teacher_id = get_teacher_id())
  );

CREATE POLICY "Parents can read submissions for linked children" ON homework_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = get_parent_id() AND ps.student_id = homework_submissions.student_id)
  );

-- =============================================
-- EXAMS
-- =============================================
CREATE POLICY "Admin full access on exams" ON exams
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can manage own exams" ON exams
  FOR ALL USING (teacher_id = get_teacher_id());

CREATE POLICY "Head teachers can read exams for assigned teachers" ON exams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM head_teacher_teachers st WHERE st.head_teacher_id = get_head_teacher_id() AND st.teacher_id = exams.teacher_id)
  );

-- =============================================
-- RESULTS
-- =============================================
CREATE POLICY "Admin full access on results" ON results
  FOR ALL USING (is_admin());

CREATE POLICY "Teachers can enter results for own exams" ON results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM exams e WHERE e.id = results.exam_id AND e.teacher_id = get_teacher_id())
  );

CREATE POLICY "Parents can read results for linked children" ON results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = get_parent_id() AND ps.student_id = results.student_id)
  );

-- =============================================
-- TASKS
-- =============================================
CREATE POLICY "Admin full access on tasks" ON tasks
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can manage tasks they assigned" ON tasks
  FOR ALL USING (assigned_by = auth.uid());

CREATE POLICY "Teachers can read/update tasks assigned to them" ON tasks
  FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "Teachers can update own task status" ON tasks
  FOR UPDATE USING (assigned_to = auth.uid());

-- =============================================
-- FEEDBACK
-- =============================================
CREATE POLICY "Admin full access on feedback" ON feedback
  FOR ALL USING (is_admin());

CREATE POLICY "Users can read feedback they sent or received" ON feedback
  FOR SELECT USING (from_user = auth.uid() OR to_user = auth.uid());

CREATE POLICY "Users can create feedback" ON feedback
  FOR INSERT WITH CHECK (from_user = auth.uid());

CREATE POLICY "Users can update feedback they received" ON feedback
  FOR UPDATE USING (to_user = auth.uid());

-- =============================================
-- FEEDBACK_RESPONSES
-- =============================================
CREATE POLICY "Admin full access on feedback_responses" ON feedback_responses
  FOR ALL USING (is_admin());

CREATE POLICY "Users can read responses for their feedback" ON feedback_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM feedback f WHERE f.id = feedback_responses.feedback_id AND (f.from_user = auth.uid() OR f.to_user = auth.uid()))
  );

CREATE POLICY "Users can respond to their feedback" ON feedback_responses
  FOR INSERT WITH CHECK (responded_by = auth.uid());

-- =============================================
-- ESCALATIONS
-- =============================================
CREATE POLICY "Admin manages escalations" ON escalations
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can read escalations involving them" ON escalations
  FOR SELECT USING (
    to_user = auth.uid() OR from_user = auth.uid() OR
    EXISTS (SELECT 1 FROM head_teachers s WHERE s.profile_id = auth.uid() AND escalations.to_user = s.profile_id)
  );

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- =============================================
-- CALENDAR_EVENTS
-- =============================================
CREATE POLICY "Authenticated users can read calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages calendar events" ON calendar_events
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can manage calendar events" ON calendar_events
  FOR ALL USING (get_user_role() IN ('head_teacher', 'supervisor'));

CREATE POLICY "Teachers can manage calendar events" ON calendar_events
  FOR ALL USING (get_user_role() = 'teacher');

-- =============================================
-- AUDIT_LOGS
-- =============================================
CREATE POLICY "Admin can read audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- SYSTEM_SETTINGS
-- =============================================
CREATE POLICY "Authenticated users can read settings" ON system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages system settings" ON system_settings
  FOR ALL USING (is_admin());