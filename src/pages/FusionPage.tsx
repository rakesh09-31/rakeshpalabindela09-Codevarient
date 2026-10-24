import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Merge,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  RefreshCw,
  Info,
  CheckSquare,
  Square,
  X,
  FileCode,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { AIChatMessage, Project } from '../types';
import { Badge, Button, ProgressBar } from '../components/ui';
import { ProjectArtwork } from '../components/common/ProjectArtwork';

// ============================================================================
// Markdown Renderer for Chat Messages
// ============================================================================
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text)]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal rule
        if (trimmed === '---') {
          return <hr key={idx} className="border-[var(--color-border)] my-2" />;
        }

        // H3 headings
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-sm font-bold text-[var(--color-text)] pt-2 pb-1 border-b border-[var(--color-border)] tracking-tight flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
              <span>{trimmed.replace('### ', '')}</span>
            </h3>
          );
        }

        // H4 headings
        if (trimmed.startsWith('#### ')) {
          return (
            <h4
              key={idx}
              className="text-xs font-bold text-[var(--color-text)] pt-1 text-[var(--color-brand)] font-mono tracking-tight"
            >
              {trimmed.replace('#### ', '')}
            </h4>
          );
        }

        // Numbered list item: e.g. "1. **Title**:"
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(\*\*.*?\*\*):?\s*(.*)$/);
        if (numberedMatch) {
          const [, num, boldTitle, rest] = numberedMatch;
          const cleanTitle = boldTitle.replace(/\*\*/g, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-4 h-4 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-brand)] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                {num}
              </span>
              <div className="flex-1">
                <span className="font-bold text-[var(--color-text)]">{cleanTitle}: </span>
                <span className="text-[var(--color-text-secondary)]">{renderFormattedText(rest)}</span>
              </div>
            </div>
          );
        }

        // Bullet point: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-3 py-0.5">
              <span className="text-[var(--color-brand)] text-xs leading-none mt-1 shrink-0">•</span>
              <span className="flex-1 text-[var(--color-text-secondary)]">
                {renderFormattedText(bulletContent)}
              </span>
            </div>
          );
        }

        // Blockquotes or Italics
        if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
          return (
            <p key={idx} className="italic text-[11px] text-[var(--color-text-muted)] pl-2 border-l-2 border-[var(--color-border)] py-0.5">
              {trimmed.slice(1, -1)}
            </p>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-[var(--color-text-secondary)]">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Inline helper for bold, code tags, etc.
function renderFormattedText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-[var(--color-text)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-subtle)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-brand)] font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[var(--color-text-secondary)]">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Suggested Natural-Language Questions Chips
const SUGGESTED_QUESTIONS = [
  'Which projects should I combine from my list, and why?',
  'Which features can be reused, and what new features become possible?',
  'Would combining these projects make the result more useful or powerful?',
  'What problems, conflicts, or technical risks might arise?',
  'Which combination is easiest to build first?',
  'Suggest an MVP for the strongest combination.',
];

// ============================================================================
// Main AI Project Fusion Advisor Workspace
// ============================================================================
export function FusionPage() {
  const { projects } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Multi-project selection (accepts query parameters from Canvas Protocol, Back link, or route state)
  const initialIds = useMemo(() => {
    const stateIds = (location.state as any)?.selectedProjectIds;
    if (Array.isArray(stateIds) && stateIds.length > 0) {
      return stateIds;
    }
    const projectsParam = searchParams.get('projects');
    if (projectsParam) {
      const split = projectsParam.split(',').filter(Boolean);
      if (split.length > 0) return split;
    }
    const p1 = searchParams.get('project1') || searchParams.get('p1');
    const p2 = searchParams.get('project2') || searchParams.get('p2');
    if (p1 && p2 && p1 !== p2) {
      return [p1, p2];
    }
    if (p1) {
      return [p1];
    }
    return [];
  }, [searchParams, location.state]);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  // Left Panel Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mobile / Tablet Tab Switcher
  const [activeMobileTab, setActiveMobileTab] = useState<'projects' | 'advisor'>('advisor');

  // AI Fusion Advisor Chat State (persisted to sessionStorage so navigating back retains review)
  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('graveyard_fusion_advisor_messages');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [composerInput, setComposerInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isSynthesizingProposal, setIsSynthesizingProposal] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Persist messages across local route transitions
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem('graveyard_fusion_advisor_messages', JSON.stringify(messages));
      }
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  // Distinct Categories for Filter
  const categories = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.category))).filter(Boolean);
  }, [projects]);

  // Filtered Projects for Left Panel
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.languages?.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || project.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' || project.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [projects, searchQuery, selectedCategory, selectedStatus]);

  // Selected project instances
  const selectedProjects = useMemo(() => {
    return selectedIds
      .map((id) => projects.find((p) => p.id === id))
      .filter((p): p is Project => !!p);
  }, [selectedIds, projects]);

  // Toggle Project Selection
  const toggleProjectSelection = (projectId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId);
      }
      if (prev.length >= 2) {
        // Keep last 1 and add new
        return [prev[1], projectId];
      }
      return [...prev, projectId];
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Reset Chat Conversation
  const handleResetChat = () => {
    setMessages([]);
    setAiError(null);
    setLastFailedPrompt(null);
    try {
      sessionStorage.removeItem('graveyard_fusion_advisor_messages');
    } catch {
      // ignore
    }
  };

  // Send Chat Prompt to AI Fusion Advisor
  const handleSendMessage = async (promptToSend: string) => {
    const trimmed = promptToSend.trim();
    if (!trimmed || isAiLoading) return;

    const userMessage: AIChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setComposerInput('');
    setIsAiLoading(true);
    setAiError(null);
    setLastFailedPrompt(null);

    try {
      const historyForApi = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiClient.askAiFusionAdvisor(
        trimmed,
        selectedIds,
        historyForApi
      );

      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      setAiError(err?.message || 'The AI Fusion Advisor was unable to evaluate this request.');
      setLastFailedPrompt(trimmed);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger Grounded Initial Welcome when no messages are present
  useEffect(() => {
    if (messages.length === 0 && projects.length > 0) {
      const sampleNames = projects.slice(0, 3).map((p) => `"${p.title}"`).join(', ');
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: `### 👋 Welcome to the AI Project Fusion Advisor\n\nI analyze your saved projects (including ${sampleNames}) for architectural compatibility, feature overlap, and combined execution feasibility.\n\n* **Select 2 projects** in the left panel to assess whether they are suitable to combine.\n* **Or click any prompt chip below** to discover high-synergy combinations across your entire garden!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [projects, messages.length]);

  // Trigger Suitability Review from Selection Dock
  const handleReviewSuitability = () => {
    if (selectedProjects.length < 2) return;
    const titles = selectedProjects.map((p) => p.title).join(' and ');
    handleSendMessage(
      `Review the fusion suitability of combining ${titles}. Are they suitable to combine, not recommended, or do they need more information?`
    );
  };

  // Navigate to Dedicated Proposal Route
  const handleViewProposal = async (pairIds: string[] = selectedIds) => {
    if (pairIds.length < 2) return;
    setIsSynthesizingProposal(true);
    try {
      const proposal = await apiClient.generateFusion(pairIds);
      navigate(`/fusion/proposal/${proposal.id}`, {
        state: { selectedProjectIds: pairIds, proposal },
      });
    } catch (err: any) {
      setAiError(`Failed to load proposal details: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSynthesizingProposal(false);
    }
  };

  return (
    <div className="h-full flex-1 min-h-0 overflow-hidden flex flex-col gap-3.5">
      {/* ================= HEADER BAR ================= */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shadow-xs shrink-0">
            <Merge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                AI Project Fusion Advisor
              </h1>
              <Badge variant="brand" size="sm" className="hidden sm:inline-flex text-[10px]">
                Autonomous Advisor
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Evaluate architectural synergy, review suitability, and unify complementary codebases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {selectedProjects.length > 0 && (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              {selectedProjects.length}/2 Selected
            </span>
          )}

          {selectedProjects.length === 2 && (
            <Button
              variant="fusion"
              size="sm"
              disabled={isAiLoading}
              onClick={handleReviewSuitability}
              className="text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assess Suitability
            </Button>
          )}
        </div>
      </div>

      {/* ================= MOBILE / TABLET TAB SELECTOR ================= */}
      <div className="lg:hidden flex rounded-xl bg-[var(--color-surface-subtle)] p-1 border border-[var(--color-border)] shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('projects')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === 'projects'
              ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-xs border border-[var(--color-border)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>My Projects ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('advisor')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === 'advisor'
              ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-xs border border-[var(--color-border)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Advisor</span>
        </button>
      </div>

      {/* ================= MAIN TWO-PANEL ANCHORED WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* ================= LEFT PANEL: MY PROJECTS LIBRARY ================= */}
        <div
          className={`lg:col-span-5 flex flex-col h-full min-h-0 overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 ${
            activeMobileTab === 'projects' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-brand)]" />
              <h2
                className="text-sm sm:text-base font-bold text-[var(--color-text)] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                My Projects ({projects.length})
              </h2>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-[11px] font-semibold text-[var(--color-brand)] hover:underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, summary, or tech..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2 py-1 text-[11px] rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1 text-[11px] rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="abandoned">Abandoned</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Scrollable Project Cards Container (Independent Scroll) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-2xl">
                No matching projects found.
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id);
                const selectionIndex = selectedIds.indexOf(project.id);

                return (
                  <div
                    key={project.id}
                    onClick={() => toggleProjectSelection(project.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-[var(--color-brand)]/5 border-[var(--color-brand)] shadow-xs ring-1 ring-[var(--color-brand)]/20'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Selection Box / Order Badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectSelection(project.id);
                        }}
                        className="mt-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-brand)] shrink-0"
                      >
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-[var(--color-brand)] text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs">
                            {selectionIndex + 1}
                          </div>
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Project Artwork Thumbnail */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[var(--color-border)]">
                        <ProjectArtwork
                          project={project}
                          compact
                        />
                      </div>

                      {/* Project Header Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <h3 className="text-xs font-bold text-[var(--color-text)] truncate">
                            {project.title}
                          </h3>
                          <Badge
                            variant={
                              project.status === 'active'
                                ? 'success'
                                : project.status === 'completed'
                                ? 'brand'
                                : 'default'
                            }
                            size="sm"
                            className="text-[9px] uppercase px-1.5 py-0 shrink-0"
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                          {project.category}
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                      {project.summary || project.originalIdea || 'No description recorded.'}
                    </p>

                    {/* Tags and Progress */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/60 text-[10px]">
                      <div className="flex flex-wrap gap-1">
                        {project.languages.slice(0, 2).map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.2 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] font-mono text-[9px]"
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <ProgressBar value={project.progress || 0} size="sm" className="w-12" />
                        <span className="font-mono text-[9px] text-[var(--color-text-muted)]">
                          {project.progress || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Anchored Selected Projects Dock */}
          <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--color-text)] flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                Selected for Fusion ({selectedProjects.length}/2)
              </span>
              {selectedProjects.length === 2 && (
                <button
                  type="button"
                  onClick={handleReviewSuitability}
                  className="text-[10px] font-bold text-[var(--color-brand)] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Assess Suitability
                </button>
              )}
            </div>

            {selectedProjects.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-muted)] italic">
                Select 2 projects above to evaluate architectural synergy.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedProjects.map((p, idx) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] shadow-xs"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-[var(--color-brand)] text-white text-[9px] font-mono flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[130px]">{p.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleProjectSelection(p.id)}
                      className="text-[var(--color-text-muted)] hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {selectedProjects.length === 2 && (
              <Button
                variant="fusion"
                size="sm"
                disabled={isAiLoading}
                onClick={handleReviewSuitability}
                className="w-full text-xs font-semibold mt-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Review Fusion Suitability in AI Chat
              </Button>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL: AI ADVISOR & CHAT ================= */}
        <div
          className={`lg:col-span-7 flex flex-col h-full min-h-0 overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-xs ${
            activeMobileTab === 'advisor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
              <h2
                className="text-sm sm:text-base font-bold text-[var(--color-text)] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Find projects that work better together
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                {selectedProjects.length === 2
                  ? 'Selected-Pair Mode'
                  : selectedProjects.length === 1
                  ? 'Partner Scan Mode'
                  : 'Collection-Wide Mode'}
              </span>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-hover)]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Conversation Area (Internal Independent Scroll) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-[var(--color-text-muted)]">
                <Info className="w-8 h-8 opacity-40" />
                <p className="text-xs max-w-sm leading-relaxed">
                  Select 2 projects from your library to evaluate whether they can be synthesized, or choose a prompt chip below to scan your collection.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-3xl p-4 text-xs shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-brand)] text-white rounded-br-xs'
                        : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <>
                        <MarkdownContent content={msg.content} />

                        {/* Interactive View Proposal Card within Advisor Response */}
                        {msg.suitability === 'SUITABLE' && msg.suitablePairIds && (
                          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-[var(--color-text)] block">
                                  {msg.proposedConceptTitle || 'Detailed Proposal Ready'}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-secondary)]">
                                  Architectural synergy verified. Click below to inspect the full proposal on a dedicated page.
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="fusion"
                              size="sm"
                              disabled={isSynthesizingProposal}
                              onClick={() => handleViewProposal(msg.suitablePairIds)}
                              className="text-xs shrink-0 flex items-center gap-1.5"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              {isSynthesizingProposal ? 'Opening...' : 'View Proposal'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <span className="text-[9px] font-mono text-[var(--color-text-muted)] mt-1 px-1">
                    {msg.role === 'user' ? 'You' : 'AI Fusion Advisor'} •{' '}
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}

            {/* Loading / Synthesizing State */}
            {isAiLoading && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] max-w-md animate-pulse">
                <Sparkles className="w-4 h-4 text-[var(--color-brand)] animate-spin shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    Analyzing architectural synergy & suitability...
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    Evaluating recorded tech stacks, features, and blocker trade-offs.
                  </p>
                </div>
              </div>
            )}

            {/* Error & Retry State */}
            {aiError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                {lastFailedPrompt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(lastFailedPrompt)}
                    className="shrink-0 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Natural Language Prompt Suggestion Chips */}
          <div className="px-5 py-2.5 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface-subtle)]/50">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] block mb-1.5 uppercase font-semibold">
              Suggested Questions:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTED_QUESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all whitespace-nowrap shadow-2xs hover:shadow-xs disabled:opacity-50 shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Message Composer Area (Anchored at Bottom) */}
          <div className="p-3.5 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(composerInput);
              }}
              className="relative flex items-center gap-2"
            >
              <input
                type="text"
                value={composerInput}
                onChange={(e) => setComposerInput(e.target.value)}
                placeholder="Ask which projects I should combine…"
                disabled={isAiLoading}
                className="flex-1 py-2.5 pl-3.5 pr-10 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)]"
              />
              <button
                type="submit"
                disabled={!composerInput.trim() || isAiLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[var(--color-brand)] text-white disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FusionPage;
