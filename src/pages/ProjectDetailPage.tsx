import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
        <h2 className="text-2xl font-bold text-[var(--color-brand)] dark:text-indigo-100">Project Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
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

  // AI prompt handler (Server-side with context isolation)
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
                // Execute state update
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
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white transition-colors self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Revival Path Trigger */}
          <button
            onClick={() => setShowRevivalModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] dark:bg-[var(--color-accent)] dark:hover:bg-[var(--color-accent-hover)] transition-colors text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revival Action
          </button>

          {/* AI Assistant Quick Toggle */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors text-xs sm:text-sm font-medium cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-slate-100 dark:bg-indigo-950/60 border-[var(--color-brand)] dark:border-indigo-400 text-[var(--color-brand)] dark:text-indigo-200 font-semibold'
                : 'border-slate-200 dark:border-indigo-950 text-slate-700 dark:text-slate-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Companion
          </button>

          {/* Edit */}
          <button
            onClick={() => navigate(`/projects/${project.id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-indigo-950 text-slate-800 dark:text-slate-200 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 transition-colors text-xs sm:text-sm font-medium cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>

          {/* Clone */}
          <button
            onClick={() => {
              const cloned = duplicateProject(project.id);
              navigate(`/projects/${cloned.id}`);
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-indigo-950 text-slate-500 dark:text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
            title="Duplicate Project"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-indigo-950 text-slate-500 dark:text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={project.status} size="sm" />
              <Badge variant="tech" size="sm">
                {project.category}
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                Planted {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              {project.pauseDate && (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  Paused {new Date(project.pauseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            <h1
              className="text-2xl md:text-4xl font-bold text-[var(--color-brand)] dark:text-indigo-100 tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {project.title}
            </h1>

            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {project.summary}
            </p>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium hover:underline bg-slate-100 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border-strong)]"
                >
                  <Github className="w-3.5 h-3.5" /> Repository
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium hover:underline bg-slate-100 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border-strong)]"
                >
                  <Globe className="w-3.5 h-3.5" /> Live Demo
                </a>
              )}
              {project.readmeUrl && (
                <a
                  href={project.readmeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium hover:underline bg-slate-100 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border-strong)]"
                >
                  <FileText className="w-3.5 h-3.5" /> Documentation
                </a>
              )}
            </div>
          </div>

          {/* Progress Summary Card */}
          <div className="w-full lg:w-64 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl p-5 border border-slate-200/80 dark:border-indigo-950/80 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                <span>Milestone Progress</span>
                <span className="font-mono text-[var(--color-brand)] dark:text-indigo-100 font-bold">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} size="xs" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[var(--color-surface)] border border-slate-200/60 dark:border-indigo-950/60">
                <span className="text-[10px] text-slate-400 block font-medium">Milestones</span>
                <span className="font-mono font-bold text-[var(--color-brand)] dark:text-indigo-100 text-sm">{project.milestones.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[var(--color-surface)] border border-slate-200/60 dark:border-indigo-950/60">
                <span className="text-[10px] text-slate-400 block font-medium">Blockers</span>
                <span className="font-mono font-bold text-[var(--color-brand)] dark:text-indigo-100 text-sm">
                  {project.technicalBlockers.length}
                </span>
              </div>
            </div>

            <Button
              variant="coral"
              size="sm"
              onClick={() => setShowRevivalModal(true)}
              className="w-full justify-center"
            >
              Choose Revival Path
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-indigo-950/80 mt-8 -mb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'tasks', label: 'Tasks & Milestones', icon: Layers, count: project.milestones.flatMap((m) => m.tasks).length },
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
                    ? 'border-zinc-900 dark:border-[var(--color-border)] text-[var(--color-brand)] dark:text-indigo-100 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? 'bg-[var(--color-brand)] text-white dark:bg-indigo-600 dark:text-white font-bold'
                        : 'bg-slate-100 dark:bg-indigo-950/60 text-slate-500'
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

      {/* Tab Contents */}
      <div className="mt-4">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Concept & Goal */}
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-7 space-y-5 shadow-2xs">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2 font-mono">
                    Original Idea & Spark
                  </h3>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-indigo-950/60 italic">
                    "{project.originalIdea || project.summary}"
                  </p>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1.5 font-mono">
                    Target Goal
                  </h3>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {project.goal || project.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1.5 font-mono">
                    Full Description
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Blockers & Why Stopped */}
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-7 space-y-4 shadow-2xs">
                <h3
                  className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  <AlertTriangle className="w-5 h-5 text-[var(--color-brand)] dark:text-indigo-100" />
                  Blockers & Abandonment Memory
                </h3>

                {project.whyStopped && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200 dark:border-indigo-950 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-[var(--color-brand)] dark:text-indigo-100 block mb-1">
                      Why this project paused:
                    </span>
                    {project.whyStopped}
                  </div>
                )}

                {project.technicalBlockers.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 font-mono uppercase tracking-wider">
                      Technical Blockers:
                    </h4>
                    <div className="space-y-2">
                      {project.technicalBlockers.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-indigo-50/50 dark:bg-indigo-950/40 p-3 rounded-xl border border-slate-200 dark:border-indigo-950"
                        >
                          <span className="font-mono text-slate-400 text-xs mt-0.5">[{idx + 1}]</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-indigo-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-brand)] dark:text-indigo-100" />
                    <span>No unresolved technical blockers recorded.</span>
                  </div>
                )}

                {project.lessonsLearned && project.lessonsLearned.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 font-mono uppercase tracking-wider">
                      Lessons Learned:
                    </h4>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      {project.lessonsLearned.map((l, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-slate-400 dark:text-slate-600">•</span>
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Feature Matrix */}
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-7 space-y-4 shadow-2xs">
                <h3
                  className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Feature Roadmap Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-1.5 font-mono">
                      <span>✓</span> Completed ({project.completedFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.completedFeatures.length === 0 ? (
                        <div className="text-xs p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-400 italic">
                          None recorded
                        </div>
                      ) : (
                        project.completedFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60 text-slate-800 dark:text-slate-200 flex items-start gap-2"
                          >
                            <span className="text-slate-500">✓</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-1.5 font-mono">
                      <span>❚❚</span> In Progress ({project.inProgressFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.inProgressFeatures.length === 0 ? (
                        <div className="text-xs p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-400 italic">
                          None active
                        </div>
                      ) : (
                        project.inProgressFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60 text-slate-800 dark:text-slate-200 flex items-start gap-2"
                          >
                            <span className="text-slate-500 font-mono text-[10px]">❚❚</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <span>+</span> Planned ({project.plannedFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.plannedFeatures.length === 0 ? (
                        <div className="text-xs p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-400 italic">
                          None planned
                        </div>
                      ) : (
                        project.plannedFeatures.map((f, i) => (
                          <div
                            key={i}
                            className="text-xs p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60 text-slate-600 dark:text-slate-400 flex items-start gap-2"
                          >
                            <span className="text-slate-400">+</span>
                            <span>{f}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Readiness Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    <Zap className="w-4 h-4 text-[var(--color-brand)] dark:text-indigo-100" />
                    Revival Readiness
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${readiness.badgeClass}`}>
                    {readiness.score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Transparent criteria calculating how easily this idea can be brought back to life:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60">
                    <span className="text-slate-500 dark:text-slate-400">Code & Scaffolding</span>
                    <span className="font-mono font-semibold text-[var(--color-brand)] dark:text-indigo-100">
                      {readiness.codeProgressScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60">
                    <span className="text-slate-500 dark:text-slate-400">Blocker Severity</span>
                    <span className="font-mono font-semibold text-[var(--color-brand)] dark:text-indigo-100">
                      {readiness.blockerScore}% clear
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/60 dark:border-indigo-950/60">
                    <span className="text-slate-500 dark:text-slate-400">Team & Resources</span>
                    <span className="font-mono font-semibold text-[var(--color-brand)] dark:text-indigo-100">
                      {readiness.teamScore}% ready
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200/80 dark:border-indigo-950/80 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-semibold block mb-0.5 text-[var(--color-brand)] dark:text-indigo-100 font-mono text-[11px] uppercase tracking-wider">
                    Recommended Path:
                  </span>
                  {readiness.recommendedPath}
                </div>
              </div>

              {/* Technologies */}
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 space-y-4 shadow-2xs">
                <h3
                  className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Technologies & Ecosystem
                </h3>

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                      Languages & Frameworks
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.languages.concat(project.frameworks).map((tech) => (
                        <Badge key={tech} variant="tech" size="sm">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                      Libraries & APIs
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.libraries.concat(project.apis).map((item) => (
                        <Badge key={item} variant="tag" size="sm">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                      Infrastructure & Tools
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tools.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-indigo-950/60 text-slate-700 dark:text-slate-300 border border-[var(--color-border)] dark:border-[var(--color-border-strong)] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TASKS & MILESTONES TAB ================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Milestones & Interactive Tasks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Completing tasks dynamically recalculates the project's overall completeness.
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
              {project.milestones.map((m, mIdx) => {
                const completedTasks = m.tasks.filter((t) => t.status === 'completed').length;
                const totalTasks = m.tasks.length;
                const isDone = totalTasks > 0 && completedTasks === totalTasks;

                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-5 md:p-6 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-indigo-950/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                            isDone
                              ? 'bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)] dark:text-[var(--color-text)]'
                              : 'bg-slate-100 dark:bg-indigo-950/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {mIdx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-2">
                            {m.title}
                            {isDone && <CheckCircle2 className="w-4 h-4 text-[var(--color-brand)] dark:text-indigo-100" />}
                          </h4>
                          {m.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {completedTasks}/{totalTasks} tasks done
                        </span>
                        <button
                          onClick={() => setShowAddTaskModal({ milestoneId: m.id })}
                          className="flex items-center gap-1 text-xs text-[var(--color-brand)] dark:text-indigo-100 font-semibold hover:underline cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Task
                        </button>
                        <button
                          onClick={() => deleteMilestone(project.id, m.id)}
                          className="p-1 text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white transition-colors cursor-pointer"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {m.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            task.status === 'completed'
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/40/50 border-[var(--color-border)]/50 dark:border-[var(--color-border)]/80 opacity-75'
                              : 'bg-white dark:bg-[var(--color-surface)] border-slate-200/80 dark:border-indigo-950/80 hover:border-[var(--color-border)] dark:hover:border-[var(--color-border-strong)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={() => toggleTaskComplete(project.id, m.id, task.id)}
                              className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100 rounded cursor-pointer"
                            />
                            <span
                              className={`text-xs sm:text-sm font-medium truncate ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-[var(--color-brand)] dark:text-indigo-100'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant={`priority-${task.priority}` as any}
                              size="sm"
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-[10px] font-mono text-slate-400">
                              wt: {task.weight}
                            </span>
                            <button
                              onClick={() => deleteTask(project.id, m.id, task.id)}
                              className="p-1 text-slate-400 hover:text-[var(--color-brand)] dark:hover:text-white cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= DOCUMENTATION TAB ================= */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-7 space-y-4 shadow-2xs">
                <h3
                  className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Architecture & README Documentation
                </h3>
                <div className="bg-[var(--color-surface-subtle)] dark:bg-[var(--color-surface)] rounded-2xl p-4 md:p-5 border border-slate-200/80 dark:border-indigo-950/80 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
{`# ${project.title}

${project.summary}

## Architecture Overview
- Frontend: ${project.frameworks.join(', ') || 'React'}
- Languages: ${project.languages.join(', ')}
- Core Services: ${project.apis.join(', ') || 'REST API'}
- Storage: ${project.tools.join(', ') || 'Local Storage'}

## Setup Instructions
1. Clone repository from ${project.repoUrl || 'git@github.com:alexrivera/' + project.title.toLowerCase().replace(/\\s+/g, '-')}
2. Run \`npm install\` or appropriate package dependency manager
3. Configure environment variables in \`.env.local\`
4. Run dev server via \`npm run dev\`
`}
                </div>
              </div>

              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-7 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-base font-semibold text-[var(--color-brand)] dark:text-indigo-100"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 italic">
                    No files or attachments uploaded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                    {project.attachments.map((att) => (
                      <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-slate-500" />
                          <span className="font-medium text-[var(--color-brand)] dark:text-indigo-100">{att.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            updateProject(project.id, {
                              attachments: project.attachments.filter((a) => a.id !== att.id),
                            });
                          }}
                          className="text-slate-500 hover:text-[var(--color-brand)] dark:hover:text-white hover:underline cursor-pointer"
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
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 space-y-3 shadow-2xs">
                <h4 className="text-sm font-semibold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-2">
                  <Github className="w-4 h-4" /> GitHub Integration
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {project.repoUrl ? 'Repository linked via URL.' : 'No repository linked yet.'}
                </p>
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 text-xs space-y-1.5 border border-slate-200/60 dark:border-indigo-950/60 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Connection Status:</span>
                    <span className="text-[var(--color-brand)] dark:text-indigo-100 font-semibold">Ready (Simulated)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Default Branch:</span>
                    <span className="text-[var(--color-brand)] dark:text-indigo-100">main</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TIMELINE TAB ================= */}
        {activeTab === 'timeline' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Project Memory Timeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chronological preservation of every milestone, pause, revival, and pivot.
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

            <div className="relative border-l-2 border-slate-200 dark:border-indigo-950 ml-4 pl-6 space-y-6">
              {project.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--color-brand)] dark:bg-[var(--color-surface-subtle)] border-4 border-white dark:border-zinc-900 shadow-2xs" />

                  <div className="bg-white dark:bg-[var(--color-surface)] rounded-2xl border border-slate-200/80 dark:border-indigo-950/80 p-4 md:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                      <span className="font-semibold text-[var(--color-brand)] dark:text-indigo-100 uppercase tracking-wider text-[10px]">
                        {event.type}
                      </span>
                      <span>
                        {new Date(event.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-[var(--color-brand)] dark:text-indigo-100">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= AI REVIVAL GUIDE TAB ================= */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 flex flex-col h-[600px] shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-indigo-950/80 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-brand)] dark:text-indigo-100">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-brand)] dark:text-indigo-100">Revival AI Companion</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-[var(--color-brand)] dark:text-indigo-100" />
                      Authorized Context Isolated • Server AI Active
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
                          ? 'bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)] dark:text-[var(--color-text)] rounded-br-none'
                          : 'bg-[var(--color-surface-subtle)] text-[var(--color-brand)] dark:bg-[var(--color-surface-subtle)] dark:text-[var(--color-text)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)]/60 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-[var(--color-border)] dark:border-[var(--color-border-strong)] space-y-2">
                          <span className="text-[11px] font-semibold text-[var(--color-brand)] dark:text-indigo-100 block font-mono uppercase tracking-wider">
                            Suggested Actions:
                          </span>
                          {msg.suggestions.map((sug) => (
                            <div
                              key={sug.id}
                              className="p-3 rounded-xl bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)] flex items-center justify-between gap-3"
                            >
                              <div className="text-xs">
                                <span className="font-semibold text-[var(--color-brand)] dark:text-indigo-100 block">{sug.label}</span>
                                <span className="text-slate-500 dark:text-slate-400">{sug.description}</span>
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
                    <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                    <Bot className="w-4 h-4 animate-spin text-[var(--color-brand)] dark:text-indigo-100" /> AI is reasoning about {project.title}...
                  </div>
                )}
              </div>

              <div className="p-3.5 border-t border-slate-200/80 dark:border-indigo-950/80 bg-white dark:bg-[var(--color-surface)]">
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
                    placeholder="Ask AI how to overcome blockers, pivot the stack, or generate MVP scope..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/40 text-[var(--color-brand)] dark:text-indigo-100 placeholder:text-slate-400 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
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
              <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-5 space-y-3 shadow-2xs">
                <h4 className="text-sm font-semibold text-[var(--color-brand)] dark:text-indigo-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Suggested Prompts
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
                      className="w-full text-left p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-indigo-950 text-xs text-slate-800 dark:text-slate-200 transition-colors leading-relaxed cursor-pointer"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TEAM TAB ================= */}
        {activeTab === 'team' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-lg font-semibold text-[var(--color-brand)] dark:text-indigo-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Team Members & Collaborators
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
                  className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-5 flex items-start gap-3 shadow-2xs"
                >
                  <Avatar name={member.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[var(--color-brand)] dark:text-indigo-100 truncate">{member.name}</h4>
                      <Badge variant="tech" size="sm">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Availability: {member.availability}</p>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {member.skills.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-accent-soft)] dark:bg-[var(--color-accent-soft)] border border-[var(--color-accent)] dark:border-[#522927] text-[var(--color-accent)] dark:text-[var(--color-accent)] font-mono"
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

        {/* ================= SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-slate-200/80 dark:border-indigo-950/80 p-6 md:p-8 space-y-6 shadow-2xs">
            <h3
              className="text-lg font-semibold text-[var(--color-brand)] dark:text-indigo-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project Settings
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                  Visibility
                </label>
                <select
                  value={project.visibility}
                  onChange={(e) =>
                    updateProject(project.id, { visibility: e.target.value as ProjectVisibility })
                  }
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/40 text-[var(--color-brand)] dark:text-indigo-100 focus:outline-none"
                >
                  <option value="private">Private (Only You)</option>
                  <option value="team">Team (Invited collaborators)</option>
                  <option value="public">Public (Discoverable by community)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-indigo-950 space-y-3.5">
                <h4 className="text-sm font-bold text-[var(--color-brand)] dark:text-indigo-100 uppercase tracking-wider font-mono">
                  Danger Zone
                </h4>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-slate-200 dark:border-indigo-950">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-brand)] dark:text-indigo-100 block">Archive this Project</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Hide from active garden lists while preserving history.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = project.status === 'archived' ? 'active' : 'archived';
                      changeProjectStatus(project.id, next);
                    }}
                  >
                    {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-[var(--color-border)] dark:border-[var(--color-border-strong)]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-brand)] dark:text-indigo-100 block">
                      Delete Project Permanently
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
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

      {/* ================= 5 REVIVAL PATHS SELECTOR MODAL ================= */}
      <Modal
        isOpen={showRevivalModal}
        onClose={() => setShowRevivalModal(false)}
        title="Revival Path Selector"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
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
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] dark:border-[var(--color-accent)] dark:bg-[var(--color-accent-soft)] shadow-2xs'
                    : 'border-slate-200 dark:border-indigo-950 hover:border-slate-300 dark:hover:border-indigo-800 bg-white dark:bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-brand)] dark:text-indigo-100">{p.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-indigo-950/60 border border-[var(--color-border)] dark:border-[var(--color-border-strong)] text-slate-700 dark:text-slate-300">
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {(revivalPath === 'change-idea' || revivalPath === 'repurpose') && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-brand)] dark:text-indigo-100 block mb-1">
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
            <label className="text-xs font-semibold text-[var(--color-brand)] dark:text-indigo-100 block mb-1">
              Revival Note / Log Entry (Saved to Timeline):
            </label>
            <Input
              value={revivalNote}
              onChange={(e) => setRevivalNote(e.target.value)}
              placeholder="e.g. Swapped OpenAI API for local Ollama, resolved budget blocker."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-indigo-950">
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
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-indigo-950 bg-white dark:bg-[var(--color-surface)] text-[var(--color-brand)] dark:text-indigo-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Weight (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(Number(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-indigo-950 bg-white dark:bg-[var(--color-surface)] text-[var(--color-brand)] dark:text-indigo-100"
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
  let badgeClass = 'bg-[var(--color-surface-subtle)] text-[var(--color-brand)] dark:bg-[var(--color-surface-subtle)] dark:text-[var(--color-text)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)] font-mono';
  let recommendedPath = 'Continue with Blocker Resolution';

  if (score >= 75) {
    label = 'Ready to Revive Now';
    badgeClass = 'bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)] dark:text-[var(--color-text)] font-mono';
    recommendedPath = 'Resume via "Continue Momentum"';
  } else if (score < 40) {
    label = 'High Friction / Needs Pivot';
    badgeClass = 'bg-[var(--color-surface-subtle)] text-slate-600 dark:bg-[var(--color-surface-subtle)] dark:text-slate-400 border border-slate-200 dark:border-indigo-950 font-mono';
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
