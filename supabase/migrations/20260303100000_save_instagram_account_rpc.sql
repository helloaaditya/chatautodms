-- Save Instagram account after OAuth: ensure profile exists then upsert instagram_accounts (one transaction)
CREATE OR REPLACE FUNCTION public.save_instagram_account_after_oauth(
  p_user_id UUID,
  p_instagram_business_id TEXT,
  p_page_id TEXT,
  p_account_name TEXT,
  p_profile_picture TEXT,
  p_access_token TEXT,
  p_token_expiry TIMESTAMPTZ,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- 1. Ensure profile exists (required for FK from instagram_accounts.user_id)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, updated_at)
  SELECT u.id, COALESCE(u.email, u.id::text || '@temp.local'), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url', NOW()
  FROM auth.users u
  WHERE u.id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  -- 2. Upsert instagram_accounts
  INSERT INTO public.instagram_accounts (
    user_id, instagram_business_id, page_id, account_name, profile_picture,
    access_token, token_expiry, is_active
  )
  VALUES (
    p_user_id, p_instagram_business_id, p_page_id, p_account_name, p_profile_picture,
    p_access_token, p_token_expiry, p_is_active
  )
  ON CONFLICT (instagram_business_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    page_id = EXCLUDED.page_id,
    account_name = EXCLUDED.account_name,
    profile_picture = EXCLUDED.profile_picture,
    access_token = EXCLUDED.access_token,
    token_expiry = EXCLUDED.token_expiry,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  SELECT id INTO v_account_id FROM public.instagram_accounts WHERE instagram_business_id = p_instagram_business_id LIMIT 1;
  RETURN v_account_id;
END;
$$;
