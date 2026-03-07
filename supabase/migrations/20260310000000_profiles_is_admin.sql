-- Add is_admin to profiles for global admin panel access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS 'When true, user can access /admin and perform CRUD on all resources.';

-- To grant admin to a user after migration, run for example:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com';
