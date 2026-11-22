'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Wallet,
  Users,
  Calendar,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  Check,
  Award,
  Lock,
  Gavel,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  location: string;
  province?: string;
  ward?: string;
  address_detail?: string;
  budget: number;
  media_slots?: number;
  photographers_count?: number;
  videographers_count?: number;
  completion_time?: string;
  event_date: string;
  deadline?: string;
  status: string;
}

interface Props {
  openProjects: Project[];
  completedProjects: Project[];
  bidCountMap: Record<string, number>;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

function getCountdownInfo(deadlineStr?: string, nowMs?: number) {
  if (!deadlineStr) return { text: 'Đang cập nhật', msLeft: Infinity, isUnderTwoHours: false, expired: false };
  const target = new Date(deadlineStr).getTime();
  const now = nowMs ?? Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { text: 'Đã hết hạn nhận thầu', msLeft: 0, isUnderTwoHours: true, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0 || days > 0) parts.push(`${hours} giờ`);
  parts.push(`${minutes} phút`);

  return {
    text: parts.join(' '),
    msLeft: diff,
    isUnderTwoHours: diff <= 2 * 60 * 60 * 1000,
    expired: false,
  };
}

export default function ProjectListClient({ openProjects, completedProjects, bidCountMap }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('saved_projects')
        .select('project_id')
        .eq('user_id', user.id);
      if (data) {
        setSavedIds(new Set(data.map((d: { project_id: string }) => d.project_id)));
      }
    };
    loadSaved();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    openProjects.forEach((p) => {
      const loc = p.province || p.location;
      if (loc) set.add(loc);
    });
    return Array.from(set);
  }, [openProjects]);

  const filteredProjects = useMemo(() => {
    if (selectedLocation === 'ALL') return openProjects;
    return openProjects.filter((p) => (p.province || p.location) === selectedLocation);
  }, [openProjects, selectedLocation]);

  const toggleSaveProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      router.push('/auth');
      return;
    }

    const next = new Set(savedIds);
    if (next.has(projectId)) {
      next.delete(projectId);
      setSavedIds(next);
      await supabase
        .from('saved_projects')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);
    } else {
      next.add(projectId);
      setSavedIds(next);
      await supabase
        .from('saved_projects')
        .insert({ user_id: userId, project_id: projectId });
    }
    window.dispatchEvent(new Event('dez-cart-updated'));
  };

  return (
    <div className="space-y-14">
      {/* Bộ lọc khu vực */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-sm text-slate-400 mr-1">
            <MapPin className="w-4 h-4 text-sky-400" /> Khu vực:
          </span>
          <button
            onClick={() => setSelectedLocation('ALL')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              selectedLocation === 'ALL'
                ? 'bg-white text-[#060b19]'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Tất cả địa điểm ({openProjects.length})
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => setSelectedLocation(loc)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selectedLocation === loc
                  ? 'bg-white text-[#060b19]'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Danh sách dự án đang mở */}
        {filteredProjects.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
            Hiện chưa có dự án nào đang mở thầu tại khu vực này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const countdown = getCountdownInfo(project.deadline, nowMs);
              const bidCount = bidCountMap[project.id] ?? 0;
              const isSaved = savedIds.has(project.id);
              const photoCount = project.photographers_count ?? 0;
              const videoCount = project.videographers_count ?? 0;
              const hasSplitStaff = photoCount > 0 || videoCount > 0;

              return (
                <div
                  key={project.id}
                  className="glass-panel rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-sky-400/40 transition group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-xs font-medium text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {project.province || project.location}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                          Đang mở thầu
                        </span>
                        <button
                          onClick={(e) => toggleSaveProject(e, project.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            isSaved
                              ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                          title={isSaved ? 'Bỏ khỏi giỏ dự án' : 'Lưu vào giỏ dự án'}
                        >
                          {isSaved ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Link href={`/projects/${project.id}`} className="block space-y-2">
                      <h2 className="text-lg font-bold text-white group-hover:text-sky-300 transition line-clamp-2">
                        {project.title}
                      </h2>
                      <p className="text-sm text-slate-400 line-clamp-3">
                        {project.description || 'Bấm vào để xem chi tiết yêu cầu dự án và thiết bị.'}
                      </p>
                    </Link>

                    {/* Bộ đếm số lượng đã đấu thầu (ẩn khi còn <= 2 tiếng) */}
                    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        {countdown.isUnderTwoHours ? (
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Gavel className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        Số lượng đã đấu thầu:
                      </span>
                      {countdown.isUnderTwoHours ? (
                        <span className="text-amber-300 font-medium">Đã ẩn (2h cuối)</span>
                      ) : (
                        <span className="text-white font-bold">{bidCount} đơn vị</span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Wallet className="w-4 h-4" /> Ngân sách đề ra:
                        </span>
                        <span className="font-bold text-white">{formatVND(project.budget)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Users className="w-4 h-4" /> Nhân sự Media:
                        </span>
                        <span className="font-medium text-slate-200">
                          {hasSplitStaff
                            ? `${photoCount} Photo • ${videoCount} Video`
                            : `${project.media_slots || 1} người/máy`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" /> Ngày sự kiện:
                        </span>
                        <span className="text-slate-200">
                          {new Date(project.event_date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" /> Thời gian còn:
                        </span>
                        <span className={`font-semibold ${countdown.isUnderTwoHours ? 'text-amber-400' : 'text-sky-400'}`}>
                          {countdown.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/projects/${project.id}`}
                    className="w-full py-3 rounded-xl bg-white text-[#060b19] font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    Xem chi tiết &amp; Đấu thầu <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Khu vực công bố dự án đã trúng thầu (KHÔNG hiện tên đơn vị trúng) */}
      <section className="space-y-5 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <Award className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Công Bố Dự Án Đã Chốt Thầu</h2>
            <p className="text-xs text-slate-400">
              Danh sách các dự án đã lựa chọn được đơn vị thực hiện (thông tin đơn vị trúng thầu được bảo mật).
            </p>
          </div>
        </div>

        {completedProjects.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
            Chưa có dự án nào được công bố hoàn thiện đấu thầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedProjects.map((proj) => {
              const photoCount = proj.photographers_count ?? 0;
              const videoCount = proj.videographers_count ?? 0;
              return (
                <div
                  key={proj.id}
                  className="glass-panel rounded-2xl p-5 space-y-3 border border-emerald-500/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      {proj.province || proj.location}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      Đã có đơn vị trúng thầu
                    </span>
                  </div>

                  <h3 className="font-bold text-white line-clamp-2">{proj.title}</h3>

                  <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between">
                      <span>Ngân sách dự án:</span>
                      <span className="text-white font-semibold">{formatVND(proj.budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quy mô nhân sự:</span>
                      <span className="text-slate-200">
                        {photoCount > 0 || videoCount > 0
                          ? `${photoCount} Photo • ${videoCount} Video`
                          : `${proj.media_slots || 1} Media`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ngày sự kiện:</span>
                      <span className="text-slate-200">
                        {new Date(proj.event_date).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
