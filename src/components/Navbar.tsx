'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, User, ShoppingBag } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(0);
  const supabase = createClient();
  const router = useRouter();

  const loadUserAndCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase
          .from('saved_projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);
      setRole(profile?.role ?? 'vendor');
      setSavedCount(count ?? 0);
    } else {
      setRole(null);
      setSavedCount(0);
    }
  };

  useEffect(() => {
    loadUserAndCart();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUserAndCart();
    });

    const handleCartUpdate = () => loadUserAndCart();
    window.addEventListener('dez-cart-updated', handleCartUpdate);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener('dez-cart-updated', handleCartUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setSavedCount(0);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white text-[#060b19] font-black flex items-center justify-center text-sm tracking-tighter">
            DEZ
          </div>
          <span className="font-bold text-lg tracking-wide text-white">
            DEZ EVENT <span className="text-xs font-normal text-slate-400 hidden sm:inline">| Cổng Đấu Thầu Media</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 text-sm font-medium hover:bg-sky-500/30 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">CRM Quản Trị</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/profile?tab=saved"
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-sm text-white transition"
                title="Giỏ dự án đã lưu"
              >
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span className="hidden lg:inline">Giỏ dự án</span>
                {savedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#060b19]">
                    {savedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-sm text-white transition"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline max-w-[150px] truncate">{user.email}</span>
                <span className="md:hidden">Quản lý</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 hover:bg-rose-500/20 transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg bg-white text-[#060b19] font-semibold text-sm hover:bg-slate-200 transition"
            >
              Đăng nhập / Đăng ký
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
