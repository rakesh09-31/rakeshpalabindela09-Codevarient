import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderOpen,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
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
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project } from '../types';
import { Badge, ProgressBar, ConfirmDialog, Button } from '../components/ui';

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
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'created'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialog states
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
      p.languages.forEach((l) => set.add(l));
      p.frameworks.forEach((f) => set.add(f));
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
          const matchTitle = project.title.toLowerCase().includes(q);
          const matchSummary = project.summary.toLowerCase().includes(q);
          const matchCategory = project.category.toLowerCase().includes(q);
          const matchTech =
            project.languages.some((l) => l.toLowerCase().includes(q)) ||
            project.frameworks.some((f) => f.toLowerCase().includes(q));
          const matchTags = project.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchCategory && !matchTech && !matchTags) {
            return false;
          }
        }
        // Status
        if (selectedStatus !== 'all' && project.status !== selectedStatus) {
          return false;
        }
        // Category
        if (selectedCategory !== 'all' && project.category !== selectedCategory) {
          return false;
        }
        // Tech
        if (
          selectedTech !== 'all' &&
          !project.languages.includes(selectedTech) &&
          !project.frameworks.includes(selectedTech)
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
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Project archive
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Complete inventory of preserved prototypes, experiments, and active roadmaps.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/projects/new')}
          icon={<Plus className="w-4 h-4" />}
        >
          New Project
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, domain, tech stack, or tags…"
              className="w-full h-[42px] pl-10 pr-9 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
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
              className="h-[42px] text-xs sm:text-sm px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
            >
              <option value="recent">Recently updated</option>
              <option value="created">Date planted</option>
              <option value="progress">Highest progress</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>

            {/* Bookmarked toggle */}
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`h-[42px] px-3 rounded-[var(--radius-md)] border transition-colors flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer ${
                bookmarkedOnly
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
              }`}
              title="Filter saved projects"
            >
              {bookmarkedOnly ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="hidden sm:inline">Saved</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center h-[42px] rounded-[var(--radius-md)] border border-[var(--color-border)] p-1 bg-[var(--color-surface-subtle)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-[32px] h-[32px] flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-[32px] h-[32px] flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="List view"
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]/60">
          <span className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="abandoned">Abandoned</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="revived">Revived</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none cursor-pointer"
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
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none cursor-pointer"
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
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] font-medium ml-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Results Count */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
        <span>
          Showing {filteredProjects.length} of {projects.length} archived projects
        </span>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--color-text)]">
            No projects matched your criteria
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
            Try adjusting your search query, status, or technology filter.
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Reset all filters
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {filteredProjects.map((project) => (
            <ProjectGridCard
              key={project.id}
              project={project}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onDelete={() => setDeleteTargetId(project.id)}
              onDuplicate={() => duplicateProject(project.id)}
              onToggleBookmark={() =>
                updateProject(project.id, { bookmarked: !project.bookmarked })
              }
              onToggleArchive={() => {
                const next = project.status === 'archived' ? 'active' : 'archived';
                changeProjectStatus(project.id, next);
              }}
            />
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

function ProjectGridCard({
  project,
  activeMenuId,
  setActiveMenuId,
  onDelete,
  onDuplicate,
  onToggleBookmark,
  onToggleArchive,
}: {
  project: Project;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleBookmark: () => void;
  onToggleArchive: () => void;
}) {
  const navigate = useNavigate();
  const isMenuOpen = activeMenuId === project.id;

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="card card-clickable min-h-[220px] flex flex-col justify-between relative group select-none"
    >
      <div>
        {/* Header row: Badge + Bookmark + Menu */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge status={project.status} size="sm" />

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onToggleBookmark}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
              title="Bookmark"
              aria-label="Bookmark project"
            >
              {project.bookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-[var(--color-brand)]" />
              ) : (
                <Bookmark className="w-4 h-4 opacity-40 group-hover:opacity-100" />
              )}
            </button>

            {/* Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenuId(isMenuOpen ? null : project.id)}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                aria-label="Project actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-8 w-48 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] py-1.5 z-20 text-xs"
                  >
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/projects/${project.id}`);
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View details
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/projects/${project.id}/edit`);
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit metadata
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/revival-studio?project=${project.id}`);
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Revival Studio
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onDuplicate();
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onToggleArchive();
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    <div className="border-t border-[var(--color-border)] my-1" />
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onDelete();
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Title & Elevator Summary */}
        <h3
          className="text-base md:text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight line-clamp-1 mb-1.5 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {project.title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4">
          {project.summary}
        </p>

        {/* Tech Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
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

      {/* Progress Footer */}
      <div className="space-y-2 pt-4 mt-4 border-t border-[var(--color-border)]">
        <ProgressBar value={project.progress} size="xs" showLabel label="Progress" />
      </div>
    </div>
  );
}

export default ProjectsPage;
