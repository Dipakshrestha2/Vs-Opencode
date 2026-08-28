-- =============================================
-- 020: Fix admin user management RLS policies
-- Resolves: admin cannot edit/delete users from the dashboard.
-- Root cause: FOR ALL USING without explicit WITH CHECK means UPDATE
-- applies the USING clause as WITH CHECK against the NEW row, but
-- get_user_role() may return null for a new row being inserted,
-- causing the check to fail silently.
-- =============================================

-- Drop and recreate profiles policies with explicit WITH CHECK clauses
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;

-- Separate explicit policies for each operation so they are unambiguous
CREATE POLICY "Admin can select profiles" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin can update profiles" ON profiles
  FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin can delete profiles" ON profiles
  FOR DELETE USING (get_user_role() = 'admin');
