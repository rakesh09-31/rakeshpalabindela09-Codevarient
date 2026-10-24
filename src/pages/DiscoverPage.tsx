import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Terminal,
  Layers,
  Cpu,
  BookOpen,
  Briefcase,
  Mail,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, UserSocialProfile, Team } from '../types';
import { Badge, Modal, Input, Textarea, Avatar, Button } from '../components/ui';

// Fallback category artwork icons
const CATEGORY_ICONS: Record<string, any> = {
  'Climate & Sustainability': Globe,
  'Developer Tools': Terminal,
  'Education & Productivity': BookOpen,
  'Generative Audio & Media': Sparkles,
  'Open Source & Infrastructure': Layers,
  'Hardware & IoT': Cpu,
};

export function DiscoverPage() {
  const {
    projects,
    updateProject,
    userProfile,
    users,
    teams,
    submitJoinRequest,
    followUser,
    unfollowUser,
    collaborationRequests,
    sendCollaborationRequest,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentUserId = userProfile.id || 'user-1';

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [mainTab, setMainTab] = useState<'all' | 'people' | 'projects' | 'teams'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');

  // Modals state
  const [collaborateProject, setCollaborateProject] = useState<Project | null>(null);
  const [collaborateMessage, setCollaborateMessage] = useState('');
  const [collaborateSkills, setCollaborateSkills] = useState('');
  const [sendingCollab, setSendingCollab] = useState(false);
  const [collabSuccess, setCollabSuccess] = useState(false);

  // Team Join Request Modal state
  const [teamToJoin, setTeamToJoin] = useState<Team | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSkills, setJoinSkills] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Debounced search query for smooth filtering
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 120);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Public projects
  const publicProjects = useMemo(() => {
    return projects.filter((p) => p.visibility === 'public');
  }, [projects]);

  // Discoverable teams (private teams are strictly excluded)
  const discoverableTeams = useMemo(() => {
    return teams.filter((t) => t.visibility === 'discoverable');
  }, [teams]);

  // Derived categories & tech
  const categories = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    discoverableTeams.forEach((t) => {
      if (t.categories) {
        t.categories.forEach((c) => set.add(c));
      }
    });
    return Array.from(set).sort();
  }, [publicProjects, discoverableTeams]);

  const technologies = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => {
      (p.languages || []).forEach((l) => set.add(l));
      (p.frameworks || []).forEach((f) => set.add(f));
    });
    return Array.from(set).sort();
  }, [publicProjects]);

  // Filtered People
  const filteredPeople = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (!q) return true;
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchBio = (u.bio || '').toLowerCase().includes(q);
      const matchSkills = u.skills && u.skills.some((s) => s.toLowerCase().includes(q));
      return matchName || matchUsername || matchBio || matchSkills;
    });
  }, [users, debouncedQuery]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return discoverableTeams.filter((t) => {
      if (q) {
        const matchName = t.name.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCats = t.categories && t.categories.some((c) => c.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCats) return false;
      }
      if (selectedCategory !== 'all') {
        const hasCat = t.categories && t.categories.includes(selectedCategory);
        if (!hasCat) return false;
      }
      return true;
    });
  }, [discoverableTeams, debouncedQuery, selectedCategory]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return publicProjects.filter((p) => {
      if (q) {
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesSummary = (p.summary || '').toLowerCase().includes(q);
        const matchesTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTech =
          (p.languages || []).some((l) => l.toLowerCase().includes(q)) ||
          (p.frameworks || []).some((f) => f.toLowerCase().includes(q));
        const matchesCategory = (p.category || '').toLowerCase().includes(q);
        const matchesOwner = (p.ownerName || '').toLowerCase().includes(q);

        if (!matchesTitle && !matchesSummary && !matchesTags && !matchesTech && !matchesCategory && !matchesOwner) {
          return false;
        }
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (
        selectedTech !== 'all' &&
        !(p.languages || []).includes(selectedTech) &&
        !(p.frameworks || []).includes(selectedTech)
      ) {
        return false;
      }
      return true;
    });
  }, [publicProjects, debouncedQuery, selectedCategory, selectedTech]);

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedTech !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTech('all');
  };

  const handleSendCollaborateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborateProject) return;
    setSendingCollab(true);
    try {
      await sendCollaborationRequest(
        collaborateProject.id,
        collaborateSkills.trim() || 'Software Development & Architecture',
        collaborateMessage.trim()
      );
      setCollabSuccess(true);
      setTimeout(() => {
        setCollabSuccess(false);
        setCollaborateProject(null);
        setCollaborateMessage('');
        setCollaborateSkills('');
      }, 1600);
    } catch (err) {
      console.error('Failed to send collaborate request:', err);
    } finally {
      setSendingCollab(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareProject) return;
    const url = `${window.location.origin}/projects/${shareProject.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmitJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamToJoin) return;
    setSubmittingJoin(true);
    try {
      const skillsArr = joinSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await submitJoinRequest(teamToJoin.id, joinMessage.trim(), skillsArr.length > 0 ? skillsArr : ['Contributor']);
      setJoinSuccess(true);
      setTimeout(() => {
        setJoinSuccess(false);
        setTeamToJoin(null);
        setJoinMessage('');
        setJoinSkills('');
      }, 1600);
    } catch (err) {
      console.error('Failed to submit join request:', err);
    } finally {
      setSubmittingJoin(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
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
            Search creators, public projects, and discoverable teams across the community. Connect with peers, inspect case files, and collaborate to revive viable concepts.
          </p>
        </div>

        <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-4 py-2.5 rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <Lock className="w-4 h-4 text-[#8B2FE8] shrink-0" />
          <span>Private archives and private teams remain strictly isolated.</span>
        </div>
      </div>

      {/* ================= 1. PROMINENT SEARCH BAR & MAIN TABS ================= */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 sm:p-6 shadow-[var(--shadow-card)] space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, projects, or teams by name, topic, or tech…"
            className="w-full h-[48px] pl-12 pr-10 text-sm md:text-base rounded-2xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1.5 rounded-lg cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Toggle: All, People, Projects, Teams */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-[var(--color-surface-subtle)] p-1 rounded-xl border border-[var(--color-border)] self-start overflow-x-auto max-w-full">
            <button
              onClick={() => setMainTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                mainTab === 'all'
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              All Results ({filteredPeople.length + filteredProjects.length + filteredTeams.length})
            </button>
            <button
              onClick={() => setMainTab('people')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mainTab === 'people'
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> People ({filteredPeople.length})
            </button>
            <button
              onClick={() => setMainTab('projects')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mainTab === 'projects'
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Projects ({filteredProjects.length})
            </button>
            <button
              onClick={() => setMainTab('teams')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                mainTab === 'teams'
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Teams ({filteredTeams.length})
            </button>
          </div>

          {/* Project & Team Dropdown Filters */}
          {(mainTab === 'all' || mainTab === 'projects' || mainTab === 'teams') && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Domains</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {mainTab !== 'teams' && (
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Tech</option>
                  {technologies.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-[36px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. PEOPLE SECTION ================= */}
      {(mainTab === 'all' || mainTab === 'people') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#8B2FE8]" />
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
                Community Creators
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {filteredPeople.length}
              </span>
            </div>
            {mainTab === 'all' && filteredPeople.length > 3 && (
              <button
                onClick={() => setMainTab('people')}
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all creators <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredPeople.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-text-body)]">
              No community creators matched "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(mainTab === 'all' ? filteredPeople.slice(0, 3) : filteredPeople).map((user) => (
                <DiscoverPersonCard
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  onFollow={() => followUser(user.id)}
                  onUnfollow={() => unfollowUser(user.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= 3. PUBLIC PROJECTS SECTION ================= */}
      {(mainTab === 'all' || mainTab === 'projects') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#C026D3]" />
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
                Public Project Blueprints
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {filteredProjects.length}
              </span>
            </div>
            {mainTab === 'all' && filteredProjects.length > 6 && (
              <button
                onClick={() => setMainTab('projects')}
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all projects <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center space-y-3">
              <Globe className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--color-text)]">No public projects matched your search</h3>
              <p className="text-xs text-[var(--color-text-body)] max-w-md mx-auto leading-relaxed">
                Try adjusting your search query, selecting different technologies, or clearing filters.
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
              {filteredProjects.map((project) => {
                const isOwner = project.ownerId === currentUserId;
                const existingCollab = collaborationRequests.find(
                  (c) => c.projectId === project.id && (c.requesterId === currentUserId || c.ownerId === currentUserId)
                );

                return (
                  <DiscoverProjectCard
                    key={project.id}
                    project={project}
                    isOwner={isOwner}
                    collabStatus={existingCollab ? existingCollab.status : undefined}
                    onBookmark={() => updateProject(project.id, { bookmarked: !project.bookmarked })}
                    onShare={() => setShareProject(project)}
                    onCollaborate={() => setCollaborateProject(project)}
                    onNavigate={() => navigate(`/projects/${project.id}`)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================= 4. DISCOVERABLE TEAMS SECTION ================= */}
      {(mainTab === 'all' || mainTab === 'teams') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#8B2FE8]" />
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
                Discoverable Teams & Working Groups
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {filteredTeams.length}
              </span>
            </div>
            {mainTab === 'all' && filteredTeams.length > 3 && (
              <button
                onClick={() => setMainTab('teams')}
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all teams <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center space-y-3">
              <Briefcase className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--color-text)]">No discoverable teams matched your search</h3>
              <p className="text-xs text-[var(--color-text-body)] max-w-md mx-auto leading-relaxed">
                Teams marked as private do not appear here. Try adjusting your search query or selecting a different category.
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
              {(mainTab === 'all' ? filteredTeams.slice(0, 3) : filteredTeams).map((team) => {
                const isMember = team.members.some((m) => m.id === currentUserId);
                const hasPendingRequest = Boolean(
                  team.joinRequests?.some((r) => r.userId === currentUserId && r.status === 'pending')
                );

                return (
                  <DiscoverTeamCard
                    key={team.id}
                    team={team}
                    isMember={isMember}
                    hasPendingRequest={hasPendingRequest}
                    onRequestJoin={() => setTeamToJoin(team)}
                    onNavigate={() => navigate('/teams')}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================= 5. COLLABORATE PROPOSAL MODAL ================= */}
      <Modal
        isOpen={Boolean(collaborateProject)}
        onClose={() => setCollaborateProject(null)}
        title={`Collaborate on "${collaborateProject?.title}"`}
        size="md"
      >
        {collabSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--color-text)]">Proposal Delivered to Creator!</h4>
            <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
              Your note and proposed skills have been recorded in SQLite and dispatched to{' '}
              <strong className="text-[var(--color-text)]">{collaborateProject?.ownerName}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendCollaborateRequest} className="space-y-4">
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Propose how your skillset can unlock pending milestones, refactor architectural bottlenecks, or co-maintain this digital garden project.
            </p>

            <Input
              label="Your Core Skills / Tech Stack *"
              required
              value={collaborateSkills}
              onChange={(e) => setCollaborateSkills(e.target.value)}
              placeholder="e.g. React, PostGIS, Rust, UI Polish"
            />

            <Textarea
              label="Proposal Note to Project Creator *"
              required
              rows={3}
              value={collaborateMessage}
              onChange={(e) => setCollaborateMessage(e.target.value)}
              placeholder="Hi! I inspected this blueprint in the Discover Archive. I'd love to assist with the next sprint deliverables..."
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCollaborateProject(null)}
                disabled={sendingCollab}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                disabled={sendingCollab}
              >
                {sendingCollab ? 'Sending Proposal...' : 'Send Proposal'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={Boolean(shareProject)}
        onClose={() => setShareProject(null)}
        title="Share Project Archive"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
            Share this public blueprint link with collaborators or hackathon peers:
          </p>

          <div className="flex items-center gap-2 p-2 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text)] font-mono truncate flex-1 px-2 select-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/projects/{shareProject?.id}
            </span>
            <Button size="sm" variant="primary" onClick={handleCopyShareLink} icon={copiedLink ? <Check className="w-3.5 h-3.5" /> : undefined}>
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= TEAM JOIN REQUEST MODAL ================= */}
      <Modal
        isOpen={Boolean(teamToJoin)}
        onClose={() => setTeamToJoin(null)}
        title={`Request to Join "${teamToJoin?.name}"`}
        size="md"
      >
        {joinSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--color-text)]">Join Request Submitted!</h4>
            <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
              Your application has been delivered to the team admins. You will receive an in-app notification once reviewed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitJoinTeam} className="space-y-4">
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Introduce yourself to the team leaders and share what technical or creative contributions you would like to offer.
            </p>

            <Input
              label="Your Relevant Skills (comma-separated) *"
              required
              value={joinSkills}
              onChange={(e) => setJoinSkills(e.target.value)}
              placeholder="e.g. Fullstack TypeScript, UI Design, CI/CD"
            />

            <Textarea
              label="Note to Team Admins *"
              required
              rows={3}
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Hi team! I'm interested in helping revive your core services and collaborating on sprint goals..."
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTeamToJoin(null)}
                disabled={submittingJoin}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                disabled={submittingJoin}
              >
                {submittingJoin ? 'Submitting...' : 'Send Join Request'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ---------------- SUB-COMPONENTS ----------------

function DiscoverPersonCard({
  user,
  isCurrentUser,
  onFollow,
  onUnfollow,
}: {
  user: UserSocialProfile;
  isCurrentUser: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const navigate = useNavigate();
  const [inAction, setInAction] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inAction || isCurrentUser) return;
    setInAction(true);
    try {
      if (user.followStatus === 'following' || user.followStatus === 'requested') {
        await onUnfollow();
      } else {
        await onFollow();
      }
    } finally {
      setInAction(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/profile/${user.id}`)}
      className="card card-clickable p-4 rounded-2xl flex flex-col justify-between group transition-all duration-200 hover:-translate-y-1 relative"
    >
      <div>
        {/* Top: Avatar + Name + Follow Button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Circular Profile Avatar with luminous accent ring */}
            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#4568DC] via-[#8B2FE8] to-[#C026D3] shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--color-surface)] flex items-center justify-center font-bold text-xs text-[var(--color-text)]">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] truncate transition-colors">
                {user.name}
              </h3>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] truncate">
                @{user.username || user.id}
              </p>
            </div>
          </div>

          {/* Follow Button */}
          {!isCurrentUser ? (
            <button
              onClick={handleToggle}
              disabled={inAction}
              className={`h-[32px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                user.followStatus === 'following'
                  ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-red-400 hover:border-red-500/40'
                  : user.followStatus === 'requested'
                  ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  : 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white hover:brightness-110 shadow-xs'
              }`}
            >
              {user.followStatus === 'following' ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>Following</span>
                </>
              ) : user.followStatus === 'requested' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Requested</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              You
            </span>
          )}
        </div>

        {/* Bio */}
        <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-3">
          {user.bio || 'Digital gardener exploring software architecture and creative development.'}
        </p>

        {/* Skills Pills */}
        {user.skills && user.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {user.skills.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats: Followers, Projects, Success Rate */}
      <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] font-mono text-[var(--color-text-secondary)]">
        <span>
          <strong className="text-[var(--color-text)]">{user.followersCount ?? 0}</strong> followers
        </span>
        <span>
          <strong className="text-[var(--color-text)]">{user.projectsCount ?? 0}</strong> projects
        </span>
        <span className="text-[var(--color-brand)] font-semibold">
          {user.successRate ?? 0}% success
        </span>
      </div>
    </div>
  );
}

function DiscoverProjectCard({
  project,
  isOwner,
  collabStatus,
  onBookmark,
  onShare,
  onCollaborate,
  onNavigate,
}: {
  project: Project;
  isOwner: boolean;
  collabStatus?: 'pending' | 'accepted' | 'declined';
  onBookmark: () => void;
  onShare: () => void;
  onCollaborate: () => void;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const Icon = CATEGORY_ICONS[project.category] || FolderOpen;
  const isBookmarked = Boolean(project.bookmarked);

  return (
    <div
      onClick={onNavigate}
      className="card card-clickable min-h-[300px] flex flex-col justify-between group select-none relative transition-all duration-200 hover:-translate-y-1 overflow-hidden"
    >
      <div>
        {/* Cover / Generative Banner */}
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-3.5 bg-gradient-to-br from-[#1E162D] via-[#140E20] to-[#0A0710] border border-[var(--color-border)] flex items-center justify-center">
          {project.attachments && project.attachments.length > 0 && project.attachments[0].url ? (
            <img
              src={project.attachments[0].url}
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-center p-4">
              <Icon className="w-8 h-8 text-[#8B2FE8] mx-auto mb-1.5 opacity-80 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                {project.category || 'Blueprint'}
              </span>
            </div>
          )}

          {/* Action buttons (Bookmark & Share) */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-xs p-1 rounded-lg border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onBookmark}
              className="p-1 rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-[#E879F9]" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onShare}
              className="p-1 rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="absolute bottom-2.5 left-2.5">
            <Badge status={project.status} size="sm" />
          </div>
        </div>

        {/* Project Title & Category */}
        <div className="space-y-1 mb-2">
          <span className="text-[10px] font-mono uppercase font-semibold text-[var(--color-text-secondary)]">
            {project.category || 'General'}
          </span>
          <h3
            className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] tracking-tight line-clamp-1 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {project.title}
          </h3>
        </div>

        <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-3">
          {project.summary}
        </p>

        {/* Tech Stack Chips */}
        <div className="flex flex-wrap gap-1 mb-2">
          {(project.languages || []).concat(project.frameworks || []).slice(0, 3).map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-mono border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-body)]"
            >
              {item}
            </span>
          ))}
          {(project.languages || []).concat(project.frameworks || []).length > 3 && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] self-center">
              +{(project.languages || []).concat(project.frameworks || []).length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Creator with clickable profile link + Collaborate action */}
      <div className="pt-3 mt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        {/* Creator link */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${project.ownerId}`);
          }}
          className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Avatar name={project.ownerName} src={project.ownerAvatar} size="sm" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[var(--color-text)] truncate block leading-tight">
              {project.ownerName}
            </span>
            <span className="text-[10px] font-mono text-[var(--color-brand)] block truncate leading-tight">
              View Profile →
            </span>
          </div>
        </div>

        {/* Collaborate Button / Status Badge */}
        <div onClick={(e) => e.stopPropagation()}>
          {isOwner ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              Your Project
            </span>
          ) : collabStatus === 'pending' ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending
            </span>
          ) : collabStatus === 'accepted' ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> Collaborating
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onCollaborate}
              icon={<Users className="w-3.5 h-3.5" />}
            >
              Collaborate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscoverTeamCard({
  team,
  isMember,
  hasPendingRequest,
  onRequestJoin,
  onNavigate,
}: {
  team: Team;
  isMember: boolean;
  hasPendingRequest: boolean;
  onRequestJoin: () => void;
  onNavigate: () => void;
}) {
  const isInvitationOnly = team.joinPolicy === 'invitation-only';

  return (
    <div
      onClick={onNavigate}
      className="card card-clickable min-h-[220px] p-5 rounded-2xl flex flex-col justify-between group transition-all duration-200 hover:-translate-y-1 relative"
    >
      <div>
        {/* Top: Avatar/Icon + Name + Policy Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl p-[2px] bg-gradient-to-tr from-[#8B2FE8] to-[#06B6D4] shrink-0">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-[var(--color-surface)] flex items-center justify-center font-bold text-sm text-[var(--color-text)]">
                {team.avatar ? (
                  <img src={team.avatar} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{team.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] truncate transition-colors">
                {team.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                  {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                </span>
                <span className="text-[var(--color-border)]">•</span>
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                  {team.projectIds.length} {team.projectIds.length === 1 ? 'project' : 'projects'}
                </span>
              </div>
            </div>
          </div>

          {/* Join Policy Badge */}
          <span
            className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 ${
              isInvitationOnly
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isInvitationOnly ? (
              <>
                <Mail className="w-3 h-3" />
                Invitation Only
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                Request to Join
              </>
            )}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-3">
          {team.description || 'Collaborative team working across shared projects.'}
        </p>

        {/* Category Pills */}
        {team.categories && team.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {team.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Member / Status / Request Button */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
          Visibility: <span className="text-[var(--color-text)] font-semibold">Discoverable</span>
        </span>

        <div onClick={(e) => e.stopPropagation()}>
          {isMember ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Member
            </span>
          ) : hasPendingRequest ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Request Pending
            </span>
          ) : isInvitationOnly ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              Invite Only
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onRequestJoin}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Request to Join
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscoverPage;