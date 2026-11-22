'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  FolderKanban,
  CheckCircle2,
  XCircle,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Wrench,
} from 'lucide-react';

interface ProvinceItem {
  province_code: string;
  name: string;
}

interface WardItem {
  ward_code: string;
  ward_name: string;
}

interface EquipmentRow {
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

export default function AdminCRMPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mainTab, setMainTab] = useState<'projects' | 'vendors'>('projects');
  const [projectStatusTab, setProjectStatusTab] = useState<'open' | 'closed' | 'completed'>('open');

  // Data
  const [projects, setProjects] = useState<any[]>([]);
  const [bidsByProject, setBidsByProject] = useState<Record<string, any[]>>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Địa giới hành chính Việt Nam mới nhất (34 Tỉnh/Thành -> Xã/Phường)
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Form tạo dự án mới
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetDisplay, setBudgetDisplay] = useState('');
  const [photographersCount, setPhotographersCount] = useState(1);
  const [videographersCount, setVideographersCount] = useState(1);
  const [completionTime, setCompletionTime] = useState('');
  const [equipmentList, setEquipmentList] = useState<EquipmentRow[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [eventDate, setEventDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const loadAdminData = async () => {
    const [{ data: projs }, { data: allBids }, { data: allProfiles }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase
        .from('bids')
        .select('*, profiles:vendor_id(company_name, phone, portfolio_url)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);

    setProjects(projs || []);

    const grouped: Record<string, any[]> = {};
    (allBids || []).forEach((b: any) => {
      if (!grouped[b.project_id]) grouped[b.project_id] = [];
      grouped[b.project_id].push(b);
    });
    setBidsByProject(grouped);

    // Đếm số lần đấu thầu và trúng thầu của từng đơn vị
    const bidStats: Record<string, { total: number; won: number }> = {};
    (allBids || []).forEach((b: any) => {
      if (!bidStats[b.vendor_id]) bidStats[b.vendor_id] = { total: 0, won: 0 };
      bidStats[b.vendor_id].total += 1;
      if (b.status === 'accepted') bidStats[b.vendor_id].won += 1;
    });

    const enrichedVendors = (allProfiles || []).map((v: any) => ({
      ...v,
      total_bids: bidStats[v.id]?.total || 0,
      won_bids: bidStats[v.id]?.won || 0,
    }));
    setVendors(enrichedVendors);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }

      setCheckingAuth(false);
      await loadAdminData();

      // Tải danh sách 34 tỉnh/thành Việt Nam
      try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        if (Array.isArray(data)) setProvinces(data);
      } catch {
        // Fallback đã xử lý ở API
      }
    };
    init();
  }, []);

  // Load Xã/Phường khi chọn Tỉnh/Thành
  const handleProvinceChange = async (code: string) => {
    setSelectedProvinceCode(code);
    const found = provinces.find((p) => p.province_code === code);
    setSelectedProvinceName(found?.name || '');
    setSelectedWardName('');
    setWards([]);

    if (!code) return;
    setLoadingWards(true);
    try {
      const res = await fetch(`/api/locations?province_code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (Array.isArray(data)) setWards(data);
    } finally {
      setLoadingWards(false);
    }
  };

  // Tự tính hạn chót nhận thầu = trước ngày sự kiện 1 tuần (7 ngày)
  const calculatedDeadline = eventDate
    ? new Date(new Date(eventDate).getTime() - 7 * 24 * 60 * 60 * 1000)
    : null;

  // Quản lý danh sách thiết bị động
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

  // Đăng dự án mới
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice('');

    try {
      const numericBudget = Number(budgetDisplay.replace(/\D/g, ''));
      if (!numericBudget) throw new Error('Vui lòng nhập ngân sách hợp lệ.');
      if (!selectedProvinceName) throw new Error('Vui lòng chọn Tỉnh/Thành phố.');
      if (!eventDate) throw new Error('Vui lòng chọn thời gian diễn ra sự kiện.');

      const deadlineIso = new Date(
        new Date(eventDate).getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const cleanedEquipment = equipmentList
        .filter((eq) => eq.name.trim() !== '')
        .map((eq) => ({ name: eq.name.trim(), quantity: Number(eq.quantity) || 1 }));

      const { error } = await supabase.from('projects').insert({
        title: title.trim(),
        description: description.trim(),
        budget: numericBudget,
        photographers_count: Number(photographersCount) || 0,
        videographers_count: Number(videographersCount) || 0,
        media_slots: (Number(photographersCount) || 0) + (Number(videographersCount) || 0),
        completion_time: completionTime.trim(),
        equipment_list: cleanedEquipment,
        location: selectedProvinceName,
        province: selectedProvinceName,
        ward: selectedWardName.trim(),
        address_detail: addressDetail.trim(),
        event_date: new Date(eventDate).toISOString(),
        deadline: deadlineIso,
        status: 'open',
      });

      if (error) throw error;

      // Reset form
      setTitle('');
      setDescription('');
      setBudgetDisplay('');
      setPhotographersCount(1);
      setVideographersCount(1);
      setCompletionTime('');
      setEquipmentList([]);
      setSelectedWardName('');
      setAddressDetail('');
      setEventDate('');
      setNotice('Đã xuất bản dự án mới thành công!');
      await loadAdminData();
    } catch (err: any) {
      setNotice('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Đổi trạng thái dự án (Đóng thầu ngay / Mở lại / Hoàn thiện)
  const handleUpdateProjectStatus = async (projectId: string, newStatus: 'open' | 'closed' | 'completed') => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);

    if (!error) {
      await loadAdminData();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Xóa dự án này sẽ xóa toàn bộ hồ sơ đấu thầu liên quan. Bạn chắc chắn chứ?')) return;
    await supabase.from('projects').delete().eq('id', projectId);
    await loadAdminData();
  };

  // Chọn nhà thầu trúng thầu & tự động đóng/hoàn thiện dự án
  const handleSelectWinner = async (projectId: string, winningBidId: string) => {
    if (!confirm('Xác nhận chọn đơn vị này TRÚNG THẦU và chuyển dự án sang trạng thái Hoàn thiện đấu thầu?')) return;

    await Promise.all([
      supabase.from('bids').update({ status: 'accepted' }).eq('id', winningBidId),
      supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', winningBidId),
      supabase.from('projects').update({ status: 'completed' }).eq('id', projectId),
    ]);

    await loadAdminData();
  };

  if (checkingAuth) {
    return <div className="py-20 text-center text-slate-400">Đang xác thực quyền Quản trị...</div>;
  }

  const filteredProjects = projects.filter((p) => p.status === projectStatusTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">CRM Quản Trị DEZ EVENT</h1>
          <p className="text-sm text-slate-400">
            Đăng dự án, duyệt hồ sơ đấu thầu và quản lý mạng lưới đối tác Studio / Agency.
          </p>
        </div>

        <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setMainTab('projects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mainTab === 'projects' ? 'bg-white text-[#060b19]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FolderKanban className="w-4 h-4" /> Quản lý Dự án ({projects.length})
          </button>
          <button
            onClick={() => setMainTab('vendors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mainTab === 'vendors' ? 'bg-white text-[#060b19]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Đơn vị đăng ký ({vendors.length})
          </button>
        </div>
      </div>

      {/* TAB CHÍNH 1: QUẢN LÝ DỰ ÁN */}
      {mainTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Form đăng dự án mới */}
          <form
            onSubmit={handleCreateProject}
            className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" /> Đăng Dự Án Mới
            </h2>

            {notice && (
              <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs">
                {notice}
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-300 mb-1">Tên sự kiện *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Gala Dinner & Year End Party 2026..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Mô tả yêu cầu Media *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Yêu cầu quay highlight, chụp ảnh, bàn giao..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Ngân sách đề ra (VNĐ) *</label>
              <input
                type="text"
                required
                value={budgetDisplay}
                onChange={(e) => setBudgetDisplay(formatNumberInput(e.target.value))}
                placeholder="VD: 35.000.000"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-bold text-emerald-300"
              />
            </div>

            {/* Nhân sự Photographer & Videographer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Số Photographer</label>
                <input
                  type="number"
                  min={0}
                  value={photographersCount}
                  onChange={(e) => setPhotographersCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Số Videographer</label>
                <input
                  type="number"
                  min={0}
                  value={videographersCount}
                  onChange={(e) => setVideographersCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Thời gian hoàn thiện dự án</label>
              <input
                type="text"
                value={completionTime}
                onChange={(e) => setCompletionTime(e.target.value)}
                placeholder="VD: Trả 30 ảnh trong đêm, video recap sau 48h"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            {/* Danh sách thiết bị động */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-sky-400" /> Thiết bị yêu cầu
                </label>
                <button
                  type="button"
                  onClick={addEquipmentRow}
                  className="text-xs px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thiết bị
                </button>
              </div>

              {equipmentList.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateEquipmentRow(idx, 'name', e.target.value)}
                    placeholder="Tên thiết bị (VD: Flycam, Sony FX3...)"
                    className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateEquipmentRow(idx, 'quantity', Number(e.target.value))}
                    className="w-16 px-2.5 py-2 rounded-xl glass-input text-xs text-center"
                    title="Số lượng"
                  />
                  <button
                    type="button"
                    onClick={() => removeEquipmentRow(idx)}
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Địa chỉ tách 3 cấp Việt Nam mới nhất */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <label className="block text-xs font-semibold text-sky-300">
                Địa chỉ tổ chức (Địa giới hành chính VN mới nhất)
              </label>

              <select
                required
                value={selectedProvinceCode}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-[#0c1427]"
              >
                <option value="">-- Chọn Tỉnh / Thành phố --</option>
                {provinces.map((p) => (
                  <option key={p.province_code} value={p.province_code}>
                    {p.name}
                  </option>
                ))}
              </select>

              {wards.length > 0 ? (
                <select
                  value={selectedWardName}
                  onChange={(e) => setSelectedWardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm bg-[#0c1427]"
                >
                  <option value="">
                    {loadingWards ? 'Đang tải Xã/Phường...' : '-- Chọn Xã / Phường --'}
                  </option>
                  {wards.map((w) => (
                    <option key={w.ward_code} value={w.ward_name}>
                      {w.ward_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedWardName}
                  onChange={(e) => setSelectedWardName(e.target.value)}
                  placeholder={loadingWards ? 'Đang tải Xã/Phường...' : 'Xã / Phường / Quận Huyện'}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                />
              )}

              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Địa chỉ cụ thể (VD: Khách sạn JW Marriott, số 8 Đỗ Đức Dục)"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            {/* Thời gian sự kiện -> Tự động tính chốt trước 1 tuần */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="block text-xs text-slate-300">Thời gian diễn ra sự kiện *</label>
              <input
                type="datetime-local"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
              {calculatedDeadline && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                  Hạn chót nhận thầu (tự động trước 7 ngày):{' '}
                  <strong>{calculatedDeadline.toLocaleString('vi-VN')}</strong>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Xuất Bản Dự Án
            </button>
          </form>

          {/* Cột phải: Danh sách dự án chia theo 3 Tab trạng thái */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
              <button
                onClick={() => setProjectStatusTab('open')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  projectStatusTab === 'open'
                    ? 'bg-emerald-400 text-[#060b19]'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                Mở đấu thầu ({projects.filter((p) => p.status === 'open').length})
              </button>
              <button
                onClick={() => setProjectStatusTab('closed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  projectStatusTab === 'closed'
                    ? 'bg-rose-400 text-[#060b19]'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                Đóng thầu ({projects.filter((p) => p.status === 'closed').length})
              </button>
              <button
                onClick={() => setProjectStatusTab('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  projectStatusTab === 'completed'
                    ? 'bg-sky-400 text-[#060b19]'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                Hoàn thiện đấu thầu ({projects.filter((p) => p.status === 'completed').length})
              </button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="glass-panel rounded-2xl p-10 text-center text-sm text-slate-400">
                Không có dự án nào ở mục này.
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const projectBids = bidsByProject[proj.id] || [];
                const isExpanded = expandedProjectId === proj.id;

                return (
                  <div key={proj.id} className="glass-panel rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-base">{proj.title}</h3>
                        <p className="text-xs text-slate-400">
                          {proj.province || proj.location} • Ngân sách:{' '}
                          <strong className="text-white">{formatVND(proj.budget)}</strong> •{' '}
                          {proj.photographers_count ?? 0} Photo / {proj.videographers_count ?? 0} Video
                        </p>
                        <p className="text-xs text-sky-300">
                          Đã nhận: <strong>{projectBids.length} hồ sơ đấu thầu</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {proj.status === 'open' && (
                          <button
                            onClick={() => handleUpdateProjectStatus(proj.id, 'closed')}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" /> Đóng thầu ngay
                          </button>
                        )}

                        {proj.status === 'closed' && (
                          <>
                            <button
                              onClick={() => handleUpdateProjectStatus(proj.id, 'open')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30"
                            >
                              Mở lại
                            </button>
                            <button
                              onClick={() => handleUpdateProjectStatus(proj.id, 'completed')}
                              className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30"
                            >
                              Đánh dấu hoàn thiện
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/15 flex items-center gap-1"
                        >
                          Hồ sơ thầu ({projectBids.length})
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                          title="Xóa dự án"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Danh sách nhà thầu đã nộp giá cho dự án này */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        {projectBids.length === 0 ? (
                          <p className="text-xs text-slate-400">Chưa có nhà thầu nào nộp hồ sơ.</p>
                        ) : (
                          projectBids.map((bid) => (
                            <div
                              key={bid.id}
                              className={`p-4 rounded-xl border space-y-2 ${
                                bid.status === 'accepted'
                                  ? 'bg-emerald-500/10 border-emerald-500/40'
                                  : 'bg-black/25 border-white/10'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-white text-sm">
                                    {bid.profiles?.company_name || 'Đơn vị đối tác'}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    SĐT: {bid.profiles?.phone || '—'}
                                  </span>
                                </div>
                                <span className="text-sm font-extrabold text-emerald-300">
                                  {formatVND(bid.bid_amount)}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 whitespace-pre-line">
                                {bid.proposal_note}
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                <div className="flex gap-3 text-xs">
                                  {bid.drive_file_url && (
                                    <a
                                      href={bid.drive_file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-400 hover:underline flex items-center gap-1"
                                    >
                                      Xem hồ sơ / Drive <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  {bid.profiles?.portfolio_url && (
                                    <a
                                      href={bid.profiles.portfolio_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-300 hover:underline flex items-center gap-1"
                                    >
                                      Portfolio <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>

                                {bid.status === 'accepted' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" /> Đã chọn trúng thầu
                                  </span>
                                ) : bid.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                                    <XCircle className="w-4 h-4" /> Đã loại
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSelectWinner(proj.id, bid.id)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[#060b19] font-bold text-xs hover:bg-emerald-400 flex items-center gap-1"
                                  >
                                    <Award className="w-3.5 h-3.5" /> Chọn trúng thầu
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CHÍNH 2: QUẢN LÝ ĐƠN VỊ ĐĂNG KÝ ĐẤU THẦU */}
      {mainTab === 'vendors' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Tên Studio / Agency</th>
                  <th className="px-5 py-3.5">Số điện thoại</th>
                  <th className="px-5 py-3.5">Portfolio</th>
                  <th className="px-5 py-3.5 text-center">Đã dự thầu</th>
                  <th className="px-5 py-3.5 text-center">Trúng thầu</th>
                  <th className="px-5 py-3.5">Vai trò</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-4 font-semibold text-white">
                      {v.company_name || '(Chưa cập nhật)'}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-mono text-xs">
                      {v.phone || '—'}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {v.portfolio_url ? (
                        <a
                          href={v.portfolio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          Mở link <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Chưa có</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-white">{v.total_bids}</td>
                    <td className="px-5 py-4 text-center font-bold text-emerald-400">{v.won_bids}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          v.role === 'admin'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {v.role === 'admin' ? 'Admin' : 'Nhà thầu'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
