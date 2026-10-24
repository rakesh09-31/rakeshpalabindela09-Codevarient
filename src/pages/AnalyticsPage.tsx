import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Layers,
  Code2,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { ProgressBar, Badge, Button } from '../components/ui';

export function AnalyticsPage() {
  const { projects, theme } = useApp();
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

  const isDark = theme === 'dark';
  const axisTickColor = isDark ? '#BDB5CC' : '#594E6B';
  const tooltipBg = isDark ? '#211A2D' : '#FFFFFF';
  const tooltipBorder = isDark ? '#493B5B' : '#D8CFE6';
  const tooltipText = isDark ? '#F8F7FB' : '#1A1326';
  const primaryBarFill = isDark ? '#8B2FE8' : '#7A20D4';
  const secondaryBarFill = isDark ? '#C026D3' : '#A21CAF';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand)] text-[var(--color-text-on-brand)] flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[var(--color-text)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Digital Garden Analytics
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-text-body)] mt-1">
          Real-time metrics calculated from your current project records, milestone completions, and blockers.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] font-mono uppercase tracking-wider block mb-2">
            Average Progress
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold font-mono text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.avgProgress}%
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">garden mean</span>
          </div>
          <ProgressBar value={metrics.avgProgress} size="xs" className="mt-3.5" />
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] font-mono uppercase tracking-wider block mb-2">
            Total Deliverables
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold font-mono text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.completedTasks}/{metrics.totalTasks}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">tasks closed</span>
          </div>
          <span className="text-xs font-medium text-[var(--color-text-body)] block mt-3.5">
            Across {projects.length} recorded repositories
          </span>
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] font-mono uppercase tracking-wider block mb-2">
            Active / Revived Ideas
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold font-mono text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.active}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">of {metrics.total} total</span>
          </div>
          <span className="text-xs font-medium text-[var(--color-text-body)] block mt-3.5">
            {metrics.paused} paused, {metrics.completed} shipped
          </span>
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] font-mono uppercase tracking-wider block mb-2">
            Unresolved Blockers
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold font-mono text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {metrics.totalBlockers}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">impediments</span>
          </div>
          <span className="text-xs font-medium text-[var(--color-text-body)] block mt-3.5">
            Addressable via Revival Studio
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Bar chart */}
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 shadow-xs space-y-4">
          <h2
            className="text-base font-bold text-[var(--color-text)] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Layers className="w-4 h-4 text-[var(--color-brand)]" /> Project Lifecycle Status Distribution
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Visualizing the health and distribution of ideas in your digital garden.
          </p>

          <div className="space-y-3.5 pt-2">
            {[
              { label: 'Active / Revived', count: metrics.active, symbol: '●' },
              { label: 'Paused', count: metrics.paused, symbol: '❚❚' },
              { label: 'Abandoned', count: metrics.abandoned, symbol: '✕' },
              { label: 'Completed', count: metrics.completed, symbol: '✓' },
              { label: 'Archived', count: metrics.archived, symbol: '⚑' },
            ].map((item) => {
              const pct = metrics.total > 0 ? Math.round((item.count / metrics.total) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[var(--color-text-secondary)]">{item.symbol}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono font-bold text-[var(--color-text)]">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-surface-subtle)] rounded-full overflow-hidden border border-[var(--color-border)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technology Ecosystem */}
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 shadow-xs space-y-4">
          <h2
            className="text-base font-bold text-[var(--color-text)] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Code2 className="w-4 h-4 text-[var(--color-brand)]" /> Technology Ecosystem Frequency
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Most utilized languages and frameworks across your repositories.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {metrics.sortedTech.map(([tech, count]) => (
              <div
                key={tech}
                className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between"
              >
                <span className="text-xs font-bold text-[var(--color-text)] font-mono">{tech}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-[var(--color-text-body)] font-medium">
                  {count} repo{count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-2 font-mono uppercase tracking-wider">
              Category Distribution:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(metrics.catMap).map(([cat, count]) => (
                <span
                  key={cat}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]"
                >
                  {cat}: <strong className="text-[var(--color-text)] font-bold">{count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Project Health & Progress Comparison */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              className="text-base sm:text-lg font-bold text-[var(--color-text)] flex items-center gap-2 tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <TrendingUp className="w-5 h-5 text-[var(--color-brand)]" /> Code Progress vs. Revival Readiness
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Dual-metric visual comparison: Violet bar represents completed code deliverables, Magenta bar represents algorithmic revival readiness.
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projects.map((p) => {
                const readiness = Math.max(15, Math.min(95, 50 + Math.round(p.progress * 0.3) - p.technicalBlockers.length * 15));
                return {
                  name: p.title.length > 12 ? `${p.title.slice(0, 11)}…` : p.title,
                  progress: p.progress,
                  readiness,
                };
              })}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisTickColor }} />
              <YAxis tick={{ fontSize: 11, fill: axisTickColor }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderRadius: '12px',
                  border: `1px solid ${tooltipBorder}`,
                  color: tooltipText,
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="progress" fill={primaryBarFill} name="Code Progress %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="readiness" fill={secondaryBarFill} name="Readiness Score %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revival Readiness Leaderboard */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2 tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Zap className="w-5 h-5 text-[var(--color-brand)]" /> Revival Readiness Leaderboard
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Transparent assessment score ranking which projects are quickest to resurrect based on completeness and blocker density.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {metrics.readinessList.map(({ project, score, recommendation }, idx) => (
            <div
              key={project.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-mono font-bold text-[var(--color-text-secondary)] text-center">
                  #{idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-brand)] hover:underline transition-colors cursor-pointer"
                    >
                      {project.title}
                    </h3>
                    <Badge status={project.status as any} size="sm" />
                  </div>
                  <p className="text-xs text-[var(--color-text-body)] mt-0.5">{recommendation}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-[var(--color-text)] block">
                    {score}/100
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)] font-medium">readiness score</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  View <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
