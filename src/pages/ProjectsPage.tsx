import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Sparkles,
  Merge,
  MoreVertical,
  ExternalLink,
  Edit2,
  Copy,
  Trash2,
  Archive,
  Bookmark,
  BookmarkCheck,
  X,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus } from '../types';
import { Badge, ProgressBar, ConfirmDialog, Avatar } from '../components/ui';

export function ProjectsPage() {
  const {
    projects,
    deleteProject,
    duplicateProject,
    changeProjectStatus,
    updateProject,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
        if (sortBy === 'recent') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === 'created') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'progress') {
          return b.progress - a.progress;
        }
        return 0;
      });
  }, [projects, searchQuery, selectedStatus, selectedCategory, selectedTech, bookmarkedOnly, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedTech('all');
    setBookmarkedOnly(false);
    setSearchParams({});
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    selectedTech !== 'all' ||
    bookmarkedOnly;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
            My Projects
          </h1>
          <p className="text-sm text-charcoal-light mt-1">
            Curate, revive, and tend to your digital garden of {projects.length} idea{projects.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/fusion')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal text-teal hover:bg-paleblue-light/30 transition-colors font-medium text-sm"
          >
            <Merge className="w-4 h-4" />
            AI Fusion
          </button>
          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest text-white hover:bg-forest-light transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-green-border/60 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-light" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, category, tech, or tags..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-green-border bg-ivory focus:outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light hover:text-charcoal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs sm:text-sm px-3 py-2 rounded-xl border border-gray-green-border bg-white text-charcoal focus:outline-none focus:border-mint"
            >
              <option value="recent">Recently Updated</option>
              <option value="created">Date Created</option>
              <option value="progress">Highest Progress</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>

            {/* Bookmarked toggle */}
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs sm:text-sm ${
                bookmarkedOnly
                  ? 'border-amber bg-amber-warm text-amber'
                  : 'border-gray-green-border text-charcoal-light hover:bg-ivory-warm'
              }`}
              title="Filter by bookmarked"
            >
              {bookmarkedOnly ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="hidden sm:inline">Saved</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-gray-green-border p-0.5 bg-ivory">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-forest shadow-xs' : 'text-charcoal-light'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white text-forest shadow-xs' : 'text-charcoal-light'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-green-border/30">
          <span className="text-xs font-medium text-charcoal-light flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          {/* Status filter pill */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-green-border bg-white text-charcoal focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="abandoned">Abandoned</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="revived">Revived</option>
          </select>

          {/* Category filter pill */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-green-border bg-white text-charcoal focus:outline-none"
          >
            <option value="all">All Domains / Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Tech filter pill */}
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-green-border bg-white text-charcoal focus:outline-none"
          >
            <option value="all">All Technologies</option>
            {technologies.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose hover:text-rose/80 font-medium ml-auto flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Results count */}
      <div className="flex items-center justify-between text-xs text-charcoal-light px-1">
        <span>
          Showing {filteredProjects.length} of {projects.length} projects
        </span>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-green-light mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-charcoal mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            No projects matched your filters
          </h3>
          <p className="text-sm text-charcoal-light mb-4">
            Try adjusting your search query, status, or technology criteria.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-ivory-warm border border-gray-green-border rounded-xl text-sm font-medium text-charcoal hover:bg-gray-green-light/20 transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <div className="bg-white rounded-2xl border border-gray-green-border/60 overflow-hidden divide-y divide-gray-green-border/30 shadow-sm">
          {filteredProjects.map((project) => (
            <ProjectListRow
              key={project.id}
              project={project}
              onDelete={() => setDeleteTargetId(project.id)}
              onDuplicate={() => duplicateProject(project.id)}
              onToggleBookmark={() =>
                updateProject(project.id, { bookmarked: !project.bookmarked })
              }
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteProject(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Project Permanently?"
        message="This action will delete the project record, its tasks, and its timeline history from your local garden. This cannot be undone."
        confirmLabel="Delete Forever"
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

  const statusVariantMap: Record<ProjectStatus, any> = {
    active: 'status-active',
    paused: 'status-paused',
    abandoned: 'status-abandoned',
    completed: 'status-completed',
    archived: 'status-archived',
    revived: 'status-revived',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <Badge variant={statusVariantMap[project.status]} size="sm">
            {project.status}
          </Badge>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              className="p-1 rounded-lg text-charcoal-light hover:text-amber transition-colors"
              title="Bookmark"
            >
              {project.bookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-amber" />
              ) : (
                <Bookmark className="w-4 h-4 opacity-40 group-hover:opacity-100" />
              )}
            </button>

            {/* Dropdown Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(isMenuOpen ? null : project.id);
                }}
                className="p-1 rounded-lg text-charcoal-light hover:text-charcoal transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 w-44 bg-white rounded-xl border border-gray-green-border shadow-lg py-1 z-20"
                  >
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/projects/${project.id}`);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-charcoal hover:bg-ivory-warm flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Workspace
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/projects/${project.id}/edit`);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-charcoal hover:bg-ivory-warm flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Project
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        navigate(`/revival-studio?project=${project.id}`);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-purple-700 hover:bg-lavender-light/30 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Revival Studio
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onDuplicate();
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-charcoal hover:bg-ivory-warm flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onToggleArchive();
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-charcoal hover:bg-ivory-warm flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    <div className="border-t border-gray-green-border/30 my-1" />
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        onDelete();
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-rose hover:bg-rose-light/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Title & Summary */}
        <h3
          onClick={() => navigate(`/projects/${project.id}`)}
          className="text-base font-semibold text-charcoal hover:text-forest transition-colors cursor-pointer line-clamp-1 mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {project.title}
        </h3>
        <p className="text-xs text-charcoal-light line-clamp-2 mb-3 leading-relaxed">
          {project.summary}
        </p>
      </div>

      {/* Progress & Metadata */}
      <div className="space-y-3 pt-3 border-t border-gray-green-border/40">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-charcoal-light font-medium">Milestones & Tasks</span>
            <span className="font-semibold text-charcoal">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="sm" colorByValue />
        </div>

        {/* Tech tags */}
        <div className="flex flex-wrap gap-1">
          {project.languages.concat(project.frameworks).slice(0, 3).map((item) => (
            <Badge key={item} variant="tech" size="sm">
              {item}
            </Badge>
          ))}
          {project.tags.slice(0, 1).map((tag) => (
            <Badge key={tag} variant="tag" size="sm">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Footer info: team avatars & last updated */}
        <div className="flex items-center justify-between pt-2 text-[11px] text-charcoal-light">
          <div className="flex items-center -space-x-1.5">
            {project.teamMembers.slice(0, 3).map((m) => (
              <Avatar key={m.id} name={m.name} size="sm" className="border-2 border-white" />
            ))}
            {project.teamMembers.length > 3 && (
              <span className="w-6 h-6 rounded-full bg-ivory-warm border border-gray-green-border flex items-center justify-center text-[10px] font-medium text-charcoal">
                +{project.teamMembers.length - 3}
              </span>
            )}
          </div>
          <span>
            Updated{' '}
            {new Date(project.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectListRow({
  project,
  onDelete,
  onDuplicate,
  onToggleBookmark,
}: {
  project: Project;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleBookmark: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="p-4 hover:bg-ivory-warm/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className="text-charcoal-light hover:text-amber"
        >
          {project.bookmarked ? (
            <BookmarkCheck className="w-4 h-4 text-amber" />
          ) : (
            <Bookmark className="w-4 h-4 opacity-40 group-hover:opacity-100" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="text-sm font-semibold text-charcoal group-hover:text-forest transition-colors truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {project.title}
            </h4>
            <Badge variant="tech" size="sm">
              {project.category}
            </Badge>
          </div>
          <p className="text-xs text-charcoal-light truncate mt-0.5">{project.summary}</p>
        </div>
      </div>

      <div className="flex items-center gap-5 flex-shrink-0 self-end md:self-center">
        {/* Progress */}
        <div className="w-24 hidden sm:block">
          <div className="flex justify-between text-[10px] text-charcoal-light mb-1">
            <span>Progress</span>
            <span className="font-semibold">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="sm" colorByValue />
        </div>

        {/* Status */}
        <span className="text-xs capitalize font-medium px-2 py-0.5 rounded-full bg-ivory-warm border border-gray-green-border text-charcoal">
          {project.status}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/revival-studio?project=${project.id}`)}
            className="p-1.5 rounded-lg text-purple-700 hover:bg-lavender-light/40 transition-colors"
            title="Revival Studio"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/projects/${project.id}/edit`)}
            className="p-1.5 rounded-lg text-charcoal-light hover:text-charcoal hover:bg-white transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-charcoal-light hover:text-charcoal hover:bg-white transition-colors"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-rose hover:bg-rose-light/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;
