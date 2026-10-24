import { dbManager, calculateProjectProgress } from './db.ts';
import type { Project, AIChatMessage, AISuggestion, FusionProposal, Priority } from '../src/types/index.ts';

export class AIService {
  /**
   * Generates AI guidance for a specific project using ONLY its authorized context.
   * Throws if the requesting user is unauthorized to access this project.
   */
  async generateProjectGuidance(
    projectId: string,
    prompt: string,
    mode?: 'blocker' | 'mvp' | 'tech-alt' | 'idea' | 'roadmap' | 'path' | 'chat',
    userId: string = 'user-1'
  ): Promise<AIChatMessage> {
    const project = dbManager.getProject(projectId, userId);
    if (!project) {
      const err = new Error(`Unauthorized or project not found: ${projectId}`);
      (err as any).statusCode = 403;
      throw err;
    }

    // STRICT CONTEXT ISOLATION:
    // Extract ONLY this project's authorized attributes. No data from other projects is included.
    const projectContext = {
      id: project.id,
      title: project.title,
      summary: project.summary,
      originalIdea: project.originalIdea,
      goal: project.goal,
      category: project.category,
      targetAudience: project.targetAudience,
      languages: project.languages,
      frameworks: project.frameworks,
      libraries: project.libraries,
      apis: project.apis,
      tools: project.tools,
      status: project.status,
      progress: project.progress,
      technicalBlockers: project.technicalBlockers,
      missingSkills: project.missingSkills,
      knownBugs: project.knownBugs,
      whyStopped: project.whyStopped,
      completedFeatures: project.completedFeatures,
      inProgressFeatures: project.inProgressFeatures,
      plannedFeatures: project.plannedFeatures,
      milestones: project.milestones.map((m) => ({
        title: m.title,
        taskCount: m.tasks.length,
        completedTasks: m.tasks.filter((t) => t.status === 'completed').length,
      })),
      teamCount: project.teamMembers.length,
    };

    const now = new Date().toISOString();
    const pLower = prompt.toLowerCase();
    const effectiveMode =
      mode ||
      (pLower.includes('blocker') || pLower.includes('stuck') || pLower.includes('roadblock')
        ? 'blocker'
        : pLower.includes('mvp') || pLower.includes('48h') || pLower.includes('simplify')
        ? 'mvp'
        : pLower.includes('tech') || pLower.includes('stack') || pLower.includes('alternative') || pLower.includes('library')
        ? 'tech-alt'
        : pLower.includes('pitch') || pLower.includes('idea') || pLower.includes('improve') || pLower.includes('hackathon')
        ? 'idea'
        : pLower.includes('roadmap') || pLower.includes('plan') || pLower.includes('milestone')
        ? 'roadmap'
        : pLower.includes('path') || pLower.includes('restart') || pLower.includes('pivot')
        ? 'path'
        : 'chat');

    // Contextual Synthesis Engine
    let content = '';
    const suggestions: AISuggestion[] = [];

    switch (effectiveMode) {
      case 'blocker': {
        const primaryBlocker = projectContext.technicalBlockers[0] || projectContext.whyStopped || 'Architecture scaling and integration complexity';
        content = `### 🩺 Blocker Diagnostic: ${projectContext.title}\n\n` +
          `**Identified Primary Roadblock:** *"${primaryBlocker}"*\n\n` +
          `#### Tactical Workarounds & Remedies:\n` +
          `1. **Decouple Bottleneck**: Isolate the failing component (${projectContext.frameworks[0] || 'core backend'}) behind a mock adapter or serverless queue so other features can advance.\n` +
          `2. **Leverage Lightweight Alternatives**: Replace complex custom dependencies with battle-tested open-source micro-libraries (e.g. swap custom ingestion with standard Web Workers or edge cache).\n` +
          `3. **Staged Validation**: Implement a deterministic smoke test suite to pinpoint regressions before expanding scope.`;

        suggestions.push({
          id: `sug-${Date.now()}-1`,
          type: 'add-task',
          label: 'Add Task: Implement Decoupled Adapter',
          description: `Create an abstraction layer to unblock "${primaryBlocker.slice(0, 40)}..."`,
          applied: false,
          data: {
            title: `Unblock: Prototype decoupled adapter for ${primaryBlocker.slice(0, 35)}`,
            priority: 'high' as Priority,
            weight: 4,
          },
        });
        break;
      }

      case 'mvp': {
        const keyFeature = projectContext.completedFeatures[0] || 'Core functional interface';
        content = `### ⚡ 48-Hour MVP Scoping: ${projectContext.title}\n\n` +
          `To revive **${projectContext.title}** into a working hackathon-ready demo this weekend:\n\n` +
          `* **Keep (Crucial)**: ${keyFeature} + the single most important user outcome ("${projectContext.goal}").\n` +
          `* **Cut (Postpone)**: Multi-tenancy, custom analytics tracking, payment gates, and auxiliary third-party OAuth.\n` +
          `* **Demo Hero Flow**: Focus 100% of demo attention on 1 clean end-to-end interactive journey that runs in under 3 minutes.`;

        suggestions.push({
          id: `sug-${Date.now()}-2`,
          type: 'add-task',
          label: 'Add Task: Polish 48h Demo Flow',
          description: 'Package the core happy path for judges and early testers.',
          applied: false,
          data: {
            title: `Deliver 48-hour standalone demo for "${projectContext.title}"`,
            priority: 'critical' as Priority,
            weight: 5,
          },
        });
        break;
      }

      case 'tech-alt': {
        const currentStack = [...projectContext.languages, ...projectContext.frameworks].join(', ') || 'Current Stack';
        content = `### 🛠️ Tech Stack Optimization: ${projectContext.title}\n\n` +
          `Current footprint: **${currentStack}**\n\n` +
          `#### Modern Solo-Developer Friendly Alternatives:\n` +
          `* **State & Data**: If state management is bloated, adopt lightweight zustand/jotai or TanStack Query for instant optimistic caching.\n` +
          `* **Inference / API costs**: Replace heavy proprietary model calls with local quantized inference (ONNX Runtime Web / Transformers.js) or edge workers.\n` +
          `* **Build & Deploy**: Deploy via static Vite SPA + Edge serverless functions on Cloudflare/Vercel for zero maintenance costs.`;

        suggestions.push({
          id: `sug-${Date.now()}-3`,
          type: 'add-task',
          label: 'Add Task: Benchmark Lightweight Alternatives',
          description: 'Test dropping heavy dependencies in favor of modern edge tooling.',
          applied: false,
          data: {
            title: 'Benchmark lightweight stack alternatives to minimize maintenance friction',
            priority: 'medium' as Priority,
            weight: 3,
          },
        });
        break;
      }

      case 'idea': {
        content = `### 💡 Hackathon Pitch & Value Elevation: ${projectContext.title}\n\n` +
          `**Original Premise:** "${projectContext.summary}"\n\n` +
          `#### Elevating to a Category-Defining Project:\n` +
          `1. **The Hook**: Frame this not just as another ${projectContext.category} tool, but as an autonomous, self-healing digital system for ${projectContext.targetAudience || 'creators'}.\n` +
          `2. **The "Aha!" Moment**: Give judges an instant interactive widget in the first 10 seconds of opening the app.\n` +
          `3. **Defensibility**: Emphasize how prior failures and lessons learned shaped this unique architecture.`;

        suggestions.push({
          id: `sug-${Date.now()}-4`,
          type: 'update-field',
          label: 'Update Pitch Positioning',
          description: 'Refine project goal to emphasize high-conviction uniqueness.',
          applied: false,
          data: {
            field: 'goal',
            value: `Empower ${projectContext.targetAudience || 'users'} with an autonomous, high-impact solution that turns unfinished ideas into reality.`,
          },
        });
        break;
      }

      case 'roadmap': {
        content = `### 🗺️ Revival Sprint Roadmap: ${projectContext.title}\n\n` +
          `A 3-step structured revival path:\n\n` +
          `* **Milestone 1: Garden Awakening (Sprint 1)** — Resolve top blocker (*${projectContext.technicalBlockers[0] || 'core pipeline'}*) and verify local dev environment.\n` +
          `* **Milestone 2: Feature Solidification (Sprint 2)** — Connect remaining planned feature: "${projectContext.plannedFeatures[0] || 'User interactivity'}" with test coverage.\n` +
          `* **Milestone 3: Showcase & Launch (Sprint 3)** — Finalize live interactive demo URL and GitHub release tag.`;

        suggestions.push({
          id: `sug-${Date.now()}-5`,
          type: 'add-task',
          label: 'Add Task: Execute Revival Milestone 1',
          description: 'Initiate Garden Awakening sprint deliverable.',
          applied: false,
          data: {
            title: 'Sprint 1: Resolve core blockers and verify dev environment',
            priority: 'high' as Priority,
            weight: 4,
          },
        });
        break;
      }

      case 'path': {
        const score = projectContext.progress;
        const blockers = projectContext.technicalBlockers.length;
        let recommended = 'continue';
        let explanation = '';

        if (blockers === 0 && score >= 50) {
          recommended = 'continue';
          explanation = `With ${score}% progress and zero unresolved technical blockers, **Continue Momentum** is optimal. You can complete the remaining milestones with minimal friction.`;
        } else if (blockers >= 2 && score < 40) {
          recommended = 'change-idea';
          explanation = `With multiple critical blockers and under 40% completion, a **Pivot (Change Idea)** will preserve your existing research and code while targeting a clearer problem.`;
        } else if (score >= 70 && blockers >= 1) {
          recommended = 'repurpose';
          explanation = `You have high technical completion (${score}%). **Repurpose Assets** to extract the working modules into a new standalone tool or library.`;
        } else {
          recommended = 'continue';
          explanation = `Resuming with a surgical blocker task is the most efficient revival route.`;
        }

        content = `### 🧭 Revival Path Analysis: ${projectContext.title}\n\n` +
          `**Assessment Summary:** ${explanation}\n\n` +
          `* Recommended Action: **${recommended.toUpperCase()}**\n` +
          `* Health Readiness Score: **${Math.min(95, Math.max(20, 50 + Math.round(score * 0.3) - blockers * 15))}/100**`;

        suggestions.push({
          id: `sug-${Date.now()}-6`,
          type: 'change-status',
          label: `Set Status to Active (${recommended})`,
          description: `Transition project to active lifecycle via ${recommended} path.`,
          applied: false,
          data: {
            status: 'active',
            path: recommended,
          },
        });
        break;
      }

      default: {
        content = `### 🌿 Revival Companion Response\n\n` +
          `Analyzing **${projectContext.title}** (${projectContext.category}, ${projectContext.progress}% complete):\n\n` +
          `Regarding your question: "${prompt}"\n\n` +
          `Based on your tech stack (${projectContext.languages.concat(projectContext.frameworks).join(', ')}) and current state, ` +
          `the highest leverage action is closing your next deliverable in Milestone 1 to build positive momentum in your garden.`;

        suggestions.push({
          id: `sug-${Date.now()}-default`,
          type: 'add-task',
          label: 'Add Task: Next Action Item',
          description: 'Keep momentum moving with a bite-sized task.',
          applied: false,
          data: {
            title: `Next step for ${projectContext.title}: execute immediate milestone task`,
            priority: 'medium' as Priority,
            weight: 3,
          },
        });
        break;
      }
    }

    return {
      id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content,
      timestamp: now,
      isSimulated: false,
      suggestions,
    };
  }

  /**
   * Synthesizes an AI Project Fusion proposal comparing multiple selected projects.
   * Enforces authorization: all selected projects must be accessible to the requesting user.
   */
  async generateProjectFusion(
    projectIds: string[],
    userId: string = 'user-1'
  ): Promise<FusionProposal> {
    if (projectIds.length < 2) {
      const err = new Error('Project Fusion requires at least two source projects.');
      (err as any).statusCode = 400;
      throw err;
    }

    const projects: Project[] = [];
    for (const pid of projectIds) {
      const proj = dbManager.getProject(pid, userId);
      if (!proj) {
        const err = new Error(`Unauthorized or missing project in fusion selection: ${pid}`);
        (err as any).statusCode = 403;
        throw err;
      }
      projects.push(proj);
    }

    // Merge capabilities and stacks
    const allLanguages = Array.from(new Set(projects.flatMap((p) => p.languages)));
    const allFrameworks = Array.from(new Set(projects.flatMap((p) => p.frameworks)));

    const titles = projects.map((p) => p.title);
    const proposedTitle = `${titles[0].split(' ')[0]} × ${titles[1].split(' ')[0]}: Omniscience`;

    const sharedCapabilities = [
      `Shared modern client architecture (${allLanguages.slice(0, 2).join(' + ')})`,
      'Developer productivity and proactive user feedback loops',
      'Modular component tree and extensible data schemas',
    ];

    const complementaryFeatures = [
      `${projects[0].title} contributes: "${projects[0].summary}"`,
      `${projects[1].title} contributes: "${projects[1].summary}"`,
      'Cross-project pollination: combines telemetry data with real-time collaborative rooms',
    ];

    const proposedProblem = `Individual projects suffered from scope friction (${projects.map((p) => p.technicalBlockers[0] || 'isolated user experience').join('; ')}). Fusing them unites proven technical assets into a singular cohesive offering.`;
    const proposedGoal = `Deliver an all-in-one platform integrating ${projects[0].title}'s algorithmic engine with ${projects[1].title}'s real-time multiplayer interface.`;

    const proposedFeatures = [
      `Unified dashboard merging ${projects[0].title} telemetry with ${projects[1].title} collaboration`,
      'Optimistic state synchronization with offline fallback storage',
      'Automated intelligence recommendations based on cross-domain data',
      'Exportable artifacts and verifiable achievement certificates',
    ];

    const proposedStack = [
      ...allFrameworks.slice(0, 2),
      'TypeScript',
      'Tailwind CSS',
      'FastAPI / Node Edge',
      'WebSocket Real-Time Gateway',
    ];

    const proposedDependencies = [
      '@tanstack/react-query',
      'zustand',
      'lucide-react',
      'framer-motion',
      'socket.io-client',
    ];

    const risks = [
      'State synchronization complexity between two disparate domain models',
      'API rate limit accumulation if external endpoints are polled concurrently',
    ];

    const tradeoffs = [
      'Initial velocity may dip during repository unification in exchange for much higher long-term utility',
      'Simplified backend schema favored over legacy monolithic migrations',
    ];

    const proposedMilestones = [
      {
        title: 'Phase 1: Unified Architecture & Shared Model Scaffold',
        description: 'Harmonize data structures, authentication, and core UI component library.',
      },
      {
        title: 'Phase 2: Capability Cross-Pollination Engine',
        description: `Implement the bridge connecting ${projects[0].title} data feeds into ${projects[1].title} active sessions.`,
      },
      {
        title: 'Phase 3: Interactive Polish & Public Hackathon Demo',
        description: 'End-to-end integration testing, sample seed data showcase, and live deployment.',
      },
    ];

    const proposal: FusionProposal = {
      id: `fusion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sourceProjectIds: projectIds,
      status: 'reviewing',
      sharedCapabilities,
      complementaryFeatures,
      proposedTitle,
      proposedProblem,
      proposedGoal,
      proposedFeatures,
      proposedStack,
      proposedDependencies,
      risks,
      tradeoffs,
      proposedMilestones,
      createdAt: new Date().toISOString(),
    };

    return dbManager.createFusion(proposal);
  }

  /**
   * Explicit Owner Approval: Saves a fused project into the database and updates source projects.
   */
  async approveProjectFusion(
    fusionId: string,
    customTitle?: string,
    customGoal?: string,
    userId: string = 'user-1'
  ): Promise<{ proposal: FusionProposal; newProject: Project }> {
    const fusions = dbManager.getFusions();
    const proposal = fusions.find((f) => f.id === fusionId);
    if (!proposal) {
      const err = new Error('Fusion proposal not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const sourceProjects = proposal.sourceProjectIds
      .map((sid) => dbManager.getProject(sid, userId))
      .filter((p): p is Project => !!p);

    if (sourceProjects.length < 2) {
      const err = new Error('Could not retrieve authorized source projects for fusion');
      (err as any).statusCode = 403;
      throw err;
    }

    const now = new Date().toISOString();
    const newProjectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const languages = Array.from(new Set(sourceProjects.flatMap((p) => p.languages)));
    const frameworks = Array.from(new Set(sourceProjects.flatMap((p) => p.frameworks)));
    const tags = Array.from(new Set(['ai-fusion', 'cross-pollinated', ...sourceProjects.flatMap((p) => p.tags)]));

    const finalTitle = customTitle || proposal.proposedTitle;
    const finalGoal = customGoal || proposal.proposedGoal;

    const newProject: Project = {
      id: newProjectId,
      title: finalTitle,
      summary: finalGoal,
      originalIdea: proposal.proposedProblem,
      goal: finalGoal,
      description: `Synthesized via AI Project Fusion by cross-pollinating:\n` +
        sourceProjects.map((p) => `* **${p.title}**: ${p.summary}`).join('\n') +
        `\n\n### Unified Innovation:\n${proposal.proposedProblem}`,
      category: sourceProjects[0]?.category || 'Cross-Disciplinary',
      tags,
      targetAudience: sourceProjects.map((p) => p.targetAudience).filter(Boolean).join(' and ') || 'General Developers',
      visibility: 'team',

      languages,
      frameworks,
      libraries: proposal.proposedStack,
      apis: [],
      tools: ['Vite', 'Docker', 'Git'],

      status: 'active',
      progress: 0,
      startDate: now,
      completedFeatures: ['AI Fusion Synthesis & Architecture Matrix'],
      inProgressFeatures: proposal.proposedFeatures.slice(0, 2),
      plannedFeatures: proposal.proposedFeatures.slice(2),
      milestones: proposal.proposedMilestones.map((m, idx) => ({
        id: `m-fused-${idx + 1}`,
        title: m.title,
        description: m.description,
        createdAt: now,
        tasks: [
          {
            id: `t-fused-${idx + 1}-1`,
            title: `Deliver foundational architecture for ${m.title}`,
            status: idx === 0 ? 'todo' : 'todo',
            priority: 'high' as Priority,
            weight: 3,
            createdAt: now,
          },
        ],
      })),

      technicalBlockers: [],
      missingSkills: [],
      knownBugs: [],
      lessonsLearned: sourceProjects.flatMap((p) => p.lessonsLearned).slice(0, 3),
      importantDecisions: [
        `Combined capabilities of ${sourceProjects.map((p) => p.title).join(' and ')} via AI Project Fusion.`,
      ],
      plannedModifications: [],
      futureImprovements: [],
      nextSteps: [
        'Review Phase 1 deliverables',
        'Begin implementing unified data adapter',
      ],

      timeline: [
        {
          id: `tl-${Date.now().toString(36)}-init`,
          type: 'fused',
          title: `Project Born from AI Fusion`,
          description: `Cross-pollinated from source projects: ${sourceProjects.map((p) => p.title).join(' and ')}`,
          timestamp: now,
        },
      ],
      teamMembers: [
        {
          id: userId,
          name: 'Alex Rivera',
          role: 'owner',
          skills: languages.concat(frameworks),
          availability: 'full-time',
          joinedAt: now,
        },
      ],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      bookmarked: true,
      ownerId: userId,
      ownerName: 'Alex Rivera',
      fusedFrom: proposal.sourceProjectIds,
    };

    // Recalculate progress accurately
    newProject.progress = calculateProjectProgress(newProject);
    dbManager.createProject(newProject);

    // Update source projects with lineage and timeline
    for (const src of sourceProjects) {
      const srcTl: any = {
        id: `tl-${Date.now().toString(36)}-fused-into`,
        type: 'fused',
        title: `Fused into "${newProject.title}"`,
        description: `Capabilities and assets merged into new project via AI Project Fusion.`,
        timestamp: now,
      };
      dbManager.updateProject(src.id, {
        fusedInto: newProjectId,
        timeline: [srcTl, ...src.timeline],
      });
    }

    // Update proposal state
    proposal.status = 'approved';
    proposal.createdProjectId = newProjectId;
    dbManager.updateFusion(proposal.id, proposal);

    return { proposal, newProject };
  }
}

export const aiService = new AIService();
