'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  LogOut,
  Loader2,
  CheckCircle2,
  UserCircle,
  ShoppingBag,
  Award,
  Gavel,
  Trash2,
  ArrowUpRight,
  MapPin,
  Calendar,
} from 'lucide-react';
import Security2FA from '@/components/Security2FA';

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

function ProfileContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get('tab') || 'saved';
  const [activeTab, setActiveTab] = useState<'saved' | 'bids' | 'won' | 'settings'>(
    (['saved', 'bids', 'won', 'settings'].includes(initialTab) ? initialTab : 'saved') as any
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);

  const [phoneError, setPhoneError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email || user.phone || '');

    const [{ data: profile }, { data: saved }, { data: bids }] = await Promise.all([
      supabase
        .from('profiles')
        .select('company_name, phone, portfolio_url')
        .eq('id', user.id)
        .single(),
      supabase
        .from('saved_projects')
        .select('id, project_id, created_at, projects(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('bids')
        .select('*, projects(*)')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (profile) {
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setOriginalPhone(profile.phone || '');
      setPortfolioUrl(profile.portfolio_url || '');
    }

    setSavedProjects((saved || []).filter((s: any) => s.projects));
    setMyBids(bids || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRemoveSaved = async (savedId: string) => {
    await supabase.from('saved_projects').delete().eq('id', savedId);
    setSavedProjects((prev) => prev.filter((item) => item.id !== savedId));
    window.dispatchEvent(new Event('dez-cart-updated'));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    setPhoneError('');

    const cleanedPhone = phone.trim();

    if (cleanedPhone && cleanedPhone !== originalPhone) {
      const { data: exists } = await supabase.rpc('check_phone_exists', {
        p_phone: cleanedPhone,
      });
      if (exists === true) {
        setPhoneError('Số điện thoại này đã được sử dụng bởi tài khoản khác.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyName.trim(),
        phone: cleanedPhone,
        portfolio_url: portfolioUrl.trim(),
      })
      .eq('id', userId);

    if (error) {
      setErrorMsg('Lỗi cập nhật: ' + error.message);
    } else {
      setOriginalPhone(cleanedPhone);
      setSuccessMsg('Đã lưu thông tin hồ sơ thành công!');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Đang tải dữ liệu quản lý...</div>;
  }

  const wonBids = myBids.filter((b) => b.status === 'accepted');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCircle className="w-10 h-10 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Quản Lý Đối Tác &amp; Dự Án</h1>
            <p className="text-sm text-slate-400">
              {companyName || 'Studio / Agency'} • {userEmail}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-sm font-medium hover:bg-rose-500/25 transition"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      {/* Thanh Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'saved' ? 'bg-white text-[#060b19]' : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Giỏ dự án ({savedProjects.length})
        </button>

        <button
          onClick={() => setActiveTab('won')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'won' ? 'bg-emerald-400 text-[#060b19]' : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Award className="w-4 h-4" /> Dự án đã trúng ({wonBids.length})
        </button>

        <button
          onClick={() => setActiveTab('bids')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'bids' ? 'bg-white text-[#060b19]' : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Gavel className="w-4 h-4" /> Đã đấu thầu ({myBids.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'settings' ? 'bg-white text-[#060b19]' : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <UserCircle className="w-4 h-4" /> Hồ sơ &amp; 2FA
        </button>
      </div>

      {/* TAB 1: GIỎ DỰ ÁN */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedProjects.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
              <p className="text-slate-400 text-sm">
                Giỏ dự án của bạn đang trống. Hãy thêm các dự án quan tâm ở trang chủ để tiện theo dõi và nộp thầu.
              </p>
              <Link
                href="/"
                className="inline-block px-5 py-2.5 rounded-xl bg-white text-[#060b19] font-semibold text-sm"
              >
                Khám phá dự án ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedProjects.map((item) => {
                const proj = item.projects;
                return (
                  <div
                    key={item.id}
                    className="glass-panel rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-sky-400" />
                          {proj.province || proj.location}
                        </span>
                        <button
                          onClick={() => handleRemoveSaved(item.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                          title="Xóa khỏi giỏ dự án"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-white text-base">{proj.title}</h3>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                        <span>Ngân sách: <strong className="text-white">{formatVND(proj.budget)}</strong></span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(proj.event_date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/projects/${proj.id}`}
                      className="w-full py-2.5 rounded-xl bg-white text-[#060b19] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200"
                    >
                      Xem chi tiết &amp; Đấu thầu <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DỰ ÁN ĐÃ TRÚNG */}
      {activeTab === 'won' && (
        <div className="space-y-4">
          {wonBids.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center text-slate-400 text-sm">
              Bạn chưa có dự án nào trúng thầu.
            </div>
          ) : (
            wonBids.map((bid) => (
              <div
                key={bid.id}
                className="glass-panel rounded-2xl p-6 border border-emerald-500/30 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                    CHÚC MỪNG TRÚNG THẦU
                  </span>
                  <span className="text-sm font-bold text-white">
                    Giá trúng thầu: {formatVND(bid.bid_amount)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{bid.projects?.title}</h3>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    Địa điểm:{' '}
                    {[bid.projects?.address_detail, bid.projects?.ward, bid.projects?.province || bid.projects?.location]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p>
                    Ngày sự kiện:{' '}
                    {bid.projects?.event_date
                      ? new Date(bid.projects.event_date).toLocaleString('vi-VN')
                      : '—'}
                  </p>
                </div>
                <Link
                  href={`/projects/${bid.project_id}`}
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
                >
                  Xem lại yêu cầu dự án <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: TẤT CẢ DỰ ÁN ĐÃ ĐẤU THẦU */}
      {activeTab === 'bids' && (
        <div className="space-y-3">
          {myBids.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center text-slate-400 text-sm">
              Bạn chưa nộp hồ sơ đấu thầu cho dự án nào.
            </div>
          ) : (
            myBids.map((bid) => (
              <div
                key={bid.id}
                className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <Link
                    href={`/projects/${bid.project_id}`}
                    className="font-bold text-white hover:text-sky-300 transition"
                  >
                    {bid.projects?.title || 'Dự án'}
                  </Link>
                  <p className="text-xs text-slate-400">
                    Giá đã chào: <strong className="text-white">{formatVND(bid.bid_amount)}</strong> • Nộp lúc{' '}
                    {new Date(bid.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-semibold w-fit ${
                    bid.status === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : bid.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {bid.status === 'accepted'
                    ? 'Đã trúng thầu'
                    : bid.status === 'rejected'
                    ? 'Không trúng'
                    : 'Đang chờ duyệt'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: HỒ SƠ & BẢO MẬT 2FA */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfile} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="font-bold text-lg text-white">Thông tin Studio / Agency</h2>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Tên Studio / Agency *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Số điện thoại liên hệ *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm transition focus:outline-none ${
                    phoneError
                      ? 'bg-rose-500/10 border border-rose-500 text-rose-100'
                      : 'glass-input'
                  }`}
                />
                {phoneError && <p className="text-xs text-rose-400 mt-1">{phoneError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Link Portfolio / Website / Fanpage / Behance
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu thay đổi
              </button>
            </div>
          </form>

          <Security2FA />
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Đang tải...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
