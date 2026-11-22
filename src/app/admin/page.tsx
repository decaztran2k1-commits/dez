'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus, ExternalLink, Check, X as XIcon, Trash2 } from 'lucide-react';

export default function AdminCRMPage() {
  const supabase = createClient();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'bids'>('projects');

  const [form, setForm] = useState({
    title: '',
    description: '',
    budget: '',
    media_count: '2',
    location: 'Hà Nội',
    event_date: '',
    deadline: '',
  });

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }
    setAuthorized(true);

    const [projRes, bidsRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase
        .from('bids')
        .select('*, projects(title), profiles(company_name, phone)')
        .order('created_at', { ascending: false }),
    ]);

    setProjects(projRes.data || []);
    setBids(bidsRes.data || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').insert({
      title: form.title,
      description: form.description,
      budget: Number(form.budget),
      media_count: Number(form.media_count),
      location: form.location,
      event_date: new Date(form.event_date).toISOString(),
      deadline: new Date(form.deadline).toISOString(),
      status: 'open',
    });

    if (!error) {
      setForm({
        title: '',
        description: '',
        budget: '',
        media_count: '2',
        location: 'Hà Nội',
        event_date: '',
        deadline: '',
      });
      loadData();
    } else {
      alert('Lỗi tạo dự án: ' + error.message);
    }
  };

  const updateProjectStatus = async (id: string, status: string) => {
    await supabase.from('projects').update({ status }).eq('id', id);
    loadData();
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Xóa dự án này sẽ xóa toàn bộ hồ sơ thầu liên quan?')) return;
    await supabase.from('projects').delete().eq('id', id);
    loadData();
  };

  const updateBidStatus = async (id: string, status: string) => {
    await supabase.from('bids').update({ status }).eq('id', id);
    loadData();
  };

  if (!authorized) {
    return <div className="text-center py-20 text-slate-400">Đang xác thực quyền Admin DEZ EVENT...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Quản Lý Dự Án & Đấu Thầu</h1>
          <p className="text-sm text-slate-400">DEZ EVENT Internal Portal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'projects' ? 'bg-white text-[#060b19]' : 'glass-card text-slate-300'
            }`}
          >
            Quản lý Dự án ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'bids' ? 'bg-white text-[#060b19]' : 'glass-card text-slate-300'
            }`}
          >
            Hồ sơ Đấu thầu ({bids.length})
          </button>
        </div>
      </div>

      {activeTab === 'projects' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateProject} className="glass-panel rounded-2xl p-6 space-y-4 h-fit">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" /> Đăng Dự Án Mới
            </h2>
            <input
              required
              placeholder="Tên sự kiện (VD: Gala Dinner cuối năm...)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
            <textarea
              required
              rows={3}
              placeholder="Mô tả yêu cầu Media (quay highlight, chụp ảnh, trả file...)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                required
                placeholder="Ngân sách (VNĐ)"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
              <input
                type="number"
                required
                placeholder="SL Media"
                value={form.media_count}
                onChange={(e) => setForm({ ...form, media_count: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
            <input
              required
              placeholder="Địa điểm (VD: Hà Nội, TP.HCM, Đà Nẵng)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
            />
            <div>
              <label className="text-xs text-slate-400">Thời gian diễn ra sự kiện</label>
              <input
                type="datetime-local"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Hạn chót nhận thầu</label>
              <input
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm mt-1"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition"
            >
              Xuất Bản Dự Án
            </button>
          </form>

          <div className="lg:col-span-2 space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-white">{p.title}</h3>
                  <p className="text-xs text-slate-400">
                    {p.location} • Ngân sách: {Number(p.budget).toLocaleString('vi-VN')}đ • {p.media_count} Media
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <select
                    value={p.status}
                    onChange={(e) => updateProjectStatus(p.id, e.target.value)}
                    className="glass-input rounded-lg px-2.5 py-1.5 text-xs bg-[#060b19]"
                  >
                    <option value="open">Đang mở</option>
                    <option value="closed">Đóng thầu</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <div key={bid.id} className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="text-xs text-sky-400 font-semibold">{bid.projects?.title}</span>
                  <h3 className="text-lg font-bold text-white">
                    {bid.profiles?.company_name} <span className="text-sm font-normal text-slate-400">({bid.profiles?.phone})</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-400 mr-2">
                    {Number(bid.proposed_budget).toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    onClick={() => updateBidStatus(bid.id, 'won')}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-1 ${
                      bid.status === 'won'
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'border-white/15 text-slate-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Check className="w-4 h-4" /> Chọn thầu
                  </button>
                  <button
                    onClick={() => updateBidStatus(bid.id, 'rejected')}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-1 ${
                      bid.status === 'rejected'
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'border-white/15 text-slate-300 hover:bg-rose-500/20'
                    }`}
                  >
                    <XIcon className="w-4 h-4" /> Loại
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                <div>
                  <strong className="text-white block mb-1">Leader & Nhân sự ({bid.team_size} người):</strong>
                  <p>{bid.leader_info?.name} - {bid.leader_info?.phone}</p>
                  <p className="text-xs text-slate-400">{bid.leader_info?.experience}</p>
                </div>
                <div>
                  <strong className="text-white block mb-1">Thiết bị sử dụng:</strong>
                  <p className="whitespace-pre-line">{bid.equipment_list}</p>
                </div>
                <div>
                  <strong className="text-white block mb-1">Hồ sơ & Ghi chú:</strong>
                  {bid.portfolio_drive_url && (
                    <a
                      href={bid.portfolio_drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline mb-1"
                    >
                      Mở Portfolio trên Google Drive <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <p className="text-xs text-slate-400">{bid.notes || 'Không có ghi chú'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
