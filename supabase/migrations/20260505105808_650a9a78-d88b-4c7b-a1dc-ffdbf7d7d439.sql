
-- Create buckets (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('shipment-documents', 'shipment-documents', false),
  ('quotation-pdfs', 'quotation-pdfs', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop any old policies on these buckets to avoid duplicates
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'scls_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- ============ AVATARS (public read, owner write) ============
CREATE POLICY "scls_avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "scls_avatars_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "scls_avatars_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "scls_avatars_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============ SHIPMENT DOCUMENTS (private) ============
-- Read: admin, operations, accountant, manager, sales -> all
-- Customer -> only files under their own shipment folder (first folder = shipment_id)
CREATE POLICY "scls_shipment_docs_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'accountant')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'sales')
    OR (
      public.has_role(auth.uid(), 'customer')
      AND EXISTS (
        SELECT 1 FROM public.shipments s
        JOIN public.profiles p ON p.customer_id = s.customer_id
        WHERE p.id = auth.uid()
          AND s.id::text = (storage.foldername(name))[1]
      )
    )
  )
);

CREATE POLICY "scls_shipment_docs_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shipment-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operations')
  )
);

CREATE POLICY "scls_shipment_docs_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operations')
  )
);

CREATE POLICY "scls_shipment_docs_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- ============ QUOTATION PDFS (private) ============
-- Folder convention: {quotation_id}/filename.pdf
CREATE POLICY "scls_quotation_pdfs_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quotation-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'accountant')
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id::text = (storage.foldername(name))[1]
        AND (
          q.created_by = auth.uid()
          OR (
            public.has_role(auth.uid(), 'customer')
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.customer_id = q.customer_id
            )
          )
        )
    )
  )
);

CREATE POLICY "scls_quotation_pdfs_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'quotation-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
);

CREATE POLICY "scls_quotation_pdfs_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'quotation-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
);

CREATE POLICY "scls_quotation_pdfs_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'quotation-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);
