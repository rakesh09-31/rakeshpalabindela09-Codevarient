import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Edit3,
  Settings,
  Globe,
  Sparkles,
  FolderOpen,
  Award,
  CheckCircle2,
  ExternalLink,
  Users,
  Check,
  X,
  Share2,
  Layers,
  ArrowRight,
  TrendingUp,
  Terminal,
  Cpu,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Badge, ProgressBar, Modal, Input, Textarea, Button } from '../components/ui';
import { apiClient } from '../services/apiClient';
import type { Project, UserSocialProfile, UserProfile } from '../types';

// Category theme fallback for project artwork
const CATEGORY_ICONS: Record<string, any> = {
  'Climate & Sustainability': Globe,
  'Developer Tools': Terminal,
  'Education & Productivity': BookOpen,
  'Generative Audio & Media': Sparkles,
  'Open Source & Infrastructure': Layers,
  'Hardware & IoT': Cpu,
};

export function ProfilePage() {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const {
    userProfile: currentUserProfile,
    projects: allProjects,
    updateUserProfile,
    followUser,
    unfollowUser,
    respondFollowRequest,
    refreshUsers,
    users: allCommunityUsers,
  } = useApp();

  const currentUserId = currentUserProfile.id || 'user-1';
  // Target profile ID: paramId or current user
  const targetId = paramId || currentUserId;
  const isOwnProfile = targetId === currentUserId;

  const [profile, setProfile] = useState<UserSocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'revived' | 'active'>('all');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<{ user: UserProfile; status: 'following' | 'requested' }[]>([]);
  const [followingList, setFollowingList] = useState<{ user: UserProfile; status: 'following' | 'requested' }[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load target user profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getUser(targetId);
      setProfile(data);
    } catch {
      // Fallback from community users
      const match = allCommunityUsers.find((u) => u.id === targetId);
      if (match) {
        setProfile(match);
      } else if (isOwnProfile) {
        setProfile({
          ...currentUserProfile,
          username: currentUserProfile.username || 'alexrivera',
          projectsCount: allProjects.filter((p) => p.ownerId === currentUserId).length,
          completedCount: allProjects.filter((p) => p.ownerId === currentUserId && p.status === 'completed').length,
          revivedCount: allProjects.filter((p) => p.ownerId === currentUserId && p.status === 'revived').length,
          successRate: 0,
          followersCount: 2,
          followingCount: 1,
          followStatus: 'none',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [targetId, isOwnProfile, allCommunityUsers, currentUserProfile, allProjects, currentUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Open Edit Profile modal with existing values
  const handleOpenEdit = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditUsername(profile.username || '');
    setEditBio(profile.bio || '');
    setEditSkills(profile.skills ? profile.skills.join(', ') : '');
    setEditAvatar(profile.avatar || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingEdit(true);
    try {
      const skillsArray = editSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updates: Partial<UserProfile> = {
        name: editName.trim() || profile.name,
        username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || profile.username,
        bio: editBio.trim(),
        skills: skillsArray,
        avatar: editAvatar.trim() || profile.avatar,
      };

      updateUserProfile(updates);
      await apiClient.updateUser(targetId, updates);
      await loadProfile();
      await refreshUsers();
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Follow / Unfollow actions
  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile || actionInProgress) return;
    setActionInProgress(true);
    try {
      if (profile.followStatus === 'following' || profile.followStatus === 'requested') {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      await loadProfile();
    } catch (e) {
      console.error('Follow action failed:', e);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRespondFollow = async (action: 'accept' | 'decline') => {
    if (!profile || isOwnProfile || actionInProgress) return;
    setActionInProgress(true);
    try {
      await respondFollowRequest(profile.id, action);
      await loadProfile();
    } catch (e) {
      console.error('Respond follow failed:', e);
    } finally {
      setActionInProgress(false);
    }
  };

  // Open Followers modal
  const handleOpenFollowers = async () => {
    setFollowersModalOpen(true);
    setLoadingList(true);
    try {
      const list = await apiClient.getUserFollowers(targetId);
      setFollowersList(list);
    } catch {
      setFollowersList([]);
    } finally {
      setLoadingList(false);
    }
  };

  // Open Following modal
  const handleOpenFollowing = async () => {
    setFollowingModalOpen(true);
    setLoadingList(true);
    try {
      const list = await apiClient.getUserFollowing(targetId);
      setFollowingList(list);
    } catch {
      setFollowingList([]);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCopyProfileLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // User's projects
  const userProjects = useMemo(() => {
    return allProjects.filter(
      (p) => p.ownerId === targetId || (p.teamMembers && p.teamMembers.some((m) => m.id === targetId))
    );
  }, [allProjects, targetId]);

  // Filtered projects by tab
  const filteredProjects = useMemo(() => {
    switch (activeTab) {
      case 'completed':
        return userProjects.filter((p) => p.status === 'completed');
      case 'revived':
        return userProjects.filter((p) => p.status === 'revived');
      case 'active':
        return userProjects.filter((p) => p.status === 'active');
      default:
        return userProjects;
    }
  }, [userProjects, activeTab]);

  // Accurate Success Rate calculation: (completed + revived) / total * 100
  const totalCount = userProjects.length;
  const completedCount = userProjects.filter((p) => p.status === 'completed').length;
  const revivedCount = userProjects.filter((p) => p.status === 'revived').length;
  const calculatedSuccessRate =
    totalCount > 0 ? Math.round(((completedCount + revivedCount) / totalCount) * 100) : 0;

  if (loading && !profile) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B2FE8] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-[var(--color-text-body)]">Loading creator profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8">
        <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-50" />
        <h2 className="text-xl font-bold text-[var(--color-text)]">Profile Not Found</h2>
        <p className="text-sm text-[var(--color-text-body)]">
          The requested creator profile does not exist or has been removed from the archive.
        </p>
        <Link to="/discover">
          <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
            Explore Discover Archive
          </Button>
        </Link>
      </div>
    );
  }

  // Initials fallback
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* ================= 1. INSTAGRAM-INSPIRED PROFILE HEADER ================= */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 md:p-10 shadow-[var(--shadow-card)] overflow-hidden">
        {/* Subtle decorative atmospheric background lighting */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-[#8B2FE8]/15 via-[#C026D3]/10 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-[#4568DC]/10 via-[#8B2FE8]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
          {/* Circular Profile Avatar with Glowing Brand Accent Ring */}
          <div className="relative shrink-0 group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#4568DC] via-[#8B2FE8] to-[#C026D3] shadow-[0_0_24px_rgba(139,47,232,0.35)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--color-surface)] border-2 border-[var(--color-surface)] flex items-center justify-center">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2D1D42] to-[#1E142B] flex items-center justify-center text-white font-bold text-2xl sm:text-3xl font-mono">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            {/* Status indicator pip */}
            <div
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#10B981] border-2 border-[var(--color-surface)] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              title="Active Digital Gardener"
            />
          </div>

          {/* Profile Identity Details */}
          <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
            {/* Top row: Name, Handle, Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {profile.name}
                </h1>
                <p className="text-xs sm:text-sm font-mono text-[var(--color-text-secondary)] mt-0.5">
                  @{profile.username || 'creator'}
                </p>
              </div>

              {/* Action Buttons: Own Profile vs Other User */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-1 sm:pt-0">
                {isOwnProfile ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleOpenEdit}
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit Profile
                    </Button>
                    <Link to="/settings">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Settings className="w-3.5 h-3.5" />}
                        title="Archive Settings"
                      >
                        Settings
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Incoming request from target to current user */}
                    {profile.followStatus === 'incoming_request' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleRespondFollow('accept')}
                          icon={<Check className="w-3.5 h-3.5" />}
                          disabled={actionInProgress}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRespondFollow('decline')}
                          icon={<X className="w-3.5 h-3.5" />}
                          disabled={actionInProgress}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={handleFollowToggle}
                        disabled={actionInProgress}
                        className={`h-[38px] px-5 rounded-[var(--radius-md)] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                          profile.followStatus === 'following'
                            ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-red-500/50 hover:text-red-400'
                            : profile.followStatus === 'requested'
                            ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                            : 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white hover:brightness-110 shadow-[0_0_16px_rgba(139,47,232,0.35)]'
                        }`}
                      >
                        {profile.followStatus === 'following' ? (
                          <>
                            <UserCheck className="w-4 h-4 text-[#34D399]" />
                            <span>Following</span>
                          </>
                        ) : profile.followStatus === 'requested' ? (
                          <>
                            <Clock className="w-4 h-4 text-[#FBBF24]" />
                            <span>Requested</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}

                    <Link to={`/discover?creator=${encodeURIComponent(profile.name)}`}>
                      <Button size="sm" variant="secondary" icon={<FolderOpen className="w-3.5 h-3.5" />}>
                        Projects
                      </Button>
                    </Link>
                  </>
                )}

                <button
                  onClick={handleCopyProfileLink}
                  className="h-[38px] w-[38px] rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] flex items-center justify-center transition-colors cursor-pointer"
                  title="Share profile link"
                  aria-label="Share profile link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#34D399]" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bio text */}
            <p className="text-sm text-[var(--color-text-body)] leading-relaxed max-w-2xl">
              {profile.bio || 'Digital gardener archiving creative concepts, prototypes, and open architectures.'}
            </p>

            {/* Core Skills Pills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. PROFILE STATISTICS ROW (Instagram Style) ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 mt-8 pt-6 border-t border-[var(--color-border)]">
          {/* Stat 1: Followers (Clickable -> Opens Modal) */}
          <button
            onClick={handleOpenFollowers}
            className="p-3 sm:p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[#8B2FE8]/40 hover:bg-[var(--color-surface-hover)] transition-all text-center cursor-pointer group"
          >
            <span className="block text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight font-mono group-hover:text-[#C026D3] transition-colors">
              {profile.followersCount ?? 0}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-[#8B2FE8]" /> Followers
            </span>
          </button>

          {/* Stat 2: Following (Clickable -> Opens Modal) */}
          <button
            onClick={handleOpenFollowing}
            className="p-3 sm:p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[#8B2FE8]/40 hover:bg-[var(--color-surface-hover)] transition-all text-center cursor-pointer group"
          >
            <span className="block text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight font-mono group-hover:text-[#C026D3] transition-colors">
              {profile.followingCount ?? 0}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <UserCheck className="w-3 h-3 text-[#8B2FE8]" /> Following
            </span>
          </button>

          {/* Stat 3: Total Projects */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <span className="block text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight font-mono">
              {totalCount}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <FolderOpen className="w-3 h-3 text-[#38BDF8]" /> Projects
            </span>
          </div>

          {/* Stat 4: Completed Projects */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <span className="block text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight font-mono text-[#34D399]">
              {completedCount}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-[#34D399]" /> Completed
            </span>
          </div>

          {/* Stat 5: Success Rate: (Completed + Revived) / Total * 100 */}
          <div
            className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-[#8B2FE8]/10 via-[#C026D3]/5 to-transparent border border-[#8B2FE8]/30 text-center col-span-2 sm:col-span-1"
            title="Success Rate = (Completed + Revived) / Total Projects * 100"
          >
            <span className="block text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight font-mono">
              {calculatedSuccessRate}%
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center justify-center gap-1 mt-0.5">
              <Award className="w-3 h-3 text-[#C026D3]" /> Success Rate
            </span>
          </div>
        </div>
      </div>

      {/* ================= 3. PROJECT SHOWCASE TABS & GRID ================= */}
      <div className="space-y-6">
        {/* Navigation & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#8B2FE8]" />
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
              Case Files & Archive
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              {filteredProjects.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {(
              [
                { id: 'all', label: 'All Projects', count: totalCount },
                { id: 'completed', label: 'Completed', count: completedCount },
                { id: 'revived', label: 'Revived', count: revivedCount },
                {
                  id: 'active',
                  label: 'Active',
                  count: userProjects.filter((p) => p.status === 'active').length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white font-semibold shadow-[0_0_12px_rgba(139,47,232,0.3)]'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center space-y-3">
            <FolderOpen className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[var(--color-text)]">No projects in this category</h3>
            <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
              {isOwnProfile
                ? 'Plant a new project or revive existing concepts to populate your public portfolio.'
                : 'This creator does not have any projects matching the selected filter.'}
            </p>
            {isOwnProfile && (
              <Link to="/projects/new">
                <Button variant="primary" size="sm">
                  Plant New Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredProjects.map((project) => (
              <ProfileProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* ================= 4. EDIT PROFILE MODAL ================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Creator Profile"
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Display Name *"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Alex Rivera"
          />

          <Input
            label="Username / Handle *"
            required
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            placeholder="e.g. alexrivera"
            hint="Alphanumeric lowercase handle without spaces"
          />

          <Textarea
            label="Bio & Digital Gardening Philosophy"
            rows={3}
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="Share your focus, tech passion, and current explorations..."
          />

          <Input
            label="Core Skills (comma separated)"
            value={editSkills}
            onChange={(e) => setEditSkills(e.target.value)}
            placeholder="React, TypeScript, PostGIS, UI Design"
          />

          <Input
            label="Avatar Image URL (Optional)"
            value={editAvatar}
            onChange={(e) => setEditAvatar(e.target.value)}
            placeholder="https://..."
            hint="Direct image URL for your profile avatar"
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= 5. FOLLOWERS MODAL ================= */}
      <Modal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        title="Followers"
        size="sm"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {loadingList ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
              Loading followers...
            </div>
          ) : followersList.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-body)]">
              No followers yet.
            </div>
          ) : (
            followersList.map(({ user, status }) => (
              <div
                key={user.id}
                onClick={() => {
                  setFollowersModalOpen(false);
                  navigate(`/profile/${user.id}`);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-surface-subtle)] border border-[var(--color-border)] shrink-0 flex items-center justify-center font-bold text-xs">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate">{user.name}</p>
                    <p className="text-[11px] font-mono text-[var(--color-text-secondary)] truncate">
                      @{user.username || user.id}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                    status === 'following'
                      ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30'
                      : 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                  }`}
                >
                  {status}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ================= 6. FOLLOWING MODAL ================= */}
      <Modal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        title="Following"
        size="sm"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {loadingList ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
              Loading following list...
            </div>
          ) : followingList.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-body)]">
              Not following anyone yet.
            </div>
          ) : (
            followingList.map(({ user }) => (
              <div
                key={user.id}
                onClick={() => {
                  setFollowingModalOpen(false);
                  navigate(`/profile/${user.id}`);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-surface-subtle)] border border-[var(--color-border)] shrink-0 flex items-center justify-center font-bold text-xs">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate">{user.name}</p>
                    <p className="text-[11px] font-mono text-[var(--color-text-secondary)] truncate">
                      @{user.username || user.id}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  Following
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function ProfileProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const Icon = CATEGORY_ICONS[project.category] || FolderOpen;

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="card card-clickable flex flex-col justify-between group select-none relative overflow-hidden transition-all duration-200 hover:-translate-y-1"
    >
      <div>
        {/* Cover / Placeholder Banner */}
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
                {project.category || 'Case File'}
              </span>
            </div>
          )}

          {/* Status badge in top right corner of card */}
          <div className="absolute top-2.5 right-2.5">
            <Badge status={project.status} size="sm" />
          </div>
        </div>

        {/* Project Header */}
        <div className="space-y-1 mb-2">
          <span className="text-[10px] font-mono uppercase font-semibold text-[var(--color-text-secondary)]">
            {project.category || 'General'}
          </span>
          <h3
            className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition-colors line-clamp-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {project.title}
          </h3>
        </div>

        {/* Summary text */}
        <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-3">
          {project.summary}
        </p>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {project.languages.concat(project.frameworks).slice(0, 3).map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-mono border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-body)]"
            >
              {item}
            </span>
          ))}
          {project.languages.concat(project.frameworks).length > 3 && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] self-center">
              +{project.languages.concat(project.frameworks).length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Progress and inspect link */}
      <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--color-text-secondary)]">Completeness</span>
          <span className="font-semibold text-[var(--color-text)]">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} size="sm" />
      </div>
    </div>
  );
}

export default ProfilePage;