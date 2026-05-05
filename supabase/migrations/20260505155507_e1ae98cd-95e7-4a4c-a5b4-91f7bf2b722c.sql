
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS employee_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-docs', 'employee-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Employee docs: self read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'employee-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Employee docs: admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'employee-docs' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role_name(auth.uid(), 'super_admin')));

CREATE POLICY "Employee docs: self upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Employee docs: admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-docs' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role_name(auth.uid(), 'super_admin')));

CREATE POLICY "Employee docs: self delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Employee docs: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-docs' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role_name(auth.uid(), 'super_admin')));
