-- 1. Chống trùng số điện thoại ở tầng Database (bỏ qua nếu rỗng)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone <> '';

-- 2. Hàm kiểm tra số điện thoại đã tồn tại chưa (Bảo mật, không lộ dữ liệu user khác)
CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = TRIM(p_phone)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_phone_exists(TEXT) TO anon, authenticated;

-- 3. Nâng cấp hàm is_admin() bắt buộc xác thực 2FA (aal2) nếu Admin đã bật 2FA
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) AND (
    (auth.jwt()->>'aal' = 'aal2')
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
