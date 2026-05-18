
-- 1. Grant admin role to the user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'perfectionstyles451@yahoo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Allow any authenticated user to read vehicles (for checklist dropdown)
DROP POLICY IF EXISTS "authenticated view vehicles" ON public.vehicles;
CREATE POLICY "authenticated view vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (true);
