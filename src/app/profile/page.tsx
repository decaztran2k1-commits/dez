'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Save, LogOut, Loader2, CheckCircle2, UserCircle } from 'lucide-react';
import Security2FA from '@/components/Security2FA';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || user.phone || '');

      const { data } = await supabase
        .from('profiles')
        .select('company_name, phone, portfolio_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setCompanyName(data.company_name || '');
        setPhone(data.phone || '');
        setOriginalPhone(data.phone || '');
        setPortfolioUrl(data.portfolio_url || '');
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
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
    return <div className="text-center py-20 text-slate-400">Đang tải thông tin tài khoản...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCircle className="w-9 h-9 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Hồ Sơ Đối Tác & Bảo Mật</h1>
            <p className="text-sm text-slate-400">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-sm font-medium hover:bg-rose-500/25 transition"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất tài khoản
        </button>
      </div>

      <form onSubmit={handleSave} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
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
            Link Portfolio / Website / Fanpage / Behance (Bổ sung)
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
  );
}
