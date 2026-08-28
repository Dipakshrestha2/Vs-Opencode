-- =============================================
-- 018 STORAGE BUCKETS AND POLICIES
-- Safe public buckets (gallery/avatars/student photos)
-- and private document buckets.
-- =============================================

INSERT INTO storage.buckets (id, name, public)
SELECT id::text, id::text, public
FROM (VALUES
  ('avatars', true),
  ('student-photos', true),
  ('gallery', true),
  ('homework-documents', false),
  ('exam-papers', false)
) AS b(id, public)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------
-- Public READ: gallery, avatars, student-photos
-- ------------------------------------------------------------------
CREATE POLICY "Public read gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Public read student photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-photos');

-- ------------------------------------------------------------------
-- WRITE:
--   avatars  -> the owning user (path: <user_id>/<file>)
--   gallery  -> admin (school staff only)
--   student-photos -> admin or a teacher
-- ------------------------------------------------------------------
CREATE POLICY "Users upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins upload gallery" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gallery' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ));

CREATE POLICY "Staff upload student photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-photos' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_teacher'))
  ));

-- ------------------------------------------------------------------
-- PRIVATE buckets (homework-documents, exam-papers):
-- Only staff may read/write. Parents receive file references but cannot
-- directly download private files; the app shows a teacher-provided
-- summary instead. (Uncomment/strengthen if direct parent download is
-- required later.)
-- ------------------------------------------------------------------
CREATE POLICY "Staff read private documents" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('homework-documents', 'exam-papers') AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_teacher', 'teacher'))
    )
  );

CREATE POLICY "Teachers and admins upload private documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('homework-documents', 'exam-papers') AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    )
  );

-- ------------------------------------------------------------------
-- DELETE: admins only on everything
-- ------------------------------------------------------------------
CREATE POLICY "Admins delete storage objects" ON storage.objects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );