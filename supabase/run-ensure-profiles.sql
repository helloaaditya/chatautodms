-- Run this once in Supabase Dashboard → SQL Editor to fix "no row in instagram_accounts"
-- 1. Create the function the Edge Function calls
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
  SELECT u.id, COALESCE(u.email, u.id::text || '@temp.local'), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url', NOW()
  FROM auth.users u
  WHERE u.id = p_user_id
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- 2. Backfill profiles for any auth users that don't have one
INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
SELECT u.id, COALESCE(u.email, u.id::text || '@temp.local'), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url', NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
