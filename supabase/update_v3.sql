-- ==========================================================
-- DEZ EVENT - UPDATE V3 (CRM Nâng cao, Giỏ dự án, Đếm thầu)
-- ==========================================================

-- 1. Nâng cấp bảng projects với các trường chi tiết mới
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS photographers_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS videographers_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completion_time TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS equipment_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS province TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ward TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_detail TEXT DEFAULT '';

-- Cập nhật trạng thái projects cho phép: 'open', 'closed', 'completed'
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (status IN ('open', 'closed', 'completed'));

-- 2. Tạo bảng saved_projects (Giỏ dự án quan tâm của nhà thầu)
CREATE TABLE IF NOT EXISTS public.saved_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved projects" ON public.saved_projects;
CREATE POLICY "Users can manage their own saved projects"
  ON public.saved_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Hàm RPC đếm số lượng nhà thầu theo dự án (Bảo mật, chỉ trả về số đếm, không lộ thông tin thầu)
CREATE OR REPLACE FUNCTION public.get_project_bid_counts()
RETURNS TABLE (project_id UUID, bid_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT b.project_id, COUNT(*)::BIGINT AS bid_count
  FROM public.bids b
  GROUP BY b.project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_project_bid_counts() TO anon, authenticated;

-- 4. Đảm bảo Admin xem được toàn bộ danh sách đơn vị đăng ký đấu thầu (profiles)
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

-- 5. Đảm bảo Admin xem và cập nhật được toàn bộ bids
DROP POLICY IF EXISTS "Admin can manage all bids" ON public.bids;
CREATE POLICY "Admin can manage all bids"
  ON public.bids
  FOR ALL
  USING (public.is_admin());

-- 6. Đảm bảo nhà thầu xem được danh sách dự án của mình (kể cả đã đóng/hoàn thiện)
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
CREATE POLICY "Anyone can view projects"
  ON public.projects
  FOR SELECT
  USING (true);
