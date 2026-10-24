import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Send,
  Check,
  ArrowRight,
  Code2,
  Zap,
  Wrench,
  Lightbulb,
  Workflow,
  Compass,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, AIChatMessage, Priority } from '../types';

export function RevivalStudioPage() {
  const { projects, addTask } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialProjectId = searchParams.get('project') || (projects[0]?.id ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );

  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content: `Welcome to the **AI Revival Studio**. I am your dedicated architectural revival companion.\n\nSelect any revival tool on the right, or ask me directly how to unlock stalled milestones, re-evaluate technology stacks, or pivot your idea into a hackathon-winning product.`,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Capability triggers
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

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || !selectedProject) return;

    const userMessage: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateStudioResponse(text, selectedProject);
      setChatMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 850);
  };

  const handleApplyAction = (msgId: string, sugId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map((s) => {
              if (s.id === sugId) {
                if (s.type === 'add-task' && selectedProject.milestones.length > 0) {
                  addTask(selectedProject.id, selectedProject.milestones[0].id, {
                    title: String(s.data.title || 'Revival Sprint Task'),
                    priority: (s.data.priority as Priority) || 'high',
                    weight: Number(s.data.weight) || 4,
                    status: 'todo',
                  });
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              AI Revival Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-light mt-1">
            Autonomous project diagnostic engine: unblock architectures, reframe MVPs, and generate revival roadmaps.
          </p>
        </div>

        {/* Project Selector Bar */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-green-border shadow-xs">
          <span className="text-xs font-semibold text-charcoal-light whitespace-nowrap">
            Active Context:
          </span>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs sm:text-sm font-semibold text-charcoal bg-transparent focus:outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status} - {p.progress}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Chat Workspace */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-green-border/60 flex flex-col h-[650px] shadow-sm overflow-hidden">
          {/* Top Context Subheader */}
          {selectedProject && (
            <div className="p-4 border-b border-gray-green-border/30 bg-ivory-warm/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-charcoal">{selectedProject.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-ivory border border-gray-green-border capitalize text-charcoal-light">
                  {selectedProject.status}
                </span>
                <span className="text-[10px] text-forest font-bold">{selectedProject.progress}% complete</span>
              </div>
              <button
                onClick={() => navigate(`/projects/${selectedProject.id}`)}
                className="text-xs text-mint hover:text-forest font-medium flex items-center gap-1 transition-colors"
              >
                Open Project Workspace <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 scrollbar-thin">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-900 text-white rounded-br-none shadow-xs'
                      : 'bg-ivory border border-gray-green-border/60 text-charcoal rounded-bl-none shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Suggestions with Real Apply Button */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-green-border/40 space-y-2">
                      <span className="text-[11px] font-bold text-purple-950 block">
                        Actionable Plan Items:
                      </span>
                      {msg.suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="p-3 rounded-xl bg-white border border-purple-200/80 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="text-xs">
                            <span className="font-bold text-charcoal block">{sug.label}</span>
                            <span className="text-charcoal-light text-[11px]">{sug.description}</span>
                          </div>
                          <button
                            disabled={sug.applied}
                            onClick={() => handleApplyAction(msg.id, sug.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              sug.applied
                                ? 'bg-mint-pale text-forest cursor-default'
                                : 'bg-purple-700 text-white hover:bg-purple-800 shadow-xs'
                            }`}
                          >
                            {sug.applied ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Added to Milestone
                              </>
                            ) : (
                              'Add to Project'
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
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-charcoal-light italic py-2">
                <Bot className="w-4 h-4 animate-spin text-purple-700" /> Synthesizing revival roadmap...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3.5 border-t border-gray-green-border/40 bg-white">
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
                placeholder="Ask how to solve rate limits, cut dependencies, or pivot features..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-green-border bg-ivory focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="p-2.5 rounded-xl bg-purple-700 text-white hover:bg-purple-800 transition-colors disabled:opacity-50 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Studio Capabilities & Project Context */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-charcoal flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Zap className="w-4 h-4 text-purple-700" /> Revival Capabilities
            </h3>
            <div className="space-y-2">
              {studioTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSend(tool.prompt)}
                    className="w-full text-left p-3 rounded-xl bg-ivory hover:bg-lavender-light/30 border border-gray-green-border/40 transition-all group flex items-start gap-2.5"
                  >
                    <Icon className="w-4 h-4 text-purple-700 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-charcoal group-hover:text-purple-900 block">
                        {tool.title}
                      </span>
                      <span className="text-[11px] text-charcoal-light leading-snug block">
                        {tool.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProject && (
            <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                Diagnostic Snapshot
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-gray-green-border/30">
                  <span className="text-charcoal-light">Status:</span>
                  <span className="font-semibold capitalize text-charcoal">{selectedProject.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-green-border/30">
                  <span className="text-charcoal-light">Blockers Logged:</span>
                  <span className={`font-semibold ${selectedProject.technicalBlockers.length > 0 ? 'text-rose' : 'text-forest'}`}>
                    {selectedProject.technicalBlockers.length} issues
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-green-border/30">
                  <span className="text-charcoal-light">Milestones:</span>
                  <span className="font-semibold text-charcoal">{selectedProject.milestones.length} defined</span>
                </div>
                {selectedProject.technicalBlockers.length > 0 && (
                  <div className="pt-1">
                    <span className="text-charcoal-light block mb-1">Primary Blocker:</span>
                    <span className="text-rose font-medium bg-rose-light/20 p-2 rounded-lg block">
                      {selectedProject.technicalBlockers[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateStudioResponse(prompt: string, project: Project): AIChatMessage {
  const p = prompt.toLowerCase();
  const now = new Date().toISOString();

  if (p.includes('blocker') || p.includes('diagnose')) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `### Blocker Diagnostic for ${project.title}\n\n**Root Cause Analysis:**\nYour project is currently stalled on: *"${project.technicalBlockers[0] || 'infrastructure dependencies'}"*.\n\n**3 Recommended Workarounds:**\n1. **Shift Heavy Logic to Client**: Offload AST / receipt processing to WebAssembly or lightweight local workers.\n2. **Hybrid Provider Fallback**: Use cheaper open-source models for routine tasks; call high-tier APIs only on complex branches.\n3. **Mock Data Sandbox**: Isolate external API failure zones with an automated offline mock harness so frontend development never stalls.`,
      timestamp: now,
      isSimulated: true,
      suggestions: [
        {
          id: `sug-${Date.now()}`,
          type: 'add-task',
          label: 'Create Blocker Workaround Harness',
          description: 'Adds an architectural task to milestone 1 to test local fallback.',
          applied: false,
          data: {
            title: 'Implement offline mock fallback layer to unblock development',
            priority: 'critical',
            weight: 4,
          },
        },
      ],
    };
  }

  if (p.includes('simplify') || p.includes('mvp') || p.includes('weekend')) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `### 48-Hour Weekend MVP Blueprint\n\nTo revive **${project.title}** without overwhelm, cut 70% of peripheral scope:\n\n- **Cut out**: Authentication, Stripe billing, multi-user websockets, and complex setting pages.\n- **Focus strictly on**: 1 inputs screen -> 1 lightning-fast core transformation -> 1 beautiful shareable export card.\n- **Tech shortcut**: Replace custom backend logic with Next.js server actions or SQLite via Prisma.\n\nThis will take you from stalled to shipped in a single sprint.`,
      timestamp: now,
      isSimulated: true,
      suggestions: [
        {
          id: `sug-${Date.now()}`,
          type: 'add-task',
          label: 'Build 48h Barebones Prototype View',
          description: 'Focus solely on the core single-page user flow.',
          applied: false,
          data: {
            title: 'Build stripped-down single-page demo flow without auth',
            priority: 'high',
            weight: 3,
          },
        },
      ],
    };
  }

  if (p.includes('path') || p.includes('optimal')) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `### Revival Path Recommendation for ${project.title}\n\nBased on your progress (${project.progress}%) and history:\n\n**Recommended Pathway: "Continue Momentum"**\nYou already possess valuable completed features: *${project.completedFeatures[0] || 'the core scaffold'}*. A full restart would discard hard-earned lessons. Instead, resolve the single blocker in task 1 and resume momentum.\n\n*Alternatively*, if your original co-founder left or passion shifted, choose **"Repurpose Assets"** to spin this codebase into an AI hackathon project.`,
      timestamp: now,
      isSimulated: true,
    };
  }

  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: `### Strategic Recommendations for ${project.title}\n\n1. **Leverage Modern Stack Ergonomics**: Your current stack (${project.languages.concat(project.frameworks).join(', ')}) is modern. You don't need a total rewrite—just a decoupled service layer.\n2. **Engage Hackathon Community**: Mark this project **Public** in Discovery to invite contributors from civic or open-source boards.\n3. **Next Immediate Milestone**: Complete the next pending task to shift your garden status from ${project.status} to active.`,
    timestamp: now,
    isSimulated: true,
  };
}

export default RevivalStudioPage;
