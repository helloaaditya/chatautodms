-- Ensure profile exists before inserting instagram_accounts (handles OAuth users whose trigger may have failed)
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
