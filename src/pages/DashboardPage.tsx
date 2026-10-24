import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  Edit2,
  Globe,
  Terminal,
  BookOpen,
  Layers,
  Cpu,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Badge, ProgressBar, Button } from '../components/ui';
import { Project } from '../types';

// ============================================================================
// Glossy Carousel Category Artwork Themes & Generative Cover Engine
// ============================================================================
const CATEGORY_THEMES: Record<
  string,
  {
    gradientLight: string;
    gradientDark: string;
    accentLight: string;
    accentDark: string;
    borderLight: string;
    borderDark: string;
    icon: typeof Globe;
    codeSnippet: string;
  }
> = {
  'Climate & Sustainability': {
    gradientLight: 'from-emerald-50 via-teal-50 to-stone-100',
    gradientDark: 'from-emerald-950/70 via-teal-950/40 to-stone-900',
    accentLight: 'text-emerald-700',
    accentDark: 'text-emerald-400',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-800/40',
    icon: Globe,
    codeSnippet: 'telemetry::geofence_offsets()',
  },
  'Developer Tools': {
    gradientLight: 'from-sky-50 via-indigo-50 to-stone-100',
    gradientDark: 'from-sky-950/70 via-indigo-950/40 to-stone-900',
    accentLight: 'text-indigo-700',
    accentDark: 'text-indigo-400',
    borderLight: 'border-indigo-200',
    borderDark: 'border-indigo-800/40',
    icon: Terminal,
    codeSnippet: 'git::diff_ast_symbols()',
  },
  'Education & Productivity': {
    gradientLight: 'from-amber-50 via-orange-50 to-stone-100',
    gradientDark: 'from-amber-950/70 via-orange-950/40 to-stone-900',
    accentLight: 'text-amber-800',
    accentDark: 'text-amber-400',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-800/40',
    icon: BookOpen,
    codeSnippet: 'session::pomodoro_sync()',
  },
  'Generative Audio & Media': {
    gradientLight: 'from-fuchsia-50 via-purple-50 to-stone-100',
    gradientDark: 'from-fuchsia-950/70 via-purple-950/40 to-stone-900',
    accentLight: 'text-fuchsia-700',
    accentDark: 'text-fuchsia-400',
    borderLight: 'border-fuchsia-200',
    borderDark: 'border-fuchsia-800/40',
    icon: Sparkles,
    codeSnippet: 'synth::web_audio_mesh()',
  },
  'Open Source & Infrastructure': {
    gradientLight: 'from-blue-50 via-slate-50 to-stone-100',
    gradientDark: 'from-blue-950/70 via-slate-950/40 to-stone-900',
    accentLight: 'text-blue-700',
    accentDark: 'text-blue-400',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-800/40',
    icon: Layers,
    codeSnippet: 'kernel::runtime_alloc()',
  },
  'Hardware & IoT': {
    gradientLight: 'from-cyan-50 via-zinc-50 to-stone-100',
    gradientDark: 'from-cyan-950/70 via-zinc-950/40 to-stone-900',
    accentLight: 'text-cyan-700',
    accentDark: 'text-cyan-400',
    borderLight: 'border-cyan-200',
    borderDark: 'border-cyan-800/40',
    icon: Cpu,
    codeSnippet: 'gpio::serial_packet()',
  },
};

function ProjectArtwork({
  project,
  onClick,
}: {
  project: Project;
  onClick?: () => void;
}) {
  const theme = CATEGORY_THEMES[project.category] || {
    gradientLight: 'from-stone-50 via-neutral-100 to-stone-100',
    gradientDark: 'from-neutral-900 via-stone-900 to-zinc-950',
    accentLight: 'text-stone-700',
    accentDark: 'text-stone-300',
    borderLight: 'border-stone-200',
    borderDark: 'border-stone-800',
    icon: Layers,
    codeSnippet: 'project::archive_entry()',
  };
  const Icon = theme.icon;

  if (project.attachments && project.attachments.length > 0 && project.attachments[0].url) {
    return (
      <div
        onClick={onClick}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 group cursor-pointer shadow-sm select-none"
      >
        <img
          src={project.attachments[0].url}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl md:rounded-3xl bg-gradient-to-br ${theme.gradientLight} dark:${theme.gradientDark} border ${theme.borderLight} dark:${theme.borderDark} p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-sm group cursor-pointer transition-all duration-300 hover:shadow-md select-none`}
    >
      {/* Glossy Diagonal Reflection Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 dark:via-white/10 to-transparent pointer-events-none" />

      {/* Decorative Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(currentColor 1px, transparent 1px), radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      />

      {/* Top Monograph Bar */}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#57534E] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md border border-black/5 dark:border-white/10">
          CASE #{project.id.toUpperCase()}
        </span>

        <span className="text-[11px] font-mono text-[#57534E] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md border border-black/5 dark:border-white/10 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{project.category}</span>
        </span>
      </div>

      {/* Centerpiece Vector Icon & Abstract Monogram */}
      <div className="relative z-10 my-auto text-center space-y-2 py-3">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/90 dark:bg-black/50 backdrop-blur-sm border border-black/5 dark:border-white/15 mx-auto flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300">
          <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.accentLight} dark:${theme.accentDark}`} />
        </div>
        <div className="font-mono text-[11px] text-[#57534E] dark:text-[#BDB5CC]">
          <code>{theme.codeSnippet}</code>
        </div>
      </div>

      {/* Bottom Technical Strip */}
      <div className="flex items-center justify-between relative z-10 pt-2 border-t border-black/5 dark:border-white/10 text-[10px] sm:text-[11px] font-mono text-[#57534E] dark:text-[#BDB5CC]">
        <span className="truncate max-w-[65%]">
          {project.languages.concat(project.frameworks).slice(0, 3).join(' • ') || 'Prototype'}
        </span>
        <span className="font-semibold uppercase tracking-wider">
          {project.status} • {project.progress}%
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { projects, updateProject } = useApp();
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid' | 'list'>('carousel');

  // Active slide index for carousel
  const [activeIndex, setActiveIndex] = useState(0);

  // Viewport resize tracking for precise peeking side margins
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Responsive slide layout metrics:
  // Desktop: 72% slide width, 2.5% gap => 14% side peek on left & right
  // Tablet:  84% slide width, 3% gap   => 8% side peek on left & right
  // Mobile:  100% slide width, 4% gap  => focused single slide, zero page overflow
  const slideWidthPct = windowWidth >= 1024 ? 72 : windowWidth >= 640 ? 84 : 100;
  const gapPct = windowWidth >= 1024 ? 2.5 : windowWidth >= 640 ? 3 : 4;
  const sideOffset = (100 - slideWidthPct) / 2;

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
          p.languages.some((l) => l.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q);
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

  // Safe slide index clamped to current filtered results
  const safeIndex = Math.min(activeIndex, Math.max(0, filteredProjects.length - 1));

  // Slide navigation callbacks
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(filteredProjects.length - 1, prev + 1));
  }, [filteredProjects.length]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    if (viewMode !== 'carousel') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, viewMode]);

  // Touch swipe support for mobile / tablet
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    if (diffX > 45) {
      handlePrev();
    } else if (diffX < -45) {
      handleNext();
    }
    touchStartX.current = null;
  };

  const formatPlantedDate = (isoString?: string) => {
    if (!isoString) return 'Preserved';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Preserved';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

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
          id: `${p.id}-${latest.id || 'milestone'}`,
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
            <div className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-[var(--color-brand-contrast)] flex items-center justify-center shadow-xs shrink-0">
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
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] font-display">
              {m.value}
            </div>
            <span className="text-xs text-[var(--color-text-muted)] mt-1 block font-mono">
              {m.note}
            </span>
          </div>
        ))}
      </section>

      {/* ================= 3. MAIN PROJECT COLLECTION & GLOSSY CAROUSEL ================= */}
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
              View full archive <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Search, Filters & View Mode */}
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
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex h-[38px] items-center rounded-[var(--radius-md)] p-1 border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
              <button
                onClick={() => setViewMode('carousel')}
                className={`h-[30px] px-2.5 flex items-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'carousel'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="Glossy Carousel Showcase"
                aria-label="Glossy carousel showcase"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Showcase</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`w-[30px] h-[30px] flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-xs'
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
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-xs'
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
        ) : viewMode === 'carousel' ? (
          /* ================= GLOSSY CAROUSEL SHOWCASE ================= */
          <div
            className="space-y-4"
            role="region"
            aria-roledescription="carousel"
            aria-label="Project showcase carousel"
          >
            {/* Carousel Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-2.5 py-0.5 rounded-md border border-[var(--color-border)]">
                  Featured Gallery
                </span>
                <span className="text-[var(--color-text-secondary)] font-semibold">
                  PROJECT{' '}
                  <strong className="text-[var(--color-text)] font-bold">
                    {safeIndex + 1 < 10 ? `0${safeIndex + 1}` : safeIndex + 1}
                  </strong>{' '}
                  / {filteredProjects.length < 10 ? `0${filteredProjects.length}` : filteredProjects.length}
                </span>
              </div>

              {/* Prev / Next & Indicators */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={filteredProjects.length <= 1 || safeIndex === 0}
                  className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                  title="Previous project [← Left Arrow]"
                  aria-label="Previous project slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dot Scrubber */}
                <div className="hidden sm:flex items-center gap-1.5 px-2">
                  {filteredProjects.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                        idx === safeIndex
                          ? 'w-6 bg-[var(--color-brand)]'
                          : 'w-2 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                      }`}
                      title={`Jump to ${p.title}`}
                      aria-label={`Jump to project slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={filteredProjects.length <= 1 || safeIndex === filteredProjects.length - 1}
                  className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                  title="Next project [→ Right Arrow]"
                  aria-label="Next project slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Glossy Carousel Stage */}
            <div
              className="relative w-full overflow-hidden py-3 select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Subtle edge atmospheric masks */}
              <div className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none bg-gradient-to-r from-[var(--color-page)] to-transparent opacity-60 hidden md:block" />
              <div className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none bg-gradient-to-l from-[var(--color-page)] to-transparent opacity-60 hidden md:block" />

              {/* Sliding Card Track */}
              <div
                className="flex items-center"
                style={{
                  transform: `translateX(calc(${sideOffset}% - ${safeIndex * (slideWidthPct + gapPct)}%))`,
                  transition: prefersReducedMotion
                    ? 'none'
                    : 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                  willChange: 'transform',
                }}
              >
                {filteredProjects.map((project, idx) => {
                  const isCurrent = idx === safeIndex;

                  return (
                    <div
                      key={project.id}
                      style={{
                        width: `${slideWidthPct}%`,
                        marginRight: `${gapPct}%`,
                        flexShrink: 0,
                      }}
                      className={`transition-all ${
                        prefersReducedMotion ? '' : 'duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
                      } ${
                        isCurrent
                          ? 'scale-100 opacity-100 z-10'
                          : 'scale-[0.93] opacity-45 hover:opacity-75 cursor-pointer z-0'
                      }`}
                      onClick={() => {
                        if (!isCurrent) setActiveIndex(idx);
                      }}
                      title={isCurrent ? undefined : `Switch to ${project.title}`}
                    >
                      {/* Glossy Card Container */}
                      <div
                        className={`relative rounded-3xl border transition-all duration-300 overflow-hidden ${
                          isCurrent
                            ? 'border-[#E8E2D6] dark:border-white/15 bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F5] to-[#F5F2ED] dark:from-[#241B33]/95 dark:via-[#1B1428]/95 dark:to-[#130E1F]/95 shadow-[0_20px_50px_-12px_rgba(28,25,23,0.12)] dark:shadow-[0_22px_60px_-15px_rgba(0,0,0,0.85)]'
                            : 'border-[#E8E2D6]/60 dark:border-white/10 bg-[#FFFDF9]/80 dark:bg-[#1C1528]/80 shadow-sm'
                        } p-6 sm:p-8 md:p-9`}
                      >
                        {/* Glossy Top Sheen Edge */}
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent pointer-events-none" />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                          {/* Left Column: Project Cover / Generative Artwork */}
                          <div className="lg:col-span-5 w-full">
                            <ProjectArtwork
                              project={project}
                              onClick={() => {
                                if (isCurrent) {
                                  navigate(`/projects/${project.id}`);
                                } else {
                                  setActiveIndex(idx);
                                }
                              }}
                            />
                          </div>

                          {/* Right Column: Project Narrative Dossier */}
                          <div className="lg:col-span-7 space-y-4">
                            {/* Metadata Strip */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge status={project.status} size="md" />
                                <Badge variant="tech" size="sm">
                                  {project.category}
                                </Badge>
                                <span className="text-xs text-[#57534E] dark:text-[#BDB5CC] flex items-center gap-1 font-mono">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Planted {formatPlantedDate(project.startDate)}
                                </span>
                              </div>

                              {/* Bookmark Toggle */}
                              {isCurrent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateProject(project.id, { bookmarked: !project.bookmarked });
                                  }}
                                  className="p-2 rounded-xl border border-[#E8E2D6] dark:border-white/10 bg-white dark:bg-black/30 hover:bg-[#F5F2ED] dark:hover:bg-black/50 text-[#57534E] dark:text-[#BDB5CC] hover:text-[#1C1917] dark:hover:text-[#F8F7FB] transition-colors cursor-pointer"
                                  title={project.bookmarked ? 'Remove bookmark' : 'Bookmark project'}
                                  aria-label="Bookmark project"
                                >
                                  {project.bookmarked ? (
                                    <BookmarkCheck className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]" />
                                  ) : (
                                    <Bookmark className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Title */}
                            <h3
                              onClick={(e) => {
                                if (isCurrent) {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}`);
                                }
                              }}
                              className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#1C1917] dark:text-[#F8F7FB] hover:text-[var(--color-brand)] transition-colors cursor-pointer leading-tight"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {project.title}
                            </h3>

                            {/* Summary */}
                            <p className="text-sm text-[#44403C] dark:text-[#E1DCE9] leading-relaxed line-clamp-3">
                              {project.summary}
                            </p>

                            {/* Tech Ecosystem */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#57534E] dark:text-[#BDB5CC]">
                                Tech Ecosystem
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {project.languages.concat(project.frameworks).slice(0, 4).map((tech) => (
                                  <Badge key={tech} variant="tech" size="sm">
                                    {tech}
                                  </Badge>
                                ))}
                                {project.tools.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="text-xs px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[#57534E] dark:text-[#BDB5CC] border border-black/5 dark:border-white/10 font-mono"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Progress Snapshot */}
                            <div className="space-y-1.5 pt-1.5 border-t border-[#E8E2D6] dark:border-white/10">
                              <div className="flex items-center justify-between text-xs font-mono text-[#57534E] dark:text-[#BDB5CC]">
                                <span>Weighted Progress</span>
                                <span className="font-bold text-[#1C1917] dark:text-[#F8F7FB]">
                                  {project.progress}%
                                </span>
                              </div>
                              <ProgressBar value={project.progress} size="xs" />
                              <div className="flex items-center gap-3 text-xs font-mono text-[#57534E] dark:text-[#BDB5CC] pt-0.5">
                                <span>{project.milestones.length} Milestones</span>
                                <span>•</span>
                                <span>
                                  {project.technicalBlockers.length === 0 ? (
                                    <span className="text-[var(--color-success)] inline-flex items-center gap-1 font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> 0 Blockers
                                    </span>
                                  ) : (
                                    <span className="text-[var(--color-warning)] inline-flex items-center gap-1 font-semibold">
                                      {project.technicalBlockers.length} Blockers
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Actions Bar */}
                            {isCurrent && (
                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}`);
                                  }}
                                  className="shadow-xs cursor-pointer"
                                >
                                  <span>Open Project Details</span>
                                  <ArrowRight className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/revival-studio?project=${project.id}`);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                                  <span>Revival Studio</span>
                                </Button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}/edit`);
                                  }}
                                  className="p-2 rounded-xl border border-[#E8E2D6] dark:border-white/10 bg-white dark:bg-black/30 hover:bg-[#F5F2ED] dark:hover:bg-black/50 text-[#57534E] dark:text-[#BDB5CC] hover:text-[#1C1917] dark:hover:text-[#F8F7FB] transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
                                  title="Edit metadata"
                                  aria-label="Edit project"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick-Jump Horizontal Strip */}
            {filteredProjects.length > 1 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--color-text-muted)] shrink-0 pr-1 flex items-center gap-1">
                    Jump to:
                  </span>
                  {filteredProjects.map((p, idx) => {
                    const isCurrent = idx === safeIndex;
                    const pTheme = CATEGORY_THEMES[p.category] || { icon: Layers };
                    const PIcon = pTheme.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-text)] font-bold shadow-xs'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]'
                        }`}
                        title={`Jump to ${p.title}`}
                      >
                        <PIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate max-w-[130px]">{p.title}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isCurrent ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-border-strong)]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= COMPACT GRID VIEW ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="card card-clickable min-h-[220px] flex flex-col justify-between select-none group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge status={project.status} size="sm" />
                    <span className="text-xs font-mono text-[var(--color-text-muted)] truncate">
                      {project.category || 'General'}
                    </span>
                  </div>

                  <h3
                    className="text-base md:text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight transition-colors line-clamp-1"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {project.title}
                  </h3>

                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                    {project.summary}
                  </p>

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
          /* ================= TABLE LIST VIEW ================= */
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
