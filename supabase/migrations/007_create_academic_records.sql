-- Attendance sessions
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken_by UUID REFERENCES profiles(id),
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, section_id, date)
);

-- Individual attendance records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attendance_id, student_id)
);

-- Homework
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id),
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  subject_id UUID REFERENCES subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status task_status DEFAULT 'assigned',
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework submissions
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  file_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade TEXT,
  feedback TEXT,
  UNIQUE(homework_id, student_id)
);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id),
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  subject_id UUID REFERENCES subjects(id),
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  total_marks INTEGER NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained INTEGER NOT NULL,
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
