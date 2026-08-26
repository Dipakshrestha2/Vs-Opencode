-- Tasks (Supervisor → Teacher)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  status task_status DEFAULT 'assigned',
  due_date DATE NOT NULL,
  priority priority_level DEFAULT 'medium',
  escalation_level INTEGER DEFAULT 0,
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID REFERENCES profiles(id),
  to_user UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES students(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status task_status DEFAULT 'assigned',
  priority priority_level DEFAULT 'medium',
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback responses
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  responded_by UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
