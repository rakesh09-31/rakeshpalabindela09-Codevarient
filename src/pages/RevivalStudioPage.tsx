import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Send,
  Check,
  ArrowRight,
  ArrowLeft,
  Code2,
  Zap,
  Wrench,
  Lightbulb,
  Workflow,
  Compass,
  AlertTriangle,
  RotateCcw,
  FileText,
  Layers,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { Project, AIChatMessage, Priority, ProjectStatus } from '../types';
import { Button, Badge, ProgressBar } from '../components/ui';

// Suggested starter question chips as requested in Section 3
const SUGGESTED_QUESTION_CHIPS = [
  { label: 'Explain this project in detail.', icon: FileText },
  { label: 'What problem does it solve, and who is it for?', icon: HelpCircle },
  { label: 'Explain the main features one by one.', icon: Layers },
  { label: 'How does the project work?', icon: Workflow },
  { label: 'Explain the tech stack and architecture.', icon: Code2 },
  { label: 'What was completed and what is still unfinished?', icon: CheckCircle2 },
  { label: 'What are the biggest blockers to reviving it?', icon: AlertTriangle },
  { label: 'What should I do first to continue development?', icon: Zap },
];

/**
 * Lightweight Markdown block renderer ensuring clean headings, lists,
 * quotes, code chips, and high contrast styling without heavy dependencies.
 */
function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => {
    return content.split('\n');
  }, [content]);

  const renderInlineFormatted = (text: string) => {
    // Process links [Label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(renderBoldAndCode(text.substring(lastIdx, match.index)));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-brand)] underline hover:opacity-80 inline-flex items-center gap-0.5 font-medium"
        >
          {label} <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
      lastIdx = linkRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(renderBoldAndCode(text.substring(lastIdx)));
    }

    return parts.length > 0 ? parts : renderBoldAndCode(text);
  };

  const renderBoldAndCode = (text: string) => {
    const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-[var(--color-text)]">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px] text-[var(--color-brand)] border border-black/5 dark:border-white/10"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return (
          <em key={i} className="italic text-[var(--color-text-secondary)]">
            {token.slice(1, -1)}
          </em>
        );
      }
      return token;
    });
  };

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
      {blocks.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading 3: ###
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-sm sm:text-base font-bold text-[var(--color-text)] pt-2 pb-1 border-b border-[var(--color-border)]/50 flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {renderInlineFormatted(trimmed.slice(4))}
            </h3>
          );
        }

        // Heading 4: ####
        if (trimmed.startsWith('#### ')) {
          return (
            <h4
              key={idx}
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider font-mono text-[var(--color-brand)] pt-2 pb-0.5"
            >
              {renderInlineFormatted(trimmed.slice(5))}
            </h4>
          );
        }

        // Blockquote: >
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[var(--color-brand)] pl-3 py-1 my-1.5 bg-black/5 dark:bg-white/5 rounded-r-lg text-xs italic text-[var(--color-text-secondary)]"
            >
              {renderInlineFormatted(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Bullet point: * or -
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[var(--color-brand)] mt-1.5">•</span>
              <span className="flex-1">{renderInlineFormatted(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list: 1. 2. etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-mono text-[11px] font-bold text-[var(--color-brand)] mt-0.5 shrink-0">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInlineFormatted(numMatch[2])}</span>
            </div>
          );
        }

        // Horizontal rule: ---
        if (trimmed === '---') {
          return <hr key={idx} className="my-2 border-[var(--color-border)]" />;
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-[var(--color-text)]">
            {renderInlineFormatted(line)}
          </p>
        );
      })}
    </div>
  );
}

export function RevivalStudioPage() {
  const { projects, addTask, changeProjectStatus } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected project state synced with query param
  const paramProjectId = searchParams.get('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    paramProjectId || (projects[0]?.id ?? '')
  );

  // Synchronize when searchParams changes (e.g. navigation from Revive Zone)
  useEffect(() => {
    if (paramProjectId && paramProjectId !== selectedProjectId) {
      setSelectedProjectId(paramProjectId);
    }
  }, [paramProjectId, selectedProjectId]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Mobile drawer tabs: 'chat' vs 'tools'
  const [mobileTab, setMobileTab] = useState<'chat' | 'tools'>('chat');

  // Conversation history
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    lastPrompt: string;
    lastMode?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping, isLoadingOverview]);

  // Generate grounded initial overview when workspace opens with selected project
  useEffect(() => {
    if (!selectedProject) return;

    let isMounted = true;
    setIsLoadingOverview(true);
    setErrorState(null);

    // Call server AI assistant for grounded initial overview
    apiClient
      .askAiAssistant(selectedProject.id, 'overview', 'overview')
      .then((overviewMsg) => {
        if (!isMounted) return;
        setChatMessages([overviewMsg]);
        setIsLoadingOverview(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Overview fetch error, generating client grounded overview:', err);
        const fallbackMsg = generateClientFallbackOverview(selectedProject);
        setChatMessages([fallbackMsg]);
        setIsLoadingOverview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId, selectedProject]);

  // Secondary Revival Capabilities
  const studioTools = [
    {
      id: 'blocker',
      title: 'Blocker Troubleshooting',
      desc: 'Debug architectural roadblocks & propose non-blocking alternatives.',
      icon: Wrench,
      prompt: 'Diagnose my current technical blockers and recommend 3 tactical workarounds.',
    },
    {
      id: 'mvp',
      title: 'MVP Simplification',
      desc: 'Strip down scope to build a working prototype in 48 hours.',
      icon: Zap,
      prompt: 'How can I radically simplify this scope into an MVP I can ship this weekend?',
    },
    {
      id: 'tech-alt',
      title: 'Tech Stack Alternatives',
      desc: 'Suggest cheaper, modern, or solo-developer friendly libraries.',
      icon: Code2,
      prompt: 'Recommend alternative technologies to replace expensive or complex dependencies in this project.',
    },
    {
      id: 'idea',
      title: 'Idea Improvement & Pitch',
      desc: 'Refine value proposition for judges & end-users.',
      icon: Lightbulb,
      prompt: 'How can I elevate this project concept to make it uniquely compelling for a hackathon demo?',
    },
    {
      id: 'roadmap',
      title: 'Revival Roadmap',
      desc: 'Generate a step-by-step 3-milestone unblocking timeline.',
      icon: Workflow,
      prompt: 'Generate a structured 3-milestone revival sprint plan with concrete tasks.',
    },
    {
      id: 'path',
      title: 'Revival Path Guidance',
      desc: 'Determine whether to Restart, Continue, Pivot, or Repurpose.',
      icon: Compass,
      prompt: 'Analyze this project memory and advise which of the 5 Revival Paths is mathematically optimal.',
    },
  ];

  // Send question to AI assistant
  const handleSend = useCallback(
    async (textToSend?: string, toolId?: string) => {
      const text = textToSend || inputPrompt;
      if (!text.trim() || !selectedProject || isTyping) return;

      setErrorState(null);

      const userMessage: AIChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMessage]);
      if (!textToSend) setInputPrompt('');
      setIsTyping(true);

      // Pass previous turns for multi-turn conversational context
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const mode =
          toolId ||
          (text.toLowerCase().includes('blocker')
            ? 'blocker'
            : text.toLowerCase().includes('mvp')
            ? 'mvp'
            : undefined);

        const aiResponse = await apiClient.askAiAssistant(
          selectedProject.id,
          text,
          mode,
          historyPayload
        );

        setChatMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);
      } catch (err: any) {
        console.error('AI assistant error:', err);
        setIsTyping(false);
        setErrorState({
          message: err?.message || 'Could not reach AI assistant. Please check your connection and retry.',
          lastPrompt: text,
          lastMode: toolId,
        });
      }
    },
    [inputPrompt, selectedProject, isTyping, chatMessages]
  );

  // Retry the last failed question
  const handleRetry = () => {
    if (!errorState) return;
    const { lastPrompt, lastMode } = errorState;
    setErrorState(null);
    handleSend(lastPrompt, lastMode);
  };

  // Explicit user confirmation to apply suggested task to milestone 1
  const handleApplyAction = (messageId: string, suggestionId: string) => {
    const msg = chatMessages.find((m) => m.id === messageId);
    if (!msg || !msg.suggestions || !selectedProject) return;

    const sug = msg.suggestions.find((s) => s.id === suggestionId);
    if (!sug || sug.applied) return;

    if (sug.type === 'add-task' && sug.data) {
      const taskData = sug.data as { title: string; priority: Priority; weight: number };
      const targetMilestone = selectedProject.milestones[0];
      if (targetMilestone) {
        addTask(selectedProject.id, targetMilestone.id, {
          title: taskData.title,
          priority: taskData.priority || 'medium',
          weight: taskData.weight || 2,
          status: 'todo',
        });
      }
    } else if (sug.type === 'change-status' && sug.data) {
      const statusData = sug.data as { status: ProjectStatus };
      changeProjectStatus(selectedProject.id, statusData.status);
    }

    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.suggestions) return m;
        return {
          ...m,
          suggestions: m.suggestions.map((s) =>
            s.id === suggestionId ? { ...s, applied: true } : s
          ),
        };
      })
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 sm:gap-3.5 overflow-hidden">
      {/* ================= 1. HEADER BAR: UNDERSTAND THIS PROJECT ================= */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer shrink-0"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shadow-[0_0_12px_rgba(139,47,232,0.35)] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight leading-tight truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Understand this project
              </h1>
              {selectedProject && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-semibold text-xs text-[var(--color-text-secondary)] hidden md:inline">
                    — {selectedProject.title}
                  </span>
                  <Badge status={selectedProject.status} size="sm" />
                </div>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] truncate">
              {selectedProject
                ? `${selectedProject.title} • ${selectedProject.category} • ${selectedProject.progress}% complete • AI Project Explainer`
                : 'Select an archived project to diagnose and revive'}
            </p>
          </div>
        </div>

        {/* Project Context Selector & Direct Navigation Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] shadow-2xs">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)] font-mono">
              Context:
            </span>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs font-semibold text-[var(--color-text)] bg-transparent focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {p.title} ({p.status} - {p.progress}%)
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${selectedProject.id}`)}
              className="text-xs h-[34px] cursor-pointer"
              title="Open Project Case File"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span className="hidden sm:inline">Case File</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden shrink-0 flex items-center p-1 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mobileTab === 'chat'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Project Q&A Chat
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mobileTab === 'tools'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Dossier & Capabilities
        </button>
      </div>

      {/* ================= 2. MAIN WORKSPACE GRID ================= */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left Column: Project Explainer & Chat (8 Cols) */}
        <div
          className={`lg:col-span-8 bg-[var(--color-surface)] rounded-2xl md:rounded-3xl border border-[var(--color-border)] flex flex-col h-full min-h-0 shadow-xs overflow-hidden ${
            mobileTab === 'tools' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Project Identity Banner */}
          {selectedProject && (
            <div className="shrink-0 p-3 sm:p-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-[var(--color-text)] truncate font-mono">
                  CASE #{selectedProject.id.toUpperCase()}
                </span>
                <span className="text-[var(--color-text-muted)]">•</span>
                <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                  {selectedProject.title}
                </span>
                <Badge status={selectedProject.status} size="sm" />
              </div>
              <span className="text-[11px] font-mono font-semibold text-[var(--color-brand)] shrink-0 hidden sm:inline">
                {selectedProject.progress}% Progress
              </span>
            </div>
          )}

          {/* Chat Message Scroll Area — SOLE VERTICAL SCROLL CONTAINER */}
          <div className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto space-y-4 scrollbar-thin">
            {isLoadingOverview && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] animate-pulse">
                <Bot className="w-5 h-5 text-[var(--color-brand)] animate-spin" />
                <span>Gathering saved project dossier & synthesizing grounded overview...</span>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-brand)] text-white rounded-br-none shadow-xs'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-none shadow-xs'
                  }`}
                >
                  <MarkdownContent content={msg.content} />

                  {/* Actionable Plan Items / Suggestions with Real User Confirmation */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[var(--color-border)] space-y-2">
                      <span className="text-[10px] font-bold text-[var(--color-text)] block font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[var(--color-brand)]" />
                        Proposed Revival Action:
                      </span>
                      {msg.suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="text-xs min-w-0">
                            <span className="font-bold text-[var(--color-text)] block truncate">{sug.label}</span>
                            <span className="text-[var(--color-text-muted)] text-[11px] line-clamp-1">{sug.description}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={sug.applied ? 'outline' : 'primary'}
                            disabled={sug.applied}
                            onClick={() => handleApplyAction(msg.id, sug.id)}
                            className="shrink-0 text-xs h-7 cursor-pointer"
                          >
                            {sug.applied ? (
                              <>
                                <Check className="w-3 h-3" /> Added to Milestone
                              </>
                            ) : (
                              'Add Task'
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

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] italic py-2 px-2 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-border)] max-w-fit">
                <Bot className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
                <span>Consulting project archive and analyzing technical parameters...</span>
              </div>
            )}

            {/* Error / Retry Banner */}
            {errorState && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs flex items-center justify-between gap-3 text-red-400">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{errorState.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="text-xs h-7 shrink-0 cursor-pointer border-red-500/40 text-red-400 hover:bg-red-500/20"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ================= 3. SUGGESTED QUESTION CHIPS ================= */}
          <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border)]/60 bg-[var(--color-surface-subtle)]/60">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-muted)] shrink-0 flex items-center gap-1 pr-1">
                <Sparkles className="w-3 h-3 text-[var(--color-brand)]" />
                Suggested:
              </span>
              {SUGGESTED_QUESTION_CHIPS.map((chip) => {
                const ChipIcon = chip.icon;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleSend(chip.label)}
                    disabled={isTyping || isLoadingOverview}
                    className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-brand)]/50 text-[var(--color-text)] text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-2xs"
                  >
                    <ChipIcon className="w-3 h-3 text-[var(--color-brand)] shrink-0" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= 4. ANCHORED MESSAGE COMPOSER ================= */}
          <div className="shrink-0 p-3 sm:p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything about this project…"
                disabled={isTyping || isLoadingOverview}
                className="flex-1 px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputPrompt.trim() || isTyping || isLoadingOverview}
                className="h-[38px] px-3.5 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Project Dossier & Quick Capabilities (4 Cols) */}
        <div
          className={`space-y-4 overflow-y-auto scrollbar-thin lg:col-span-4 h-full min-h-0 ${
            mobileTab === 'chat' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Diagnostic Snapshot Dossier */}
          {selectedProject && (
            <div className="bg-[var(--color-surface)] rounded-2xl md:rounded-3xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3.5 text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--color-brand)]" />
                  <h3
                    className="text-xs font-bold text-[var(--color-text)] uppercase font-mono tracking-wider"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Project Dossier
                  </h3>
                </div>
                <Badge status={selectedProject.status} size="sm" />
              </div>

              {/* Progress & Category */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-muted)] font-mono">Weighted Completion:</span>
                  <span className="font-bold text-[var(--color-text)] font-mono">{selectedProject.progress}%</span>
                </div>
                <ProgressBar value={selectedProject.progress} size="xs" />
              </div>

              {/* Scope & Stored Attributes */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-muted)]">Category:</span>
                  <span className="font-semibold text-[var(--color-text)]">{selectedProject.category}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-muted)]">Target Audience:</span>
                  <span className="font-medium text-[var(--color-text)] truncate max-w-[180px]">
                    {selectedProject.targetAudience || 'Not recorded'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-muted)]">Repository:</span>
                  <span className="font-mono text-[11px] truncate max-w-[180px]">
                    {selectedProject.repoUrl ? (
                      <a
                        href={selectedProject.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
                      >
                        Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[var(--color-text-muted)] italic">None recorded</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-muted)]">Blockers Logged:</span>
                  <span className="font-mono font-semibold text-[var(--color-text)]">
                    {selectedProject.technicalBlockers.length} issues
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[var(--color-border)]/40">
                  <span className="text-[var(--color-text-muted)]">Milestones:</span>
                  <span className="font-mono font-semibold text-[var(--color-text)]">
                    {selectedProject.milestones.length} defined
                  </span>
                </div>
              </div>

              {/* Tech Stack Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-bold block">
                  Tech Ecosystem:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedProject.languages.concat(selectedProject.frameworks).map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text)]"
                    >
                      {tech}
                    </span>
                  ))}
                  {selectedProject.libraries.slice(0, 3).map((lib) => (
                    <span
                      key={lib}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[var(--color-border)]/60 bg-black/5 dark:bg-white/5 text-[var(--color-text-secondary)]"
                    >
                      {lib}
                    </span>
                  ))}
                </div>
              </div>

              {/* Why Paused / Blocker Callout */}
              {(selectedProject.whyStopped || selectedProject.technicalBlockers[0]) && (
                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase text-[var(--color-text-muted)] font-bold block mb-1">
                    Dormancy Root Cause:
                  </span>
                  <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] text-[var(--color-text)] leading-relaxed">
                    {selectedProject.whyStopped ? (
                      <p className="italic">"{selectedProject.whyStopped}"</p>
                    ) : (
                      <p>{selectedProject.technicalBlockers[0]}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Topic Jumpers / Studio Tools */}
          <div className="bg-[var(--color-surface)] rounded-2xl md:rounded-3xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3 shadow-xs">
            <h3
              className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5 uppercase font-mono tracking-wider"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Zap className="w-3.5 h-3.5 text-[var(--color-brand)]" /> Diagnostic Topics
            </h3>
            <div className="space-y-2">
              {studioTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      handleSend(tool.prompt, tool.id);
                      setMobileTab('chat');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-all group flex items-start gap-2.5 cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-[var(--color-brand)] mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--color-text)] block truncate">
                        {tool.title}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)] leading-snug block mt-0.5 line-clamp-2">
                        {tool.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback grounded overview generator ensuring instantaneous rendering
 * if network or backend initialization takes extra time.
 */
function generateClientFallbackOverview(project: Project): AIChatMessage {
  const stack = [...project.languages, ...project.frameworks, ...project.libraries].join(', ') || 'Standard web stack';
  const reason = project.whyStopped || (project.technicalBlockers[0] ? `Technical roadblock: ${project.technicalBlockers[0]}` : 'Reason for pausing was not explicitly documented in the archive.');
  const repoNotice = project.repoUrl
    ? `* **Repository URL**: [${project.repoUrl}](${project.repoUrl})`
    : `* **Repository URL**: *No repository URL recorded in project file.* (The AI has not inspected source code or repository files).`;

  const content = `### 🌿 Grounded Project Overview: ${project.title}\n\n` +
    `**${project.title}** is a **${project.category}** initiative preserved with **${project.status.toUpperCase()}** status (${project.progress}% weighted progress).\n\n` +
    `#### 🎯 Purpose & Intended Outcome\n` +
    `* **Core Premise**: ${project.summary}\n` +
    `* **Original Idea**: "${project.originalIdea || project.summary}"\n` +
    `* **Target Audience**: ${project.targetAudience ? `**${project.targetAudience}**` : '*Not explicitly recorded in project dossier.*'}\n` +
    `* **Stated Goal**: ${project.goal || '*Not explicitly defined.*'}\n\n` +
    `#### 🛠️ Technology & Assets\n` +
    `* **Tech Stack**: ${stack}\n` +
    `* **External APIs**: ${project.apis.length > 0 ? project.apis.join(', ') : 'None configured'}\n` +
    `${repoNotice}\n\n` +
    `#### 📊 Development Health & Dormancy\n` +
    `* **Features**: ${project.completedFeatures.length} completed, ${project.inProgressFeatures.length} in progress, ${project.plannedFeatures.length} planned\n` +
    `* **Milestone Progress**: ${project.milestones.length} milestones defined\n` +
    `* **Dormancy Reason**: *"${reason}"*\n\n` +
    `---\n` +
    `*Ask any question below about this project's architecture, features, blockers, or next steps to prepare your revival strategy.*`;

  return {
    id: `overview-${project.id}`,
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    isSimulated: false,
  };
}

export default RevivalStudioPage;
