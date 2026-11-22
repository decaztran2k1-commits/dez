'use client';

import { useState, useMemo, useEffect } from 'react';
import { MapPin, Users, Calendar, Clock, Wallet, ArrowUpRight } from 'lucide-react';
import BidModal from './BidModal';

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  media_count: number;
  location: string;
  event_date: string;
  deadline: string;
  status: 'open' | 'closed' | 'completed';
}

function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft(`${d} ngày ${h} giờ ${m} phút`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [deadline]);

  return <span>{timeLeft}</span>;
}

export default function ProjectBoard({ initialProjects }: { initialProjects: Project[] }) {
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const locations = useMemo(() => {
    const unique = Array.from(new Set(initialProjects.map((p) => p.location)));
    return ['ALL', ...unique];
  }, [initialProjects]);

  const filteredProjects = useMemo(() => {
    if (selectedLocation === 'ALL') return initialProjects;
    return initialProjects.filter((p) => p.location === selectedLocation);
  }, [initialProjects, selectedLocation]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-400 mr-2 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> Khu vực:
        </span>
        {locations.map((loc) => (
          <button
            key={loc}
            onClick={() => setSelectedLocation(loc)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              selectedLocation === loc
                ? 'bg-white text-[#060b19]'
                : 'glass-card text-slate-300 hover:text-white'
            }`}
          >
            {loc === 'ALL' ? 'Tất cả địa điểm' : loc}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const isExpired = new Date(project.deadline).getTime() <= Date.now();
          const isOpen = project.status === 'open' && !isExpired;

          return (
            <div key={project.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {project.location}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      isOpen
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isOpen ? 'Đang mở thầu' : project.status === 'completed' ? 'Hoàn thành' : 'Đã đóng'}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white line-clamp-2">{project.title}</h2>
                <p className="text-sm text-slate-300 line-clamp-3">{project.description}</p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-white/10 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Wallet className="w-4 h-4" /> Ngân sách đề ra:
                  </span>
                  <span className="font-bold text-white">{formatMoney(project.budget)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-4 h-4" /> Nhân sự Media:
                  </span>
                  <span className="font-medium text-white">{project.media_count} người/máy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-4 h-4" /> Ngày sự kiện:
                  </span>
                  <span>{new Date(project.event_date).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-4 h-4" /> Thời gian còn:
                  </span>
                  <span className="text-sky-300 font-medium">
                    <Countdown deadline={project.deadline} />
                  </span>
                </div>
              </div>

              <button
                disabled={!isOpen}
                onClick={() => setActiveProject(project)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition ${
                  isOpen
                    ? 'bg-white text-[#060b19] hover:bg-slate-200'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isOpen ? (
                  <>
                    Tham gia đấu thầu <ArrowUpRight className="w-4 h-4" />
                  </>
                ) : (
                  'Ngừng nhận hồ sơ'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
          Hiện chưa có dự án nào tại khu vực này.
        </div>
      )}

      {activeProject && (
        <BidModal project={activeProject} onClose={() => setActiveProject(null)} />
      )}
    </div>
  );
}
