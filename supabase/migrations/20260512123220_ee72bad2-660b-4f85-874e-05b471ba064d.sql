
-- Make inspections bucket private
UPDATE storage.buckets SET public = false WHERE id = 'inspections';
DROP POLICY IF EXISTS "inspection photos public read" ON storage.objects;
CREATE POLICY "auth users read inspection photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inspections');

-- Lock down SECURITY DEFINER functions from direct API access (RLS still uses them internally)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
