import { createClient } from '@/lib/supabase/server';
import ProjectListClient from '@/components/ProjectListClient';

export const revalidate = 30;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: openProjects }, { data: completedProjects }, { data: bidCounts }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('status', 'open')
        .order('deadline', { ascending: true }),
      supabase
        .from('projects')
        .select('id, title, location, province, event_date, budget, photographers_count, videographers_count, media_slots, status, created_at')
        .eq('status', 'completed')
        .order('event_date', { ascending: false })
        .limit(12),
      supabase.rpc('get_project_bid_counts'),
    ]);

  const bidCountMap: Record<string, number> = {};
  if (Array.isArray(bidCounts)) {
    bidCounts.forEach((row: { project_id: string; bid_count: number }) => {
      bidCountMap[row.project_id] = Number(row.bid_count) || 0;
    });
  }

  return (
    <div className="space-y-12">
      <section className="text-center max-w-3xl mx-auto space-y-3 pt-4">
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/25">
          Hệ thống Đấu thầu Sự kiện Minh bạch &amp; Bảo mật
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Cổng Đấu Thầu Media <span className="text-sky-400">DEZ EVENT</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Xem chi tiết yêu cầu thiết bị, nhân sự Photo/Video và gửi hồ sơ báo giá trực tiếp cho các dự án sự kiện trên toàn quốc.
        </p>
      </section>

      <ProjectListClient
        openProjects={openProjects || []}
        completedProjects={completedProjects || []}
        bidCountMap={bidCountMap}
      />
    </div>
  );
}
