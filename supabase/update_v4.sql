-- Chuyển danh sách thiết bị sang bảng bids (nhà thầu tự kê khai thiết bị khi đấu thầu)
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS equipment_list JSONB DEFAULT '[]'::jsonb;
