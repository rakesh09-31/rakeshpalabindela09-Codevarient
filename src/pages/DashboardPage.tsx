import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  Leaf,
  TreePine,
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Archive,
  TrendingUp,
  Merge,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus } from '../types';

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  active: <Leaf className="w-4 h-4 text-emerald-600" />,
  paused: <Clock className="w-4 h-4 text-amber-600" />,
  abandoned: <AlertTriangle className="w-4 h-4 text-rose-600" />,
  completed: <CheckCircle2 className="w-4 h-4 text-[#14382B]" />,
  archived: <Archive className="w-4 h-4 text-stone-500" />,
  revived: <Sprout className="w-4 h-4 text-teal-600" />,
};

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  paused: 'bg-amber-50 border-amber-300 text-amber-800',
  abandoned: 'bg-rose-50 border-rose-300 text-rose-700',
  completed: 'bg-emerald-100/60 border-emerald-300 text-[#14382B]',
  archived: 'bg-stone-100 border-stone-300 text-stone-600',
  revived: 'bg-purple-50 border-purple-300 text-purple-800',
};

const gardenStageIcon = (progress: number) => {
  if (progress >= 80) return <TreePine className="w-8 h-8" />;
  if (progress >= 40) return <Leaf className="w-8 h-8" />;
  return <Sprout className="w-8 h-8" />;
};

const gardenStageColor = (status: ProjectStatus, progress: number) => {
  if (status === 'completed') return 'text-[#14382B]';
  if (status === 'archived') return 'text-stone-400';
  if (status === 'abandoned') return 'text-rose-500';
  if (status === 'paused') return 'text-amber-500';
  if (progress >= 70) return 'text-[#14382B]';
  if (progress >= 30) return 'text-emerald-600';
  return 'text-emerald-400';
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 p-4 rounded-2xl border ${color} bg-white shadow-2xs`}
    >
      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/50">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'var(--font-display)' }}>
          {value}
        </p>
        <p className="text-xs font-medium text-stone-500">{label}</p>
      </div>
    </motion.div>
  );
}

function ProjectGardenCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8DE] p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-xl bg-[#FAF6EE] ${gardenStageColor(project.status, project.progress)}`}>
            {gardenStageIcon(project.progress)}
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              statusColors[project.status]
            }`}
          >
            {project.status}
          </span>
        </div>
        <h3 className="text-sm font-bold text-[#2D3436] mb-1 group-hover:text-[#14382B] transition-colors truncate">
          {project.title}
        </h3>
        <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
          {project.summary}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                project.progress >= 70
                  ? 'bg-[#14382B]'
                  : project.progress >= 30
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
          </div>
          <span className="text-[11px] font-bold text-stone-600">{project.progress}%</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {project.tags.slice(0, 2).map((tag: string) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { projects, reminders, userProfile } = useApp();
  const navigate = useNavigate();

  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === 'active' || p.status === 'revived').length,
    paused: projects.filter((p: Project) => p.status === 'paused').length,
    completed: projects.filter((p: Project) => p.status === 'completed').length,
    archived: projects.filter((p: Project) => p.status === 'archived').length,
    abandoned: projects.filter((p: Project) => p.status === 'abandoned').length,
  };

  const readyToRevive = projects.filter(
    (p: Project) => p.status === 'paused' || p.status === 'abandoned'
  );

  const withBlockers = projects.filter(
    (p: Project) => p.technicalBlockers.length > 0 && p.status !== 'completed' && p.status !== 'archived'
  );

  const upcomingReminders = reminders
    .filter((r) => r.status === 'upcoming' && r.enabled)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 3);

  const recentEvents = projects
    .flatMap((p: Project) =>
      p.timeline.map((e) => ({
        ...e,
        projectTitle: p.title,
        projectId: p.id,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = userProfile?.name?.split(' ')[0] || 'Creator';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[#2D3436]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {greeting()}, {firstName}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {readyToRevive.length > 0
              ? `You have ${readyToRevive.length} unfinished project${
                  readyToRevive.length !== 1 ? 's' : ''
                } ready for a second life.`
              : 'All your projects are currently in active stewardship!'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#14382B] text-white rounded-xl font-semibold hover:bg-[#1E503E] transition-colors shadow-sm self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </motion.button>
      </motion.div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Ideas"
          value={stats.total}
          icon={<Sprout className="w-5 h-5 text-[#14382B]" />}
          color="border-[#E2E8DE]"
        />
        <StatCard
          label="Growing (Active)"
          value={stats.active}
          icon={<Leaf className="w-5 h-5 text-emerald-600" />}
          color="border-emerald-200"
        />
        <StatCard
          label="Dormant (Paused)"
          value={stats.paused}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          color="border-amber-200"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="w-5 h-5 text-[#14382B]" />}
          color="border-emerald-200"
        />
        <StatCard
          label="Ready to Revive"
          value={readyToRevive.length}
          icon={<RotateCcw className="w-5 h-5 text-purple-600" />}
          color="border-purple-200"
        />
      </div>

      {/* Project Garden & Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Garden */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg font-bold text-[#2D3436]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Project Garden
              </h2>
              <p className="text-xs text-stone-500">
                Visualizing botanical progress stages: seedlings, sprouts, and mature canopies.
              </p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-emerald-700 hover:text-[#14382B] font-semibold flex items-center gap-1 transition-colors"
            >
              View All ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E2E8DE] p-12 text-center">
              <Sprout className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">Your garden is empty</h3>
              <p className="text-xs text-stone-500 mb-4">Plant your first idea to get started.</p>
              <button
                onClick={() => navigate('/projects/new')}
                className="px-4 py-2 bg-[#14382B] text-white rounded-xl text-xs font-semibold"
              >
                Plant Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.slice(0, 6).map((project: Project) => (
                <ProjectGardenCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Quick Actions, Revival Alerts, Reminders */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#E2E8DE] p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Creative Workspaces
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/revival-studio')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 transition-colors text-left group"
              >
                <Sparkles className="w-5 h-5 text-purple-700 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-purple-950 group-hover:text-purple-800">
                    AI Revival Studio
                  </p>
                  <p className="text-[11px] text-purple-700/80">Diagnostic guidance & roadmaps</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/fusion')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200 transition-colors text-left group"
              >
                <Merge className="w-5 h-5 text-sky-700 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-sky-950 group-hover:text-sky-800">
                    AI Project Fusion
                  </p>
                  <p className="text-[11px] text-sky-700/80">Combine compatible concepts</p>
                </div>
              </button>
            </div>
          </div>

          {/* Ready to Revive */}
          {readyToRevive.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8DE] p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                Recommended For Revival
              </h3>
              <div className="space-y-2">
                {readyToRevive.slice(0, 3).map((p: Project) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-2.5 rounded-xl hover:bg-stone-50 border border-stone-100 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-800 truncate block">
                        {p.title}
                      </span>
                      <span className="text-[10px] text-stone-500 truncate block">
                        {p.whyStopped || 'Awaiting unblocking'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {p.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers Alert */}
          {withBlockers.length > 0 && (
            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Unresolved Blockers ({withBlockers.length})
              </h3>
              <div className="space-y-2">
                {withBlockers.slice(0, 2).map((p: Project) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-stone-800 block">{p.title}</span>
                    <span className="text-[11px] text-rose-700 block mt-0.5 truncate">
                      • {p.technicalBlockers[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8DE] p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                Upcoming Reminders
              </h3>
              <div className="space-y-2">
                {upcomingReminders.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-stone-50/60 border border-stone-200/50 text-xs"
                  >
                    <span className="font-semibold text-stone-800 block truncate">{r.title}</span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(r.dateTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E2E8DE] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-bold text-[#2D3436]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Recent Garden Activity
            </h2>
            <span className="text-xs text-stone-500">Automatic timeline logging</span>
          </div>

          <div className="divide-y divide-stone-100">
            {recentEvents.map((event) => (
              <div key={event.id} className="py-3 flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-stone-800">{event.title}</span>
                  <span className="text-stone-500"> on </span>
                  <span
                    onClick={() => navigate(`/projects/${event.projectId}`)}
                    className="font-semibold text-[#14382B] hover:underline cursor-pointer"
                  >
                    {event.projectTitle}
                  </span>
                  {event.description && (
                    <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                      {event.description}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
