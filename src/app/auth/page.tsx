'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Check, X, ShieldCheck, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'register_otp' | 'forgot' | 'forgot_otp' | 'reset_password' | 'mfa';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Quên mật khẩu & OTP
  const [recoveryMethod, setRecoveryMethod] = useState<'phone' | 'email'>('phone');
  const [otpCode, setOtpCode] = useState('');

  // 2FA MFA khi đăng nhập
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();
  const router = useRouter();

  // Chuẩn hóa SĐT Việt Nam sang định dạng E.164 (+84...) cho Supabase SMS OTP
  const formatVNPhone = (raw: string) => {
    const cleaned = raw.trim().replace(/\s+/g, '');
    if (cleaned.startsWith('0')) return '+84' + cleaned.slice(1);
    if (!cleaned.startsWith('+')) return '+84' + cleaned;
    return cleaned;
  };

  // Kiểm tra điều kiện mật khẩu mạnh (không dấu)
  const passwordRules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/~`+=;']/.test(password),
    noAccents: /^[\x21-\x7E]*$/.test(password) && password.length > 0,
  };

  const isPasswordValid =
    passwordRules.minLength &&
    passwordRules.hasUpper &&
    passwordRules.hasLower &&
    passwordRules.hasSpecial &&
    passwordRules.noAccents;

  const isConfirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const checkDuplicatePhone = async (phoneValue: string) => {
    const cleaned = phoneValue.trim();
    if (!cleaned) {
      setPhoneError('');
      return false;
    }
    setCheckingPhone(true);
    const { data, error } = await supabase.rpc('check_phone_exists', { p_phone: cleaned });
    setCheckingPhone(false);

    if (!error && data === true) {
      setPhoneError('Số điện thoại này đã được đăng ký bởi tài khoản khác.');
      return true;
    }
    setPhoneError('');
    return false;
  };

  const resetAlerts = () => {
    setMessage('');
    setErrorMsg('');
  };

  // 1. Xử lý Đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Kiểm tra 2FA
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp.find((f) => f.status === 'verified');
        if (totp) {
          setMfaFactorId(totp.id);
          setMode('mfa');
          setLoading(false);
          return;
        }
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Xác thực mã 2FA
  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });
    if (error) {
      setErrorMsg('Mã 2FA không chính xác hoặc đã hết hạn.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  };

  // 3. Xử lý Đăng ký (mặc định gửi OTP qua SĐT)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();

    try {
      if (!isPasswordValid) throw new Error('Mật khẩu chưa đạt đủ điều kiện bảo mật.');
      if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');

      const isDup = await checkDuplicatePhone(phone);
      if (isDup) {
        setLoading(false);
        return;
      }

      const formattedPhone = formatVNPhone(phone);
      const { error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password,
        options: {
          data: {
            company_name: companyName.trim(),
            phone: phone.trim(),
            email: email.trim(),
          },
        },
      });
      if (error) throw error;

      setMessage(`Mã OTP 6 số đã được gửi tới SĐT ${formattedPhone}.`);
      setMode('register_otp');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Xác nhận OTP đăng ký SĐT
  const handleVerifyRegisterOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();
    try {
      const formattedPhone = formatVNPhone(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode.trim(),
        type: 'sms',
      });
      if (error) throw error;

      // Gắn thêm Email vào tài khoản sau khi xác thực SĐT
      if (email.trim()) {
        await supabase.auth.updateUser({ email: email.trim() });
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Gửi OTP Quên mật khẩu (SĐT hoặc Email)
  const handleForgotSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();

    try {
      if (recoveryMethod === 'phone') {
        const formattedPhone = formatVNPhone(phone);
        const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
        if (error) throw error;
        setMessage(`Đã gửi mã OTP khôi phục tới SĐT ${formattedPhone}.`);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setMessage(`Đã gửi mã OTP khôi phục tới Email ${email.trim()}.`);
      }
      setMode('forgot_otp');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Xác nhận OTP Quên mật khẩu
  const handleVerifyForgotOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();

    try {
      if (recoveryMethod === 'phone') {
        const { error } = await supabase.auth.verifyOtp({
          phone: formatVNPhone(phone),
          token: otpCode.trim(),
          type: 'sms',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'recovery',
        });
        if (error) throw error;
      }
      setPassword('');
      setConfirmPassword('');
      setMode('reset_password');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 7. Đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetAlerts();
    try {
      if (!isPasswordValid) throw new Error('Mật khẩu mới chưa đạt đủ điều kiện bảo mật.');
      if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const RuleItem = ({ ok, text }: { ok: boolean; text: string }) => (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-400' : 'text-slate-400'}`}>
      {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
      <span>{text}</span>
    </li>
  );

  return (
    <div className="max-w-md mx-auto mt-8 glass-panel rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">
          {mode === 'login' && 'Đăng Nhập Hệ Thống'}
          {mode === 'register' && 'Đăng Ký Nhà Thầu Media'}
          {mode === 'register_otp' && 'Xác Thực OTP Số Điện Thoại'}
          {mode === 'forgot' && 'Quên Mật Khẩu'}
          {mode === 'forgot_otp' && 'Nhập Mã OTP Khôi Phục'}
          {mode === 'reset_password' && 'Đặt Mật Khẩu Mới'}
          {mode === 'mfa' && 'Xác Thực 2 Lớp (2FA)'}
        </h1>
        <p className="text-sm text-slate-400">
          Cổng đối tác DEZ EVENT
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-sm">
          {message}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm">
          {errorMsg}
        </div>
      )}

      {/* FORM ĐĂNG NHẬP */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="studio@email.com"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-slate-300">Mật khẩu *</label>
              <button
                type="button"
                onClick={() => { resetAlerts(); setMode('forgot'); }}
                className="text-xs text-sky-400 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Đăng nhập
          </button>
        </form>
      )}

      {/* FORM ĐĂNG KÝ */}
      {mode === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Tên Studio / Agency *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="VD: Lightbox Media Studio"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Số điện thoại (Nhận OTP) *</label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                onBlur={(e) => checkDuplicatePhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className={`w-full px-4 py-2.5 rounded-xl text-sm transition focus:outline-none ${
                  phoneError
                    ? 'bg-rose-500/10 border border-rose-500 text-rose-100'
                    : 'glass-input'
                }`}
              />
              {checkingPhone && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3.5 top-3" />
              )}
            </div>
            {phoneError && <p className="text-xs text-rose-400 mt-1">{phoneError}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="studio@email.com"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Mật khẩu *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, không dấu"
                className={`w-full pl-4 pr-11 py-2.5 rounded-xl text-sm transition focus:outline-none ${
                  password.length > 0 && !isPasswordValid
                    ? 'bg-rose-500/10 border border-rose-500 text-rose-100'
                    : 'glass-input'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <ul className="mt-2 space-y-1 bg-white/5 rounded-xl p-3 border border-white/10">
              <RuleItem ok={passwordRules.minLength} text="Từ 8 ký tự trở lên" />
              <RuleItem ok={passwordRules.hasUpper} text="Ít nhất 1 chữ in hoa (A-Z)" />
              <RuleItem ok={passwordRules.hasLower} text="Ít nhất 1 chữ thường (a-z)" />
              <RuleItem ok={passwordRules.hasSpecial} text="Ít nhất 1 ký tự đặc biệt (!@#$...)" />
              <RuleItem ok={passwordRules.noAccents} text="Không dấu tiếng Việt & khoảng trắng" />
            </ul>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Xác nhận mật khẩu *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className={`w-full pl-4 pr-11 py-2.5 rounded-xl text-sm transition focus:outline-none ${
                  isConfirmMismatch
                    ? 'bg-rose-500/10 border border-rose-500 text-rose-100'
                    : 'glass-input'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isConfirmMismatch && (
              <p className="text-xs text-rose-400 mt-1">Mật khẩu xác nhận không khớp.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !!phoneError || !isPasswordValid || password !== confirmPassword}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Gửi mã OTP xác thực SĐT
          </button>
        </form>
      )}

      {/* NHẬP OTP ĐĂNG KÝ */}
      {mode === 'register_otp' && (
        <form onSubmit={handleVerifyRegisterOTP} className="space-y-4">
          <input
            type="text"
            required
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Nhập 6 số OTP"
            className="w-full px-4 py-3 rounded-xl glass-input text-center tracking-widest font-mono text-lg"
          />
          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Hoàn tất đăng ký'}
          </button>
        </form>
      )}

      {/* QUÊN MẬT KHẨU (CHỌN SĐT HOẶC EMAIL) */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgotSendOTP} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setRecoveryMethod('phone')}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                recoveryMethod === 'phone' ? 'bg-white text-[#060b19]' : 'text-slate-300'
              }`}
            >
              Qua Số điện thoại
            </button>
            <button
              type="button"
              onClick={() => setRecoveryMethod('email')}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                recoveryMethod === 'email' ? 'bg-white text-[#060b19]' : 'text-slate-300'
              }`}
            >
              Qua Email
            </button>
          </div>

          {recoveryMethod === 'phone' ? (
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Số điện thoại đã đăng ký *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Email đã đăng ký *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="studio@email.com"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200"
          >
            {loading ? 'Đang gửi OTP...' : 'Nhận mã OTP khôi phục'}
          </button>
        </form>
      )}

      {/* NHẬP OTP QUÊN MẬT KHẨU */}
      {mode === 'forgot_otp' && (
        <form onSubmit={handleVerifyForgotOTP} className="space-y-4">
          <input
            type="text"
            required
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Nhập 6 số OTP"
            className="w-full px-4 py-3 rounded-xl glass-input text-center tracking-widest font-mono text-lg"
          />
          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? 'Đang kiểm tra...' : 'Xác nhận OTP'}
          </button>
        </form>
      )}

      {/* ĐẶT MẬT KHẨU MỚI */}
      {mode === 'reset_password' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Mật khẩu mới *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <ul className="mt-2 space-y-1 bg-white/5 rounded-xl p-3 border border-white/10">
              <RuleItem ok={passwordRules.minLength} text="Từ 8 ký tự trở lên" />
              <RuleItem ok={passwordRules.hasUpper} text="Ít nhất 1 chữ in hoa" />
              <RuleItem ok={passwordRules.hasLower} text="Ít nhất 1 chữ thường" />
              <RuleItem ok={passwordRules.hasSpecial} text="Ít nhất 1 ký tự đặc biệt" />
              <RuleItem ok={passwordRules.noAccents} text="Không dấu & khoảng trắng" />
            </ul>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Xác nhận mật khẩu mới *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !isPasswordValid || password !== confirmPassword}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            Lưu mật khẩu mới
          </button>
        </form>
      )}

      {/* XÁC THỰC 2FA KHI ĐĂNG NHẬP */}
      {mode === 'mfa' && (
        <form onSubmit={handleVerifyMFA} className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-sky-300 bg-sky-500/10 p-3 rounded-xl border border-sky-400/20">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Mở ứng dụng Google Authenticator và nhập mã 6 số để hoàn tất đăng nhập.</span>
          </div>
          <input
            type="text"
            required
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-xl glass-input text-center tracking-widest font-mono text-lg"
          />
          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Xác nhận 2FA'}
          </button>
        </form>
      )}

      {/* ĐIỀU HƯỚNG CHUYỂN TAB */}
      <div className="text-center text-sm text-slate-400 pt-2 border-t border-white/10">
        {mode === 'login' ? (
          <>
            Chưa có tài khoản Studio?{' '}
            <button
              onClick={() => { resetAlerts(); setMode('register'); }}
              className="text-white font-semibold underline underline-offset-4"
            >
              Đăng ký ngay
            </button>
          </>
        ) : (
          <button
            onClick={() => { resetAlerts(); setMode('login'); }}
            className="inline-flex items-center gap-1.5 text-white font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
          </button>
        )}
      </div>
    </div>
  );
}
