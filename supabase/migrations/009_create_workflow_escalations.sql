-- Escalations
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  feedback_id UUID REFERENCES feedback(id),
  from_user UUID REFERENCES profiles(id),
  to_user UUID REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status task_status DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
