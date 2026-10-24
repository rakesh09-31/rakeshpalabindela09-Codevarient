import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  Search,
  Sparkles,
  Merge,
  LayoutGrid,
  List as ListIcon,
  Archive,
  ArrowUpRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Badge, ProgressBar, Button } from '../components/ui';

export function DashboardPage() {
  const { projects } = useApp();
  const navigate = useNavigate();

  // Search and filter state for archive gallery
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Derive categories from actual project records
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  // Derive metrics
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === 'active' || p.status === 'revived').length;
  const pausedCount = projects.filter((p) => p.status === 'paused').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const readyToReviveCount = projects.filter((p) => {
    const isPaused = p.status === 'paused' || p.status === 'abandoned';
    const score = 50 + Math.round(p.progress * 0.3) - p.technicalBlockers.length * 15;
    return isPaused && score >= 40;
  }).length;

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.languages.some((l) => l.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'revivable') {
          const isPaused = p.status === 'paused' || p.status === 'abandoned';
          if (!isPaused) return false;
        } else if (p.status !== selectedStatus) {
          return false;
        }
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [projects, searchQuery, selectedStatus, selectedCategory]);

  // Revival recommendations: 2–3 paused/abandoned projects with revival potential
  const revivalRecommendations = useMemo(() => {
    return projects
      .filter((p) => p.status === 'paused' || p.status === 'abandoned')
      .slice(0, 3);
  }, [projects]);

  // Unresolved blockers triage
  const blockedProjects = useMemo(() => {
    return projects
      .filter((p) => p.technicalBlockers && p.technicalBlockers.length > 0)
      .slice(0, 3);
  }, [projects]);

  // Recent activity feed derived from project updates and milestones
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; time: string; projectId: string }> = [];
    projects.forEach((p) => {
      if (p.timeline && p.timeline.length > 0) {
        const latest = p.timeline[p.timeline.length - 1];
        list.push({
          id: `${p.id}-${latest.id || Math.random()}`,
          title: latest.title || p.title,
          desc: latest.description || `Milestone reached in ${p.title}`,
          time: new Date(latest.timestamp || p.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          projectId: p.id,
        });
      } else {
        list.push({
          id: p.id,
          title: p.title,
          desc: `Updated archive state to ${p.status}`,
          time: new Date(p.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          projectId: p.id,
        });
      }
    });
    return list.slice(0, 4);
  }, [projects]);

  return (
    <div className="space-y-8 pb-16">
      {/* ================= 1. MODEST, ELEGANT WELCOME SECTION ================= */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 md:p-8 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-[var(--color-brand-contrast)] flex items-center justify-center shadow-2xs shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[var(--color-brand)] uppercase tracking-wider font-mono">
              Digital Idea Repository
            </span>
          </div>

          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text)] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Give your unfinished ideas another chance.
          </h1>

          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Preserve past work, diagnose technical blockers with AI, and resurrect viable concepts into complete projects.
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/projects/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            New Project
          </Button>
        </div>
      </section>

      {/* ================= 2. CLEAN PROJECT SUMMARY METRICS ================= */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total projects', value: totalCount, note: 'recorded concepts' },
          { label: 'Active', value: activeCount, note: 'in development' },
          { label: 'Paused', value: pausedCount, note: 'on hold' },
          { label: 'Completed', value: completedCount, note: 'shipped releases' },
          { label: 'Ready to revive', value: readyToReviveCount, note: 'high readiness' },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)] transition-colors"
          >
            <span className="text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium block mb-1">
              {m.label}
            </span>
            <div
              className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] font-display"
            >
              {m.value}
            </div>
            <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
              {m.note}
            </span>
          </div>
        ))}
      </section>

      {/* ================= 3. MAIN PROJECT COLLECTION ================= */}
      <section className="space-y-5">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <h2
              className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project collection
            </h2>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">
              ({filteredProjects.length})
            </span>
            <Link
              to="/projects"
              className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1 ml-2"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive…"
                className="w-full h-[38px] pl-9 pr-3 text-xs sm:text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20"
              />
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-[38px] px-3 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter Tabs */}
            <div className="inline-flex h-[38px] items-center rounded-[var(--radius-md)] p-1 border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'paused', label: 'Paused' },
                { id: 'completed', label: 'Completed' },
                { id: 'revivable', label: 'Revivable' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`h-[30px] px-3 rounded-[var(--radius-sm)] text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatus === tab.id
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="hidden sm:inline-flex h-[38px] items-center rounded-[var(--radius-md)] p-1 border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-[30px] h-[30px] flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="Grid layout"
                aria-label="Grid layout"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-[30px] h-[30px] flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="List layout"
                aria-label="List layout"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Content */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 space-y-3">
            <Archive className="w-10 h-10 mx-auto text-[var(--color-text-muted)]" />
            <h3 className="text-base font-bold text-[var(--color-text)]">
              No matching projects found
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
              No projects match the current search or filters. Try adjusting your query or create a new project.
            </p>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedCategory('all');
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="card card-clickable min-h-[220px] flex flex-col justify-between select-none group"
              >
                <div className="space-y-3">
                  {/* Status & Domain header */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge status={project.status} size="sm" />
                    <span className="text-xs font-mono text-[var(--color-text-muted)] truncate">
                      {project.category || 'General'}
                    </span>
                  </div>

                  {/* Project Title */}
                  <h3
                    className="text-base md:text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight transition-colors line-clamp-1"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {project.title}
                  </h3>

                  {/* Short summary */}
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                    {project.summary}
                  </p>

                  {/* Tech stack tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.languages.concat(project.frameworks).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]"
                      >
                        {t}
                      </span>
                    ))}
                    {project.languages.concat(project.frameworks).length > 3 && (
                      <span className="text-[11px] text-[var(--color-text-muted)] self-center font-mono">
                        +{project.languages.concat(project.frameworks).length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Progress + Action */}
                <div className="pt-4 mt-4 border-t border-[var(--color-border)] space-y-3">
                  <ProgressBar
                    value={project.progress}
                    size="xs"
                    showLabel
                    label="Progress"
                  />

                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1">
                    <span>
                      {project.milestones.length} milestone{project.milestones.length === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-brand)] group-hover:translate-x-0.5 transition-transform text-xs">
                      Open project <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List Mode */
          <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-card)]">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer group"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2.5">
                    <h3
                      className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight transition-colors"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {project.title}
                    </h3>
                    <Badge status={project.status} size="sm" />
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-1">
                    {project.summary}
                  </p>
                </div>

                <div className="flex items-center gap-6 self-start sm:self-center">
                  <div className="w-36 hidden md:block">
                    <ProgressBar value={project.progress} size="xs" showLabel />
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)] shrink-0">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= 4. SECONDARY REGION BELOW PROJECT COLLECTION ================= */}
      <section className="pt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section A: Revival Recommendations with Warm Accent highlights */}
          <div className="card flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3
                    className="text-base font-bold text-[var(--color-text)] tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Revival recommendations
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  Ready to revive
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Paused projects showing strong revival readiness and clear next steps.
              </p>

              <div className="space-y-2.5 pt-1">
                {revivalRecommendations.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-3 italic">
                    No paused projects currently eligible for revival.
                  </p>
                ) : (
                  revivalRecommendations.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="p-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-[var(--color-text)] block truncate group-hover:text-[var(--color-accent)] transition-colors">
                          {p.title}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                          {p.summary}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[var(--color-accent)] flex items-center gap-1">
                        Revive <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Need diagnostic guidance?</span>
              <button
                onClick={() => navigate('/revival-studio')}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Revival Studio <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section B: Unresolved Blockers */}
          <div className="card flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                  <h3
                    className="text-base font-bold text-[var(--color-text)] tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Unresolved blockers
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                  {blockedProjects.length} logged
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Technical roadblocks preventing forward momentum across projects.
              </p>

              <div className="space-y-2.5 pt-1">
                {blockedProjects.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-3 italic">
                    Zero technical blockers currently recorded.
                  </p>
                ) : (
                  blockedProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="p-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-strong)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--color-text)] block truncate">
                          {p.title}
                        </span>
                        <span className="text-[11px] text-[var(--color-warning)] font-medium">
                          Blocker
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-0.5 block">
                        {p.technicalBlockers[0]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Resolve roadblocks</span>
              <button
                onClick={() => navigate('/projects')}
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Inspect Blocked Projects <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section C: Recent Activity Feed */}
          <div className="card flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-brand)]" />
                <h3
                  className="text-base font-bold text-[var(--color-text)] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Recent activity
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                A quiet chronological feed of recent milestones, updates, and status changes.
              </p>

              <div className="space-y-3 pt-1">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => navigate(`/projects/${act.projectId}`)}
                    className="flex items-start gap-3 text-xs cursor-pointer group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition-colors truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {act.desc}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] font-mono shrink-0">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Activity timeline</span>
              <Link
                to="/analytics"
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1"
              >
                Analytics Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Section D: AI Tools Shortcuts */}
          <div className="card flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
                <h3
                  className="text-base font-bold text-[var(--color-text)] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  AI tools
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Project-aware intelligence tools to diagnose and combine unfinished concepts.
              </p>

              <div className="space-y-2.5 pt-1">
                {/* Shortcut 1 */}
                <div
                  onClick={() => navigate('/revival-studio')}
                  className="p-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-brand)]/50 transition-colors cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-brand)]">
                        Revival Studio
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        Blocker triage, modern stacks, and MVP roadmaps.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Shortcut 2 */}
                <div
                  onClick={() => navigate('/fusion')}
                  className="p-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-brand)]/50 transition-colors cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                      <Merge className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-brand)]">
                        Project Fusion
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        Synthesize two projects into one unified vision.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Autonomous synthesis</span>
              <span className="text-xs font-mono text-[var(--color-brand)] font-semibold">
                AI Ready
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
