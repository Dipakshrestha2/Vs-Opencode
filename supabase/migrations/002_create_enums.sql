-- Custom enum types
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'teacher', 'parent');
CREATE TYPE task_status AS ENUM ('assigned', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'completed');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
