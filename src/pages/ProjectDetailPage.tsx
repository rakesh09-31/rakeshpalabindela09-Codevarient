import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit3,
  Sparkles,
  RotateCcw,
  ExternalLink,
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
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  Project,
  ProjectStatus,
  ProjectVisibility,
  Priority,
  AIChatMessage,
} from '../types';
import {
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

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-charcoal">Project Not Found</h2>
        <p className="text-charcoal-light">
          The project you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  // Calculate Revival Readiness score & factors
  const readiness = calculateReadiness(project);

  // AI prompt handler
  const handleSendAi = (promptText?: string) => {
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

    setTimeout(() => {
      const response = generateAiResponse(text, project);
      setChatMessages((prev) => [...prev, response]);
      setAiTyping(false);
    }, 900);
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
                  changeProjectStatus(project.id, (s.data.status as ProjectStatus) || 'active', 'Applied AI recommendation');
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-light hover:text-forest transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Revival Path Trigger */}
          <button
            onClick={() => setShowRevivalModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-mint-pale border border-mint text-forest hover:bg-mint-light/40 transition-colors text-xs sm:text-sm font-semibold shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-forest" />
            Revival Studio Action
          </button>

          {/* AI Assistant Quick Toggle */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors text-xs sm:text-sm font-medium ${
              activeTab === 'ai'
                ? 'bg-lavender-light border-lavender text-purple-900 font-semibold'
                : 'border-lavender text-purple-800 hover:bg-lavender-light/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Assistant
          </button>

          {/* Edit */}
          <button
            onClick={() => navigate(`/projects/${project.id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-green-border text-charcoal hover:bg-ivory-warm transition-colors text-xs sm:text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>

          {/* Clone */}
          <button
            onClick={() => {
              const cloned = duplicateProject(project.id);
              navigate(`/projects/${cloned.id}`);
            }}
            className="p-2 rounded-xl border border-gray-green-border text-charcoal-light hover:text-charcoal hover:bg-ivory-warm transition-colors"
            title="Duplicate Project"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl border border-rose-light/50 text-rose hover:bg-rose-light/20 transition-colors"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-3xl border border-gray-green-border/60 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-ivory-warm border border-gray-green-border text-charcoal">
                {project.status}
              </span>
              <Badge variant="tech" size="md">
                {project.category}
              </Badge>
              <span className="text-xs text-charcoal-light flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Started {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              {project.pauseDate && (
                <span className="text-xs text-amber flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Paused {new Date(project.pauseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            <h1
              className="text-2xl md:text-4xl font-bold text-charcoal tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {project.title}
            </h1>

            <p className="text-sm md:text-base text-charcoal-light max-w-3xl leading-relaxed">
              {project.summary}
            </p>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-charcoal font-medium hover:text-forest transition-colors bg-ivory-warm px-3 py-1.5 rounded-lg border border-gray-green-border/60"
                >
                  <Github className="w-3.5 h-3.5" /> Repository
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-teal font-medium hover:text-forest transition-colors bg-paleblue-light/40 px-3 py-1.5 rounded-lg border border-paleblue/60"
                >
                  <Globe className="w-3.5 h-3.5" /> Live Demo
                </a>
              )}
              {project.readmeUrl && (
                <a
                  href={project.readmeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-charcoal-light font-medium hover:text-charcoal transition-colors bg-ivory-warm px-3 py-1.5 rounded-lg border border-gray-green-border/60"
                >
                  <FileText className="w-3.5 h-3.5" /> Documentation
                </a>
              )}
            </div>
          </div>

          {/* Progress summary */}
          <div className="w-full lg:w-64 bg-ivory rounded-2xl p-5 border border-gray-green-border/60 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-charcoal-light mb-1.5">
                <span className="font-semibold text-charcoal">Garden Completeness</span>
                <span className="font-bold text-forest text-base">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} size="md" colorByValue />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-white border border-gray-green-border/40">
                <span className="text-[10px] text-charcoal-light block">Milestones</span>
                <span className="font-bold text-charcoal text-sm">{project.milestones.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-gray-green-border/40">
                <span className="text-[10px] text-charcoal-light block">Blockers</span>
                <span className={`font-bold text-sm ${project.technicalBlockers.length > 0 ? 'text-rose' : 'text-forest'}`}>
                  {project.technicalBlockers.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowRevivalModal(true)}
              className="w-full py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-light transition-colors text-center shadow-xs"
            >
              Choose Revival Path
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-gray-green-border/40 mt-8 -mb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'tasks', label: 'Tasks & Milestones', icon: Layers, count: project.milestones.flatMap((m) => m.tasks).length },
            { id: 'docs', label: 'Documentation & Files', icon: FileCode, count: project.attachments.length },
            { id: 'timeline', label: 'Memory & Timeline', icon: History, count: project.timeline.length },
            { id: 'ai', label: 'AI Revival Guide', icon: Bot },
            { id: 'team', label: 'Team', icon: Users, count: project.teamMembers.length },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-forest text-forest font-semibold'
                    : 'border-transparent text-charcoal-light hover:text-charcoal'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-forest text-white' : 'bg-gray-green-light/40 text-charcoal'
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
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-5">
                <div>
                  <h3 className="text-xs uppercase font-bold text-forest tracking-wider mb-1.5">
                    Original Idea & Spark
                  </h3>
                  <p className="text-sm text-charcoal leading-relaxed bg-ivory-warm p-4 rounded-xl border border-gray-green-border/40 italic">
                    "{project.originalIdea || project.summary}"
                  </p>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-bold text-forest tracking-wider mb-1.5">
                    Target Goal
                  </h3>
                  <p className="text-sm text-charcoal leading-relaxed">
                    {project.goal || project.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-bold text-forest tracking-wider mb-1.5">
                    Full Description
                  </h3>
                  <p className="text-sm text-charcoal-light leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Blockers & Why Stopped */}
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <h3 className="text-base font-semibold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <AlertTriangle className="w-5 h-5 text-amber" />
                  Blockers & Abandonment Memory
                </h3>

                {project.whyStopped && (
                  <div className="p-4 rounded-xl bg-amber-warm/40 border border-amber/30 text-xs sm:text-sm text-charcoal">
                    <span className="font-semibold text-amber block mb-1">Why this project paused:</span>
                    {project.whyStopped}
                  </div>
                )}

                {project.technicalBlockers.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-charcoal-light mb-2">Technical Blockers:</h4>
                    <div className="space-y-1.5">
                      {project.technicalBlockers.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-rose bg-rose-light/20 p-2.5 rounded-lg border border-rose-light/40">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-forest bg-mint-pale p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> No unresolved technical blockers recorded!
                  </div>
                )}

                {project.lessonsLearned && project.lessonsLearned.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-charcoal-light mb-2">Lessons Learned:</h4>
                    <ul className="list-disc list-inside text-xs sm:text-sm text-charcoal-light space-y-1">
                      {project.lessonsLearned.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Feature Matrix */}
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <h3 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Feature Roadmap Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-forest flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({project.completedFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.completedFeatures.map((f, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-mint-pale/50 border border-mint/30 text-charcoal">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> In Progress ({project.inProgressFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.inProgressFeatures.map((f, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-amber-warm/40 border border-amber/30 text-charcoal">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-charcoal-light flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Planned ({project.plannedFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {project.plannedFeatures.map((f, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-ivory-warm border border-gray-green-border/40 text-charcoal-light">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Readiness Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Zap className="w-4 h-4 text-forest" />
                    Revival Readiness
                  </h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${readiness.badgeClass}`}>
                    {readiness.label} ({readiness.score}/100)
                  </span>
                </div>

                <p className="text-xs text-charcoal-light leading-relaxed">
                  Transparent criteria calculating how easily this idea can be brought back to life:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory">
                    <span className="text-charcoal-light">Code & Scaffolding</span>
                    <span className="font-semibold text-charcoal">{readiness.codeProgressScore}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory">
                    <span className="text-charcoal-light">Blocker Severity</span>
                    <span className={`font-semibold ${readiness.blockerScore < 50 ? 'text-rose' : 'text-forest'}`}>
                      {readiness.blockerScore}% clear
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory">
                    <span className="text-charcoal-light">Team & Resources</span>
                    <span className="font-semibold text-charcoal">{readiness.teamScore}% ready</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-mint-pale/50 border border-mint/40 text-xs text-forest">
                  <span className="font-semibold block mb-0.5">Recommended Path:</span>
                  {readiness.recommendedPath}
                </div>
              </div>

              {/* Technologies */}
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <h3 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Technologies & Ecosystem
                </h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wider block mb-1.5">
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
                    <span className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wider block mb-1.5">
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
                    <span className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wider block mb-1.5">
                      Infrastructure & Tools
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tools.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-ivory-warm text-charcoal-light border border-gray-green-border">
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Milestones & Interactive Tasks
                </h3>
                <p className="text-xs text-charcoal-light">
                  Completing tasks dynamically recalculates the project's overall completeness.
                </p>
              </div>

              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-forest text-white hover:bg-forest-light transition-colors text-xs sm:text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Milestone
              </button>
            </div>

            <div className="space-y-5">
              {project.milestones.map((m, mIdx) => {
                const completedTasks = m.tasks.filter((t) => t.status === 'completed').length;
                const totalTasks = m.tasks.length;
                const isDone = totalTasks > 0 && completedTasks === totalTasks;

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-green-border/40 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isDone ? 'bg-mint text-forest' : 'bg-ivory-warm text-charcoal'
                          }`}
                        >
                          {mIdx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-charcoal flex items-center gap-2">
                            {m.title}
                            {isDone && <CheckCircle2 className="w-4 h-4 text-forest" />}
                          </h4>
                          {m.description && (
                            <p className="text-xs text-charcoal-light">{m.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs text-charcoal-light">
                          {completedTasks}/{totalTasks} tasks done
                        </span>
                        <button
                          onClick={() => setShowAddTaskModal({ milestoneId: m.id })}
                          className="flex items-center gap-1 text-xs text-forest font-semibold hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Task
                        </button>
                        <button
                          onClick={() => deleteMilestone(project.id, m.id)}
                          className="p-1 text-charcoal-light hover:text-rose transition-colors"
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
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            task.status === 'completed'
                              ? 'bg-mint-pale/20 border-mint/30'
                              : 'bg-ivory/50 border-gray-green-border/40 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={() => toggleTaskComplete(project.id, m.id, task.id)}
                              className="w-4 h-4 text-forest rounded border-gray-green focus:ring-forest cursor-pointer"
                            />
                            <span
                              className={`text-xs sm:text-sm font-medium truncate ${
                                task.status === 'completed'
                                  ? 'line-through text-charcoal-light'
                                  : 'text-charcoal'
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
                            <span className="text-[10px] text-charcoal-light">
                              wt: {task.weight}
                            </span>
                            <button
                              onClick={() => deleteTask(project.id, m.id, task.id)}
                              className="p-1 text-charcoal-light hover:text-rose"
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
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <h3 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Architecture & README Documentation
                </h3>
                <div className="bg-ivory rounded-xl p-4 border border-gray-green-border/50 text-xs sm:text-sm font-mono text-charcoal leading-relaxed whitespace-pre-wrap">
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

              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                    Files & Screenshots ({project.attachments.length})
                  </h3>
                  <button
                    onClick={() => {
                      const newAtt = {
                        id: `att-${Date.now()}`,
                        name: `screenshot_spec_${project.attachments.length + 1}.png`,
                        type: 'image/png',
                        size: 450000,
                        uploadedAt: new Date().toISOString(),
                      };
                      updateProject(project.id, {
                        attachments: [...project.attachments, newAtt],
                      }, 'Uploaded mock screenshot asset');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-green-border text-xs text-charcoal hover:bg-ivory-warm transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File (Simulated)
                  </button>
                </div>

                {project.attachments.length === 0 ? (
                  <p className="text-xs text-charcoal-light py-4 italic">No files or attachments uploaded yet.</p>
                ) : (
                  <div className="divide-y divide-gray-green-border/30">
                    {project.attachments.map((att) => (
                      <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-forest" />
                          <span className="font-medium text-charcoal">{att.name}</span>
                          <span className="text-[10px] text-charcoal-light">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            updateProject(project.id, {
                              attachments: project.attachments.filter((a) => a.id !== att.id),
                            });
                          }}
                          className="text-rose hover:underline"
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
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-3">
                <h4 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                  <Github className="w-4 h-4" /> GitHub Integration
                </h4>
                <p className="text-xs text-charcoal-light">
                  {project.repoUrl ? 'Repository linked via URL.' : 'No repository linked yet.'}
                </p>
                <div className="p-3 rounded-xl bg-ivory text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Connection Status:</span>
                    <span className="text-forest font-medium">Ready (Simulated)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Default Branch:</span>
                    <span className="text-charcoal">main</span>
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
                <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Project Memory Timeline
                </h3>
                <p className="text-xs text-charcoal-light">
                  Chronological preservation of every milestone, pause, revival, and pivot.
                </p>
              </div>

              <button
                onClick={() => setShowAddTimelineModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-green-border text-xs text-charcoal hover:bg-ivory-warm font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note to Timeline
              </button>
            </div>

            <div className="relative border-l-2 border-mint/40 ml-4 pl-6 space-y-6">
              {project.timeline.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-forest border-4 border-white shadow-xs" />

                  <div className="bg-white rounded-xl border border-gray-green-border/60 p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-charcoal-light mb-1">
                      <span className="font-semibold text-forest uppercase tracking-wider text-[10px]">
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

                    <h4 className="text-sm font-semibold text-charcoal">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-charcoal-light mt-1 leading-relaxed">
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
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-green-border/60 flex flex-col h-[600px] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-green-border/40 bg-ivory-warm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal">Revival AI Companion</h4>
                    <p className="text-[11px] text-charcoal-light">Project-aware context active • Simulated mode</p>
                  </div>
                </div>
                <Badge variant="tag" size="sm">
                  {project.title}
                </Badge>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-forest text-white rounded-br-none'
                          : 'bg-ivory border border-gray-green-border/60 text-charcoal rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-green-border/40 space-y-2">
                          <span className="text-[11px] font-semibold text-purple-900 block">
                            Suggested Actions:
                          </span>
                          {msg.suggestions.map((sug) => (
                            <div
                              key={sug.id}
                              className="p-2.5 rounded-xl bg-white border border-purple-200 flex items-center justify-between gap-2"
                            >
                              <div className="text-xs">
                                <span className="font-semibold text-purple-950 block">{sug.label}</span>
                                <span className="text-charcoal-light">{sug.description}</span>
                              </div>
                              <button
                                disabled={sug.applied}
                                onClick={() => handleApplyAiSuggestion(msg.id, sug.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  sug.applied
                                    ? 'bg-mint-pale text-forest cursor-default'
                                    : 'bg-purple-700 text-white hover:bg-purple-800'
                                }`}
                              >
                                {sug.applied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Applied
                                  </>
                                ) : (
                                  'Apply to Project'
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-charcoal-light mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex items-center gap-2 text-xs text-charcoal-light italic py-2">
                    <Bot className="w-4 h-4 animate-spin text-purple-600" /> AI is reasoning about {project.title}...
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-green-border/40 bg-white">
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
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-green-border bg-ivory focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim()}
                    className="p-2.5 rounded-xl bg-purple-700 text-white hover:bg-purple-800 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 space-y-3">
                <h4 className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Suggested Prompts
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
                      className="w-full text-left p-2.5 rounded-xl bg-ivory hover:bg-lavender-light/30 border border-gray-green-border/40 text-xs text-charcoal transition-colors leading-relaxed"
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
                <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                  Team Members & Collaborators
                </h3>
                <p className="text-xs text-charcoal-light">
                  People collaborating on nurturing this project back to life.
                </p>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest text-white hover:bg-forest-light transition-colors text-xs sm:text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Invite Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-gray-green-border/60 p-4 flex items-start gap-3 shadow-xs"
                >
                  <Avatar name={member.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-charcoal truncate">{member.name}</h4>
                      <Badge variant="tech" size="sm">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-charcoal-light mt-0.5">Availability: {member.availability}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-ivory border border-gray-green-border text-charcoal">
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
          <div className="max-w-2xl bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              Project Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-charcoal-light uppercase tracking-wider block mb-1.5">
                  Visibility
                </label>
                <select
                  value={project.visibility}
                  onChange={(e) =>
                    updateProject(project.id, { visibility: e.target.value as ProjectVisibility })
                  }
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
                >
                  <option value="private">Private (Only You)</option>
                  <option value="team">Team (Invited collaborators)</option>
                  <option value="public">Public (Discoverable by community)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-green-border/40 space-y-3">
                <h4 className="text-sm font-bold text-rose">Danger Zone</h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-ivory border border-gray-green-border/60">
                  <div>
                    <span className="text-xs font-semibold text-charcoal block">Archive this Project</span>
                    <span className="text-[11px] text-charcoal-light">Hide from active garden lists while preserving history.</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = project.status === 'archived' ? 'active' : 'archived';
                      changeProjectStatus(project.id, next);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-green-border text-xs font-medium text-charcoal hover:bg-white"
                  >
                    {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-light/20 border border-rose-light/50">
                  <div>
                    <span className="text-xs font-semibold text-rose block">Delete Project Permanently</span>
                    <span className="text-[11px] text-charcoal-light">Erase all records, tasks, and history.</span>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose text-white text-xs font-semibold hover:bg-rose/90"
                  >
                    Delete
                  </button>
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
          <p className="text-xs sm:text-sm text-charcoal-light">
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
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  revivalPath === p.id
                    ? 'border-forest bg-mint-pale/30 shadow-xs'
                    : 'border-gray-green-border/60 hover:border-gray-green bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs sm:text-sm font-bold text-charcoal">{p.title}</h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ivory border border-gray-green-border">
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-charcoal-light leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {(revivalPath === 'change-idea' || revivalPath === 'repurpose') && (
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">
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
            <label className="text-xs font-semibold text-charcoal block mb-1">
              Revival Note / Log Entry (Saved to Timeline):
            </label>
            <Input
              value={revivalNote}
              onChange={(e) => setRevivalNote(e.target.value)}
              placeholder="e.g. Swapped OpenAI API for local Ollama, resolved budget blocker."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-green-border/30">
            <button
              onClick={() => setShowRevivalModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-green-border text-xs sm:text-sm font-medium text-charcoal hover:bg-ivory-warm"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteRevival}
              className="px-5 py-2 rounded-xl bg-forest text-white text-xs sm:text-sm font-semibold hover:bg-forest-light transition-colors shadow-xs"
            >
              Execute Revival Path
            </button>
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
            <button
              type="button"
              onClick={() => setShowAddMilestoneModal(false)}
              className="px-3.5 py-2 rounded-xl border border-gray-green-border text-xs text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
            >
              Save Milestone
            </button>
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
              <label className="text-xs font-semibold text-charcoal-light block mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-green-border bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">Weight (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-green-border bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddTaskModal(null)}
              className="px-3.5 py-2 rounded-xl border border-gray-green-border text-xs text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
            >
              Add Task
            </button>
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
            <button
              onClick={() => setShowAddTimelineModal(false)}
              className="px-3 py-1.5 rounded-xl border text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (customTimelineNote.trim()) {
                  updateProject(project.id, {}, customTimelineNote.trim());
                  setCustomTimelineNote('');
                  setShowAddTimelineModal(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold"
            >
              Save to Timeline
            </button>
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
            <button
              onClick={() => setShowInviteModal(false)}
              className="px-3.5 py-2 rounded-xl border text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold"
            >
              Send Invitation
            </button>
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
  let badgeClass = 'bg-amber-warm text-amber';
  let recommendedPath = 'Continue with Blocker Resolution';

  if (score >= 75) {
    label = 'Ready to Revive Now';
    badgeClass = 'bg-mint-pale text-forest';
    recommendedPath = 'Resume via "Continue Momentum"';
  } else if (score < 40) {
    label = 'High Friction / Needs Pivot';
    badgeClass = 'bg-rose-light/30 text-rose';
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
      content: `I analyzed the blocker for **${project.title}** regarding *"${project.technicalBlockers[0] || 'infrastructure bottlenecks'}"*.\n\n### Recommended Architectural Fix:\n1. **Local Model Routing**: Replace 80% of routine AST checks with a self-hosted or quantized local model (like Llama-3-8B or DeepSeek-Coder) to drop API costs from \$0.35/run to \$0.00.\n2. **Commit SHA Caching**: Cache prompt results keyed by hash so repeated PR checks cost zero tokens.\n3. **Pruning AST Trees**: Avoid sending whole files—strip comments and untouched functions before bundling payload.`,
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
