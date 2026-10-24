import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  Sparkles,
  RotateCcw,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Users,
  Settings as SettingsIcon,
  BookOpen,
  History,
  Bot,
  Zap,
  Check,
  Upload,
  FileCode,
  Copy,
  ShieldCheck,
  Play,
  Pause,
  Archive,
  XCircle,
  Target,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import {
  Project,
  ProjectStatus,
  ProjectVisibility,
  Priority,
  AIChatMessage,
} from '../types';
import {
  Button,
  Badge,
  ProgressBar,
  Modal,
  ConfirmDialog,
  Avatar,
  Input,
  Textarea,
  Select,
  Github,
} from '../components/ui';

interface StatusOption {
  status: ProjectStatus;
  label: string;
  badgeLabel: string;
  description: string;
  icon: typeof Play;
  consequential?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'active',
    label: 'Active Development',
    badgeLabel: 'Active',
    description: 'Sprint is in progress. Milestones and tasks are actively being developed and unblocked.',
    icon: Play,
  },
  {
    status: 'paused',
    label: 'Paused (Graveyard)',
    badgeLabel: 'Paused',
    description: 'Development is temporarily put on hold. All blockers, context, and code progress remain preserved.',
    icon: Pause,
  },
  {
    status: 'revived',
    label: 'Revived',
    badgeLabel: 'Revived',
    description: 'Project has been actively resurrected or pivoted through a chosen revival roadmap.',
    icon: RotateCcw,
  },
  {
    status: 'completed',
    label: 'Completed & Shipped',
    badgeLabel: 'Completed',
    description: 'Core deliverables achieved. Project is officially shipped and marked complete.',
    icon: CheckCircle2,
  },
  {
    status: 'abandoned',
    label: 'Abandoned',
    badgeLabel: 'Abandoned',
    description: 'Development discontinued with no active plans to resume. Retrospective memory is retained for harvesting.',
    icon: XCircle,
    consequential: true,
  },
  {
    status: 'archived',
    label: 'Archived (Cold Storage)',
    badgeLabel: 'Archived',
    description: 'Preserved in read-only cold storage. Hidden from active dashboards while keeping historical data.',
    icon: Archive,
    consequential: true,
  },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    projects,
    updateProject,
    deleteProject,
    duplicateProject,
    changeProjectStatus,
    reviveProject,
    addMilestone,
    deleteMilestone,
    addTask,
    toggleTaskComplete,
    deleteTask,
  } = useApp();

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'tasks' | 'docs' | 'timeline' | 'ai' | 'team' | 'settings'
  >('overview');

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(() => searchParams.get('statusModal') === 'true');
  const [selectedNewStatus, setSelectedNewStatus] = useState<ProjectStatus>(() => project?.status || 'paused');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [showRevivalModal, setShowRevivalModal] = useState(false);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<{ milestoneId: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddTimelineModal, setShowAddTimelineModal] = useState(false);

  // Form states
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskWeight, setNewTaskWeight] = useState(3);
  const [customTimelineNote, setCustomTimelineNote] = useState('');

  // Revival Path form
  const [revivalPath, setRevivalPath] = useState<
    'restart' | 'continue' | 'change-idea' | 'repurpose' | 'archive'
  >('continue');
  const [revivalNote, setRevivalNote] = useState('');
  const [revivalNewGoal, setRevivalNewGoal] = useState('');

  // AI Chat state
  const [aiInput, setAiInput] = useState('');
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'm-welcome',
      role: 'assistant',
      content: `Hello Alex! I am your AI Revival Guide for **${project?.title || 'this project'}**. I have analyzed your blockers, tech stack, and milestone history. How can I help revive or improve this project today?`,
      timestamp: new Date().toISOString(),
      isSimulated: true,
      suggestions: [
        {
          id: 'sug-1',
          type: 'add-task',
          label: 'Add Blocker Resolution Milestone',
          description: 'Create an actionable task to benchmark low-cost alternatives.',
          applied: false,
          data: {
            title: 'Audit and prototype low-cost alternative architecture',
            priority: 'critical',
            weight: 4,
          },
        },
      ],
    },
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Project Not Found</h2>
        <p className="text-[var(--color-text-secondary)] text-sm">
          The project you are looking for does not exist or has been removed.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  // Calculate Revival Readiness score & factors
  const readiness = calculateReadiness(project);

  // Milestone and task statistics
  const allTasks = project.milestones.flatMap((m) => m.tasks);
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const completedMilestones = project.milestones.filter(
    (m) => m.tasks.length > 0 && m.tasks.every((t) => t.status === 'completed')
  );

  // Date formatting helpers
  const formatDisplayDate = (isoString?: string) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatMonthYear = (isoString?: string) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Status Change handlers
  const handleOpenStatusModal = (initialStatus?: ProjectStatus) => {
    setSelectedNewStatus(initialStatus || project.status);
    setStatusNote('');
    setStatusError(null);
    setShowStatusModal(true);
  };

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNewStatus === project.status && !statusNote.trim()) {
      setShowStatusModal(false);
      return;
    }
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      changeProjectStatus(project.id, selectedNewStatus, statusNote.trim() || undefined);
      setShowStatusModal(false);
      setStatusNote('');
    } catch (err: any) {
      setStatusError(err.message || 'Failed to update project status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDirectStatusChange = (newStatus: ProjectStatus, note: string) => {
    try {
      changeProjectStatus(project.id, newStatus, note);
    } catch (err: any) {
      console.error('Failed to change status:', err);
    }
  };

  // AI prompt handler
  const handleSendAi = async (promptText?: string) => {
    const text = promptText || aiInput;
    if (!text.trim()) return;

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!promptText) setAiInput('');
    setAiTyping(true);

    try {
      const response = await apiClient.askAiAssistant(project.id, text);
      setChatMessages((prev) => [...prev, response]);
    } catch {
      const fallback = generateAiResponse(text, project);
      setChatMessages((prev) => [...prev, fallback]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleApplyAiSuggestion = (msgId: string, sugId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map((s) => {
              if (s.id === sugId) {
                if (s.type === 'add-task' && project.milestones.length > 0) {
                  addTask(project.id, project.milestones[0].id, {
                    title: String(s.data.title || 'Suggested AI Action'),
                    priority: (s.data.priority as Priority) || 'high',
                    weight: Number(s.data.weight) || 3,
                    status: 'todo',
                  });
                } else if (s.type === 'change-status') {
                  changeProjectStatus(
                    project.id,
                    (s.data.status as ProjectStatus) || 'active',
                    'Applied AI recommendation'
                  );
                } else if (s.type === 'update-field' && s.data.field && s.data.value) {
                  updateProject(
                    project.id,
                    { [String(s.data.field)]: s.data.value },
                    'Applied AI recommendation'
                  );
                }
                return { ...s, applied: true };
              }
              return s;
            }),
          };
        }
        return msg;
      })
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAtt = {
      id: `att-${Date.now().toString(36)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    updateProject(
      project.id,
      { attachments: [newAtt, ...project.attachments] },
      `Uploaded document asset "${file.name}"`
    );

    if (e.target) e.target.value = '';
  };

  const handleExecuteRevival = () => {
    reviveProject(project.id, revivalPath, revivalNote, revivalNewGoal);
    setShowRevivalModal(false);
    setRevivalNote('');
    setRevivalNewGoal('');
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    addMilestone(project.id, {
      title: newMilestoneTitle.trim(),
      description: newMilestoneDesc.trim() || undefined,
    });
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setShowAddMilestoneModal(false);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddTaskModal || !newTaskTitle.trim()) return;
    addTask(project.id, showAddTaskModal.milestoneId, {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      weight: newTaskWeight,
      status: 'todo',
    });
    setNewTaskTitle('');
    setShowAddTaskModal(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Navigation & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors self-start cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Project Archive</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Change Status Control */}
          <button
            onClick={() => handleOpenStatusModal()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            title="Change project lifecycle state"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <span>Change Status</span>
          </button>

          {/* Revival Action / Studio Trigger */}
          <button
            onClick={() => setShowRevivalModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-white hover:opacity-95 text-xs sm:text-sm font-semibold transition-opacity shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Revival Action</span>
          </button>

          {/* AI Companion Quick Toggle */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[var(--color-surface-subtle)] border-[var(--color-brand)] text-[var(--color-brand)] font-semibold'
                : 'border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Companion</span>
          </button>

          {/* Edit */}
          <button
            onClick={() => navigate(`/projects/${project.id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors text-xs sm:text-sm font-medium cursor-pointer"
            title="Edit Project"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Duplicate / Clone */}
          <button
            onClick={() => {
              const cloned = duplicateProject(project.id);
              navigate(`/projects/${cloned.id}`);
            }}
            className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            title="Duplicate Project Case File"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Case File Identity Header */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3.5 flex-1 min-w-0">
            {/* Metadata Badges & Lifecycle Dates */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge status={project.status} size="md" />

              <Badge variant="tech" size="sm">
                {project.category}
              </Badge>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {project.visibility === 'public' ? 'Public' : project.visibility === 'team' ? 'Team Access' : 'Private Case File'}
              </span>

              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                Planted {formatMonthYear(project.startDate) || 'Unknown'}
              </span>

              {project.pauseDate && (project.status === 'paused' || project.status === 'abandoned') && (
                <span className="text-xs text-[var(--color-status-paused)] flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  Paused {formatMonthYear(project.pauseDate)}
                </span>
              )}

              {project.completionDate && project.status === 'completed' && (
                <span className="text-xs text-[var(--color-success)] flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed {formatMonthYear(project.completionDate)}
                </span>
              )}
            </div>

            {/* Project Title (High-contrast near-white #F8F7FB) */}
            <h1
              className="text-2xl md:text-4xl font-bold text-[var(--color-text)] tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {project.title}
            </h1>

            {/* Concise 1-2 sentence project summary (High-contrast neutral #E1DCE9) */}
            <p className="text-sm md:text-base text-[var(--color-text-body)] max-w-3xl leading-relaxed">
              {project.summary}
            </p>

            {/* Resource Actions (Repository, Live Demo, Docs only when present) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {project.repoUrl ? (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  <span>Repository</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-subtle)]/60 px-3 py-1.5 rounded-xl border border-[var(--color-border)]/60">
                  <Github className="w-3.5 h-3.5 opacity-40" />
                  <span>No repository linked</span>
                </span>
              )}

              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[var(--color-status-active)]" />
                  <span>Live Demo</span>
                </a>
              )}

              {project.readmeUrl && (
                <a
                  href={project.readmeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  <span>Documentation</span>
                </a>
              )}

              <button
                onClick={() => handleOpenStatusModal()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:underline ml-1 cursor-pointer"
              >
                <span>Status:</span>
                <span className="capitalize font-semibold text-[var(--color-text)]">{project.status}</span>
                <span className="text-[10px] text-[var(--color-brand)] font-mono">(change)</span>
              </button>
            </div>
          </div>

          {/* Quick Progress Snapshot Widget */}
          <div className="w-full lg:w-72 bg-[var(--color-surface-subtle)] rounded-2xl p-5 border border-[var(--color-border)] flex flex-col justify-between space-y-4 shrink-0">
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1.5 font-medium">
                <span>Weighted Progress</span>
                <span className="font-mono text-[var(--color-text)] font-bold text-sm">
                  {project.progress}%
                </span>
              </div>
              <ProgressBar value={project.progress} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block font-medium uppercase font-mono">
                  Milestones
                </span>
                <span className="font-mono font-bold text-[var(--color-text)] text-sm">
                  {completedMilestones.length}/{project.milestones.length}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] block font-medium uppercase font-mono">
                  Blockers
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    project.technicalBlockers.length > 0 ? 'text-[var(--color-status-paused)]' : 'text-[var(--color-success)]'
                  }`}
                >
                  {project.technicalBlockers.length}
                </span>
              </div>
            </div>

            <Button
              variant="coral"
              size="sm"
              onClick={() => setShowRevivalModal(true)}
              className="w-full justify-center shadow-xs"
            >
              Choose Revival Path
            </Button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] pt-2 -mb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Case File', icon: BookOpen },
            { id: 'tasks', label: 'Tasks & Milestones', icon: Layers, count: allTasks.length },
            { id: 'docs', label: 'Documentation & Files', icon: FileCode, count: project.attachments.length },
            { id: 'timeline', label: 'Memory & Timeline', icon: History, count: project.timeline.length },
            { id: 'ai', label: 'AI Companion', icon: Bot },
            { id: 'team', label: 'Team', icon: Users, count: project.teamMembers.length },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'border-[var(--color-brand)] text-[var(--color-text)] font-semibold'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-[var(--color-brand)] text-white font-bold'
                        : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PAUSED PROJECT CALLOUT BANNER (Visible whenever project is paused) */}
      {project.status === 'paused' && (
        <div className="rounded-2xl border border-[var(--color-status-paused)]/40 bg-[var(--color-status-paused-soft)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-status-paused)]/20 text-[var(--color-status-paused)] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text)]">
                  Paused Project Case File
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-status-paused)]/20 text-[var(--color-status-paused)] font-bold uppercase tracking-wider">
                  Development Frozen
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed max-w-3xl">
                This project is on hold. You can resume active development immediately, launch a guided recovery plan in Revival Studio, pivot the concept, or transition it into long-term preservation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 md:self-center">
            <button
              onClick={() => handleDirectStatusChange('active', 'Resumed active sprint from paused state')}
              className="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-[var(--color-status-active)]" />
              <span>Resume Development</span>
            </button>

            <button
              onClick={() => navigate(`/revival-studio?project=${project.id}`)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-xs font-semibold text-white hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Revival Studio</span>
            </button>

            <button
              onClick={() => handleOpenStatusModal()}
              className="px-3 py-2 rounded-xl bg-transparent border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer"
            >
              Change Status...
            </button>
          </div>
        </div>
      )}

      {/* ABANDONED PROJECT CALLOUT BANNER (Visible whenever project is abandoned) */}
      {project.status === 'abandoned' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-danger)] flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text)]">
                  Abandoned Project Archive
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] uppercase tracking-wider">
                  Preserved Record
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed max-w-3xl">
                Development on this project ceased. Retrospective lessons, blockers, and architecture are preserved for historical reference and code asset harvesting.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 md:self-center">
            <button
              onClick={() => setShowRevivalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-xs font-semibold text-white hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revive Project</span>
            </button>

            <button
              onClick={() => handleOpenStatusModal()}
              className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            >
              Change Status...
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Content Display */}
      <div className="mt-2">
        {/* ================= 1. OVERVIEW & CASE FILE TAB ================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8-col: Main Dossier & Narrative */}
            <div className="lg:col-span-8 space-y-6">
              {/* SECTION 1: PROJECT BRIEF & INTENT */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] border-l-4 border-l-[var(--color-brand)] p-6 md:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--color-brand)]" />
                    <h2 className="text-base md:text-lg font-bold text-[var(--color-text)] tracking-tight">
                      Project Case Brief
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Dossier Core
                  </span>
                </div>

                {/* Original Spark & Premise */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
                    Original Idea & Spark
                  </h3>
                  <div className="bg-[var(--color-surface-subtle)] p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] text-sm sm:text-base text-[var(--color-text-body)] italic leading-relaxed">
                    "{project.originalIdea || project.summary}"
                  </div>
                </div>

                {/* Target Goal & Core Problem */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
                    Target Goal & Problem Statement
                  </h3>
                  <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)]/60 border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed">
                    {project.goal || project.description}
                  </div>
                </div>

                {/* Full Description */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
                    Full Description
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>

                {/* Tags and Target Audience */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs font-mono text-[var(--color-text-secondary)] mr-1">Tags:</span>
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="tag" size="sm">
                      #{tag}
                    </Badge>
                  ))}
                  {project.targetAudience && (
                    <span className="text-xs text-[var(--color-text-muted)] font-mono ml-auto">
                      Audience: <strong className="text-[var(--color-text-secondary)]">{project.targetAudience}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 2: WHY IT PAUSED & TECHNICAL FRICTION */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-status-paused)]" />
                    <h2 className="text-base md:text-lg font-bold text-[var(--color-text)] tracking-tight">
                      Why It Paused & Technical Obstacles
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {project.technicalBlockers.length} Blockers
                  </span>
                </div>

                {/* Recorded Pause Reason */}
                {project.whyStopped ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-subtle)] border-l-4 border-l-[var(--color-status-paused)] border border-[var(--color-border)] space-y-1.5">
                    <span className="text-xs font-bold text-[var(--color-status-paused)] font-mono uppercase tracking-wider block">
                      Recorded Pause Rationale
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed">
                      {project.whyStopped}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] italic">
                    No specific pause rationale was documented when this project entered the graveyard.
                  </div>
                )}

                {/* Technical Blockers List */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
                    Technical Blockers & Bottlenecks
                  </h3>

                  {project.technicalBlockers.length > 0 ? (
                    <div className="space-y-2.5">
                      {project.technicalBlockers.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]"
                        >
                          <span className="font-mono text-xs font-bold text-[var(--color-status-paused)] mt-0.5 bg-[var(--color-surface)] px-2 py-0.5 rounded-md border border-[var(--color-border)] shrink-0">
                            [{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}]
                          </span>
                          <span className="text-xs sm:text-sm text-[var(--color-text-body)] font-medium leading-relaxed flex-1">
                            {b}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-[var(--color-text-body)] bg-[var(--color-surface-subtle)] p-4 rounded-2xl border border-[var(--color-border)] flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                      <span>No unresolved technical blockers recorded. The codebase is clean to resume.</span>
                    </div>
                  )}
                </div>

                {/* Lessons Learned & Retrospective */}
                {project.lessonsLearned && project.lessonsLearned.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[var(--color-border)]">
                    <h3 className="text-xs uppercase font-bold text-[var(--color-text-secondary)] tracking-wider font-mono">
                      Lessons Learned & Retrospective
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-text-body)]">
                      {project.lessonsLearned.map((l, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-[var(--color-brand)] font-bold text-xs mt-0.5 shrink-0">▪</span>
                          <span className="leading-relaxed">{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* SECTION 3: ROADMAP & FEATURE STATUS */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-[var(--color-brand)]" />
                    <h2 className="text-base md:text-lg font-bold text-[var(--color-text)] tracking-tight">
                      Feature Roadmap & Completeness
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {project.completedFeatures.length + project.inProgressFeatures.length + project.plannedFeatures.length} Features
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Completed */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-success)] flex items-center gap-1.5 font-mono uppercase">
                        <Check className="w-3.5 h-3.5" /> Completed
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        ({project.completedFeatures.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {project.completedFeatures.length === 0 ? (
                        <div className="text-xs p-3.5 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] italic">
                          None completed yet
                        </div>
                      ) : (
                        project.completedFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] flex items-start gap-2 leading-relaxed"
                          >
                            <span className="text-[var(--color-success)] font-bold">✓</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-status-active)] flex items-center gap-1.5 font-mono uppercase">
                        <Play className="w-3 h-3" /> In Progress
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        ({project.inProgressFeatures.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {project.inProgressFeatures.length === 0 ? (
                        <div className="text-xs p-3.5 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] italic">
                          None currently active
                        </div>
                      ) : (
                        project.inProgressFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] flex items-start gap-2 leading-relaxed"
                          >
                            <span className="text-[var(--color-status-active)] font-mono text-[10px] mt-0.5">❚❚</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Planned */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-secondary)] flex items-center gap-1.5 font-mono uppercase">
                        <Plus className="w-3.5 h-3.5" /> Planned
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        ({project.plannedFeatures.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {project.plannedFeatures.length === 0 ? (
                        <div className="text-xs p-3.5 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] italic">
                          None planned
                        </div>
                      ) : (
                        project.plannedFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-start gap-2 leading-relaxed"
                          >
                            <span className="text-[var(--color-text-muted)]">+</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: RECOVERY PLAN & PRACTICAL NEXT ACTIONS */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                    <h2 className="text-base md:text-lg font-bold text-[var(--color-text)] tracking-tight">
                      Recovery Plan & Practical Next Actions
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-accent-soft)] text-[#E879F9] border border-[var(--color-accent)]/30 font-semibold self-start sm:self-auto">
                    Suggestion: {readiness.recommendedPath}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Based on current progress ({project.progress}%) and recorded blockers, here are concrete recommended actions to move this project forward:
                </p>

                {/* Practical Next Steps */}
                <div className="space-y-2.5">
                  {project.nextSteps && project.nextSteps.length > 0 ? (
                    project.nextSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-body)]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[var(--color-brand)]/20 text-[var(--color-brand)] flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-body)]">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-brand)]/20 text-[var(--color-brand)] flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                          1
                        </span>
                        <span className="leading-relaxed">
                          Address initial technical blocker: benchmark alternative APIs or quantized local models in AI Companion.
                        </span>
                      </div>
                      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-body)]">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-brand)]/20 text-[var(--color-brand)] flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                          2
                        </span>
                        <span className="leading-relaxed">
                          Scope a concise 48-hour MVP focusing on a single verified export or interaction loop.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action CTA Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    Actions are suggestions, not automatic project changes.
                  </span>
                  <button
                    onClick={() => navigate(`/revival-studio?project=${project.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-white hover:opacity-95 text-xs font-semibold transition-opacity self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    <span>Analyze in Revival Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right 4-col: Snapshot, Readiness, Tech, Ownership */}
            <div className="lg:col-span-4 space-y-6">
              {/* Progress & Vitals Snapshot */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase font-mono tracking-wider">
                    Progress & Vitals
                  </h3>
                  <span className="font-mono text-base font-bold text-[var(--color-text)]">
                    {project.progress}%
                  </span>
                </div>

                <ProgressBar value={project.progress} size="sm" />

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase block mb-0.5">
                      Milestones Done
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--color-text)]">
                      {completedMilestones.length} / {project.milestones.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase block mb-0.5">
                      Tasks Completed
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--color-text)]">
                      {completedTasks.length} / {allTasks.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase block mb-0.5">
                      Blockers
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        project.technicalBlockers.length > 0 ? 'text-[var(--color-status-paused)]' : 'text-[var(--color-success)]'
                      }`}
                    >
                      {project.technicalBlockers.length} Active
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase block mb-0.5">
                      Timeline Events
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--color-text)]">
                      {project.timeline.length} Logged
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenStatusModal()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-text)] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                  <span>Update Lifecycle Status</span>
                </button>
              </div>

              {/* Revival Readiness */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                    Revival Readiness
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${readiness.badgeClass}`}>
                    {readiness.score}/100
                  </span>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Transparent readiness score calculated from code completion, blocker severity, and active team resources:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Code & Scaffolding</span>
                    <span className="font-mono font-semibold text-[var(--color-text)]">
                      {readiness.codeProgressScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Blocker Severity</span>
                    <span className="font-mono font-semibold text-[var(--color-text)]">
                      {readiness.blockerScore}% clear
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Team & Collaboration</span>
                    <span className="font-mono font-semibold text-[var(--color-text)]">
                      {readiness.teamScore}% ready
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                  <span className="font-semibold block mb-0.5 text-[var(--color-text)] font-mono text-[11px] uppercase tracking-wider">
                    Recommended Path:
                  </span>
                  {readiness.recommendedPath}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevivalModal(true)}
                  className="w-full justify-center"
                >
                  Choose Revival Path
                </Button>
              </div>

              {/* Technologies & Ecosystem */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase font-mono tracking-wider border-b border-[var(--color-border)] pb-3">
                  Technologies & Ecosystem
                </h3>

                <div className="space-y-4">
                  {/* Languages & Frameworks */}
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2 font-mono">
                      Languages & Frameworks
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.languages.concat(project.frameworks).map((tech) => (
                        <Badge key={tech} variant="tech" size="sm">
                          {tech}
                        </Badge>
                      ))}
                      {project.languages.length === 0 && project.frameworks.length === 0 && (
                        <span className="text-xs text-[var(--color-text-muted)] italic">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Libraries & APIs */}
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2 font-mono">
                      Libraries & APIs
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.libraries.concat(project.apis).map((item) => (
                        <Badge key={item} variant="tag" size="sm">
                          {item}
                        </Badge>
                      ))}
                      {project.libraries.length === 0 && project.apis.length === 0 && (
                        <span className="text-xs text-[var(--color-text-muted)] italic">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Infrastructure & Tools */}
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2 font-mono">
                      Infrastructure & Tools
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tools.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-body)] border border-[var(--color-border)] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                      {project.tools.length === 0 && (
                        <span className="text-xs text-[var(--color-text-muted)] italic">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ownership & Team Summary */}
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase font-mono tracking-wider">
                    Project Custodian
                  </h3>
                  <button
                    onClick={() => setActiveTab('team')}
                    className="text-xs text-[var(--color-brand)] hover:underline font-mono"
                  >
                    View Team ({project.teamMembers.length})
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar name={project.ownerName || 'Alex Rivera'} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-[var(--color-text)] block truncate">
                      {project.ownerName || 'Alex Rivera'}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                      Owner & Project Lead
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. TASKS & MILESTONES TAB ================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Milestones & Interactive Tasks
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Completing tasks dynamically recalculates the project's weighted progress score.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddMilestoneModal(true)}
              >
                <Plus className="w-4 h-4" /> Add Milestone
              </Button>
            </div>

            <div className="space-y-5">
              {project.milestones.length === 0 ? (
                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center space-y-3">
                  <Layers className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
                  <h4 className="text-base font-semibold text-[var(--color-text)]">No Milestones Recorded</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
                    Break down this project into actionable milestones and granular engineering tasks.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddMilestoneModal(true)}
                  >
                    Create First Milestone
                  </Button>
                </div>
              ) : (
                project.milestones.map((m, mIdx) => {
                  const mCompleted = m.tasks.filter((t) => t.status === 'completed').length;
                  const mTotal = m.tasks.length;
                  const isDone = mTotal > 0 && mCompleted === mTotal;

                  return (
                    <div
                      key={m.id}
                      className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 md:p-6 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                              isDone
                                ? 'bg-[var(--color-success)] text-white'
                                : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-body)]'
                            }`}
                          >
                            {mIdx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
                              {m.title}
                              {isDone && <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />}
                            </h4>
                            {m.description && (
                              <p className="text-xs text-[var(--color-text-secondary)]">{m.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                            {mCompleted}/{mTotal} tasks done
                          </span>
                          <button
                            onClick={() => setShowAddTaskModal({ milestoneId: m.id })}
                            className="flex items-center gap-1 text-xs text-[var(--color-brand)] font-semibold hover:underline cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Task
                          </button>
                          <button
                            onClick={() => deleteMilestone(project.id, m.id)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {m.tasks.length === 0 ? (
                          <p className="text-xs text-[var(--color-text-muted)] italic py-2">
                            No tasks in this milestone yet. Click "Add Task" to create one.
                          </p>
                        ) : (
                          m.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                task.status === 'completed'
                                  ? 'bg-[var(--color-surface-subtle)]/40 border-[var(--color-border)]/50 opacity-75'
                                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={task.status === 'completed'}
                                  onChange={() => toggleTaskComplete(project.id, m.id, task.id)}
                                  className="w-4 h-4 accent-[#8B2FE8] rounded cursor-pointer"
                                />
                                <span
                                  className={`text-xs sm:text-sm font-medium truncate ${
                                    task.status === 'completed'
                                      ? 'line-through text-[var(--color-text-muted)]'
                                      : 'text-[var(--color-text)]'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant={`priority-${task.priority}` as any}
                                  size="sm"
                                >
                                  {task.priority}
                                </Badge>
                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                  wt: {task.weight}
                                </span>
                                <button
                                  onClick={() => deleteTask(project.id, m.id, task.id)}
                                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= 3. DOCUMENTATION & FILES TAB ================= */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 space-y-4 shadow-xs">
                <h3
                  className="text-base font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Architecture & README Documentation
                </h3>
                <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-4 md:p-5 border border-[var(--color-border)] text-xs sm:text-sm font-mono text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap">
{`# ${project.title}

${project.summary}

## Architecture Overview
- Frontend: ${project.frameworks.join(', ') || 'React'}
- Languages: ${project.languages.join(', ') || 'TypeScript'}
- Core Services: ${project.apis.join(', ') || 'REST API'}
- Storage & Tools: ${project.tools.join(', ') || 'SQLite / Local Storage'}

## Setup Instructions
1. ${project.repoUrl ? `Clone repository from ${project.repoUrl}` : 'No repository linked yet (link in Project Settings)'}
2. Run \`npm install\` or appropriate package dependency manager
3. Configure environment variables in \`.env.local\`
4. Run dev server via \`npm run dev\`
`}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-base font-semibold text-[var(--color-text)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Files & Screenshots ({project.attachments.length})
                  </h3>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" /> Attach File / Spec
                  </Button>
                </div>

                {project.attachments.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-secondary)] py-4 italic">
                    No files or attachments uploaded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {project.attachments.map((att) => (
                      <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-[var(--color-brand)]" />
                          <span className="font-medium text-[var(--color-text)]">{att.name}</span>
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            updateProject(project.id, {
                              attachments: project.attachments.filter((a) => a.id !== att.id),
                            });
                          }}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-3 shadow-xs">
                <h4 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                  <Github className="w-4 h-4 text-[var(--color-text-secondary)]" /> GitHub Integration
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {project.repoUrl ? 'Repository linked via Git URL.' : 'No repository linked yet.'}
                </p>
                <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] text-xs space-y-1.5 border border-[var(--color-border)] font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Connection Status:</span>
                    <span className={`font-semibold ${project.repoUrl ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                      {project.repoUrl ? 'Ready' : 'Not Linked (Optional)'}
                    </span>
                  </div>
                  {project.repoUrl && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Default Branch:</span>
                      <span className="text-[var(--color-text)]">main</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. MEMORY & TIMELINE TAB ================= */}
        {activeTab === 'timeline' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Project Memory Timeline
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Chronological log of every status change, milestone, pause, and revival.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTimelineModal(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Note to Timeline
              </Button>
            </div>

            <div className="relative border-l-2 border-[var(--color-border)] ml-4 pl-6 space-y-6">
              {project.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--color-brand)] border-4 border-[var(--color-page)] shadow-xs" />

                  <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 md:p-5 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1 font-mono">
                      <span className="font-semibold text-[var(--color-brand)] uppercase tracking-wider text-[10px]">
                        {event.type}
                      </span>
                      <span>
                        {formatDisplayDate(event.timestamp) || event.timestamp}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-[var(--color-text)]">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-[var(--color-text-body)] mt-1.5 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. AI REVIVAL GUIDE TAB ================= */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] flex flex-col h-[600px] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)]">Revival AI Companion</h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-[var(--color-brand)]" />
                      Isolated Context • Server AI Active
                    </p>
                  </div>
                </div>
                <Badge variant="tag" size="sm">
                  {project.title}
                </Badge>
              </div>

              <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4 scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--color-brand)] text-white rounded-br-none'
                          : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-body)] border border-[var(--color-border)] rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-[var(--color-border)] space-y-2">
                          <span className="text-[11px] font-semibold text-[var(--color-text)] block font-mono uppercase tracking-wider">
                            Suggested Actions:
                          </span>
                          {msg.suggestions.map((sug) => (
                            <div
                              key={sug.id}
                              className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3"
                            >
                              <div className="text-xs">
                                <span className="font-semibold text-[var(--color-text)] block">{sug.label}</span>
                                <span className="text-[var(--color-text-secondary)]">{sug.description}</span>
                              </div>
                              <Button
                                size="sm"
                                variant={sug.applied ? 'outline' : 'primary'}
                                disabled={sug.applied}
                                onClick={() => handleApplyAiSuggestion(msg.id, sug.id)}
                              >
                                {sug.applied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Applied
                                  </>
                                ) : (
                                  'Apply to Project'
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] italic py-2">
                    <Bot className="w-4 h-4 animate-spin text-[var(--color-brand)]" /> AI is reasoning about {project.title}...
                  </div>
                )}
              </div>

              <div className="p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAi();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask AI how to unblock milestones, pivot the stack, or scope an MVP..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!aiInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 space-y-3 shadow-xs">
                <h4 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--color-brand)]" /> Suggested Prompts
                </h4>
                <div className="space-y-2">
                  {[
                    'Help solve my technical blocker',
                    'Suggest a smaller MVP to launch this week',
                    'Recommend alternative cost-effective technologies',
                    'Improve this idea for hackathon demo appeal',
                    'Generate a 3-step revival roadmap',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAi(prompt)}
                      className="w-full text-left p-3 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs text-[var(--color-text-body)] transition-colors leading-relaxed cursor-pointer"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. TEAM TAB ================= */}
        {activeTab === 'team' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Team Members & Collaborators
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  People collaborating on nurturing this project back to life.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus className="w-4 h-4" /> Invite Member
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 flex items-start gap-3 shadow-xs"
                >
                  <Avatar name={member.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">{member.name}</h4>
                      <Badge variant="tech" size="sm">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Availability: {member.availability}</p>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {member.skills.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 text-[#E879F9] font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 7. SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 space-y-6 shadow-xs">
            <h3
              className="text-lg font-semibold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project Settings
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2 font-mono">
                  Visibility
                </label>
                <select
                  value={project.visibility}
                  onChange={(e) =>
                    updateProject(project.id, { visibility: e.target.value as ProjectVisibility })
                  }
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="private">Private (Only You)</option>
                  <option value="team">Team (Invited collaborators)</option>
                  <option value="public">Public (Discoverable by community)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-[var(--color-border)] space-y-3.5">
                <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-mono">
                  Lifecycle Controls & Danger Zone
                </h4>

                {/* Change status control */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text)] block">
                      Change Project Status
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Current: <strong className="capitalize">{project.status}</strong>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStatusModal()}
                  >
                    Change Status
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text)] block">Archive this Project</span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Hide from active garden lists while preserving history.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = project.status === 'archived' ? 'active' : 'archived';
                      changeProjectStatus(project.id, next, `Toggled archive status to ${next}`);
                    }}
                  >
                    {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text)] block">
                      Delete Project Permanently
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Erase all records, tasks, and history.
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FUNCTIONAL PROJECT STATUS CHANGER MODAL ================= */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change Project Lifecycle Status"
        size="lg"
      >
        <form onSubmit={handleStatusChangeSubmit} className="space-y-5">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-secondary)]">Current Project Status:</span>
            <Badge status={project.status} size="md" />
          </div>

          <p className="text-xs text-[var(--color-text-secondary)]">
            Choose a valid lifecycle status. This updates project dates, dashboards, and timeline without modifying tasks, blockers, or milestone progress:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedNewStatus === opt.status;

              return (
                <div
                  key={opt.status}
                  onClick={() => setSelectedNewStatus(opt.status)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}`} />
                      <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                        {opt.label}
                      </span>
                    </div>
                    <Badge status={opt.status} size="sm" />
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Consequential Warning */}
          {(selectedNewStatus === 'abandoned' || selectedNewStatus === 'archived') && (
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-start gap-2.5 text-xs text-[var(--color-text-body)]">
              <AlertTriangle className="w-4 h-4 text-[var(--color-status-paused)] shrink-0 mt-0.5" />
              <span>
                <strong>Consequential Change:</strong> Marking this project as{' '}
                <strong className="capitalize">{selectedNewStatus}</strong> will remove it from active sprint lists. All data and retrospects remain intact, and you can reactivate it at any time.
              </span>
            </div>
          )}

          {/* Optional Transition Note */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase font-mono tracking-wider block mb-1.5">
              Transition Note or Reason (Logged to Project Timeline):
            </label>
            <Input
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Unblocking after team review, or pausing while evaluating alternate APIs..."
            />
          </div>

          {statusError && (
            <div className="p-3 rounded-xl bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-xs">
              {statusError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => setShowStatusModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? 'Saving...' : 'Apply Status Change'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= 5 REVIVAL PATHS SELECTOR MODAL ================= */}
      <Modal
        isOpen={showRevivalModal}
        onClose={() => setShowRevivalModal(false)}
        title="Revival Path Selector"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            Every unfinished project has a unique destiny. Choose the revival pathway that matches your next chapter:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'restart',
                title: '1. Fresh Restart',
                desc: 'Reset progress to 0% with a clean slate, while preserving all past memory and lessons.',
                badge: 'Clean Slate',
              },
              {
                id: 'continue',
                title: '2. Continue Momentum',
                desc: 'Resume immediately from current tasks and milestones. Unpause and start building.',
                badge: 'Resume',
              },
              {
                id: 'change-idea',
                title: '3. Change Idea (Pivot)',
                desc: 'Evolve the core premise into a new angle while archiving the original thesis.',
                badge: 'Pivot Concept',
              },
              {
                id: 'repurpose',
                title: '4. Repurpose Assets',
                desc: 'Harvest existing frontend UI, database models, or backend APIs for a totally new app.',
                badge: 'Harvest Code',
              },
              {
                id: 'archive',
                title: '5. Museum Archive',
                desc: 'Preserve the project in the digital museum vault without guilt or active sprint alarms.',
                badge: 'Preserve',
              },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setRevivalPath(p.id as any)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  revivalPath === p.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">{p.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {(revivalPath === 'change-idea' || revivalPath === 'repurpose') && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] block mb-1">
                New Concept / Target Goal:
              </label>
              <Input
                value={revivalNewGoal}
                onChange={(e) => setRevivalNewGoal(e.target.value)}
                placeholder="What is the new updated vision?"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--color-text)] block mb-1">
              Revival Note / Log Entry (Saved to Timeline):
            </label>
            <Input
              value={revivalNote}
              onChange={(e) => setRevivalNote(e.target.value)}
              placeholder="e.g. Swapped expensive API for local Ollama, unblocked MVP scope."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevivalModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="coral"
              size="sm"
              onClick={handleExecuteRevival}
            >
              Execute Revival Path
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={showAddMilestoneModal}
        onClose={() => setShowAddMilestoneModal(false)}
        title="Add Project Milestone"
      >
        <form onSubmit={handleAddMilestoneSubmit} className="space-y-4">
          <Input
            label="Milestone Title"
            required
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="e.g. Core Database Schema & API Setup"
          />
          <Textarea
            label="Description (Optional)"
            rows={2}
            value={newMilestoneDesc}
            onChange={(e) => setNewMilestoneDesc(e.target.value)}
            placeholder="Key deliverables required for this milestone..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddMilestoneModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={!!showAddTaskModal}
        onClose={() => setShowAddTaskModal(null)}
        title="Add Task to Milestone"
      >
        <form onSubmit={handleAddTaskSubmit} className="space-y-4">
          <Input
            label="Task Title"
            required
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Write Dockerfile and test locally"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">Weight (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(Number(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddTaskModal(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Timeline Note Modal */}
      <Modal
        isOpen={showAddTimelineModal}
        onClose={() => setShowAddTimelineModal(false)}
        title="Add Memory Note to Timeline"
      >
        <div className="space-y-4">
          <Textarea
            label="Note or Retrospective Entry"
            rows={3}
            value={customTimelineNote}
            onChange={(e) => setCustomTimelineNote(e.target.value)}
            placeholder="Document an architectural insight, team change, or new idea..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddTimelineModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (customTimelineNote.trim()) {
                  updateProject(project.id, {}, customTimelineNote.trim());
                  setCustomTimelineNote('');
                  setShowAddTimelineModal(false);
                }
              }}
            >
              Save to Timeline
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Collaborator"
      >
        <div className="space-y-4">
          <Input label="Collaborator Name" placeholder="e.g. Jordan Smith" />
          <Input label="Email address" placeholder="jordan@domain.com" />
          <Select
            label="Role"
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowInviteModal(false)}
            >
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteProject(project.id);
          navigate('/projects');
        }}
        title={`Permanently delete "${project.title}"?`}
        message="This will remove the project from your garden and cannot be recovered."
        confirmLabel="Delete Project"
        confirmVariant="danger"
      />
    </div>
  );
}

function calculateReadiness(project: Project) {
  let score = 50;
  const codeProgressScore = project.progress;
  score += Math.round(codeProgressScore * 0.3);
  const blockerScore = Math.max(0, 100 - project.technicalBlockers.length * 35);
  score -= project.technicalBlockers.length * 15;
  const teamScore = Math.min(100, project.teamMembers.length * 40);
  score = Math.max(15, Math.min(95, score));

  let label = 'Moderate Revival Effort';
  let badgeClass = 'bg-[var(--color-surface-subtle)] text-[var(--color-text)] border border-[var(--color-border)] font-mono';
  let recommendedPath = 'Continue with Blocker Resolution';

  if (score >= 75) {
    label = 'Ready to Revive Now';
    badgeClass = 'bg-[var(--color-brand)] text-white font-mono';
    recommendedPath = 'Resume via "Continue Momentum"';
  } else if (score < 40) {
    label = 'High Friction / Needs Pivot';
    badgeClass = 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-mono';
    recommendedPath = 'Choose "Change Idea (Pivot)" or "Repurpose Assets"';
  }

  return {
    score,
    label,
    badgeClass,
    recommendedPath,
    codeProgressScore,
    blockerScore,
    teamScore,
  };
}

function generateAiResponse(prompt: string, project: Project): AIChatMessage {
  const p = prompt.toLowerCase();
  const now = new Date().toISOString();

  if (p.includes('blocker') || p.includes('rate limit') || p.includes('cost')) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `I analyzed the blocker for **${project.title}** regarding *"${project.technicalBlockers[0] || 'infrastructure bottlenecks'}"*.\n\n### Recommended Architectural Fix:\n1. **Local Model Routing**: Replace 80% of routine AST checks with a self-hosted or quantized local model (like Llama-3-8B or DeepSeek-Coder) to drop API costs from $0.35/run to $0.00.\n2. **Commit SHA Caching**: Cache prompt results keyed by hash so repeated PR checks cost zero tokens.\n3. **Pruning AST Trees**: Avoid sending whole files—strip comments and untouched functions before bundling payload.`,
      timestamp: now,
      isSimulated: true,
      suggestions: [
        {
          id: `sug-${Date.now()}`,
          type: 'add-task',
          label: 'Add Task: Prototype Local Model Fallback',
          description: 'Adds an action item to test local Llama 3 inference.',
          applied: false,
          data: {
            title: 'Benchmark local Llama 3 quantized model to resolve rate limits',
            priority: 'critical',
            weight: 5,
          },
        },
      ],
    };
  }

  if (p.includes('mvp') || p.includes('smaller')) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `Here is a stripped-down, high-impact MVP scope for **${project.title}** that you can build in 48 hours:\n\n- **Cut**: Multi-room synchronization and complex video mesh.\n- **Keep**: The core ${project.category} value proposition: 1 instant interactive view + 1 verified export format.\n- **Launch Target**: Ship directly on Product Hunt or Hacker News Show as a single focused tool.`,
      timestamp: now,
      isSimulated: true,
    };
  }

  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: `Great question regarding **${project.title}**! Based on its current progress of **${project.progress}%** and tech stack (${project.languages.join(', ')}):\n\nI recommend prioritizing the first pending milestone to rebuild momentum. You already completed key features like ${project.completedFeatures[0] || 'the initial scaffold'}. Taking on 1 small task today will bring this idea back into an active garden state!`,
    timestamp: now,
    isSimulated: true,
  };
}

export default ProjectDetailPage;
