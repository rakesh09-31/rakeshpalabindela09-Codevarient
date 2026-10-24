import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Search,
  Bookmark,
  BookmarkCheck,
  Share2,
  Users,
  Check,
  Send,
  Lock,
  X,
  Filter,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project } from '../types';
import { Badge, Modal, Input, Textarea, Avatar, Button } from '../components/ui';

export function DiscoverPage() {
  const { projects, updateProject } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');

  // Modals state
  const [collaborateProject, setCollaborateProject] = useState<Project | null>(null);
  const [collaborateMessage, setCollaborateMessage] = useState('');
  const [collaborateSkills, setCollaborateSkills] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter public projects only
  const publicProjects = useMemo(() => {
    return projects.filter((p) => p.visibility === 'public');
  }, [projects]);

  // Real supported categories derived from public projects
  const categories = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [publicProjects]);

  // Real supported technologies derived from public projects
  const technologies = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => {
      p.languages.forEach((l) => set.add(l));
      p.frameworks.forEach((f) => set.add(f));
    });
    return Array.from(set).sort();
  }, [publicProjects]);

  // Filtered public projects
  const filtered = useMemo(() => {
    return publicProjects.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesSummary = p.summary.toLowerCase().includes(q);
        const matchesTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchesTech =
          p.languages.some((l) => l.toLowerCase().includes(q)) ||
          p.frameworks.some((f) => f.toLowerCase().includes(q));
        const matchesCategory = p.category?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesSummary && !matchesTags && !matchesTech && !matchesCategory) {
          return false;
        }
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (
        selectedTech !== 'all' &&
        !p.languages.includes(selectedTech) &&
        !p.frameworks.includes(selectedTech)
      ) {
        return false;
      }
      return true;
    });
  }, [publicProjects, searchQuery, selectedCategory, selectedTech]);

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedTech !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTech('all');
  };

  const handleSendCollaborateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborateProject) return;
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setCollaborateProject(null);
      setCollaborateMessage('');
      setCollaborateSkills('');
    }, 1500);
  };

  const handleCopyShareLink = () => {
    if (!shareProject) return;
    const url = `${window.location.origin}/projects/${shareProject.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-white shadow-[0_0_16px_rgba(139,47,232,0.35)] flex items-center justify-center shrink-0 border border-white/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Discover Archive
              </h1>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-body)] mt-1.5 max-w-2xl leading-relaxed">
            Explore public unfinished projects, inspect architectural blueprints, and collaborate with creators to revive viable concepts.
          </p>
        </div>

        <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-4 py-2.5 rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <Lock className="w-4 h-4 text-[#8B2FE8] shrink-0" />
          <span>Private projects remain securely isolated in personal archives.</span>
        </div>
      </div>

      {/* Category Chips (Filter shortcuts mapping directly to supported categories) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white font-semibold shadow-[0_0_12px_rgba(139,47,232,0.3)]'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          All Domains ({publicProjects.length})
        </button>
        {categories.map((cat) => {
          const count = publicProjects.filter((p) => p.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none ${
                isSelected
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white font-semibold shadow-[0_0_12px_rgba(139,47,232,0.3)]'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, domain, tech stack, or tags…"
              className="w-full h-[42px] pl-10 pr-9 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 rounded cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-[42px] text-xs sm:text-sm px-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="all">All Domains</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full h-[42px] text-xs sm:text-sm px-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="all">All Technologies</option>
                {technologies.map((t) => (
                  <option key={t} value={t} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-[42px] px-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)]/50">
          <span>
            Showing <strong className="text-[var(--color-text)] font-semibold">{filtered.length}</strong> of{' '}
            {publicProjects.length} public community projects
          </span>
          {hasActiveFilters && (
            <span className="text-[var(--color-brand)] font-medium">Filtered results active</span>
          )}
        </div>
      </div>

      {/* Grid: 2 columns on tablet/medium, 3 columns on desktop, 1 on mobile */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center shadow-xs space-y-3">
          <Globe className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-bold text-[var(--color-text)]">No public projects matched your search</h3>
          <p className="text-xs text-[var(--color-text-body)] max-w-md mx-auto leading-relaxed">
            Try adjusting your search query, clearing domain filters, or selecting a different technology stack.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {filtered.map((project) => (
            <PublicProjectCard
              key={project.id}
              project={project}
              onBookmark={() => updateProject(project.id, { bookmarked: !project.bookmarked })}
              onShare={() => setShareProject(project)}
              onCollaborate={() => setCollaborateProject(project)}
              onNavigate={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      {/* Collaborate Modal */}
      <Modal
        isOpen={Boolean(collaborateProject)}
        onClose={() => setCollaborateProject(null)}
        title={`Collaborate on "${collaborateProject?.title}"`}
        size="md"
      >
        {requestSent ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--color-text)]">Collaboration Proposal Sent!</h4>
            <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
              Your note and proposed skill contributions have been delivered to{' '}
              <strong className="text-[var(--color-text)]">{collaborateProject?.ownerName}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendCollaborateRequest} className="space-y-4">
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Declare your available skills and propose how you can assist with pending milestones or architectural blockers.
            </p>

            <Input
              label="Your Core Skills / Tech Stack *"
              required
              value={collaborateSkills}
              onChange={(e) => setCollaborateSkills(e.target.value)}
              placeholder="e.g. React Native, TypeScript, PostGIS, UI Polish"
            />

            <Textarea
              label="Note to Project Creator *"
              required
              rows={3}
              value={collaborateMessage}
              onChange={(e) => setCollaborateMessage(e.target.value)}
              placeholder="Hi! I noticed this project in the Discover Archive. I would love to help revive milestone tasks..."
            />

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCollaborateProject(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                Send Proposal
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={Boolean(shareProject)}
        onClose={() => setShareProject(null)}
        title="Share Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
            Share this public project archive link with teammates, open-source contributors, or hackathon peers:
          </p>

          <div className="flex items-center gap-2 p-2 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text)] font-mono truncate flex-1 px-2 select-all">
              {window.location.origin}/projects/{shareProject?.id}
            </span>
            <Button size="sm" variant="primary" onClick={handleCopyShareLink} icon={copiedLink ? <Check className="w-3.5 h-3.5" /> : undefined}>
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PublicProjectCard({
  project,
  onBookmark,
  onShare,
  onCollaborate,
  onNavigate,
}: {
  project: Project;
  onBookmark: () => void;
  onShare: () => void;
  onCollaborate: () => void;
  onNavigate: () => void;
}) {
  const teamCount = project.teamMembers ? project.teamMembers.length : 1;
  const isBookmarked = Boolean(project.bookmarked);

  return (
    <div
      onClick={onNavigate}
      className="card card-clickable min-h-[260px] flex flex-col justify-between group select-none relative"
    >
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-medium">
              {project.category || 'General'}
            </span>
            <Badge status={project.status} size="sm" />
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onBookmark}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark project'}
              aria-label="Bookmark project"
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-[#C026D3] dark:text-[#E879F9]" />
              ) : (
                <Bookmark className="w-4 h-4 opacity-70 group-hover:opacity-100" />
              )}
            </button>
            <button
              onClick={onShare}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title="Share project link"
              aria-label="Share project"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Name & Summary */}
        <h3
          className="text-base md:text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight line-clamp-1 mb-1.5 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {project.title}
        </h3>
        <p className="text-sm text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-4">
          {project.summary}
        </p>

        {/* Tech Stack Chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {project.languages.concat(project.frameworks).slice(0, 3).map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-body)]"
            >
              {item}
            </span>
          ))}
          {project.languages.concat(project.frameworks).length > 3 && (
            <span className="text-[11px] text-[var(--color-text-secondary)] self-center font-mono font-medium">
              +{project.languages.concat(project.frameworks).length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Creator info + Collaborate CTA */}
      <div className="pt-3 mt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={project.ownerName} size="sm" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[var(--color-text)] truncate block leading-tight">
              {project.ownerName}
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block truncate leading-tight">
              {teamCount} {teamCount === 1 ? 'creator' : 'collaborators'}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={onCollaborate}
            icon={<Users className="w-3.5 h-3.5" />}
          >
            Collaborate
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DiscoverPage;
