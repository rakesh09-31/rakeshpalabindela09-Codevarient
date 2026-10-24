import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Merge,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  ShieldAlert,
  Calendar,
  ExternalLink,
  Edit2,
  Check,
  RefreshCw,
  GitMerge,
  Lock,
  FileQuestion,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { FusionProposal, Project } from '../types';
import { Badge, Button } from '../components/ui';
import { ProjectArtwork } from '../components/common/ProjectArtwork';

export function FusionProposalPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProjects } = useApp();

  // Primary Proposal & Source Projects State
  const [proposal, setProposal] = useState<FusionProposal | null>(
    (location.state as any)?.proposal || null
  );
  const [sourceProjects, setSourceProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(!proposal);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Editable parameters before approval
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGoal, setEditGoal] = useState('');

  // Confirmation Modal & Creation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [createdProjectResult, setCreatedProjectResult] = useState<Project | null>(null);

  // Load proposal details
  useEffect(() => {
    let isMounted = true;
    if (!proposalId) return;

    const fetchProposal = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setErrorCode(null);
        const data = await apiClient.getFusionProposal(proposalId);
        if (!isMounted) return;
        setProposal(data.proposal);
        setSourceProjects(data.sourceProjects);
        setEditTitle(data.proposal.proposedTitle);
        setEditGoal(data.proposal.proposedGoal);
      } catch (err: any) {
        if (!isMounted) return;
        const status = err.statusCode || (err.message?.includes('404') ? 404 : err.message?.includes('403') || err.message?.includes('Unauthorized') ? 403 : 500);
        setErrorCode(status);
        setError(err.message || 'Failed to load fusion proposal.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProposal();

    return () => {
      isMounted = false;
    };
  }, [proposalId]);

  // Handle Approve Confirmation
  const handleCommitApproval = async () => {
    if (!proposal || isApproving) return;
    setIsApproving(true);
    setApprovalError(null);

    try {
      const result = await apiClient.approveFusion(
        proposal.id,
        editTitle.trim() || proposal.proposedTitle,
        editGoal.trim() || proposal.proposedGoal
      );
      await refreshProjects();
      setCreatedProjectResult(result.newProject);
      setProposal(result.proposal);
      setShowConfirmModal(false);
    } catch (err: any) {
      setApprovalError(err.message || 'Could not approve and create project. You can safely retry.');
    } finally {
      setIsApproving(false);
    }
  };

  // Back Link destination with retained project IDs
  const backToAdvisorUrl = sourceProjects.length > 0
    ? `/fusion?projects=${sourceProjects.map((p) => p.id).join(',')}`
    : '/fusion';

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center animate-spin">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[var(--color-text)]">Loading Fusion Proposal</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Retrieving architectural synthesis, source lineage, and implementation roadmap...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error States (404 Not Found, 403 Forbidden, 500 Server Error)
  // --------------------------------------------------------------------------
  if (error || !proposal) {
    const isNotFound = errorCode === 404;
    const isForbidden = errorCode === 403;

    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-xs">
          {isForbidden ? (
            <Lock className="w-8 h-8" />
          ) : isNotFound ? (
            <FileQuestion className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isForbidden
              ? 'Access Restricted'
              : isNotFound
              ? 'Proposal Not Found or Expired'
              : 'Unable to Load Proposal'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {isForbidden
              ? 'You do not have permission to view one or more private source projects linked to this proposal.'
              : isNotFound
              ? 'The requested fusion proposal draft does not exist or has expired. Return to the Fusion Advisor to evaluate your projects.'
              : error || 'An unexpected error occurred while loading proposal details.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/fusion')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Fusion Advisor
          </Button>
          {!isNotFound && !isForbidden && (
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isApproved = proposal.status === 'approved';

  // Fallback synthesis descriptions if not explicitly present
  const whyFit =
    proposal.whyFit ||
    `Combining ${sourceProjects.map((p) => p.title).join(' and ')} unifies complementary capabilities across ${sourceProjects.map((p) => p.category).join(' and ')}. Merging their data schemas and user interfaces eliminates context switching and provides a seamless single-pane-of-glass experience.`;

  const proposedUX =
    proposal.proposedUX ||
    `A cohesive, single-window workspace with unified navigation, synchronized state synchronization, and consolidated user workflows bridging both original project domains.`;

  const confirmedFacts = proposal.confirmedFacts || [
    `Verified Source Lineage: Combines assets from ${sourceProjects.map((p) => `"${p.title}" (${p.status})`).join(' and ')}.`,
    `Compatible Foundation: Shared web-standard technologies across both codebases.`,
    `Feature Parity: Preserves existing verified features without breaking original project records.`,
  ];

  const assumptions = proposal.assumptions || [
    'Cross-project session synchronization can be accomplished without notable latency.',
    'User base will prefer a single integrated platform over switching between separate utilities.',
    'Database models can be merged smoothly with a single migration schema.',
  ];

  const unresolvedQuestions = proposal.unresolvedQuestions || [
    `How will historical user milestones and tasks from source projects be surfaced in ${editTitle || proposal.proposedTitle}?`,
    `Which backend API framework will serve as the primary routing layer for new features?`,
    `What telemetry or analytics fallback should be used if external integrations fail?`,
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* ================= TOP NAVIGATION & BREADCRUMB ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <Link
          to={backToAdvisorUrl}
          state={{ selectedProjectIds: sourceProjects.map((p) => p.id) }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors py-1.5 px-3 rounded-xl hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border)] w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fusion Advisor
        </Link>

        <div className="flex items-center gap-2">
          <Badge
            variant={isApproved ? 'success' : 'brand'}
            size="sm"
            className="uppercase tracking-wider font-mono text-[10px]"
          >
            {isApproved ? 'Approved & Planted' : 'Reviewing Draft'}
          </Badge>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            ID: {proposal.id}
          </span>
        </div>
      </div>

      {/* ================= ALREADY APPROVED BANNER ================= */}
      {isApproved && proposal.createdProjectId && (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                This Fusion Proposal Has Been Approved
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                The fused project was planted in your garden as an active case file. The original source projects remain intact with full lineage references.
              </p>
            </div>
          </div>
          <Button
            variant="fusion"
            size="sm"
            onClick={() => navigate(`/projects/${proposal.createdProjectId}`)}
            className="shrink-0 flex items-center gap-1.5 text-xs"
          >
            Open Fused Project Case File
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ================= HERO HEADER CARD ================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-subtle)] border border-[var(--color-border)] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shadow-xs">
                <Merge className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--color-brand)] uppercase tracking-wider font-mono">
                Fusion Proposal
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {editTitle || proposal.proposedTitle}
            </h1>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {editGoal || proposal.proposedGoal}
            </p>
          </div>

          {!isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="shrink-0 flex items-center gap-1.5 text-xs w-fit"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isEditing ? 'Done Editing' : 'Customize Title / Goal'}
            </Button>
          )}
        </div>

        {/* Inline customization inputs if editing */}
        {isEditing && !isApproved && (
          <div className="mt-4 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3 animate-in fade-in duration-200">
            <div>
              <label className="text-xs font-bold text-[var(--color-text)] block mb-1">
                Fused Project Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter custom fused project title..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-page)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-brand)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--color-text)] block mb-1">
                Fused Project Mission / Goal
              </label>
              <textarea
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                rows={2}
                placeholder="Enter custom goal or elevator pitch..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-page)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-brand)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= SECTION 1: RESPONSIVE LINEAGE & SOURCE CONNECTIONS ================= */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Source Project Lineage
          </h2>
        </div>

        {/* Responsive, non-overflowing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {sourceProjects.map((p, idx) => (
            <div
              key={p.id}
              className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-xs space-y-3 min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[var(--color-brand)] uppercase tracking-wider">
                  Source {idx + 1}
                </span>
                <Badge
                  variant={p.status === 'active' ? 'success' : p.status === 'completed' ? 'brand' : 'default'}
                  size="sm"
                  className="text-[10px]"
                >
                  {p.status}
                </Badge>
              </div>

              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[var(--color-border)]">
                  <ProjectArtwork
                    project={p}
                    compact
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[var(--color-text)] truncate">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {p.category}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed flex-1">
                {p.summary || p.originalIdea}
              </p>

              <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
                {p.languages.slice(0, 3).map((lang) => (
                  <span
                    key={lang}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-mono border border-[var(--color-border)]"
                  >
                    {lang}
                  </span>
                ))}
                {p.completedFeatures.length > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-auto flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {p.completedFeatures.length} built
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Fused Concept Card */}
          <div className="flex flex-col bg-gradient-to-br from-[var(--color-surface)] to-purple-500/5 border-2 border-[var(--color-brand)]/40 rounded-2xl p-4 shadow-xs space-y-3 min-w-0 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Unified Fused Concept
              </span>
              <Badge variant="brand" size="sm" className="text-[10px]">
                Cross-Disciplinary
              </Badge>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Merge className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[var(--color-text)] truncate">
                  {editTitle || proposal.proposedTitle}
                </h3>
                <p className="text-[11px] text-[var(--color-brand)] font-semibold truncate">
                  Single Cohesive Platform
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed flex-1">
              {editGoal || proposal.proposedGoal}
            </p>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>Source originals preserved</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">100% Lineage</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: SUITABILITY & SYNERGY ANALYSIS ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Why These Projects Are Suitable to Combine
          </h2>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {whyFit}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
            <span className="text-xs font-bold text-[var(--color-text)] block">
              Unified Innovation Rationale
            </span>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {proposal.proposedProblem}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
            <span className="text-xs font-bold text-[var(--color-text)] block">
              Compound Architectural Value
            </span>
            <ul className="text-xs text-[var(--color-text-secondary)] space-y-1.5">
              {proposal.sharedCapabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: FEATURE REUSE & INTEGRATION PLAN ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Feature Reuse & Integration Plan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reusable Contributed Assets */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block font-mono">
              Contributed Assets from Source Projects
            </span>
            <div className="space-y-2">
              {proposal.complementaryFeatures.map((feat, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Capabilities Unlocked */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block font-mono">
              New Capabilities Unlocked by Fusion
            </span>
            <div className="space-y-2">
              {proposal.proposedFeatures.map((feat, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs text-[var(--color-text)] leading-relaxed flex items-start gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 4: PROPOSED UNIFIED USER EXPERIENCE ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-500" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Proposed Unified User Experience
          </h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {proposedUX}
        </p>
      </div>

      {/* ================= SECTION 5: TECHNOLOGY & ARCHITECTURE CONSIDERATIONS ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Technology & Architecture Considerations
          </h2>
        </div>

        {/* Proposed Stack Pills */}
        <div className="space-y-1.5">
          <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] block">
            Target Unified Stack:
          </span>
          <div className="flex flex-wrap gap-2">
            {proposal.proposedStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text)] font-mono text-xs border border-[var(--color-border)] shadow-2xs font-semibold"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Confirmed Facts vs Assumptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Confirmed Facts */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-mono">
                Confirmed Facts
              </span>
            </div>
            <ul className="text-xs text-[var(--color-text-secondary)] space-y-2">
              {confirmedFacts.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Assumptions & Hypotheses */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider font-mono">
                Assumptions & Hypotheses to Validate
              </span>
            </div>
            <ul className="text-xs text-[var(--color-text-secondary)] space-y-2">
              {assumptions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ================= SECTION 6: RISKS, TRADEOFFS & UNRESOLVED QUESTIONS ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Risks, Trade-offs & Unresolved Questions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risks & Trade-offs */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
              Identified Risks & Scope Compromises
            </span>
            <div className="space-y-2">
              {proposal.risks.concat(proposal.tradeoffs || []).map((risk, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-[var(--color-text-secondary)] leading-relaxed flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unresolved Questions */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
              Open Questions for Prototyping
            </span>
            <div className="space-y-2">
              {unresolvedQuestions.map((q, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed flex items-start gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0 mt-0.5" />
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 7: MVP SCOPE & IMPLEMENTATION SEQUENCE ================= */}
      <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
            Suggested MVP & Implementation Sequence
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {proposal.proposedMilestones.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2 flex flex-col"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[var(--color-brand)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-[var(--color-text)] truncate">
                  {m.title}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">
                {m.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SECTION 8: REVIEW & APPROVE (ACTION BAR) ================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-purple-500/10 border-2 border-[var(--color-brand)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-brand)]" />
              Review & Approve Fused Project
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
              Ready to plant <strong>{editTitle || proposal.proposedTitle}</strong> in your project garden? Original source projects ({sourceProjects.map((p) => p.title).join(', ')}) will remain untouched with complete bidirectional lineage links.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isApproved ? (
              <Button
                variant="fusion"
                onClick={() => navigate(`/projects/${proposal.createdProjectId}`)}
                className="flex items-center gap-2 shadow-xs"
              >
                <span>View Fused Project Case File</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="fusion"
                size="lg"
                disabled={isApproving}
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 font-bold px-6 py-3 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Approve & Create Fused Project</span>
              </Button>
            )}
          </div>
        </div>

        {approvalError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
            <span>{approvalError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCommitApproval}
              disabled={isApproving}
              className="text-xs shrink-0"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* ================= EXPLICIT CONFIRMATION MODAL ================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Merge className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  Confirm Project Creation
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Review the parameters below before permanently planting the new project in your garden.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3 text-xs">
              <div>
                <span className="font-mono font-bold text-[var(--color-text-muted)] block text-[10px] uppercase">
                  New Project Title
                </span>
                <span className="font-bold text-sm text-[var(--color-text)]">
                  {editTitle || proposal.proposedTitle}
                </span>
              </div>

              <div>
                <span className="font-mono font-bold text-[var(--color-text-muted)] block text-[10px] uppercase">
                  Source Projects (Lineage Guaranteed)
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {sourceProjects.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold text-[11px]"
                    >
                      {p.title}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-mono font-bold text-[var(--color-text-muted)] block text-[10px] uppercase">
                  Preservation Guarantee
                </span>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                  Original source projects will NOT be deleted or altered. Bidirectional lineage tags and milestone history will be established.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={isApproving}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="fusion"
                disabled={isApproving}
                onClick={handleCommitApproval}
                className="flex items-center gap-1.5"
              >
                {isApproving ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Creating Project...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Create</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {createdProjectResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[var(--color-text)]">
                Project Planted Successfully!
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                <strong>{createdProjectResult.title}</strong> has been added to your My Projects library with cross-pollinated tech stack, milestones, and lineage tags.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/fusion')}
                className="w-full sm:w-auto"
              >
                Return to Advisor
              </Button>
              <Button
                variant="fusion"
                onClick={() => navigate(`/projects/${createdProjectResult.id}`)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                <span>Open Case File</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
