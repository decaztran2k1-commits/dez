'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, ShieldAlert, Loader2, Trash2 } from 'lucide-react';

export default function Security2FA() {
  const supabase = createClient();
  const [factors, setFactors] = useState<any[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp || []);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleEnroll = async () => {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'DEZ EVENT Authenticator',
    });

    if (error) {
      setMessage(error.message);
    } else if (data) {
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    }
    setLoading(false);
  };

  const handleVerifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: verifyCode.trim(),
    });

    if (error) {
      setMessage('Mã xác thực không đúng hoặc đã hết hạn.');
    } else {
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode('');
      setMessage('Đã kích hoạt bảo mật 2 lớp (2FA) thành công!');
      await loadFactors();
    }
    setLoading(false);
  };

  const handleUnenroll = async (id: string) => {
    if (!confirm('Bạn có chắc muốn tắt bảo mật 2FA?')) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) setMessage(error.message);
    else {
      setMessage('Đã tắt 2FA.');
      await loadFactors();
    }
    setLoading(false);
  };

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {verifiedFactor ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-white">Bảo mật 2 lớp (2FA Authenticator)</h3>
            <p className="text-xs text-slate-400">
              {verifiedFactor
                ? 'Tài khoản đang được bảo vệ bằng Google Authenticator.'
                : 'Khuyên dùng để bảo vệ tài khoản Admin & Hồ sơ thầu.'}
            </p>
          </div>
        </div>

        {verifiedFactor ? (
          <button
            onClick={() => handleUnenroll(verifiedFactor.id)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs hover:bg-rose-500/30 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Tắt 2FA
          </button>
        ) : (
          !qrCode && (
            <button
              onClick={handleEnroll}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white text-[#060b19] font-semibold text-xs hover:bg-slate-200 transition shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thiết lập 2FA'}
            </button>
          )
        )}
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 text-xs">
          {message}
        </div>
      )}

      {qrCode && (
        <form onSubmit={handleVerifyEnroll} className="pt-4 border-t border-white/10 space-y-4">
          <p className="text-sm text-slate-300">
            1. Mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Authy</strong> và quét mã QR bên dưới:
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-xl w-fit">
              <img src={qrCode} alt="QR 2FA" className="w-40 h-40" />
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <p>Hoặc nhập thủ công mã bí mật (Secret Key):</p>
              <code className="block p-2.5 rounded-lg bg-black/40 text-sky-300 font-mono select-all break-all">
                {secret}
              </code>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-slate-300">
              2. Nhập mã 6 chữ số hiển thị trên ứng dụng để xác nhận:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="w-40 px-4 py-2.5 rounded-xl glass-input text-center tracking-widest font-mono text-base"
              />
              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                Xác nhận bật
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
