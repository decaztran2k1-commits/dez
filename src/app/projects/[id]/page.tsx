'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Wallet,
  Camera,
  Video,
  Wrench,
  FileCheck2,
  ShoppingBag,
  Check,
  Gavel,
  Lock,
  Loader2,
  Upload,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';

interface EquipmentItem {
  name: string;
  quantity: number;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

function formatNumberInput(val: string) {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<any>(null);
  const [bidCount, setBidCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [myExistingBid, setMyExistingBid] = useState<any>(null);

  // Form đấu thầu
  const [bidAmountDisplay, setBidAmountDisplay] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      const [{ data: proj }, { data: counts }, { data: authData }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.rpc('get_project_bid_counts'),
        supabase.auth.getUser(),
      ]);

      setProject(proj);

      if (Array.isArray(counts)) {
        const found = counts.find((c: any) => c.project_id === projectId);
        setBidCount(found ? Number(found.bid_count) : 0);
      }

      if (authData?.user) {
        setUser(authData.user);
        const [{ data: saved }, { data: existingBid }, { data: profile }] = await Promise.all([
          supabase
            .from('saved_projects')
            .select('id')
            .eq('user_id', authData.user.id)
            .eq('project_id', projectId)
            .maybeSingle(),
          supabase
            .from('bids')
            .select('*')
            .eq('vendor_id', authData.user.id)
            .eq('project_id', projectId)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('portfolio_url')
            .eq('id', authData.user.id)
            .single(),
        ]);

        setIsSaved(!!saved);
        setMyExistingBid(existingBid);
        if (profile?.portfolio_url) setPortfolioLink(profile.portfolio_url);
      }
      setLoading(false);
    };

    if (projectId) loadDetail();
  }, [projectId]);

  const toggleSave = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (isSaved) {
      setIsSaved(false);
      await supabase
        .from('saved_projects')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', projectId);
    } else {
      setIsSaved(true);
      await supabase
        .from('saved_projects')
        .insert({ user_id: user.id, project_id: projectId });
    }
    window.dispatchEvent(new Event('dez-cart-updated'));
  };

  // Quản lý danh sách thiết bị nhà thầu mang theo
  const addEquipmentRow = () => {
    setEquipmentList((prev) => [...prev, { name: '', quantity: 1 }]);
  };

  const updateEquipmentRow = (idx: number, field: 'name' | 'quantity', value: string | number) => {
    setEquipmentList((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const removeEquipmentRow = (idx: number) => {
    setEquipmentList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/auth');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitMsg('');

    try {
      const numericAmount = Number(bidAmountDisplay.replace(/\D/g, ''));
      if (!numericAmount || numericAmount <= 0) {
        throw new Error('Vui lòng nhập giá chào thầu hợp lệ.');
      }

      let driveFileId: string | null = null;
      let driveFileUrl: string | null = portfolioLink.trim() || null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Lỗi tải file lên Google Drive.');
        }
        driveFileId = uploadData.fileId || null;
        driveFileUrl = uploadData.webViewLink || driveFileUrl;
      }

      const cleanedEquipment = equipmentList
        .filter((eq) => eq.name.trim() !== '')
        .map((eq) => ({ name: eq.name.trim(), quantity: Number(eq.quantity) || 1 }));

      const { data: inserted, error } = await supabase
        .from('bids')
        .insert({
          project_id: projectId,
          vendor_id: user.id,
          bid_amount: numericAmount,
          proposal_note: proposalNote.trim(),
          equipment_list: cleanedEquipment,
          drive_file_id: driveFileId,
          drive_file_url: driveFileUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setMyExistingBid(inserted);
      setBidCount((c) => c + 1);
      setSubmitMsg('Đã gửi hồ sơ đấu thầu thành công! Bạn có thể theo dõi trạng thái trong trang Quản lý.');
    } catch (err: any) {
      setSubmitError(err.message || 'Có lỗi xảy ra khi gửi hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Đang tải chi tiết dự án...</div>;
  }

  if (!project) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-300">Không tìm thấy dự án này.</p>
        <Link href="/" className="text-sky-400 hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  const deadlineMs = project.deadline ? new Date(project.deadline).getTime() : Infinity;
  const msLeft = deadlineMs - Date.now();
  const isUnderTwoHours = msLeft <= 2 * 60 * 60 * 1000;
  const isExpired = msLeft <= 0 || project.status !== 'open';

  const fullAddress = [project.address_detail, project.ward, project.province || project.location]
    .filter(Boolean)
    .join(', ');

  const mySubmittedEquipment: EquipmentItem[] = Array.isArray(myExistingBid?.equipment_list)
    ? myExistingBid.equipment_list
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách dự án
        </Link>

        <button
          onClick={toggleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
            isSaved
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
              : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          {isSaved ? 'Đã lưu trong giỏ dự án' : 'Lưu vào giỏ dự án'}
        </button>
      </div>

      {/* Thông tin chi tiết dự án */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {project.province || project.location}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                project.status === 'open'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : project.status === 'completed'
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {project.status === 'open'
                ? 'Đang mở thầu'
                : project.status === 'completed'
                ? 'Hoàn thiện đấu thầu'
                : 'Đã đóng thầu'}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center gap-2">
            {isUnderTwoHours ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">
                  Số lượng đấu thầu đang được bảo mật (2h cuối)
                </span>
              </>
            ) : (
              <>
                <Gavel className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300">Đã có</span>
                <span className="text-white font-bold">{bidCount} đơn vị</span>
                <span className="text-slate-300">tham gia đấu thầu</span>
              </>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{project.title}</h1>

        {/* Lưới thông số chính */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" /> Ngân sách đề ra
            </div>
            <div className="text-lg font-bold text-white">{formatVND(project.budget)}</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-400" /> Photographer &amp; Video
            </div>
            <div className="text-base font-bold text-white flex items-center gap-3">
              <span>{project.photographers_count ?? 0} Photo</span>
              <span className="text-slate-500">•</span>
              <span className="inline-flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-sky-400" />
                {project.videographers_count ?? 0} Video
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" /> Ngày diễn ra sự kiện
            </div>
            <div className="text-base font-bold text-white">
              {new Date(project.event_date).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Hạn chót nhận thầu
            </div>
            <div className="text-base font-bold text-amber-300">
              {project.deadline
                ? new Date(project.deadline).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Trước sự kiện 7 ngày'}
            </div>
          </div>
        </div>

        {/* Địa chỉ & Thời gian hoàn thiện */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-400" /> Địa điểm tổ chức chi tiết
            </div>
            <div className="text-sm font-medium text-white">{fullAddress || 'Đang cập nhật'}</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-400" /> Thời gian hoàn thiện sản phẩm
            </div>
            <div className="text-sm font-medium text-white">
              {project.completion_time || 'Theo thỏa thuận khi chốt thầu'}
            </div>
          </div>
        </div>

        {/* Mô tả chi tiết */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">Mô tả &amp; Yêu cầu chi tiết</h2>
          <div className="p-4 rounded-xl bg-black/25 border border-white/10 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {project.description}
          </div>
        </div>
      </div>

      {/* Form nộp hồ sơ đấu thầu */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
        <h2 className="text-xl font-bold text-white">Nộp Hồ Sơ Đấu Thầu</h2>

        {myExistingBid ? (
          <div className="p-5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 className="w-5 h-5" /> Bạn đã nộp hồ sơ cho dự án này
            </div>
            <p className="text-sm text-slate-200">
              Giá chào thầu của bạn: <strong>{formatVND(myExistingBid.bid_amount)}</strong>
            </p>
            {mySubmittedEquipment.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 font-semibold">Thiết bị đã kê khai:</p>
                <div className="flex flex-wrap gap-2">
                  {mySubmittedEquipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-xs text-white"
                    >
                      {eq.name} (x{eq.quantity})
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Trạng thái hiện tại:{' '}
              <span className="text-white font-semibold uppercase">
                {myExistingBid.status === 'accepted'
                  ? 'Đã trúng thầu'
                  : myExistingBid.status === 'rejected'
                  ? 'Không trúng thầu'
                  : 'Đang chờ duyệt'}
              </span>
            </p>
          </div>
        ) : isExpired ? (
          <div className="p-5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm">
            Dự án này đã đóng hoặc hết thời gian nhận hồ sơ đấu thầu.
          </div>
        ) : !user ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center space-y-3">
            <p className="text-sm text-slate-300">
              Vui lòng đăng nhập tài khoản Studio / Agency để gửi báo giá đấu thầu.
            </p>
            <Link
              href="/auth"
              className="inline-block px-6 py-2.5 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <form onSubmit={handleBidSubmit} className="space-y-5">
            {submitMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm">
                {submitMsg}
              </div>
            )}
            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Giá chào thầu của đơn vị bạn (VNĐ) *
                </label>
                <input
                  type="text"
                  required
                  value={bidAmountDisplay}
                  onChange={(e) => setBidAmountDisplay(formatNumberInput(e.target.value))}
                  placeholder="VD: 32.000.000"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Link Portfolio / Demo sản phẩm tương tự
                </label>
                <input
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc Behance"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            {/* Danh sách thiết bị nhà thầu mang đi thực hiện */}
            <div className="space-y-2.5 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-sky-400" /> Danh sách thiết bị sử dụng cho dự án
                </label>
                <button
                  type="button"
                  onClick={addEquipmentRow}
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thiết bị
                </button>
              </div>

              {equipmentList.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Bấm &ldquo;+ Thêm thiết bị&rdquo; để kê khai máy ảnh, máy quay, gimbal, flycam, đèn... bạn sẽ mang theo.
                </p>
              ) : (
                <div className="space-y-2">
                  {equipmentList.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={row.name}
                        onChange={(e) => updateEquipmentRow(idx, 'name', e.target.value)}
                        placeholder="Tên thiết bị (VD: Sony FX3, Gimbal RS4, Flycam Mavic 3...)"
                        className="flex-1 px-3.5 py-2 rounded-xl glass-input text-xs"
                      />
                      <input
                        type="number"
                        min={1}
                        required
                        value={row.quantity}
                        onChange={(e) => updateEquipmentRow(idx, 'quantity', Number(e.target.value))}
                        className="w-20 px-2.5 py-2 rounded-xl glass-input text-xs text-center"
                        title="Số lượng"
                      />
                      <button
                        type="button"
                        onClick={() => removeEquipmentRow(idx)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Đề xuất phương án triển khai &amp; cam kết tiến độ *
              </label>
              <textarea
                rows={4}
                required
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                placeholder="Mô tả chi tiết ekip tham gia, quy trình quay chụp và cam kết thời gian trả file..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Đính kèm file Báo giá / Hồ sơ năng lực (PDF, DOCX - tùy chọn, lưu trực tiếp lên Google Drive)
              </label>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition">
                <Upload className="w-4 h-4 text-sky-400" />
                <span className="text-sm text-slate-300 truncate">
                  {file ? file.name : 'Chọn file từ máy tính...'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Gửi Hồ Sơ Đấu Thầu
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
