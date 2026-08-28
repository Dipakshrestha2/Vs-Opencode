-- =============================================
-- 019 EXTENDED DEMO / WORKFLOW DATA
-- Safe, idempotent. Requires the demo auth users
-- to exist first (see setup manual). Runs after
-- 016-018 so it can use result_status and fills
-- the review/escalation workflow with real data.
-- If the demo profiles are not found it simply
-- does nothing and prints a NOTICE.
-- =============================================

-- ------------------------------------------------------------------
-- Ensure one-to-one entity links so ON CONFLICT (profile_id) works
-- ------------------------------------------------------------------
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_teachers_profile ON teachers(profile_id);
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_head_teachers_profile ON head_teachers(profile_id);
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_parents_profile ON parents(profile_id);
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $seed$
DECLARE
  v_admin      UUID;
  v_ht         UUID;
  v_t1         UUID;
  v_t2         UUID;
  v_p1         UUID;
  v_p2         UUID;

  v_ht_id      UUID;
  v_t1_id      UUID;
  v_t2_id      UUID;
  v_p1_id      UUID;
  v_p2_id      UUID;

  v_exam_id    UUID;

  v_ay         UUID := 'b0000000-0000-0000-0000-000000000001';
  v_kg1a_class UUID := 'c0000000-0000-0000-0000-000000000001';
  v_kg1a_sec   UUID := 'd0000000-0000-0000-0000-000000000001';
  v_kg1b_sec   UUID := 'd0000000-0000-0000-0000-000000000002';
  v_kg2a_class UUID := 'c0000000-0000-0000-0000-000000000002';
  v_kg2a_sec   UUID := 'd0000000-0000-0000-0000-000000000003';

  v_math       UUID := 'e0000000-0000-0000-0000-000000000001';
  v_english    UUID := 'e0000000-0000-0000-0000-000000000002';
  v_science    UUID := 'e0000000-0000-0000-0000-000000000003';
  v_art        UUID := 'e0000000-0000-0000-0000-000000000004';
  v_reading    UUID := 'e0000000-0000-0000-0000-000000000007';

  -- Demo students (KG1-A = 001-004, KG1-B = 005-007, KG2-A = 008-010)
  v_students_kg1a UUID[] := ARRAY[
    'f0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000004'];
BEGIN
  -- Resolve demo profiles by email (created with auth users, see SETUP.md)
  SELECT id INTO v_admin FROM profiles WHERE email = 'admin@kindergarten.com';
  SELECT id INTO v_ht    FROM profiles WHERE email = 'head_teacher@kindergarten.com';
  SELECT id INTO v_t1    FROM profiles WHERE email = 'teacher1@kindergarten.com';
  SELECT id INTO v_t2    FROM profiles WHERE email = 'teacher2@kindergarten.com';
  SELECT id INTO v_p1    FROM profiles WHERE email = 'parent1@kindergarten.com';
  SELECT id INTO v_p2    FROM profiles WHERE email = 'parent2@kindergarten.com';

  IF v_t1 IS NULL OR v_ht IS NULL OR v_p1 IS NULL THEN
    RAISE NOTICE 'Demo auth users not found yet - skip extended seed. Create the users first, then re-run 019.';
    RETURN;
  END IF;

  -- ---- Teachers / Head teacher entity rows ----
  INSERT INTO teachers (id, profile_id, employee_id, qualification, hire_date)
  VALUES (uuid_generate_v4(), v_t1, 'T-1001', 'B.Ed Early Childhood', '2024-08-01')
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_t1_id;
  IF v_t1_id IS NULL THEN SELECT id INTO v_t1_id FROM teachers WHERE profile_id = v_t1; END IF;

  INSERT INTO teachers (id, profile_id, employee_id, qualification, hire_date)
  VALUES (uuid_generate_v4(), v_t2, 'T-1002', 'M.Ed Special Education', '2025-01-15')
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_t2_id;
  IF v_t2_id IS NULL THEN SELECT id INTO v_t2_id FROM teachers WHERE profile_id = v_t2; END IF;

  INSERT INTO head_teachers (id, profile_id, employee_id, department)
  VALUES (uuid_generate_v4(), v_ht, 'HT-001', 'Early Education')
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_ht_id;
  IF v_ht_id IS NULL THEN SELECT id INTO v_ht_id FROM head_teachers WHERE profile_id = v_ht; END IF;

  -- ---- Head teacher covers both demo teachers ----
  INSERT INTO head_teacher_teachers (head_teacher_id, teacher_id, academic_year_id)
  VALUES
    (v_ht_id, v_t1_id, v_ay),
    (v_ht_id, v_t2_id, v_ay)
  ON CONFLICT (head_teacher_id, teacher_id, academic_year_id) DO NOTHING;

  -- ---- Teacher -> class assignments ----
  INSERT INTO teacher_classes (teacher_id, class_id, section_id, academic_year_id) VALUES
    (v_t1_id, v_kg1a_class, v_kg1a_sec, v_ay),
    (v_t1_id, v_kg1a_class, v_kg1b_sec, v_ay),
    (v_t1_id, v_kg2a_class, v_kg2a_sec, v_ay),
    (v_t2_id, v_kg1a_class, v_kg1a_sec, v_ay)
  ON CONFLICT (teacher_id, class_id, section_id, academic_year_id) DO NOTHING;

  -- ---- Teacher -> subject assignments ----
  INSERT INTO teacher_subjects (teacher_id, subject_id, class_id, section_id) VALUES
    (v_t1_id, v_math,    v_kg1a_class, v_kg1a_sec),
    (v_t1_id, v_english, v_kg1a_class, v_kg1a_sec),
    (v_t1_id, v_art,     v_kg1a_class, v_kg1a_sec),
    (v_t2_id, v_science, v_kg1a_class, v_kg1a_sec),
    (v_t2_id, v_reading, v_kg1a_class, v_kg1a_sec);

  -- ---- Parent entity rows + links to demo students ----
  INSERT INTO parents (id, profile_id, occupation, address)
  VALUES (uuid_generate_v4(), v_p1, 'Engineer', '12 Maple Street')
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_p1_id;
  IF v_p1_id IS NULL THEN SELECT id INTO v_p1_id FROM parents WHERE profile_id = v_p1; END IF;

  INSERT INTO parents (id, profile_id, occupation, address)
  VALUES (uuid_generate_v4(), v_p2, 'Designer', '45 Oak Avenue')
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_p2_id;
  IF v_p2_id IS NULL THEN SELECT id INTO v_p2_id FROM parents WHERE profile_id = v_p2; END IF;

  INSERT INTO parent_students (parent_id, student_id, relationship, is_primary) VALUES
    (v_p1_id, 'f0000000-0000-0000-0000-000000000001', 'Mother', true),
    (v_p1_id, 'f0000000-0000-0000-0000-000000000002', 'Mother', false),
    (v_p2_id, 'f0000000-0000-0000-0000-000000000005', 'Father', true)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  -- ---- Homework (teacher1: KG1-A Math; teacher2: KG1-A Science) ----
  INSERT INTO homework (teacher_id, class_id, section_id, subject_id, title, description, due_date, status, academic_year_id)
  SELECT v_t1_id, v_kg1a_class, v_kg1a_sec, v_math,    'Counting Exercise',  'Count 1-20 using objects at home.', '2026-08-28', 'assigned', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM homework h WHERE h.title = 'Counting Exercise' AND h.teacher_id = v_t1_id);

  INSERT INTO homework (teacher_id, class_id, section_id, subject_id, title, description, due_date, status, academic_year_id)
  SELECT v_t1_id, v_kg1a_class, v_kg1a_sec, v_english, 'Letter Tracing',      'Trace letters A-M.',              '2026-08-30', 'assigned', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM homework h WHERE h.title = 'Letter Tracing' AND h.teacher_id = v_t1_id);

  INSERT INTO homework (teacher_id, class_id, section_id, subject_id, title, description, due_date, status, academic_year_id)
  SELECT v_t2_id, v_kg1a_class, v_kg1a_sec, v_science, 'Plant Observation',   'Draw and label a plant.',         '2026-08-29', 'assigned', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM homework h WHERE h.title = 'Plant Observation' AND h.teacher_id = v_t2_id);

  -- ---- Exam + results submitted for review (teacher1 -> head teacher) ----
  INSERT INTO exams (id, teacher_id, class_id, section_id, subject_id, title, exam_date, total_marks, academic_year_id)
  SELECT uuid_generate_v4(), v_t1_id, v_kg1a_class, v_kg1a_sec, v_math, 'Mid-Term Math Assessment', '2026-08-20', 50, v_ay
  WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.title = 'Mid-Term Math Assessment' AND e.teacher_id = v_t1_id)
  RETURNING id INTO v_exam_id;

  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM exams WHERE title = 'Mid-Term Math Assessment' AND teacher_id = v_t1_id LIMIT 1;
  END IF;

  INSERT INTO results (exam_id, student_id, marks_obtained, grade, remarks, entered_by, status, submitted_at)
  SELECT v_exam_id, student_id, marks, grade, remarks, v_t1, 'submitted', NOW()
  FROM (VALUES
    ('f0000000-0000-0000-0000-000000000001'::UUID, 45, 'A', 'Excellent number sense'),
    ('f0000000-0000-0000-0000-000000000002'::UUID, 38, 'B', 'Good progress, practice sums'),
    ('f0000000-0000-0000-0000-000000000003'::UUID, 47, 'A', 'Outstanding work'),
    ('f0000000-0000-0000-0000-000000000004'::UUID, 41, 'A', 'Very good')
  ) AS r(student_id, marks, grade, remarks)
  ON CONFLICT (exam_id, student_id) DO NOTHING;

  -- ---- Tasks: head teacher -> teachers (one in_progress, one submitted) ----
  INSERT INTO tasks (title, description, assigned_by, assigned_to, class_id, section_id, status, due_date, priority, academic_year_id)
  SELECT 'Submit weekly attendance report', 'Aggregate and submit KG1-A attendance for the week.', v_ht, v_t1, v_kg1a_class, v_kg1a_sec, 'in_progress', '2026-08-28', 'high', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title = 'Submit weekly attendance report' AND t.assigned_by = v_ht);

  INSERT INTO tasks (title, description, assigned_by, assigned_to, class_id, section_id, status, due_date, priority, academic_year_id)
  SELECT 'Prepare phonics worksheets', 'Create printable phonics worksheets for KG1-B.',       v_ht, v_t1, v_kg1a_class, v_kg1b_sec, 'submitted',  '2026-08-30', 'medium', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title = 'Prepare phonics worksheets' AND t.assigned_by = v_ht);

  INSERT INTO tasks (title, description, assigned_by, assigned_to, class_id, section_id, status, due_date, priority, academic_year_id)
  SELECT 'Update KG2 lesson plans', 'Review and submit updated KG2-A lesson plans.',           v_ht, v_t2, v_kg2a_class, v_kg2a_sec, 'assigned',   '2026-08-29', 'medium', v_ay
  WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title = 'Update KG2 lesson plans' AND t.assigned_by = v_ht);

  -- ---- Feedback flow ----
  INSERT INTO feedback (from_user, to_user, class_id, subject, message, status, priority, due_date)
  SELECT v_t1, v_ht, v_kg1a_class, 'Attendance report submission', 'I will submit the KG1-A attendance report by Friday.', 'assigned', 'high', '2026-08-28'
  WHERE NOT EXISTS (SELECT 1 FROM feedback f WHERE f.subject = 'Attendance report submission' AND f.from_user = v_t1);

  INSERT INTO feedback (from_user, to_user, class_id, subject, message, status, priority, due_date)
  SELECT v_ht, v_t1, v_kg1a_class, 'Great classroom management', 'Parents praised the new reading corner. Keep it up!',   'assigned', 'medium', NULL
  WHERE NOT EXISTS (SELECT 1 FROM feedback f WHERE f.subject = 'Great classroom management' AND f.from_user = v_ht);

  -- ---- Announcements ----
  INSERT INTO announcements (school_id, title, body, audience, created_by, published_at)
  SELECT 'a0000000-0000-0000-0000-000000000001', 'Welcome to the 2026-2027 year', 'We are delighted to welcome all families to a new year at Little Stars Kindergarten.', 'all', v_admin, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = 'Welcome to the 2026-2027 year');

  INSERT INTO announcements (school_id, title, body, audience, created_by, published_at)
  SELECT 'a0000000-0000-0000-0000-000000000001', 'Parent-Teacher Conference', 'Mark your calendars for the mid-term parent-teacher conferences on 15 September.', 'parent', v_admin, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = 'Parent-Teacher Conference');

  -- ---- Notifications for the demo teacher ----
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT id, 'Task Assigned', 'You have been assigned: "Update KG2 lesson plans"', 'task', '#/teacher/tasks'
  FROM profiles WHERE id = v_t2 AND NOT EXISTS (
    SELECT 1 FROM notifications WHERE user_id = v_t2 AND title = 'Task Assigned'
  );

  RAISE NOTICE 'Extended demo data created successfully (019).';
END;
$seed$;