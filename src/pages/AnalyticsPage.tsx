import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Layers,
  Code2,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project } from '../types';
import { ProgressBar, Badge } from '../components/ui';

export function AnalyticsPage() {
  const { projects } = useApp();
  const navigate = useNavigate();

  // Metrics derived dynamically from state
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active' || p.status === 'revived').length;
    const paused = projects.filter((p) => p.status === 'paused').length;
    const abandoned = projects.filter((p) => p.status === 'abandoned').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const archived = projects.filter((p) => p.status === 'archived').length;

    const avgProgress = total > 0 ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / total) : 0;

    const totalTasks = projects.flatMap((p) => p.milestones.flatMap((m) => m.tasks)).length;
    const completedTasks = projects
      .flatMap((p) => p.milestones.flatMap((m) => m.tasks))
      .filter((t) => t.status === 'completed').length;

    const totalBlockers = projects.reduce((acc, p) => acc + p.technicalBlockers.length, 0);

    // Categories breakdown
    const catMap: Record<string, number> = {};
    projects.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });

    // Tech breakdown
    const techMap: Record<string, number> = {};
    projects.forEach((p) => {
      p.languages.concat(p.frameworks).forEach((t) => {
        techMap[t] = (techMap[t] || 0) + 1;
      });
    });

    const sortedTech = Object.entries(techMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Revival Readiness Leaderboard
    const readinessList = projects
      .map((p) => {
        let score = 50 + Math.round(p.progress * 0.3) - p.technicalBlockers.length * 15;
        score = Math.max(15, Math.min(95, score));
        return {
          project: p,
          score,
          recommendation:
            score >= 70
              ? 'Ready to revive via Continue'
              : p.technicalBlockers.length > 0
              ? 'Resolve single blocker to resume'
              : 'Consider AI Project Fusion',
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      total,
      active,
      paused,
      abandoned,
      completed,
      archived,
      avgProgress,
      totalTasks,
      completedTasks,
      totalBlockers,
      catMap,
      sortedTech,
      readinessList,
    };
  }, [projects]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-forest text-mint-light flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
            Digital Garden Analytics
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-charcoal-light mt-1">
          Real-time metrics calculated from your current project records, milestone completions, and blockers.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs">
          <span className="text-xs text-charcoal-light font-medium block mb-1">Average Garden Progress</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-forest" style={{ fontFamily: 'var(--font-display)' }}>
              {metrics.avgProgress}%
            </span>
            <span className="text-xs text-mint font-semibold">health score</span>
          </div>
          <ProgressBar value={metrics.avgProgress} size="sm" className="mt-3" colorByValue />
        </div>

        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs">
          <span className="text-xs text-charcoal-light font-medium block mb-1">Total Deliverables</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              {metrics.completedTasks}/{metrics.totalTasks}
            </span>
            <span className="text-xs text-charcoal-light">tasks closed</span>
          </div>
          <span className="text-[11px] text-charcoal-light block mt-3">
            Across {projects.length} recorded repositories
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs">
          <span className="text-xs text-charcoal-light font-medium block mb-1">Active / Revived Ideas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-mint" style={{ fontFamily: 'var(--font-display)' }}>
              {metrics.active}
            </span>
            <span className="text-xs text-charcoal-light">of {metrics.total} total</span>
          </div>
          <span className="text-[11px] text-charcoal-light block mt-3">
            {metrics.paused} paused, {metrics.completed} shipped
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs">
          <span className="text-xs text-charcoal-light font-medium block mb-1">Unresolved Blockers</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${metrics.totalBlockers > 0 ? 'text-rose' : 'text-forest'}`} style={{ fontFamily: 'var(--font-display)' }}>
              {metrics.totalBlockers}
            </span>
            <span className="text-xs text-rose font-medium">impediments</span>
          </div>
          <span className="text-[11px] text-charcoal-light block mt-3">
            Addressable via Revival Studio
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Bar chart */}
        <div className="bg-white rounded-3xl border border-gray-green-border/60 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Layers className="w-4 h-4 text-forest" /> Project Lifecycle Status Distribution
          </h2>
          <p className="text-xs text-charcoal-light">
            Visualizing the health and distribution of ideas in your digital garden.
          </p>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Active / Revived', count: metrics.active, color: 'bg-mint' },
              { label: 'Paused', count: metrics.paused, color: 'bg-amber' },
              { label: 'Abandoned', count: metrics.abandoned, color: 'bg-rose' },
              { label: 'Completed', count: metrics.completed, color: 'bg-forest' },
              { label: 'Archived', count: metrics.archived, color: 'bg-gray-400' },
            ].map((item) => {
              const pct = metrics.total > 0 ? Math.round((item.count / metrics.total) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-charcoal">{item.label}</span>
                    <span className="font-bold text-charcoal">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-ivory rounded-full overflow-hidden border border-gray-green-border/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technology Ecosystem */}
        <div className="bg-white rounded-3xl border border-gray-green-border/60 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Code2 className="w-4 h-4 text-purple-700" /> Technology Ecosystem Frequency
          </h2>
          <p className="text-xs text-charcoal-light">
            Most utilized languages and frameworks across your repositories.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {metrics.sortedTech.map(([tech, count]) => (
              <div
                key={tech}
                className="p-3 rounded-xl bg-ivory border border-gray-green-border/50 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-charcoal">{tech}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white border font-semibold text-forest">
                  {count} project{count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-green-border/30">
            <span className="text-xs font-semibold text-charcoal-light block mb-2">Category Distribution:</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(metrics.catMap).map(([cat, count]) => (
                <span key={cat} className="text-[11px] px-2.5 py-1 rounded-lg bg-ivory-warm border border-gray-green-border text-charcoal">
                  {cat}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revival Readiness Leaderboard */}
      <div className="bg-white rounded-3xl border border-gray-green-border/60 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Zap className="w-5 h-5 text-forest" /> Revival Readiness Leaderboard
            </h2>
            <p className="text-xs text-charcoal-light">
              Transparent assessment score ranking which projects are quickest to resurrect based on completeness and blocker density.
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-green-border/30">
          {metrics.readinessList.map(({ project, score, recommendation }, idx) => (
            <div
              key={project.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-charcoal-light text-center">
                  #{idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="text-sm font-bold text-charcoal group-hover:text-forest transition-colors cursor-pointer"
                    >
                      {project.title}
                    </h3>
                    <Badge variant="tech" size="sm">
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-charcoal-light mt-0.5">{recommendation}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="text-right">
                  <span className="text-xs font-bold text-forest block">{score}/100</span>
                  <span className="text-[10px] text-charcoal-light">readiness score</span>
                </div>

                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-green-border text-xs text-charcoal hover:bg-ivory-warm"
                >
                  View <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
