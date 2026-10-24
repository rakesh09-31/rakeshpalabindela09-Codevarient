import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Check,
  X,
  UserPlus,
  FolderOpen,
  Trash2,
  Settings,
  Shield,
  ShieldCheck,
  Globe,
  Lock,
  Calendar,
  Clock,
  ArrowRight,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  LogOut,
  UserCheck,
  Tag,
  ListTodo,
  TrendingUp,
  BarChart2,
  Share2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  TeamMember,
  TeamVisibility,
  TeamJoinPolicy,
  TeamTask,
  TeamTaskPriority,
  TeamTaskStatus,
  TeamActivityEvent,
  TeamComment,
  TeamAnalytics,
  TeamInvitation,
} from '../types';
import {
  Avatar,
  Badge,
  Button,
  Modal,
  Input,
  Textarea,
  ConfirmDialog,
  ProgressBar,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { apiClient } from '../services/apiClient';

type WorkspaceTab = 'overview' | 'projects' | 'tasks' | 'activity' | 'members' | 'discussions' | 'analytics';

export function TeamsPage() {
  const {
    teams,
    projects,
    userProfile,
    createTeam,
    updateTeam,
    deleteTeam,
    transferTeamOwnership,
    leaveTeam,
    updateMemberRole,
    removeMember,
    inviteMember,
    cancelInvitation,
    approveJoinRequest,
    rejectJoinRequest,
    shareProjectWithTeam,
    unshareProjectFromTeam,
  } = useApp();

  const navigate = useNavigate();
  const { toast } = useToast();

  const currentUserId = userProfile.id || 'user-1';

  // Active Team & Active Tab
  const [activeTeamId, setActiveTeamId] = useState<string>(() => teams[0]?.id || '');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === activeTeamId) || teams[0] || null;
  }, [teams, activeTeamId]);

  useEffect(() => {
    if (activeTeam && activeTeam.id !== activeTeamId) {
      setActiveTeamId(activeTeam.id);
    }
  }, [activeTeam, activeTeamId]);

  // Current user's membership & role in active team
  const currentMember = useMemo(() => {
    if (!activeTeam) return null;
    return activeTeam.members.find((m) => m.id === currentUserId) || null;
  }, [activeTeam, currentUserId]);

  const isOwner = activeTeam?.ownerId === currentUserId || currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin';
  const canManageTeam = isOwner || isAdmin;

  // Real data state loaded for active team
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [activities, setActivities] = useState<TeamActivityEvent[]>([]);
  const [comments, setComments] = useState<TeamComment[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [_isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Load team-specific details (tasks, activities, comments, invitations, analytics)
  const loadTeamData = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setIsLoadingDetails(true);
    try {
      const [tTasks, tActs, tComms, tInvs, tAnalytics] = await Promise.allSettled([
        apiClient.getTeamTasks(teamId),
        apiClient.getTeamActivities(teamId),
        apiClient.getTeamComments(teamId),
        apiClient.getTeamInvitations(teamId),
        apiClient.getTeamAnalytics(teamId),
      ]);

      if (tTasks.status === 'fulfilled') setTasks(tTasks.value);
      if (tActs.status === 'fulfilled') setActivities(tActs.value);
      if (tComms.status === 'fulfilled') setComments(tComms.value);
      if (tInvs.status === 'fulfilled') setInvitations(tInvs.value);
      if (tAnalytics.status === 'fulfilled') setAnalytics(tAnalytics.value);
    } catch (err) {
      console.error('Error loading team details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (activeTeam?.id) {
      loadTeamData(activeTeam.id);
    }
  }, [activeTeam?.id, loadTeamData]);

  // ---------------- MODALS STATE ----------------
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false);
  const [showLeaveTeamDialog, setShowLeaveTeamDialog] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareProjectModal, setShowShareProjectModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<TeamMember | null>(null);
  const [unshareProjectTarget, setUnshareProjectTarget] = useState<{ id: string; title: string } | null>(null);

  // Form states: Create Team
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamAvatar, setTeamAvatar] = useState('');
  const [teamVisibility, setTeamVisibility] = useState<TeamVisibility>('discoverable');
  const [teamCategories, setTeamCategories] = useState('');
  const [teamJoinPolicy, setTeamJoinPolicy] = useState<TeamJoinPolicy>('request-to-join');
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  // Form states: Invite Contributor
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Form states: Share Project
  const [selectedProjectIdToShare, setSelectedProjectIdToShare] = useState('');

  // Form states: Create Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<TeamTaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskSubtasksInput, setTaskSubtasksInput] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Form states: New Comment
  const [commentContent, setCommentContent] = useState('');
  const [commentProjectId, setCommentProjectId] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Task Filter state
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>('all');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('all');
  const [taskFilterProject, setTaskFilterProject] = useState<string>('all');

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilterStatus !== 'all' && t.status !== taskFilterStatus) return false;
      if (taskFilterPriority !== 'all' && t.priority !== taskFilterPriority) return false;
      if (taskFilterAssignee !== 'all' && t.assigneeId !== taskFilterAssignee) return false;
      if (taskFilterProject !== 'all' && t.projectId !== taskFilterProject) return false;
      return true;
    });
  }, [tasks, taskFilterStatus, taskFilterPriority, taskFilterAssignee, taskFilterProject]);

  // Associated Projects
  const associatedProjects = useMemo(() => {
    if (!activeTeam) return [];
    return projects.filter((p) => activeTeam.projectIds.includes(p.id));
  }, [activeTeam, projects]);

  // Personal projects eligible to be shared with active team
  const unsharedPersonalProjects = useMemo(() => {
    if (!activeTeam) return [];
    return projects.filter((p) => p.ownerId === currentUserId && !activeTeam.projectIds.includes(p.id));
  }, [activeTeam, projects, currentUserId]);

  const pendingRequests = useMemo(() => {
    return activeTeam?.joinRequests?.filter((r) => r.status === 'pending') || [];
  }, [activeTeam]);

  // ---------------- FORM HANDLERS ----------------
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast('warning', 'Team name is required');
      return;
    }
    if (teamName.trim().length > 100) {
      toast('warning', 'Team name cannot exceed 100 characters');
      return;
    }

    setIsSubmittingTeam(true);
    try {
      const cats = teamCategories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const created = await createTeam({
        name: teamName.trim(),
        description: teamDesc.trim(),
        avatar: teamAvatar.trim() || undefined,
        visibility: teamVisibility,
        categories: cats,
        joinPolicy: teamJoinPolicy,
      });

      toast('success', `Team "${created.name}" created successfully!`);
      setActiveTeamId(created.id);
      setShowCreateTeamModal(false);
      setTeamName('');
      setTeamDesc('');
      setTeamAvatar('');
      setTeamCategories('');
    } catch (err: any) {
      toast('error', err.message || 'Failed to create team');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleEditTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    if (!teamName.trim()) {
      toast('warning', 'Team name is required');
      return;
    }

    setIsSubmittingTeam(true);
    try {
      const cats = teamCategories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const updated = await updateTeam(activeTeam.id, {
        name: teamName.trim(),
        description: teamDesc.trim(),
        avatar: teamAvatar.trim() || undefined,
        visibility: teamVisibility,
        categories: cats,
        joinPolicy: teamJoinPolicy,
      });

      toast('success', `Team "${updated.name}" updated`);
      setShowEditTeamModal(false);
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to update team');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    try {
      await deleteTeam(activeTeam.id);
      toast('success', `Team "${activeTeam.name}" dissolved. Personal projects remain intact.`);
      setShowDeleteTeamDialog(false);
      const remaining = teams.filter((t) => t.id !== activeTeam.id);
      if (remaining.length > 0) {
        setActiveTeamId(remaining[0].id);
      }
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete team');
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!activeTeam) return;
    try {
      await transferTeamOwnership(activeTeam.id, newOwnerId);
      toast('success', 'Team ownership successfully transferred');
      setShowTransferOwnershipModal(false);
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to transfer ownership');
    }
  };

  const handleLeaveTeam = async () => {
    if (!activeTeam) return;
    try {
      await leaveTeam(activeTeam.id);
      toast('success', `You have left ${activeTeam.name}`);
      setShowLeaveTeamDialog(false);
      const remaining = teams.filter((t) => t.id !== activeTeam.id);
      if (remaining.length > 0) {
        setActiveTeamId(remaining[0].id);
      }
    } catch (err: any) {
      toast('error', err.message || 'Failed to leave team');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !inviteIdentifier.trim()) {
      toast('warning', 'Please enter a valid username or email');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await inviteMember(
        activeTeam.id,
        inviteIdentifier.trim(),
        inviteRole,
        inviteMessage.trim()
      );
      toast(
        'success',
        `Invitation sent to ${res.invitation.inviteeName || res.invitation.inviteeEmail}! (${res.emailDelivery.reason})`
      );
      setInviteIdentifier('');
      setInviteMessage('');
      setShowInviteModal(false);
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to invite contributor');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!activeTeam) return;
    try {
      await cancelInvitation(activeTeam.id, invitationId);
      toast('success', 'Invitation cancelled');
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to cancel invitation');
    }
  };

  const handleShareProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !selectedProjectIdToShare) return;

    try {
      const res = await shareProjectWithTeam(activeTeam.id, selectedProjectIdToShare);
      toast('success', `"${res.project.title}" is now shared with ${activeTeam.name}`);
      setShowShareProjectModal(false);
      setSelectedProjectIdToShare('');
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to share project');
    }
  };

  const handleUnshareProject = async (projectId: string) => {
    if (!activeTeam) return;
    try {
      await unshareProjectFromTeam(activeTeam.id, projectId);
      toast('success', 'Project unshared from team workspace (project record preserved)');
      setUnshareProjectTarget(null);
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to unshare project');
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !taskTitle.trim()) {
      toast('warning', 'Task title is required');
      return;
    }

    setIsSubmittingTask(true);
    try {
      const subtasks = taskSubtasksInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((title, idx) => ({ id: `st-${Date.now()}-${idx}`, title, completed: false }));

      const linkedProj = projects.find((p) => p.id === taskProjectId);
      const assigneeMember = activeTeam.members.find((m) => m.id === taskAssigneeId);

      const newTask = await apiClient.createTeamTask({
        teamId: activeTeam.id,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        projectId: taskProjectId || undefined,
        projectTitle: linkedProj?.title,
        assigneeId: taskAssigneeId || undefined,
        assigneeName: assigneeMember?.name,
        creatorId: currentUserId,
        creatorName: currentMember?.name || 'Member',
        priority: taskPriority,
        status: 'todo',
        dueDate: taskDueDate || undefined,
        subtasks,
      });

      toast('success', `Task "${newTask.title}" created`);
      setTaskTitle('');
      setTaskDesc('');
      setTaskProjectId('');
      setTaskAssigneeId('');
      setTaskDueDate('');
      setTaskSubtasksInput('');
      setShowCreateTaskModal(false);
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to create task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: TeamTask) => {
    if (!activeTeam) return;
    const nextStatus: TeamTaskStatus =
      task.status === 'completed' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'in_progress';
    try {
      await apiClient.updateTeamTask(task.id, activeTeam.id, { status: nextStatus });
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeTeam) return;
    try {
      await apiClient.deleteTeamTask(activeTeam.id, taskId);
      toast('success', 'Task removed');
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete task');
    }
  };

  const handleCreateCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      await apiClient.createTeamComment({
        teamId: activeTeam.id,
        content: commentContent.trim(),
        projectId: commentProjectId || undefined,
        authorId: currentUserId,
        authorName: currentMember?.name || userProfile.name || 'Member',
      });
      setCommentContent('');
      toast('success', 'Comment posted');
      loadTeamData(activeTeam.id);
    } catch (err: any) {
      toast('error', err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ================= 1. HEADER & TEAM SELECTOR STRIP ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Teams & Collaboration Workspace
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                Form collectives, share project stewardship, manage team tasks, and review contributor applications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTeamName('');
              setTeamDesc('');
              setTeamAvatar('');
              setTeamCategories('');
              setTeamVisibility('discoverable');
              setTeamJoinPolicy('request-to-join');
              setShowCreateTeamModal(true);
            }}
          >
            <Plus className="w-4 h-4" /> Create Team
          </Button>
        </div>
      </div>

      {/* Team Selection Ribbon if multiple teams exist */}
      {teams.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
          <span className="text-[11px] font-mono uppercase font-bold text-[var(--color-text-muted)] pr-1 shrink-0">
            My Teams:
          </span>
          {teams.map((t) => {
            const isCurrent = t.id === activeTeam?.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTeamId(t.id);
                  loadTeamData(t.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  isCurrent
                    ? 'border-[#8B2FE8] bg-[#8B2FE8]/15 text-[var(--color-text)] font-bold shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>{t.name}</span>
                <span className="text-[10px] opacity-70 px-1 rounded bg-black/5 dark:bg-white/10">
                  {t.members.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ================= 2. ACTIVE TEAM WORKSPACE ================= */}
      {!activeTeam ? (
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">No Teams Formed Yet</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-5 max-w-sm mx-auto">
            Create a collaborative team collective to share project stewardship, assign tasks, and build together.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateTeamModal(true)}
          >
            <Plus className="w-4 h-4" /> Create Your First Team
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Team Identity Banner */}
          <div className="relative rounded-3xl border border-[#D8CFE6] dark:border-[#382B49] bg-[var(--color-surface)] p-6 sm:p-7 shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                {activeTeam.avatar ? (
                  <img
                    src={activeTeam.avatar}
                    alt={activeTeam.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-[var(--color-border)] shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center text-2xl font-bold font-mono shadow-xs shrink-0">
                    {activeTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight leading-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {activeTeam.name}
                    </h2>

                    {/* Visibility Badge */}
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${
                        activeTeam.visibility === 'discoverable'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {activeTeam.visibility === 'discoverable' ? (
                        <>
                          <Globe className="w-3 h-3" /> Discoverable
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Private
                        </>
                      )}
                    </span>

                    {/* Join Policy Badge */}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]">
                      {activeTeam.joinPolicy === 'invitation-only' ? 'Invite Only' : 'Requests Open'}
                    </span>

                    {/* Current User Role Badge */}
                    {currentMember && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold capitalize">
                        Your role: {currentMember.role}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
                    {activeTeam.description || 'No focus description set.'}
                  </p>

                  {/* Categories Pills */}
                  {activeTeam.categories && activeTeam.categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {activeTeam.categories.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 opacity-70" />
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Team Actions Dock */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                {canManageTeam && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Invite
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTeamName(activeTeam.name);
                        setTeamDesc(activeTeam.description || '');
                        setTeamAvatar(activeTeam.avatar || '');
                        setTeamVisibility(activeTeam.visibility || 'discoverable');
                        setTeamCategories((activeTeam.categories || []).join(', '));
                        setTeamJoinPolicy(activeTeam.joinPolicy || 'request-to-join');
                        setShowEditTeamModal(true);
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </>
                )}

                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTransferOwnershipModal(true)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Transfer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteTeamDialog(true)}
                      className="text-red-500 hover:text-red-600 border-red-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </>
                )}

                {!isOwner && currentMember && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLeaveTeamDialog(true)}
                    className="text-amber-600 border-amber-500/30"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Leave
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ================= 3. WORKSPACE TABS NAVIGATION ================= */}
          <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'overview', label: 'Overview', icon: Users },
              { id: 'projects', label: `Projects (${associatedProjects.length})`, icon: FolderOpen },
              { id: 'tasks', label: `Tasks (${tasks.length})`, icon: ListTodo },
              { id: 'activity', label: 'Activity Feed', icon: Activity },
              {
                id: 'members',
                label: `Members (${activeTeam.members.length})${
                  pendingRequests.length > 0 ? ` • ${pendingRequests.length} Req` : ''
                }`,
                icon: UserCheck,
              },
              { id: 'discussions', label: `Discussions (${comments.length})`, icon: MessageSquare },
              { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border-b-2 ${
                    isActive
                      ? 'border-[#8B2FE8] text-[var(--color-brand)] bg-[var(--color-surface)] shadow-xs'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Active Members
                  </span>
                  <span className="text-2xl font-bold font-mono text-[var(--color-text)]">
                    {activeTeam.members.length}
                  </span>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Stewarded Projects
                  </span>
                  <span className="text-2xl font-bold font-mono text-[var(--color-brand)]">
                    {associatedProjects.length}
                  </span>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Open Tasks
                  </span>
                  <span className="text-2xl font-bold font-mono text-[var(--color-text)]">
                    {tasks.filter((t) => t.status !== 'completed').length}
                  </span>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Completed Tasks
                  </span>
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {tasks.filter((t) => t.status === 'completed').length}
                  </span>
                </div>
              </div>

              {/* Overview 2-column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Stewarded Projects Preview */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-purple-500" />
                      Shared Projects ({associatedProjects.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('projects')}
                    >
                      View All
                    </Button>
                  </div>

                  {associatedProjects.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">
                        No projects have been shared with this team yet.
                      </p>
                      {canManageTeam && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowShareProjectModal(true)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Share Existing Project
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {associatedProjects.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#8B2FE8] transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-brand)]">
                                {p.title}
                              </h4>
                              <Badge status={p.status} size="sm" />
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                              {p.summary}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-[var(--color-text)]">
                                {p.progress}%
                              </span>
                              <div className="w-20">
                                <ProgressBar value={p.progress} size="xs" />
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Recent Team Activity Feed */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-500" />
                      Recent Activity
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('activity')}
                    >
                      View All
                    </Button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        No team activity recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
                      {activities.slice(0, 5).map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--color-text)] truncate">
                              {act.title}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                              {new Date(act.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                              {act.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PROJECTS ================= */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text)]">
                    Stewarded Team Projects
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Projects explicitly shared with {activeTeam.name}. Personal ownership remains protected.
                  </p>
                </div>

                {canManageTeam && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowShareProjectModal(true)}
                  >
                    <Plus className="w-4 h-4" /> Share Project with Team
                  </Button>
                )}
              </div>

              {associatedProjects.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                  <FolderOpen className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">
                    No Shared Projects Yet
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4 max-w-sm mx-auto">
                    Team members can share their paused, active, or revive-candidate projects into the team workspace.
                  </p>
                  {canManageTeam && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareProjectModal(true)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Share Existing Project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {associatedProjects.map((p) => {
                    const isProjectOwner = p.ownerId === currentUserId;
                    return (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#8B2FE8] transition-all space-y-3.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="text-base font-bold text-[var(--color-text)] hover:text-[var(--color-brand)] cursor-pointer"
                              >
                                {p.title}
                              </h4>
                              <Badge status={p.status} size="sm" />
                            </div>
                            <span className="text-[11px] font-mono text-[var(--color-text-muted)] block">
                              Owner: {p.ownerName || 'Alex Rivera'} • Updated{' '}
                              {new Date(p.updatedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {(isProjectOwner || canManageTeam) && (
                            <button
                              type="button"
                              onClick={() => setUnshareProjectTarget({ id: p.id, title: p.title })}
                              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Unshare from team workspace"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                          {p.summary}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)]">Progress</span>
                            <span className="font-bold text-[var(--color-text)]">{p.progress}%</span>
                          </div>
                          <ProgressBar value={p.progress} size="xs" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex flex-wrap gap-1">
                            {p.languages.concat(p.frameworks).slice(0, 3).map((tech) => (
                              <Badge key={tech} variant="tech" size="sm">
                                {tech}
                              </Badge>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/projects/${p.id}`)}
                          >
                            Case File <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: TASKS ================= */}
          {activeTab === 'tasks' && (
            <div className="space-y-5">
              {/* Task Controls & Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={taskFilterStatus}
                    onChange={(e) => setTaskFilterStatus(e.target.value)}
                    className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={taskFilterPriority}
                    onChange={(e) => setTaskFilterPriority(e.target.value)}
                    className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  {/* Assignee Filter */}
                  <select
                    value={taskFilterAssignee}
                    onChange={(e) => setTaskFilterAssignee(e.target.value)}
                    className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono cursor-pointer"
                  >
                    <option value="all">All Assignees</option>
                    {activeTeam.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  {/* Project Filter */}
                  {associatedProjects.length > 0 && (
                    <select
                      value={taskFilterProject}
                      onChange={(e) => setTaskFilterProject(e.target.value)}
                      className="h-[36px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono cursor-pointer"
                    >
                      <option value="all">All Projects</option>
                      {associatedProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateTaskModal(true)}
                >
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                  <ListTodo className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">No Tasks Found</h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4 max-w-sm mx-auto">
                    {tasks.length === 0
                      ? 'Create actionable tasks tied to your shared projects and assign them to team members.'
                      : 'No tasks match the active filters.'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateTaskModal(true)}
                  >
                    <Plus className="w-4 h-4" /> Add New Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((t) => {
                    const isCompleted = t.status === 'completed';
                    const isOverdue =
                      !isCompleted && t.dueDate && new Date(t.dueDate).getTime() < Date.now();

                    return (
                      <div
                        key={t.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-[var(--color-surface-subtle)]/60 border-[var(--color-border)] opacity-75'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[#8B2FE8] shadow-xs'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t)}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-[var(--color-border-strong)] hover:border-[#8B2FE8]'
                            }`}
                            title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-sm font-bold text-[var(--color-text)] ${
                                  isCompleted ? 'line-through opacity-70' : ''
                                }`}
                              >
                                {t.title}
                              </h4>

                              {/* Priority badge */}
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase ${
                                  t.priority === 'urgent'
                                    ? 'bg-red-500/15 text-red-600 border border-red-500/30'
                                    : t.priority === 'high'
                                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                    : t.priority === 'low'
                                    ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                                    : 'bg-zinc-500/15 text-zinc-600 border border-zinc-500/30'
                                }`}
                              >
                                {t.priority}
                              </span>

                              {/* Status badge */}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] capitalize">
                                {t.status.replace('_', ' ')}
                              </span>

                              {isOverdue && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 border border-red-500/30 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                                </span>
                              )}
                            </div>

                            {t.description && (
                              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                                {t.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--color-text-muted)] pt-1">
                              {t.projectTitle && (
                                <span className="flex items-center gap-1 text-[var(--color-brand)] font-semibold">
                                  <FolderOpen className="w-3 h-3" />
                                  {t.projectTitle}
                                </span>
                              )}

                              {t.assigneeName && (
                                <span className="flex items-center gap-1">
                                  <Avatar name={t.assigneeName} size="xs" />
                                  {t.assigneeName}
                                </span>
                              )}

                              {t.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due {new Date(t.dueDate).toLocaleDateString()}
                                </span>
                              )}

                              {t.subtasks && t.subtasks.length > 0 && (
                                <span>
                                  {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length} subtasks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: ACTIVITY FEED ================= */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Team Chronological Activity Log
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Audited event stream of team changes, project shares, tasks, invitations, and discussions.
                </p>
              </div>

              {activities.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                  <Activity className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No activity recorded yet for this team.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3.5 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-4 h-4" />
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                            {act.title}
                          </h4>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {act.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                            {act.description}
                          </p>
                        )}
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] block pt-1">
                          Actor: {act.actorName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 5: MEMBERS & INVITATIONS ================= */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Active Members Card */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3
                      className="text-base font-bold text-[var(--color-text)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Active Members ({activeTeam.members.length})
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Collaborators with workspace access to {activeTeam.name}.
                    </p>
                  </div>

                  {canManageTeam && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="w-4 h-4" /> Invite Contributor
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTeam.members.map((member) => {
                    const isSelf = member.id === currentUserId;
                    const isMemberOwner = member.role === 'owner' || member.id === activeTeam.ownerId;

                    return (
                      <div
                        key={member.id}
                        className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={member.name} size="md" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                                {member.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-mono text-purple-500 font-bold">
                                  (You)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Role Selector or Badge */}
                              {isOwner && !isMemberOwner ? (
                                <select
                                  value={member.role}
                                  onChange={async (e) => {
                                    try {
                                      await updateMemberRole(
                                        activeTeam.id,
                                        member.id,
                                        e.target.value as 'admin' | 'member'
                                      );
                                      toast('success', `Updated ${member.name}'s role to ${e.target.value}`);
                                      loadTeamData(activeTeam.id);
                                    } catch (err: any) {
                                      toast('error', err.message || 'Failed to update role');
                                    }
                                  }}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-semibold cursor-pointer"
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-semibold capitalize">
                                  {member.role}
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                Availability: {member.availability}
                              </span>
                            </div>

                            {member.skills && member.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {member.skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[var(--color-text-secondary)]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Removal Action */}
                        {!isMemberOwner && (isOwner || (isAdmin && member.role === 'member')) && (
                          <button
                            type="button"
                            onClick={() => setRemoveMemberTarget(member)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Join Requests Queue */}
              {pendingRequests.length > 0 && (
                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2 font-mono uppercase tracking-wider">
                      <UserPlus className="w-4 h-4 text-purple-500" /> Pending Join Requests ({pendingRequests.length})
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      Review & onboard contributors
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={req.userName} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                                {req.userName}
                              </span>
                              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                applied {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] italic mt-0.5">
                              "{req.message}"
                            </p>
                            {req.skills && req.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {req.skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {canManageTeam && (
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={async () => {
                                await approveJoinRequest(activeTeam.id, req.id);
                                toast('success', `Approved ${req.userName}'s join request`);
                                loadTeamData(activeTeam.id);
                              }}
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await rejectJoinRequest(activeTeam.id, req.id);
                                toast('info', `Declined ${req.userName}'s request`);
                                loadTeamData(activeTeam.id);
                              }}
                            >
                              <X className="w-3.5 h-3.5" /> Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invitations Queue */}
              {invitations.length > 0 && (
                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2 font-mono uppercase tracking-wider">
                      <Send className="w-4 h-4 text-purple-500" /> Pending Invitations ({invitations.length})
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      Awaiting user acceptance
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-[var(--color-text)]">
                              {inv.inviteeName || inv.inviteeEmail}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 capitalize">
                              Role: {inv.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--color-text-muted)] font-mono block mt-0.5">
                            Invited by {inv.invitedByName} on {new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {canManageTeam && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="text-red-500 border-red-500/30 self-end sm:self-center"
                          >
                            Cancel Invitation
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 6: DISCUSSIONS ================= */}
          {activeTab === 'discussions' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Team Discussions & Comments
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Lightweight discussions tied to team projects and tasks. Mentions (@username) trigger notifications.
                </p>
              </div>

              {/* New Comment Input Box */}
              <form
                onSubmit={handleCreateCommentSubmit}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--color-text)] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Post New Note or Question
                  </span>

                  {associatedProjects.length > 0 && (
                    <select
                      value={commentProjectId}
                      onChange={(e) => setCommentProjectId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono cursor-pointer"
                    >
                      <option value="">General Discussion</option>
                      {associatedProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          Topic: {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Share a milestone update, blocker query, or @mention a collaborator..."
                  rows={2}
                  maxLength={2000}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    Tip: Use @Name to alert a collaborator
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingComment || !commentContent.trim()}
                  >
                    <Send className="w-3.5 h-3.5" /> Post Comment
                  </Button>
                </div>
              </form>

              {/* Comments Feed */}
              {comments.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                  <MessageSquare className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No discussion comments posted yet. Start a conversation above!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comm) => {
                    const isAuthor = comm.authorId === currentUserId;
                    return (
                      <div
                        key={comm.id}
                        className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={comm.authorName} size="xs" />
                            <span className="text-xs font-bold text-[var(--color-text)]">
                              {comm.authorName}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                              {new Date(comm.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {(isAuthor || canManageTeam) && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await apiClient.deleteTeamComment(activeTeam.id, comm.id);
                                  toast('success', 'Comment deleted');
                                  loadTeamData(activeTeam.id);
                                } catch (err: any) {
                                  toast('error', err.message || 'Failed to delete comment');
                                }
                              }}
                              className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {comm.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 7: ANALYTICS ================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Team Collaboration Analytics
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Transparent, factual metrics grounded in actual team records. No arbitrary productivity rankings.
                </p>
              </div>

              {!analytics || (analytics.totalTasks === 0 && analytics.activeSharedProjects === 0) ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                  <BarChart2 className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">Not Enough Data</h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
                    Analytics will populate automatically as team projects are shared and tasks are completed.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Analytics KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
                        Task Completion Rate
                      </span>
                      <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {analytics.taskCompletionRate}%
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono block mt-1">
                        {analytics.completedTasks} of {analytics.totalTasks} tasks done
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
                        Overdue Tasks
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono ${
                          analytics.overdueTasks > 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        {analytics.overdueTasks}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono block mt-1">
                        Tasks past due date
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
                        Active Shared Projects
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--color-brand)]">
                        {analytics.activeSharedProjects}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono block mt-1">
                        Currently in active development
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
                        Average Project Progress
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--color-text)]">
                        {analytics.averageProjectProgress}%
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono block mt-1">
                        Across all shared initiatives
                      </span>
                    </div>
                  </div>

                  {/* Member Contributions Breakdown */}
                  <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4 shadow-xs">
                    <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text)]">
                      Member Contributions by Activity
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Transparent accounting of completed tasks, assigned responsibilities, shared projects, and discussion notes.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                            <th className="py-2.5 px-3">Member</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3 text-right">Tasks Completed</th>
                            <th className="py-2.5 px-3 text-right">Tasks Assigned</th>
                            <th className="py-2.5 px-3 text-right">Projects Shared</th>
                            <th className="py-2.5 px-3 text-right">Discussion Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.memberContributions.map((mc) => (
                            <tr
                              key={mc.memberId}
                              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-subtle)] transition-colors"
                            >
                              <td className="py-3 px-3 flex items-center gap-2 font-bold text-[var(--color-text)]">
                                <Avatar name={mc.memberName} size="xs" />
                                <span>{mc.memberName}</span>
                              </td>
                              <td className="py-3 px-3 capitalize text-[var(--color-text-secondary)]">
                                {mc.role}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {mc.completedTasksCount}
                              </td>
                              <td className="py-3 px-3 text-right text-[var(--color-text)]">
                                {mc.assignedTasksCount}
                              </td>
                              <td className="py-3 px-3 text-right text-[var(--color-brand)] font-bold">
                                {mc.sharedProjectsCount}
                              </td>
                              <td className="py-3 px-3 text-right text-[var(--color-text-secondary)]">
                                {mc.commentsCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: CREATE TEAM ================= */}
      <Modal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        title="Create Team Collective"
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
          <Input
            label="Team Name"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Civic Labs or AudioCraft Studio"
            maxLength={100}
          />

          <Textarea
            label="Focus Description / Purpose"
            rows={3}
            value={teamDesc}
            onChange={(e) => setTeamDesc(e.target.value)}
            placeholder="What collective mission, technology, or projects unite this team?"
          />

          <Input
            label="Avatar Image URL (Optional)"
            value={teamAvatar}
            onChange={(e) => setTeamAvatar(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />

          <Input
            label="Interests & Categories (Comma-separated)"
            value={teamCategories}
            onChange={(e) => setTeamCategories(e.target.value)}
            placeholder="e.g. Climate & Sustainability, Open Source, React"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Visibility
              </label>
              <select
                value={teamVisibility}
                onChange={(e) => setTeamVisibility(e.target.value as TeamVisibility)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="discoverable">Discoverable (Public in Discover)</option>
                <option value="private">Private (Restricted to Members)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Join Policy
              </label>
              <select
                value={teamJoinPolicy}
                onChange={(e) => setTeamJoinPolicy(e.target.value as TeamJoinPolicy)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="request-to-join">Request to Join (Open Applications)</option>
                <option value="invitation-only">Invitation Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTeamModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingTeam}
            >
              Create Team Collective
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: EDIT TEAM ================= */}
      <Modal
        isOpen={showEditTeamModal}
        onClose={() => setShowEditTeamModal(false)}
        title="Edit Team Details"
      >
        <form onSubmit={handleEditTeamSubmit} className="space-y-4">
          <Input
            label="Team Name"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={100}
          />

          <Textarea
            label="Focus Description / Purpose"
            rows={3}
            value={teamDesc}
            onChange={(e) => setTeamDesc(e.target.value)}
          />

          <Input
            label="Avatar Image URL (Optional)"
            value={teamAvatar}
            onChange={(e) => setTeamAvatar(e.target.value)}
          />

          <Input
            label="Interests & Categories (Comma-separated)"
            value={teamCategories}
            onChange={(e) => setTeamCategories(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Visibility
              </label>
              <select
                value={teamVisibility}
                onChange={(e) => setTeamVisibility(e.target.value as TeamVisibility)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="discoverable">Discoverable (Public in Discover)</option>
                <option value="private">Private (Restricted to Members)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Join Policy
              </label>
              <select
                value={teamJoinPolicy}
                onChange={(e) => setTeamJoinPolicy(e.target.value as TeamJoinPolicy)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="request-to-join">Request to Join (Open Applications)</option>
                <option value="invitation-only">Invitation Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditTeamModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingTeam}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: INVITE CONTRIBUTOR ================= */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Contributor to Team"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Username or Email Address"
            required
            value={inviteIdentifier}
            onChange={(e) => setInviteIdentifier(e.target.value)}
            placeholder="e.g. elena@example.com or siddharth"
          />

          <div>
            <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
              Role in Team
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
            >
              <option value="member">Member (Can view, collaborate on projects and tasks)</option>
              <option value="admin">Admin (Can manage projects, tasks, and invite members)</option>
            </select>
          </div>

          <Textarea
            label="Personal Invitation Message (Optional)"
            rows={2}
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="Why would you like this contributor to join your team?"
          />

          <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-muted)]">
            Note: In-app invitation will be delivered immediately to the user's notifications. External SMTP email delivery will be reported as unavailable if unconfigured.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingInvite}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: SHARE PROJECT ================= */}
      <Modal
        isOpen={showShareProjectModal}
        onClose={() => setShowShareProjectModal(false)}
        title="Share Project with Team"
      >
        <form onSubmit={handleShareProjectSubmit} className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Select one of your existing projects to share with {activeTeam?.name}. You remain the project owner, and you can revoke team access at any time.
          </p>

          {unsharedPersonalProjects.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)]">
                All of your projects are already shared with this team, or you have no recorded projects yet.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Select Project
              </label>
              <select
                value={selectedProjectIdToShare}
                onChange={(e) => setSelectedProjectIdToShare(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
                required
              >
                <option value="">-- Choose a project --</option>
                {unsharedPersonalProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.status} • {p.progress}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowShareProjectModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedProjectIdToShare}
            >
              Share with Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CREATE TASK ================= */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title="Create Team Task"
      >
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
          <Input
            label="Task Title"
            required
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="e.g. Implement offline CRDT sync harness"
          />

          <Textarea
            label="Task Description"
            rows={2}
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            placeholder="Add implementation notes, acceptance criteria, or links..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Linked Project (Optional)
              </label>
              <select
                value={taskProjectId}
                onChange={(e) => setTaskProjectId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="">No linked project</option>
                {associatedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Assignee
              </label>
              <select
                value={taskAssigneeId}
                onChange={(e) => setTaskAssigneeId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="">Unassigned</option>
                {activeTeam?.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TeamTaskPriority)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[var(--color-text-secondary)] block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-mono"
              />
            </div>
          </div>

          <Textarea
            label="Subtasks / Checklist (One per line)"
            rows={3}
            value={taskSubtasksInput}
            onChange={(e) => setTaskSubtasksInput(e.target.value)}
            placeholder="Write benchmark test harness&#10;Verify memory bounds&#10;Update documentation"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTaskModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingTask}
            >
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: TRANSFER OWNERSHIP ================= */}
      <Modal
        isOpen={showTransferOwnershipModal}
        onClose={() => setShowTransferOwnershipModal(false)}
        title="Transfer Team Ownership"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Select another active team member to become the Owner of {activeTeam?.name}. You will remain an Admin on the team.
          </p>

          <div className="space-y-2">
            {activeTeam?.members
              .filter((m) => m.id !== currentUserId)
              .map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={member.name} size="xs" />
                    <div>
                      <span className="font-bold text-[var(--color-text)]">{member.name}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block capitalize">
                        Current role: {member.role}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransferOwnership(member.id)}
                  >
                    Transfer to {member.name.split(' ')[0]}
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransferOwnershipModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= CONFIRM DIALOG: DELETE TEAM ================= */}
      <ConfirmDialog
        isOpen={showDeleteTeamDialog}
        onClose={() => setShowDeleteTeamDialog(false)}
        onConfirm={handleDeleteTeam}
        title={`Delete Team "${activeTeam?.name}"?`}
        message="This will dissolve the team workspace, tasks, and discussion history. Shared projects will remain completely safe and intact in their owners' accounts."
        confirmLabel="Dissolve Team"
        confirmVariant="danger"
      />

      {/* ================= CONFIRM DIALOG: LEAVE TEAM ================= */}
      <ConfirmDialog
        isOpen={showLeaveTeamDialog}
        onClose={() => setShowLeaveTeamDialog(false)}
        onConfirm={handleLeaveTeam}
        title={`Leave "${activeTeam?.name}"?`}
        message="You will lose access to team project channels and assigned tasks."
        confirmLabel="Leave Team"
        confirmVariant="danger"
      />

      {/* ================= CONFIRM DIALOG: REMOVE MEMBER ================= */}
      <ConfirmDialog
        isOpen={!!removeMemberTarget}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={async () => {
          if (removeMemberTarget && activeTeam) {
            try {
              await removeMember(activeTeam.id, removeMemberTarget.id);
              toast('success', `Removed ${removeMemberTarget.name} from team`);
              setRemoveMemberTarget(null);
              loadTeamData(activeTeam.id);
            } catch (err: any) {
              toast('error', err.message || 'Failed to remove member');
            }
          }
        }}
        title={`Remove ${removeMemberTarget?.name}?`}
        message="This collaborator will lose access to team project channels and tasks."
        confirmLabel="Remove Contributor"
        confirmVariant="danger"
      />

      {/* ================= CONFIRM DIALOG: UNSHARE PROJECT ================= */}
      <ConfirmDialog
        isOpen={!!unshareProjectTarget}
        onClose={() => setUnshareProjectTarget(null)}
        onConfirm={() => {
          if (unshareProjectTarget) {
            handleUnshareProject(unshareProjectTarget.id);
          }
        }}
        title={`Unshare "${unshareProjectTarget?.title}"?`}
        message="The project will be removed from the team workspace. The underlying project case file and data remain completely preserved in the owner's account."
        confirmLabel="Unshare Project"
        confirmVariant="danger"
      />
    </div>
  );
}

export default TeamsPage;
