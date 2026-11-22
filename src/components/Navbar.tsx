'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, User } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(data?.role ?? 'vendor');
      } else {
        setRole(null);
      }
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getSession();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
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
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-sm text-white transition"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline max-w-[160px] truncate">{user.email || user.phone}</span>
                <span className="md:hidden">Hồ sơ</span>
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
