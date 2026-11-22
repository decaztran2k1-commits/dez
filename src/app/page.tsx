import { createClient } from '@/lib/supabase/server';
import ProjectBoard from '@/components/ProjectBoard';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-2xl p-6 sm:p-10 text-center space-y-3">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-200 border border-white/15">
          DEZ EVENT PARTNER NETWORK
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
          Danh Sách Dự Án Media Đang Mời Thầu
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base">
          Kết nối trực tiếp với các Studio, Agency và Ekip quay chụp sự kiện chuyên nghiệp trên toàn quốc. Minh bạch ngân sách, quy trình nhanh gọn.
        </p>
      </section>

      <ProjectBoard initialProjects={projects || []} />
    </div>
  );
}
