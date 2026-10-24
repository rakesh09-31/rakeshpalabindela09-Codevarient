import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderOpen,
  Search,
  Filter,
  Plus,
  Sparkles,
  MoreVertical,
  ExternalLink,
  Edit2,
  Copy,
  Trash2,
  Archive,
  Bookmark,
  BookmarkCheck,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Globe,
  Terminal,
  BookOpen,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project } from '../types';
import { Badge, ProgressBar, ConfirmDialog, Button } from '../components/ui';

// Editorial aesthetic categories and motifs
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
    gradientDark: 'from-emerald-950/60 via-teal-950/30 to-stone-900',
    accentLight: 'text-emerald-700',
    accentDark: 'text-emerald-400',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-800/40',
    icon: Globe,
    codeSnippet: 'telemetry::geofence_offsets()',
  },
  'Developer Tools': {
    gradientLight: 'from-sky-50 via-indigo-50 to-stone-100',
    gradientDark: 'from-sky-950/60 via-indigo-950/30 to-stone-900',
    accentLight: 'text-indigo-700',
    accentDark: 'text-indigo-400',
    borderLight: 'border-indigo-200',
    borderDark: 'border-indigo-800/40',
    icon: Terminal,
    codeSnippet: 'git::diff_ast_symbols()',
  },
  'Education & Productivity': {
    gradientLight: 'from-amber-50 via-orange-50 to-stone-100',
    gradientDark: 'from-amber-950/60 via-orange-950/30 to-stone-900',
    accentLight: 'text-amber-800',
    accentDark: 'text-amber-400',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-800/40',
    icon: BookOpen,
    codeSnippet: 'session::pomodoro_sync()',
  },
  'Generative Audio & Media': {
    gradientLight: 'from-fuchsia-50 via-purple-50 to-stone-100',
    gradientDark: 'from-fuchsia-950/60 via-purple-950/30 to-stone-900',
    accentLight: 'text-fuchsia-700',
    accentDark: 'text-fuchsia-400',
    borderLight: 'border-fuchsia-200',
    borderDark: 'border-fuchsia-800/40',
    icon: Sparkles,
    codeSnippet: 'synth::web_audio_mesh()',
  },
  'Open Source & Infrastructure': {
    gradientLight: 'from-blue-50 via-slate-50 to-stone-100',
    gradientDark: 'from-blue-950/60 via-slate-950/30 to-stone-900',
    accentLight: 'text-blue-700',
    accentDark: 'text-blue-400',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-800/40',
    icon: Layers,
    codeSnippet: 'kernel::runtime_alloc()',
  },
  'Hardware & IoT': {
    gradientLight: 'from-cyan-50 via-zinc-50 to-stone-100',
    gradientDark: 'from-cyan-950/60 via-zinc-950/30 to-stone-900',
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
  size = 'large',
  onClick,
}: {
  project: Project;
  size?: 'large' | 'small';
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

  if (size === 'small') {
    return (
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${theme.gradientLight} dark:${theme.gradientDark} border ${theme.borderLight} dark:${theme.borderDark} flex flex-col items-center justify-center shrink-0 relative overflow-hidden shadow-xs`}
      >
        <Icon className={`w-5 h-5 ${theme.accentLight} dark:${theme.accentDark}`} />
        <span className="text-[10px] font-mono font-bold text-[#1A1326] dark:text-[#F8F7FB] mt-0.5 uppercase tracking-wider">
          {project.title.slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[16/11] sm:aspect-[16/10] lg:aspect-[4/3] rounded-2xl md:rounded-3xl bg-gradient-to-br ${theme.gradientLight} dark:${theme.gradientDark} border ${theme.borderLight} dark:${theme.borderDark} p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-sm group cursor-pointer transition-all duration-300 hover:shadow-md select-none`}
    >
      {/* Decorative Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(currentColor 1px, transparent 1px), radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      />

      {/* Top Monograph Bar */}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#594E6B] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md border border-black/5 dark:border-white/10">
          CASE #{project.id.toUpperCase()}
        </span>

        <span className="text-[11px] font-mono text-[#594E6B] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md border border-black/5 dark:border-white/10 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{project.category}</span>
        </span>
      </div>

      {/* Centerpiece Vector Icon & Abstract Monogram */}
      <div className="relative z-10 my-auto text-center space-y-2 py-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/90 dark:bg-black/50 backdrop-blur-sm border border-black/5 dark:border-white/15 mx-auto flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300">
          <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${theme.accentLight} dark:${theme.accentDark}`} />
        </div>
        <div className="font-mono text-xs text-[#594E6B] dark:text-[#BDB5CC]">
          <code>{theme.codeSnippet}</code>
        </div>
      </div>

      {/* Bottom Technical Strip */}
      <div className="flex items-center justify-between relative z-10 pt-2 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-[#594E6B] dark:text-[#BDB5CC]">
        <span className="truncate max-w-[65%]">
          {(project.languages || []).concat(project.frameworks || []).slice(0, 3).join(' • ') || 'Prototype'}
        </span>
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {project.status} • {project.progress}%
        </span>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const {
    projects,
    deleteProject,
    duplicateProject,
    changeProjectStatus,
    updateProject,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'created'>('recent');

  // Synchronize when searchParams changes (e.g. navigation from Dashboard metrics)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
    const searchParam = searchParams.get('search');
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Featured slide index
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Dialog & menu states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Derive categories and technologies from actual data
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  const technologies = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      (p.languages || []).forEach((l) => set.add(l));
      (p.frameworks || []).forEach((f) => set.add(f));
    });
    return Array.from(set);
  }, [projects]);

  // Filtered & sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (project.title || '').toLowerCase().includes(q);
          const matchSummary = (project.summary || '').toLowerCase().includes(q);
          const matchCategory = (project.category || '').toLowerCase().includes(q);
          const matchTech =
            (project.languages || []).some((l) => l.toLowerCase().includes(q)) ||
            (project.frameworks || []).some((f) => f.toLowerCase().includes(q));
          const matchTags = (project.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchCategory && !matchTech && !matchTags) {
            return false;
          }
        }
        // Status
        if (selectedStatus !== 'all') {
          if (selectedStatus === 'active') {
            if (project.status !== 'active' && project.status !== 'revived') {
              return false;
            }
          } else if (selectedStatus === 'revivable') {
            const isPaused = project.status === 'paused' || project.status === 'abandoned';
            const score = 50 + Math.round((project.progress || 0) * 0.3) - (project.technicalBlockers?.length || 0) * 15;
            if (!isPaused || score < 40) {
              return false;
            }
          } else if (project.status !== selectedStatus) {
            return false;
          }
        }
        // Category
        if (selectedCategory !== 'all' && project.category !== selectedCategory) {
          return false;
        }
        // Tech
        if (
          selectedTech !== 'all' &&
          !(project.languages || []).includes(selectedTech) &&
          !(project.frameworks || []).includes(selectedTech)
        ) {
          return false;
        }
        // Bookmarked
        if (bookmarkedOnly && !project.bookmarked) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'progress') return b.progress - a.progress;
        if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, searchQuery, selectedStatus, selectedCategory, selectedTech, bookmarkedOnly, sortBy]);

  // Safely derive featured project index within current filtered bounds
  const safeSlideIndex =
    filteredProjects.length === 0
      ? 0
      : Math.min(currentSlideIndex, filteredProjects.length - 1);
  const featuredProject = filteredProjects[safeSlideIndex] || null;

  // Slide navigation handlers
  const handlePrevSlide = useCallback(() => {
    if (filteredProjects.length <= 1) return;
    setCurrentSlideIndex((prev) => {
      const safe = Math.min(prev, filteredProjects.length - 1);
      return safe > 0 ? safe - 1 : filteredProjects.length - 1;
    });
  }, [filteredProjects.length]);

  const handleNextSlide = useCallback(() => {
    if (filteredProjects.length <= 1) return;
    setCurrentSlideIndex((prev) => {
      const safe = Math.min(prev, filteredProjects.length - 1);
      return safe < filteredProjects.length - 1 ? safe + 1 : 0;
    });
  }, [filteredProjects.length]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
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
        handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevSlide, handleNextSlide]);

  const hasActiveFilters =
    searchQuery ||
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    selectedTech !== 'all' ||
    bookmarkedOnly;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedTech('all');
    setBookmarkedOnly(false);
    navigate({ search: '' }, { replace: true });
  };

  const formatPlantedDate = (isoString?: string) => {
    if (!isoString) return 'Preserved';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Preserved';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Editorial Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-subtle)] px-2.5 py-0.5 rounded-md border border-[var(--color-border)]">
              Digital Artifact Archive
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Project Showcase & Archive
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mt-1 max-w-2xl leading-relaxed">
            Curated slide showcase and comprehensive inventory of preserved prototypes, experiments, and revival roadmaps.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/projects/new')}
          icon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto shadow-xs"
        >
          New Project
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archive by title, domain, technology stack, or tags…"
              className="w-full h-[42px] pl-10 pr-9 text-xs sm:text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-[42px] text-xs sm:text-sm px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)] cursor-pointer"
            >
              <option value="recent">Recently updated</option>
              <option value="created">Date planted</option>
              <option value="progress">Highest progress</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>

            {/* Bookmarked toggle */}
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`h-[42px] px-3.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer ${
                bookmarkedOnly
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[#C026D3] dark:text-[#E879F9] font-semibold shadow-xs'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
              title="Filter bookmarked projects"
            >
              {bookmarkedOnly ? (
                <BookmarkCheck className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Saved</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]/60">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5 mr-1 font-mono">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" /> Filters:
          </span>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              const next = new URLSearchParams(searchParams);
              if (e.target.value === 'all') next.delete('status');
              else next.set('status', e.target.value);
              navigate({ search: next.toString() }, { replace: true });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="revivable">Ready to revive</option>
            <option value="abandoned">Abandoned</option>
            <option value="archived">Archived</option>
            <option value="revived">Revived</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] focus:outline-none cursor-pointer"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] focus:outline-none cursor-pointer"
          >
            <option value="all">All technologies</option>
            {technologies.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] font-semibold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Active Filter Pill */}
        {selectedStatus !== 'all' && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]/40">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">Active filter:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-mono font-medium">
              <span>Status: <strong>{selectedStatus === 'revivable' ? 'Ready to revive' : selectedStatus}</strong> ({filteredProjects.length})</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('all');
                  const next = new URLSearchParams(searchParams);
                  next.delete('status');
                  navigate({ search: next.toString() }, { replace: true });
                }}
                className="hover:text-purple-900 dark:hover:text-white cursor-pointer ml-1"
                aria-label="Clear status filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ================= SECTION 1: FEATURED SLIDE SHOWCASE ================= */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 md:p-16 text-center space-y-4 shadow-xs">
          <FolderOpen className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-[var(--color-text)]">
            No Preserved Projects Matched Your Filters
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
            No projects in your garden match the current search query or active filter settings.
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Reset all filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Slide Navigation Header Controls */}
          <div className="flex items-center justify-between px-2 text-xs font-mono">
            <span className="text-[var(--color-text-secondary)] font-semibold">
              FEATURED EXHIBIT{' '}
              <strong className="text-[var(--color-text)] font-bold">
                {safeSlideIndex + 1 < 10 ? `0${safeSlideIndex + 1}` : safeSlideIndex + 1}
              </strong>{' '}
              / {filteredProjects.length < 10 ? `0${filteredProjects.length}` : filteredProjects.length}
            </span>

            {/* Slide Arrows & Keyboard Hints */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                disabled={filteredProjects.length <= 1}
                className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                title="Previous Project [← Left Arrow]"
                aria-label="Previous project slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dot Indicators */}
              <div className="hidden sm:flex items-center gap-1.5 px-2">
                {filteredProjects.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === safeSlideIndex
                        ? 'w-6 bg-[var(--color-brand)]'
                        : 'w-2 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                    }`}
                    title={`Jump to ${p.title}`}
                    aria-label={`Jump to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextSlide}
                disabled={filteredProjects.length <= 1}
                className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                title="Next Project [→ Right Arrow]"
                aria-label="Next project slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Featured Slide Card */}
          {featuredProject && (
            <div
              key={featuredProject.id}
              className="rounded-3xl border border-[#E8E2D6] dark:border-[var(--color-border)] bg-[#FFFDF9] dark:bg-[var(--color-surface)] p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden transition-all duration-200"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left Column: Project Artwork Showcase */}
                  <div className="lg:col-span-5 w-full">
                    <ProjectArtwork
                      project={featuredProject}
                      size="large"
                      onClick={() => navigate(`/projects/${featuredProject.id}`)}
                    />
                  </div>

                  {/* Right Column: Project Dossier & Narrative */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Metadata Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge status={featuredProject.status} size="md" />
                        <Badge variant="tech" size="sm">
                          {featuredProject.category}
                        </Badge>
                        <span className="text-xs text-[#78716C] dark:text-[#BDB5CC] flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          Planted {formatPlantedDate(featuredProject.startDate)}
                        </span>
                      </div>

                      {/* Bookmark Toggle */}
                      <button
                        onClick={() =>
                          updateProject(featuredProject.id, { bookmarked: !featuredProject.bookmarked })
                        }
                        className="p-2 rounded-xl border border-[#E8E2D6] dark:border-white/10 bg-white dark:bg-black/30 hover:bg-[#F5F2ED] dark:hover:bg-black/50 text-[#78716C] dark:text-[#BDB5CC] hover:text-[#1C1917] dark:hover:text-[#F8F7FB] transition-colors cursor-pointer"
                        title={featuredProject.bookmarked ? 'Remove bookmark' : 'Bookmark project'}
                        aria-label="Bookmark project"
                      >
                        {featuredProject.bookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Project Title */}
                    <h2
                      onClick={() => navigate(`/projects/${featuredProject.id}`)}
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1917] dark:text-[#F8F7FB] hover:text-[var(--color-brand)] transition-colors cursor-pointer leading-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {featuredProject.title}
                    </h2>

                    {/* Summary / Pitch */}
                    <p className="text-sm sm:text-base text-[#44403C] dark:text-[#E1DCE9] leading-relaxed line-clamp-3">
                      {featuredProject.summary}
                    </p>

                    {/* Tech Badges */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#78716C] dark:text-[#BDB5CC]">
                        Tech Ecosystem
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(featuredProject.languages || []).concat(featuredProject.frameworks || []).map((tech) => (
                          <Badge key={tech} variant="tech" size="sm">
                            {tech}
                          </Badge>
                        ))}
                        {(featuredProject.tools || []).slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[#78716C] dark:text-[#BDB5CC] border border-black/5 dark:border-white/10 font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Progress Snapshot */}
                    <div className="space-y-2 pt-2 border-t border-[#E8E2D6] dark:border-white/10">
                      <div className="flex items-center justify-between text-xs font-mono text-[#78716C] dark:text-[#BDB5CC]">
                        <span>Weighted Progress</span>
                        <span className="font-bold text-[#1C1917] dark:text-[#F8F7FB]">
                          {featuredProject.progress}%
                        </span>
                      </div>
                      <ProgressBar value={featuredProject.progress} size="sm" />
                      <div className="flex items-center gap-4 text-xs font-mono text-[#78716C] dark:text-[#BDB5CC] pt-1">
                        <span>{featuredProject.milestones?.length || 0} Milestones</span>
                        <span>•</span>
                        <span>
                          {(featuredProject.technicalBlockers?.length || 0) === 0 ? (
                            <span className="text-[var(--color-success)] inline-flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 0 Blockers
                            </span>
                          ) : (
                            <span className="text-[var(--color-status-paused)] font-semibold">
                              {featuredProject.technicalBlockers?.length || 0} Active Blockers
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-3">
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/projects/${featuredProject.id}`)}
                        className="shadow-xs cursor-pointer"
                      >
                        <span>View Project Case File</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => navigate(`/revival-studio?project=${featuredProject.id}`)}
                        className="cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
                        <span>Revival Studio</span>
                      </Button>

                      {/* Quick Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === featuredProject.id ? null : featuredProject.id)
                          }
                          className="p-2.5 rounded-xl border border-[#E8E2D6] dark:border-white/15 bg-white dark:bg-black/30 hover:bg-[#F5F2ED] dark:hover:bg-black/50 text-[#78716C] dark:text-[#BDB5CC] hover:text-[#1C1917] dark:hover:text-[#F8F7FB] transition-colors cursor-pointer"
                          aria-label="Project actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === featuredProject.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-10 w-48 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg py-1.5 z-20 text-xs"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(`/projects/${featuredProject.id}`);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Full case file
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(`/projects/${featuredProject.id}/edit`);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit metadata
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  duplicateProject(featuredProject.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  const next = featuredProject.status === 'archived' ? 'active' : 'archived';
                                  changeProjectStatus(featuredProject.id, next);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                {featuredProject.status === 'archived' ? 'Unarchive' : 'Archive'}
                              </button>
                              <div className="border-t border-[var(--color-border)] my-1" />
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteTargetId(featuredProject.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete project
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION 2: VERTICAL PROJECT NAVIGATION LIST ================= */}
      {filteredProjects.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3
                className="text-lg font-bold text-[var(--color-text)] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Project Archive Index
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Click any project record below to inspect it in the featured showcase above.
              </p>
            </div>

            <span className="text-xs font-mono text-[var(--color-text-secondary)] font-medium self-start sm:self-auto">
              Showing <strong className="text-[var(--color-text)] font-semibold">{filteredProjects.length}</strong> of {projects.length} preserved ideas
            </span>
          </div>

          {/* Clean Vertical Navigation List */}
          <div className="divide-y divide-[var(--color-border)] rounded-2xl md:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
            {filteredProjects.map((project, index) => {
              const isSelected = featuredProject?.id === project.id;

              return (
                <div
                  key={project.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#F5F2ED] dark:bg-[var(--color-surface-hover)] border-l-4 border-l-[var(--color-brand)] font-medium shadow-2xs'
                      : 'hover:bg-[var(--color-surface-subtle)] border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Left: Thumbnail & Project Meta */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                    <ProjectArtwork project={project} size="small" />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-bold">
                          #{index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>

                        <h4
                          className={`text-sm sm:text-base font-bold truncate transition-colors ${
                            isSelected
                              ? 'text-[var(--color-brand)]'
                              : 'text-[var(--color-text)] group-hover:text-[var(--color-brand)]'
                          }`}
                        >
                          {project.title}
                        </h4>

                        <Badge status={project.status} size="sm" />

                        {isSelected && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-brand-soft)] text-[#8B2FE8] dark:text-[#D946EF] font-bold uppercase tracking-wider hidden sm:inline-block">
                            Active Exhibit
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[var(--color-text-body)] line-clamp-1 leading-relaxed">
                        {project.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-secondary)] font-mono pt-0.5">
                        <span>{project.category}</span>
                        <span>•</span>
                        <span>Planted {formatPlantedDate(project.startDate)}</span>
                        {(project.languages?.length || 0) > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">
                              {(project.languages || []).slice(0, 2).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress & Action Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 self-stretch md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-[var(--color-border)]/50">
                    {/* Progress Bar Widget */}
                    <div className="w-28 sm:w-36 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[var(--color-text-secondary)]">
                        <span>Progress</span>
                        <span className="font-semibold text-[var(--color-text)]">{project.progress}%</span>
                      </div>
                      <ProgressBar value={project.progress} size="xs" />
                    </div>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProject(project.id, { bookmarked: !project.bookmarked });
                      }}
                      className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                      title={project.bookmarked ? 'Remove bookmark' : 'Bookmark project'}
                      aria-label="Bookmark project"
                    >
                      {project.bookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]" />
                      ) : (
                        <Bookmark className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      )}
                    </button>

                    {/* Direct Detail Link */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-text)] hover:text-[var(--color-brand)] transition-colors cursor-pointer"
                      title="Open full project case file"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteProject(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Permanently delete project"
        message="This will completely remove the project record and its memory timeline. This action cannot be undone."
        confirmLabel="Delete project"
        confirmVariant="danger"
      />
    </div>
  );
}

export default ProjectsPage;
