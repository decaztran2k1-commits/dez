'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project } from './ProjectBoard';
import { X, UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BidModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const supabase = createClient();
  const router = useRouter();

  const [proposedBudget, setProposedBudget] = useState(project.budget.toString());
  const [teamSize, setTeamSize] = useState(project.media_count.toString());
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderExp, setLeaderExp] = useState('');
  const [equipmentList, setEquipmentList] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      let driveUrl = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Lỗi tải file lên Drive');
        driveUrl = uploadData.webViewLink;
      }

      const { error: dbError } = await supabase.from('bids').insert({
        project_id: project.id,
        vendor_id: user.id,
        proposed_budget: Number(proposedBudget),
        team_size: Number(teamSize),
        leader_info: {
          name: leaderName,
          phone: leaderPhone,
          experience: leaderExp,
        },
        equipment_list: equipmentList,
        portfolio_drive_url: driveUrl,
        notes,
      });

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Studio của bạn đã nộp hồ sơ cho dự án này rồi.');
        }
        throw new Error(dbError.message);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 sm:p-8 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          <div className="py-10 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h3 className="text-2xl font-bold text-white">Nộp Hồ Sơ Thầu Thành Công!</h3>
            <p className="text-slate-300 text-sm">
              DEZ EVENT đã nhận được đề xuất của bạn cho dự án <strong>{project.title}</strong>. Chúng tôi sẽ liên hệ ngay khi có kết quả.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white text-[#060b19] font-semibold text-sm"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">
                Hồ sơ dự thầu Media
              </span>
              <h3 className="text-xl font-bold text-white mt-1">{project.title}</h3>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Giá chào thầu (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Số lượng nhân sự Media *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Tên Leader Ekip *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">SĐT Leader *</label>
                <input
                  type="tel"
                  required
                  placeholder="09xx..."
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Kinh nghiệm Leader</label>
                <input
                  type="text"
                  placeholder="VD: 5 năm sự kiện"
                  value={leaderExp}
                  onChange={(e) => setLeaderExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Danh sách thiết bị (Loại máy quay, máy ảnh, lens, gimbal, đèn, flycam...) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="VD: 2x Sony FX3, 1x Sony A7IV, Lens 24-70 GMII, 70-200 GMII, Flycam Mavic 3 Pro..."
                value={equipmentList}
                onChange={(e) => setEquipmentList(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Đính kèm Profile / Portfolio (PDF, JPG, PNG - Tối đa 10MB, lưu trên Google Drive)
              </label>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl border border-dashed border-white/25 hover:border-white/50 bg-white/5 cursor-pointer transition">
                <UploadCloud className="w-5 h-5 text-sky-400" />
                <span className="text-sm text-slate-300">
                  {file ? file.name : 'Nhấn để chọn file Hồ sơ năng lực / Báo giá'}
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Ghi chú thêm & Link sản phẩm đã làm</label>
              <textarea
                rows={2}
                placeholder="Link Youtube / Vimeo / Behance hoặc cam kết trả file nhanh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-white text-[#060b19] font-semibold text-sm hover:bg-slate-200 flex items-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi Hồ Sơ Đấu Thầu
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
