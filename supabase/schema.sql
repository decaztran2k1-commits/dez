-- 1. Bảng Profiles (Thông tin Studio / Agency / Admin)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'vendor' CHECK (role IN ('admin', 'vendor')),
  company_name TEXT NOT NULL,
  phone TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Projects (Dự án sự kiện của DEZ EVENT)
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget BIGINT NOT NULL,
  media_count INT NOT NULL DEFAULT 1,
  location TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Bids (Hồ sơ đấu thầu từ các Studio/Agency)
CREATE TABLE public.bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  proposed_budget BIGINT NOT NULL,
  team_size INT NOT NULL,
  leader_info JSONB NOT NULL,
  equipment_list TEXT NOT NULL,
  portfolio_drive_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'won', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, vendor_id)
);

-- Trigger tự động tạo Profile khi đăng ký tài khoản mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Studio Mới'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'vendor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- BẬT ROW LEVEL SECURITY (BẢO MẬT TUYỆT ĐỐI)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "User xem profile cua minh hoac Admin xem tat ca"
  ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "User tu cap nhat profile (khong duoc doi role)"
  ON public.profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Ai cung co the xem du an"
  ON public.projects FOR SELECT USING (true);

CREATE POLICY "Chi Admin duoc tao/sua/xoa du an"
  ON public.projects FOR ALL USING (public.is_admin());

CREATE POLICY "Vendor chi xem ho so cua minh, Admin xem tat ca"
  ON public.bids FOR SELECT USING (auth.uid() = vendor_id OR public.is_admin());

CREATE POLICY "Vendor duoc nop thau vao du an dang mo"
  ON public.bids FOR INSERT WITH CHECK (
    auth.uid() = vendor_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND status = 'open' AND deadline > NOW()
    )
  );

CREATE POLICY "Chi Admin duoc duyet/cap nhat trang thai thau"
  ON public.bids FOR UPDATE USING (public.is_admin());
