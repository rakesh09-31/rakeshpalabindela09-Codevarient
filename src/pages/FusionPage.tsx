import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Merge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Code2,
  Shield,
  Workflow,
  Plus,
  Edit2,
  Check,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { Project, FusionProposal } from '../types';
import { Badge, Button } from '../components/ui';

export function FusionPage() {
  const { projects, createFusionProposal, approveFusionProposal, refreshProjects } = useApp();
  const navigate = useNavigate();

  // Multi-project selection
  const [selectedIds, setSelectedIds] = useState<string[]>(['proj-2', 'proj-5']); // CodeMentor AI + StudySync default
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<FusionProposal | null>(null);

  // Editable proposal fields
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');

  const toggleSelectProject = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));

  // Synthesize Fusion (Server-side with authorization check)
  const handleSynthesize = async () => {
    if (selectedProjects.length < 2) return;
    setIsSynthesizing(true);
    setCurrentProposal(null);

    try {
      const proposal = await apiClient.generateFusion(selectedIds);
      setCurrentProposal(proposal);
      setEditTitle(proposal.proposedTitle);
      setEditGoal(proposal.proposedGoal);
    } catch {
      const proposal = generateFusionAnalysis(selectedProjects);
      const saved = createFusionProposal(proposal);
      setCurrentProposal(saved);
      setEditTitle(saved.proposedTitle);
      setEditGoal(saved.proposedGoal);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleApprove = async () => {
    if (!currentProposal) return;
    try {
      const result = await apiClient.approveFusion(currentProposal.id, editTitle, editGoal);
      refreshProjects();
      navigate(`/projects/${result.newProject.id}`);
    } catch {
      const { newProject } = approveFusionProposal(currentProposal.id);
      refreshProjects();
      navigate(`/projects/${newProject.id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white flex items-center justify-center">
              <Merge className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[var(--color-text)]  tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              AI Project Fusion
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-1">
            Cross-pollinate compatible unfinished projects into a unified, high-conviction concept.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-subtle)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
            {selectedIds.length} projects selected
          </span>
          <Button
            variant="fusion"
            size="sm"
            disabled={selectedIds.length < 2 || isSynthesizing}
            onClick={handleSynthesize}
          >
            <Sparkles className="w-4 h-4" />
            {isSynthesizing ? 'Synthesizing Fusion...' : 'Synthesize Fusion Proposal'}
          </Button>
        </div>
      </div>

      {/* Step 1: Project Selection Matrix */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2
            className="text-base font-semibold text-[var(--color-text)]  flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span>Step 1: Choose 2 or more projects to fuse</span>
          </h2>
          <span className="text-xs text-[var(--color-text-muted)] ">
            Tip: Try pairing <strong>CodeMentor AI</strong> + <strong>StudySync</strong>, or <strong>EcoTrack</strong> + <strong>GreenRoute</strong>.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => {
            const isSelected = selectedIds.includes(project.id);
            return (
              <div
                key={project.id}
                onClick={() => toggleSelectProject(project.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-nav-selected)] shadow-[0_0_24px_rgba(139,47,232,0.18)] ring-1 ring-[var(--color-brand)]/40'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge status={project.status} size="sm" />
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[var(--color-brand)] rounded cursor-pointer"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">{project.title}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                    {project.summary}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-[var(--color-border)]">
                  {project.languages.concat(project.frameworks).slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthesis Loading Animation */}
      {isSynthesizing && (
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center space-y-4 shadow-xs animate-pulse">
          <Sparkles className="w-10 h-10 text-[var(--color-text)]  mx-auto animate-spin" />
          <h3
            className="text-lg font-bold text-[var(--color-text)]  tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AI Fusion Engine Analyzing Architectural Synergy...
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  max-w-md mx-auto leading-relaxed">
            Mapping shared tech capabilities, identifying complementary feature vectors, and calculating risk trade-offs between {selectedProjects.map((p) => p.title).join(' and ')}.
          </p>
        </div>
      )}

      {/* Step 2: The AI Fusion Canvas */}
      {currentProposal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-xs space-y-8"
        >
          {/* Canvas Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)] border-[var(--color-border)]">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="status-revived" size="sm">
                  Synthesized Proposal Ready
                </Badge>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">Simulated AI Architecture Output</span>
              </div>

              {isEditingProposal ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl md:text-2xl font-bold text-[var(--color-text)]  px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] w-full focus:outline-none"
                  />
                  <input
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="text-xs sm:text-sm text-[var(--color-text-secondary)]  px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] w-full focus:outline-none"
                  />
                </div>
              ) : (
                <div className="mt-2.5">
                  <h2
                    className="text-xl md:text-3xl font-bold text-[var(--color-text)]  tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {editTitle || currentProposal.proposedTitle}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]  mt-1 leading-relaxed">
                    {editGoal || currentProposal.proposedGoal}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProposal(!isEditingProposal)}
              >
                <Edit2 className="w-3.5 h-3.5" />
                {isEditingProposal ? 'Done Editing' : 'Edit Proposal'}
              </Button>

              <Button
                variant="fusion"
                size="sm"
                onClick={handleApprove}
              >
                <Check className="w-4 h-4" />
                Approve & Plant Fused Project
              </Button>
            </div>
          </div>

          {/* Visual Source Nodes Connection */}
          <div className="p-5 md:p-6 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]  uppercase tracking-wider block mb-4 font-mono">
              Fused Lineage & Source Dependencies
            </span>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              {selectedProjects.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs max-w-xs text-left">
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] block">Parent Source {idx + 1}</span>
                    <h4 className="text-sm font-bold text-[var(--color-text)] ">{p.title}</h4>
                    <p className="text-[11px] text-[var(--color-text-muted)]  truncate">{p.summary}</p>
                  </div>
                  {idx < selectedProjects.length - 1 && (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)]  flex items-center justify-center text-xs font-mono font-bold shadow-xs">
                      +
                    </div>
                  )}
                </div>
              ))}

              <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] mx-2 hidden sm:block" />

              <div className="p-4 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)]  shadow-xs max-w-xs text-left">
                <span className="text-[10px] font-mono text-[var(--color-text-muted)] block">Fused Concept</span>
                <h4 className="text-sm font-bold truncate">{editTitle || currentProposal.proposedTitle}</h4>
                <p className="text-[11px] text-[var(--color-text-secondary)]  truncate">New Single Cohesive App</p>
              </div>
            </div>
          </div>

          {/* Shared Capabilities & Complementary Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 md:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs">
              <h3
                className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Layers className="w-4 h-4 text-[var(--color-text)] " /> Shared Capabilities & Overlaps
              </h3>
              <div className="space-y-2">
                {currentProposal.sharedCapabilities.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-[var(--color-text)]  bg-[var(--color-surface-subtle)] p-3 rounded-xl border border-[var(--color-border)]/60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-text)]  flex-shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs">
              <h3
                className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Sparkles className="w-4 h-4 text-[var(--color-text)] " /> Complementary Feature Vectors
              </h3>
              <div className="space-y-2">
                {currentProposal.complementaryFeatures.map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-[var(--color-text)]  bg-[var(--color-surface-subtle)] p-3 rounded-xl border border-[var(--color-border)]/60"
                  >
                    <Plus className="w-4 h-4 text-[var(--color-text)]  flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Tech Stack & Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 md:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs">
              <h3
                className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Code2 className="w-4 h-4 text-[var(--color-text)] " /> Unified Technology Stack
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentProposal.proposedStack.map((tech) => (
                  <Badge key={tech} variant="tech" size="sm">
                    {tech}
                  </Badge>
                ))}
              </div>
              <div className="pt-2 text-xs text-[var(--color-text-muted)]  leading-relaxed">
                <span className="font-semibold text-[var(--color-text)]  block mb-1">Architecture Rationale:</span>
                Synthesizes the frontend ergonomics of React with low-cost server action endpoints to avoid redundant infrastructure bills.
              </div>
            </div>

            <div className="p-5 md:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-xs">
              <h3
                className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Shield className="w-4 h-4 text-[var(--color-text)] " /> Risk & Tradeoff Assessment
              </h3>
              <div className="space-y-2">
                {currentProposal.risks.map((risk, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-[var(--color-text)]  bg-[var(--color-surface-subtle)] p-3 rounded-xl border border-[var(--color-border)]"
                  >
                    <AlertTriangle className="w-4 h-4 text-[var(--color-text)]  flex-shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Proposed Fused Roadmap */}
          <div className="p-5 md:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 shadow-xs">
            <h3
              className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Workflow className="w-4 h-4 text-[var(--color-text)] " /> Proposed Fused Sprint Milestones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentProposal.proposedMilestones.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]/60 space-y-1"
                >
                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)]  uppercase">
                    Milestone {idx + 1}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)] ">{m.title}</h4>
                  <p className="text-xs text-[var(--color-text-muted)]  leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Bottom Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)] border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-muted)] ">
              Approving creates a real new project in your garden and appends lineage records to source timelines.
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={handleApprove}
            >
              Approve & Create Fused Project
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function generateFusionAnalysis(sourceProjects: Project[]): Omit<FusionProposal, 'id' | 'createdAt' | 'status'> {
  const titles = sourceProjects.map((p) => p.title);
  const isEduDev = titles.includes('CodeMentor AI') && titles.includes('StudySync');
  const isClimate = titles.includes('EcoTrack') && titles.includes('GreenRoute');

  if (isEduDev) {
    return {
      sourceProjectIds: sourceProjects.map((p) => p.id),
      proposedTitle: 'StudyMentor: Communal Pair-Programming Salon',
      proposedProblem:
        'Junior developers face loneliness and cryptic compiler bottlenecks. Solitary learning leads to 60% attrition.',
      proposedGoal:
        'A browser-based virtual pair-debugging room with synced Pomodoro intervals and an on-demand AI code tutor.',
      sharedCapabilities: [
        'React and TypeScript component architectures',
        'Developer education and learning empathy mindset',
        'Stateful workspace session management',
      ],
      complementaryFeatures: [
        'StudySync brings real-time ambient focus rooms and synced markdown notes',
        'CodeMentor AI brings interactive Monaco code diff walkthroughs and AST pedagogy',
      ],
      proposedFeatures: [
        'Communal virtual study room with shared Monaco code editor',
        'Ambient lofi audio mixer paired with automated bug breakdown quizzes',
        'Local Llama-3-8B fallback to provide unlimited code reviews without token costs',
      ],
      proposedStack: ['TypeScript', 'React', 'Go Fiber', 'Tailwind', 'Monaco Editor', 'Ollama / Llama 3'],
      proposedDependencies: ['monaco-editor', 'yjs', 'howler', 'zustand'],
      risks: [
        'Managing concurrent state between Monaco editor diffs and Yjs document rooms',
        'Balancing focused ambient study vs intrusive AI code suggestions',
      ],
      tradeoffs: [
        'Strip out heavy WebRTC video to keep server bandwidth lightweight and focused on audio + code',
      ],
      proposedMilestones: [
        {
          title: 'Unify Monaco Editor within Go Fiber Room Hub',
          description: 'Embed the CodeMentor diff viewer into StudySync synchronized room channels.',
        },
        {
          title: 'Local Llama-3 Integration & Audio Polish',
          description: 'Wire up local offline model inference to eliminate API token runaway entirely.',
        },
      ],
    };
  }

  if (isClimate) {
    return {
      sourceProjectIds: sourceProjects.map((p) => p.id),
      proposedTitle: 'EcoRoute: Urban Low-Emission Mobility & Carbon Telemetry',
      proposedProblem:
        'Citizens want to reduce emissions but navigation apps optimize purely for car traffic and fail to capture real transit impact.',
      proposedGoal:
        'Unified navigation and carbon telemetry platform that charts the cleanest shaded route and logs carbon avoided.',
      sharedCapabilities: [
        'Sustainability telemetry algorithms',
        'Python backend microservices (FastAPI & GeoDjango)',
        'Urban geospatial datasets and mobile mapping',
      ],
      complementaryFeatures: [
        'GreenRoute contributes clean-air shaded bicycle routing graphs',
        'EcoTrack contributes personal carbon accounting and receipt OCR offset tracking',
      ],
      proposedFeatures: [
        'Clean-air commute navigation with tree-canopy shade weighting',
        'Automated "Carbon Avoided" ledger synced directly to weekly habit streaks',
        'Civic hazard reporting for blocked transit paths',
      ],
      proposedStack: ['Python', 'Dart/Flutter', 'FastAPI', 'PostGIS', 'OpenStreetMap', 'Tailwind'],
      proposedDependencies: ['geopandas', 'pgrouting', 'climatiq-client', 'flutter_map'],
      risks: [
        'Merging GeoDjango spatial queries with FastAPI async throughput',
        'Battery consumption running background GPS telemetry while cycling',
      ],
      tradeoffs: [
        'Pre-compute raster air quality heatmaps to avoid real-time calculation lag on mobile client',
      ],
      proposedMilestones: [
        {
          title: 'PostGIS Routing & Climatiq Factor Pipeline',
          description: 'Unify bike route distance calculation with Climatiq avoided emission savings.',
        },
        {
          title: 'Mobile Map Client with Carbon Telemetry Sheet',
          description: 'Deliver the combined turn-by-turn navigation card with live carbon credits.',
        },
      ],
    };
  }

  return {
    sourceProjectIds: sourceProjects.map((p) => p.id),
    proposedTitle: `${sourceProjects[0].title.slice(0, 5)}${sourceProjects[1]?.title || 'Hub'} Synthesized`,
    proposedProblem: `Disparate feature sets in ${sourceProjects.map((p) => p.category).join(' and ')} can be converged into a unified workspace.`,
    proposedGoal: `Deliver a combined platform that unifies ${sourceProjects.map((p) => p.title).join(' with ')}.`,
    sharedCapabilities: ['TypeScript runtime', 'Modern UI component patterns'],
    complementaryFeatures: [
      `Frontend capability from ${sourceProjects[0].title}`,
      `Complementary domain logic from ${sourceProjects[1]?.title || 'secondary project'}`,
    ],
    proposedFeatures: ['Integrated unified dashboard', 'Cross-project asset pipeline'],
    proposedStack: ['TypeScript', 'React', 'Tailwind', 'Vite'],
    proposedDependencies: ['lucide-react', 'zustand'],
    risks: ['Scope sprawl across multiple original domains'],
    tradeoffs: ['Focusing on the top 2 features from each parent codebase'],
    proposedMilestones: [
      {
        title: 'Core Integrated Schema',
        description: 'Establish shared data models and navigation layout.',
      },
      {
        title: 'Unified MVP Prototype',
        description: 'Connect primary interactive views into a cohesive single flow.',
      },
    ],
  };
}

export default FusionPage;
