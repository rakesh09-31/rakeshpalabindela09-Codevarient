import { dbManager, calculateProjectProgress } from './db.ts';
import type { Project, AIChatMessage, AISuggestion, FusionProposal, Priority, ReminderSuggestion } from '../src/types/index.ts';

export class AIService {
  /**
   * Generates AI guidance for a specific project using ONLY its authorized context.
   * Throws if the requesting user is unauthorized to access this project.
   */
  async generateProjectGuidance(
    projectId: string,
    prompt: string,
    mode?: string,
    userId: string = 'user-1',
    chatHistory?: Array<{ role: string; content: string }>
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
      summary: project.summary || '',
      originalIdea: project.originalIdea || '',
      goal: project.goal || '',
      description: project.description || '',
      category: project.category || 'General',
      targetAudience: project.targetAudience || '',
      languages: project.languages || [],
      frameworks: project.frameworks || [],
      libraries: project.libraries || [],
      apis: project.apis || [],
      tools: project.tools || [],
      repoUrl: project.repoUrl,
      demoUrl: project.demoUrl,
      readmeUrl: project.readmeUrl,
      status: project.status,
      progress: project.progress || 0,
      startDate: project.startDate,
      pauseDate: project.pauseDate,
      whyStopped: project.whyStopped,
      technicalBlockers: project.technicalBlockers || [],
      missingSkills: project.missingSkills || [],
      knownBugs: project.knownBugs || [],
      lessonsLearned: project.lessonsLearned || [],
      importantDecisions: project.importantDecisions || [],
      plannedModifications: project.plannedModifications || [],
      futureImprovements: project.futureImprovements || [],
      nextSteps: project.nextSteps || [],
      completedFeatures: project.completedFeatures || [],
      inProgressFeatures: project.inProgressFeatures || [],
      plannedFeatures: project.plannedFeatures || [],
      milestones: (project.milestones || []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        taskCount: m.tasks?.length || 0,
        completedTasks: m.tasks?.filter((t) => t.status === 'completed').length || 0,
        tasks: (m.tasks || []).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          weight: t.weight,
        })),
      })),
      teamMembers: (project.teamMembers || []).map((tm) => ({
        name: tm.name,
        role: tm.role,
        skills: tm.skills,
      })),
      timeline: project.timeline || [],
    };

    const now = new Date().toISOString();
    const pLower = (prompt || '').toLowerCase().trim();

    // Mode resolution: explicit mode > semantic prompt pattern > fallback
    let effectiveMode = mode;
    if (!effectiveMode || effectiveMode === 'chat') {
      if (pLower === 'overview' || pLower.includes('project overview') || pLower.includes('understand this project')) {
        effectiveMode = 'overview';
      } else if (pLower.includes('explain this project in detail') || (pLower.includes('explain') && pLower.includes('detail'))) {
        effectiveMode = 'explain-detail';
      } else if (pLower.includes('what problem does it solve') || (pLower.includes('problem') && pLower.includes('who is it for'))) {
        effectiveMode = 'problem-audience';
      } else if (pLower.includes('main features one by one') || pLower.includes('features one by one') || pLower.includes('explain the main features')) {
        effectiveMode = 'features-detail';
      } else if (pLower.includes('how does the project work') || pLower.includes('how it works') || pLower.includes('how does it work')) {
        effectiveMode = 'how-it-works';
      } else if (pLower.includes('tech stack and architecture') || (pLower.includes('stack') && pLower.includes('architecture'))) {
        effectiveMode = 'stack-architecture';
      } else if (pLower.includes('completed and what is still unfinished') || pLower.includes('what was completed') || pLower.includes('still unfinished') || pLower.includes('unfinished')) {
        effectiveMode = 'completed-vs-unfinished';
      } else if (pLower.includes('biggest blockers') || pLower.includes('blockers to reviving') || (pLower.includes('blocker') && pLower.includes('reviving'))) {
        effectiveMode = 'blockers-deep';
      } else if (pLower.includes('what should i do first') || pLower.includes('do first to continue') || pLower.includes('first steps') || pLower.includes('first step')) {
        effectiveMode = 'first-steps';
      } else if (pLower.includes('blocker') || pLower.includes('stuck') || pLower.includes('roadblock')) {
        effectiveMode = 'blocker';
      } else if (pLower.includes('mvp') || pLower.includes('48h') || pLower.includes('simplify') || pLower.includes('weekend')) {
        effectiveMode = 'mvp';
      } else if (pLower.includes('tech') || pLower.includes('stack') || pLower.includes('alternative') || pLower.includes('library')) {
        effectiveMode = 'tech-alt';
      } else if (pLower.includes('pitch') || pLower.includes('idea') || pLower.includes('improve') || pLower.includes('hackathon')) {
        effectiveMode = 'idea';
      } else if (pLower.includes('roadmap') || pLower.includes('plan') || pLower.includes('milestone')) {
        effectiveMode = 'roadmap';
      } else if (pLower.includes('path') || pLower.includes('restart') || pLower.includes('pivot')) {
        effectiveMode = 'path';
      } else {
        effectiveMode = 'chat';
      }
    }

    let content = '';
    const suggestions: AISuggestion[] = [];

    const totalTasks = projectContext.milestones.reduce((acc, m) => acc + m.taskCount, 0);
    const completedTasks = projectContext.milestones.reduce((acc, m) => acc + m.completedTasks, 0);
    const remainingTasks = totalTasks - completedTasks;
    const stackSummary = [...projectContext.languages, ...projectContext.frameworks, ...projectContext.libraries].join(', ') || 'Standard web stack';

    switch (effectiveMode) {
      // ---------------- 1. WORKSPACE INITIAL OVERVIEW ----------------
      case 'overview': {
        const primaryReason = projectContext.whyStopped || (projectContext.technicalBlockers[0] ? `Technical roadblock: ${projectContext.technicalBlockers[0]}` : 'Reason for pausing was not explicitly documented in the archive.');
        const repoNotice = projectContext.repoUrl
          ? `* **Repository URL**: [${projectContext.repoUrl}](${projectContext.repoUrl})`
          : `* **Repository URL**: *No repository URL recorded in project file.* (The AI has not inspected source code or repository files).`;

        content = `### 🌿 Grounded Project Overview: ${projectContext.title}\n\n` +
          `**${projectContext.title}** is a **${projectContext.category}** initiative preserved with **${projectContext.status.toUpperCase()}** status (${projectContext.progress}% weighted progress).\n\n` +
          `#### 🎯 Purpose & Intended Outcome\n` +
          `* **Core Premise**: ${projectContext.summary}\n` +
          `* **Original Idea**: "${projectContext.originalIdea || projectContext.summary}"\n` +
          `* **Target Audience**: ${projectContext.targetAudience ? `**${projectContext.targetAudience}**` : '*Not explicitly recorded in project dossier.*'}\n` +
          `* **Stated Goal**: ${projectContext.goal || '*Not explicitly defined.*'}\n\n` +
          `#### 🛠️ Technology & Assets\n` +
          `* **Tech Stack**: ${stackSummary}\n` +
          `* **External APIs**: ${projectContext.apis.length > 0 ? projectContext.apis.join(', ') : 'None configured'}\n` +
          `${repoNotice}\n\n` +
          `#### 📊 Development Health & Dormancy\n` +
          `* **Features**: ${projectContext.completedFeatures.length} completed, ${projectContext.inProgressFeatures.length} in progress, ${projectContext.plannedFeatures.length} planned\n` +
          `* **Milestone Progress**: ${completedTasks} of ${totalTasks} tasks completed across ${projectContext.milestones.length} milestones\n` +
          `* **Dormancy Reason**: *"${primaryReason}"*\n\n` +
          `---\n` +
          `*Ask any question below about this project's architecture, features, blockers, or next steps to prepare your revival strategy.*`;
        break;
      }

      // ---------------- 2. EXPLAIN PROJECT IN DETAIL ----------------
      case 'explain-detail': {
        const repoDetail = projectContext.repoUrl
          ? `The project is linked to repository \`${projectContext.repoUrl}\`. Note: the AI analyzes recorded architectural metadata and has not executed tests against the repository.`
          : `⚠️ **Repository Note**: No repository link or code repository is recorded for this project. The AI has not inspected source files, git commits, or running code.`;

        content = `### 📋 Comprehensive Project Breakdown: ${projectContext.title}\n\n` +
          `#### 1. Plain-Language Concept & Overview\n` +
          `In plain terms, **${projectContext.title}** is a **${projectContext.category}** project designed to solve: *"${projectContext.summary}"*. ` +
          `It is tailored specifically for **${projectContext.targetAudience || 'its intended users'}**, aiming to achieve: *"${projectContext.goal || 'streamlined digital workflows'}"*.\n\n` +
          `#### 2. Architecture & Technical Structure\n` +
          `* **Languages**: ${projectContext.languages.join(', ') || 'Not specified'}\n` +
          `* **Frameworks & UI**: ${projectContext.frameworks.join(', ') || 'Not specified'}\n` +
          `* **Libraries & Packages**: ${projectContext.libraries.join(', ') || 'Standard packages'}\n` +
          `* **APIs & Third-Party Services**: ${projectContext.apis.join(', ') || 'None connected'}\n` +
          `* **Dev & Build Tools**: ${projectContext.tools.join(', ') || 'Standard build tools'}\n` +
          `* **Source Code State**: ${repoDetail}\n\n` +
          `#### 3. Development Progress & Lifecycle State\n` +
          `* **Current Status**: **${projectContext.status.toUpperCase()}** (${projectContext.progress}% weighted completion).\n` +
          `* **Milestones**: ${projectContext.milestones.length} defined (${completedTasks}/${totalTasks} tasks finished).\n` +
          `* **Completed Features**: ${projectContext.completedFeatures.length > 0 ? projectContext.completedFeatures.join(', ') : 'Scaffolding and foundational setup only.'}\n\n` +
          `#### 4. Dormancy Factors & Stalling Reasons\n` +
          `* **Why Paused**: ${projectContext.whyStopped ? `*"${projectContext.whyStopped}"*` : '*Reason was not explicitly recorded when paused.*'}\n` +
          `* **Technical Blockers**: ${projectContext.technicalBlockers.length > 0 ? projectContext.technicalBlockers.map((b) => `\n  - ${b}`).join('') : ' None logged.'}\n\n` +
          `#### 5. Saved Facts vs. AI Inferences\n` +
          `* **Saved Facts**: Stored project metadata (technologies, milestone statuses, recorded blocker descriptions).\n` +
          `* **AI Assessment**: The project has viable assets (${projectContext.completedFeatures.length > 0 ? 'solid feature scaffolding' : 'clear conceptual domain'}) but requires resolving dependencies before resuming.`;
        break;
      }

      // ---------------- 3. WHAT PROBLEM DOES IT SOLVE & WHO FOR ----------------
      case 'problem-audience': {
        content = `### 🎯 Problem Statement & Target Audience: ${projectContext.title}\n\n` +
          `#### 1. The Core Problem Being Addressed\n` +
          `**Saved Problem Formulation:**\n` +
          `> "${projectContext.originalIdea || projectContext.summary}"\n\n` +
          `*In simple language:* Users in the **${projectContext.category}** space face friction with existing workflows. ` +
          `This project was conceived to remove that friction by providing an automated, organized, and focused solution.\n\n` +
          `#### 2. Target Audience\n` +
          `* **Intended Users**: ${projectContext.targetAudience ? `**${projectContext.targetAudience}**` : '*Not explicitly specified in the saved project file.*'}\n` +
          `* **User Need**: They require a reliable way to accomplish *"${projectContext.goal || projectContext.summary}"* without manual overhead.\n\n` +
          `#### 3. Desired Ultimate Outcome\n` +
          `* **Project Goal**: "${projectContext.goal || 'Deliver a functional, deployable system.'}"\n\n` +
          `#### 4. Saved Facts vs. Assumptions\n` +
          `* **Saved Facts**: The problem statement ("${(projectContext.originalIdea || projectContext.summary).slice(0, 80)}...") and target audience ("${projectContext.targetAudience || 'Unspecified'}") are direct saved attributes.\n` +
          `* **AI Suggestion**: When reviving, conduct a 10-minute user survey with 3 individuals from **${projectContext.targetAudience || 'your target audience'}** to confirm their acute pain points before writing new code.`;
        break;
      }

      // ---------------- 4. MAIN FEATURES ONE BY ONE ----------------
      case 'features-detail': {
        const completedSection = projectContext.completedFeatures.length > 0
          ? projectContext.completedFeatures.map((f, i) => `${i + 1}. **${f}** — Fully implemented and verified in past sprints.`).join('\n')
          : '*No features were marked as fully completed before this project was preserved.*';

        const inProgressSection = projectContext.inProgressFeatures.length > 0
          ? projectContext.inProgressFeatures.map((f, i) => `${i + 1}. **${f}** — Work was in flight when the project paused.`).join('\n')
          : '*No features were actively in-progress when paused.*';

        const plannedSection = projectContext.plannedFeatures.length > 0
          ? projectContext.plannedFeatures.map((f, i) => `${i + 1}. **${f}** — Future roadmap capability required for full production release.`).join('\n')
          : '*No additional planned features recorded in the archive.*';

        content = `### 🧩 Feature-by-Feature Breakdown: ${projectContext.title}\n\n` +
          `#### ✅ Completed Features (${projectContext.completedFeatures.length})\n` +
          `${completedSection}\n\n` +
          `#### ⏳ In-Progress Features (${projectContext.inProgressFeatures.length})\n` +
          `${inProgressSection}\n\n` +
          `#### 📋 Planned Features (${projectContext.plannedFeatures.length})\n` +
          `${plannedSection}\n\n` +
          `#### 💡 Architectural Synergy\n` +
          `These capabilities are designed to run atop **${stackSummary}**. ` +
          `The highest leverage step is bringing the in-progress feature set across the finish line before initiating new planned features.`;
        break;
      }

      // ---------------- 5. HOW DOES THE PROJECT WORK ----------------
      case 'how-it-works': {
        const primaryLang = projectContext.languages[0] || 'TypeScript';
        const primaryFramework = projectContext.frameworks[0] || 'React';
        const apiNote = projectContext.apis.length > 0 ? projectContext.apis.join(' and ') : 'internal data storage';

        content = `### ⚙️ System Mechanics: How ${projectContext.title} Works\n\n` +
          `#### Step 1: User Onboarding & Input Layer\n` +
          `The user interacts with a modern client interface built using **${primaryFramework}**. ` +
          `Input parameters and user actions are captured through dedicated form controls and routed through client-side state.\n\n` +
          `#### Step 2: Core Processing & Engine Execution\n` +
          `Business logic is evaluated using **${primaryLang}**. Core algorithms process the input data, applying domain-specific transformations ` +
          `relevant to ${projectContext.category}.\n\n` +
          `#### Step 3: External Integration & Data Pipeline\n` +
          `The application interfaces with **${apiNote}** to query live state, generate outputs, or sync records.\n\n` +
          `#### Step 4: Storage & Presentation\n` +
          `Results are formatted, cached, and presented back to the user through responsive UI dashboards.\n\n` +
          `#### ⚠️ Current Functional Boundary\n` +
          `Development was suspended at the boundary between Milestone 1 and Milestone 2. ` +
          `Specifically: ${projectContext.technicalBlockers[0] ? `The system halts at: *"${projectContext.technicalBlockers[0]}"*.` : `Work paused due to: *"${projectContext.whyStopped || 'bandwidth constraints'}"*.`}`;
        break;
      }

      // ---------------- 6. TECH STACK AND ARCHITECTURE ----------------
      case 'stack-architecture': {
        const repoState = projectContext.repoUrl
          ? `* **Repository URL**: \`${projectContext.repoUrl}\`\n* **Inspection Notice**: The AI evaluates saved architectural parameters and has not executed or run local code.`
          : `* **Repository URL**: ⚠️ **No repository URL is recorded in the project file.**\n* **Limitation Notice**: The AI has not inspected actual source files, directory trees, or Git commits because no repository link was provided. To discuss specific code files or functions, please paste code snippets directly into this chat.`;

        content = `### 🏗️ Tech Stack & Architecture: ${projectContext.title}\n\n` +
          `#### 1. Presentation / Client Layer\n` +
          `* **Frameworks**: ${projectContext.frameworks.length > 0 ? projectContext.frameworks.join(', ') : 'None specified'}\n` +
          `* **Libraries**: ${projectContext.libraries.length > 0 ? projectContext.libraries.join(', ') : 'Standard component dependencies'}\n\n` +
          `#### 2. Core Execution & Runtime Layer\n` +
          `* **Languages**: ${projectContext.languages.length > 0 ? projectContext.languages.join(', ') : 'None specified'}\n` +
          `* **Build & Dev Tools**: ${projectContext.tools.length > 0 ? projectContext.tools.join(', ') : 'Standard tooling'}\n\n` +
          `#### 3. External Services & APIs\n` +
          `* **APIs**: ${projectContext.apis.length > 0 ? projectContext.apis.join(', ') : 'No external APIs configured'}\n\n` +
          `#### 4. Source Code & Repository Status\n` +
          `${repoState}\n\n` +
          `#### 5. Architectural Evaluation\n` +
          `* **Modularity**: The current stack (${stackSummary}) is well-suited for solo developers or small teams.\n` +
          `* **Friction Points**: Watch for heavy third-party dependencies that introduce latency or billing quotas.`;
        break;
      }

      // ---------------- 7. WHAT WAS COMPLETED VS UNFINISHED ----------------
      case 'completed-vs-unfinished': {
        content = `### 📊 Completed vs. Unfinished Work: ${projectContext.title}\n\n` +
          `#### 📈 Quantitative Progress Metrics\n` +
          `* **Overall Weighted Progress**: **${projectContext.progress}%**\n` +
          `* **Milestones Defined**: **${projectContext.milestones.length}**\n` +
          `* **Task Breakdown**: **${totalTasks} total tasks** (**${completedTasks} completed**, **${remainingTasks} remaining**)\n\n` +
          `#### ✅ What Was Completed\n` +
          `* **Features**: ${projectContext.completedFeatures.length > 0 ? projectContext.completedFeatures.map((f) => `\`${f}\``).join(', ') : 'Foundational architecture only.'}\n` +
          `* **Milestones Finished**: ${projectContext.milestones.filter((m) => m.taskCount > 0 && m.completedTasks === m.taskCount).map((m) => m.title).join(', ') || 'No milestones 100% completed.'}\n\n` +
          `#### ⏳ What Remains Unfinished\n` +
          `* **In-Progress Features**: ${projectContext.inProgressFeatures.length > 0 ? projectContext.inProgressFeatures.map((f) => `\`${f}\``).join(', ') : 'None marked in-progress.'}\n` +
          `* **Planned Features**: ${projectContext.plannedFeatures.length > 0 ? projectContext.plannedFeatures.map((f) => `\`${f}\``).join(', ') : 'None planned.'}\n` +
          `* **Remaining Tasks**: ${remainingTasks} pending tasks in Milestone backlog.\n\n` +
          `#### 🛑 Stalling Point\n` +
          `The immediate barrier preventing transition to 100% is: *"${projectContext.technicalBlockers[0] || projectContext.whyStopped || 'Pending task backlog'}"*.`;
        break;
      }

      // ---------------- 8. BIGGEST BLOCKERS TO REVIVING IT ----------------
      case 'blockers-deep': {
        const blockerItems = projectContext.technicalBlockers.length > 0
          ? projectContext.technicalBlockers.map((b, i) => `${i + 1}. **${b}**\n   - *Impact*: Halts execution of dependent features.\n   - *Workaround*: Decouple from synchronous call; introduce mock adapter or fallback provider.`).join('\n\n')
          : '*Zero technical blockers were logged in the project dossier.*';

        content = `### 🚧 Roadblocks & Blockers Analysis: ${projectContext.title}\n\n` +
          `#### 1. Known Technical Blockers\n` +
          `${blockerItems}\n\n` +
          `#### 2. Reason for Stalling / Abandonment (Saved Fact)\n` +
          `> "${projectContext.whyStopped || 'No explicit textual reason for pausing was recorded in the archive.'}"\n\n` +
          `#### 3. Skills & Bug Audit\n` +
          `* **Missing Skills**: ${projectContext.missingSkills.length > 0 ? projectContext.missingSkills.join(', ') : 'None recorded'}\n` +
          `* **Known Bugs**: ${projectContext.knownBugs.length > 0 ? projectContext.knownBugs.join(', ') : 'Zero known bugs documented'}\n\n` +
          `#### 4. Recommended Tactical Unblocking Sequence\n` +
          `1. **Mock the Failing Layer**: Temporarily replace third-party dependencies with deterministic in-memory stubs.\n` +
          `2. **Isolate Scope**: Verify the core happy path independently of error-prone features.\n` +
          `3. **Re-engage Incrementally**: Solve one blocker at a time before adding new capabilities.`;

        suggestions.push({
          id: `sug-${Date.now()}-blocker-task`,
          type: 'add-task',
          label: 'Add Task: Implement Mock Workaround',
          description: `Create an adapter to bypass "${(projectContext.technicalBlockers[0] || 'primary blocker').slice(0, 35)}..."`,
          applied: false,
          data: {
            title: `Unblock: Prototype mock adapter for ${projectContext.technicalBlockers[0] || 'primary blocker'}`,
            priority: 'high' as Priority,
            weight: 4,
          },
        });
        break;
      }

      // ---------------- 9. WHAT SHOULD I DO FIRST ----------------
      case 'first-steps': {
        const topTask = projectContext.milestones[0]?.tasks.find((t) => t.status !== 'completed');
        const nextTaskTitle = topTask?.title || `Resolve ${projectContext.technicalBlockers[0] || 'initial prototype setup'}`;

        content = `### 🚀 First Steps to Resume Development: ${projectContext.title}\n\n` +
          `Here is a practical, prioritized 3-step sequence to wake this project up without getting overwhelmed:\n\n` +
          `#### Step 1: Baseline & Dev Environment Check (30 Minutes)\n` +
          `* Clone or open the project workspace.\n` +
          `* Verify package manager dependencies and run a clean build.\n` +
          `* Confirm environment variables (e.g. API keys for ${projectContext.apis.join(', ') || 'connected services'}).\n\n` +
          `#### Step 2: Tackle Highest-Leverage Deliverable (60-90 Minutes)\n` +
          `* Focus on: **"${nextTaskTitle}"**.\n` +
          `* Do not touch auxiliary settings or planned features yet; focus purely on restoring working code flow.\n\n` +
          `#### Step 3: Establish a Working Smoke-Test Loop (30 Minutes)\n` +
          `* Validate the core happy path from user entry to primary output.\n` +
          `* Verify that no regressions trigger the blocker: *"${projectContext.technicalBlockers[0] || 'prior issue'}"*.\n\n` +
          `---\n` +
          `*Tip: You can add this immediate action item directly to your milestone below.*`;

        suggestions.push({
          id: `sug-${Date.now()}-step1`,
          type: 'add-task',
          label: `Add Task: ${nextTaskTitle.slice(0, 30)}...`,
          description: 'Adds the prioritized first step directly to Milestone 1.',
          applied: false,
          data: {
            title: `Revival Step 1: ${nextTaskTitle}`,
            priority: 'critical' as Priority,
            weight: 5,
          },
        });
        break;
      }

      // ---------------- 10. BLOCKER TROUBLESHOOTING (Backwards-compatible) ----------------
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

      // ---------------- 11. 48-HOUR MVP SCOPING (Backwards-compatible) ----------------
      case 'mvp': {
        const keyFeature = projectContext.completedFeatures[0] || 'Core functional interface';
        content = `### ⚡ 48-Hour MVP Scoping: ${projectContext.title}\n\n` +
          `To revive **${projectContext.title}** into a working hackathon-ready demo this weekend:\n\n` +
          `* **Keep (Crucial)**: ${keyFeature} + the single most important user outcome ("${projectContext.goal || projectContext.summary}").\n` +
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

      // ---------------- 12. TECH STACK ALTERNATIVES (Backwards-compatible) ----------------
      case 'tech-alt': {
        const currentStack = stackSummary;
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

      // ---------------- 13. IDEA / PITCH (Backwards-compatible) ----------------
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

      // ---------------- 14. ROADMAP (Backwards-compatible) ----------------
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

      // ---------------- 15. PATH GUIDANCE (Backwards-compatible) ----------------
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
        break;
      }

      // ---------------- 16. CHAT / CONVERSATIONAL FOLLOW-UPS ----------------
      default: {
        // Conversational handling with strict context grounding
        const isAskingAboutCodeOrFiles = pLower.includes('code') || pLower.includes('file') || pLower.includes('repo') || pLower.includes('line of code') || pLower.includes('function') || pLower.includes('class');
        const isAskingAboutTeam = pLower.includes('team') || pLower.includes('collaborator') || pLower.includes('member') || pLower.includes('who is working');
        const isAskingAboutDatabase = pLower.includes('database') || pLower.includes('schema') || pLower.includes('sql') || pLower.includes('postgres') || pLower.includes('table');
        const isAskingAboutBlockers = pLower.includes('block') || pLower.includes('stuck') || pLower.includes('bug') || pLower.includes('issue');

        const historyNote = (chatHistory && chatHistory.length > 0)
          ? `\n\n*Prior Discussion Context*: Continuing previous discussion regarding "${chatHistory[chatHistory.length - 1]?.content.slice(0, 40)}...".`
          : '';

        if (isAskingAboutCodeOrFiles) {
          if (projectContext.repoUrl) {
            content = `### 🔍 Source Code Inquiry: ${projectContext.title}\n\n` +
              `This project has a recorded repository URL at: [${projectContext.repoUrl}](${projectContext.repoUrl}).\n\n` +
              `**Scope & Limitation Note**: The AI evaluates the saved architectural dossier (languages: ${projectContext.languages.join(', ') || 'N/A'}, frameworks: ${projectContext.frameworks.join(', ') || 'N/A'}) and does not have direct read access to cloned disk files or arbitrary commit trees. If you have specific code snippets or function definitions, please paste them here and I will analyze them.` +
              historyNote;
          } else {
            content = `### ⚠️ No Code Repository Recorded: ${projectContext.title}\n\n` +
              `**Information Not Available**: There is no repository URL or source code tree attached to this project's archive entry.\n\n` +
              `* The AI is reasoning strictly from saved metadata (${stackSummary}).\n` +
              `* It has not inspected any actual repository files or directory trees.\n\n` +
              `If you have a GitHub link, local file, or code snippet you would like to examine, paste it directly into this chat or add the repository link in the Project Detail editor.` +
              historyNote;
          }
        } else if (isAskingAboutTeam) {
          content = `### 👥 Team Composition: ${projectContext.title}\n\n` +
            (projectContext.teamMembers.length > 0
              ? projectContext.teamMembers.map((tm) => `* **${tm.name}** (${tm.role}) — Skills: ${tm.skills.join(', ') || 'General'}`).join('\n')
              : '*No team members are recorded for this project in the database.*') +
            `\n\nTo recruit additional contributors, you can propose collaboration in the Discovery hub.`;
        } else if (isAskingAboutDatabase) {
          content = `### 🗄️ Persistence & Database Layer: ${projectContext.title}\n\n` +
            `* **Recorded APIs & Storage**: ${projectContext.apis.length > 0 ? projectContext.apis.join(', ') : 'No dedicated remote database API recorded in project attributes.'}\n` +
            `* **Architecture Note**: If the project uses SQLite, Supabase, or PostgreSQL, that schema detail is not explicitly logged in the high-level dossier.\n\n` +
            `*Would you like to share your database schema or table requirements so we can architect the persistence layer?*`;
        } else if (isAskingAboutBlockers) {
          content = `### 🚧 Technical Obstacle Overview: ${projectContext.title}\n\n` +
            (projectContext.technicalBlockers.length > 0
              ? projectContext.technicalBlockers.map((b, i) => `${i + 1}. **${b}**`).join('\n')
              : `*Zero technical blockers are logged for this project.*`) +
            `\n\n**Reason Stalled**: *"${projectContext.whyStopped || 'Not recorded'}"*.\n` +
            `Would you like to explore workarounds to bypass these bottlenecks?`;
        } else {
          content = `### 🌿 Revival Companion: ${projectContext.title}\n\n` +
            `Regarding your question: *"${prompt}"*\n\n` +
            `**Project Context Insights:**\n` +
            `* **Domain**: ${projectContext.category} (${projectContext.status.toUpperCase()}, ${projectContext.progress}% complete)\n` +
            `* **Current Tech Ecosystem**: ${stackSummary}\n` +
            `* **Milestone State**: ${completedTasks} of ${totalTasks} tasks completed\n\n` +
            `**Grounded Recommendation:**\n` +
            `To keep momentum moving forward, avoid scope inflation. Focus on closing the remaining tasks in Milestone 1 rather than redesigning the entire system.\n\n` +
            `*Saved Fact*: The project was preserved because: "${projectContext.whyStopped || projectContext.technicalBlockers[0] || 'development was paused'}".`;

          suggestions.push({
            id: `sug-${Date.now()}-chat`,
            type: 'add-task',
            label: 'Add Task: Next Step Action Item',
            description: 'Adds an unblocking task to milestone 1.',
            applied: false,
            data: {
              title: `Next step for ${projectContext.title}: verify dev environment and resume active tasks`,
              priority: 'medium' as Priority,
              weight: 3,
            },
          });
        }
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

    const hasSharedTech = allLanguages.filter((l) => projects[0].languages.includes(l) && projects[1].languages.includes(l)).length > 0;
    const confirmedFacts = [
      hasSharedTech
        ? `Confirmed Runtime Alignment: Both codebases utilize shared core language standards (${projects[0].languages.filter((l) => projects[1].languages.includes(l)).join(', ') || 'modern web'}).`
        : `Architectural Runtime: ${projects[0].title} utilizes ${projects[0].languages.join(', ') || 'web stack'} while ${projects[1].title} utilizes ${projects[1].languages.join(', ') || 'web stack'}.`,
      `Verified Lifecycle State: "${projects[0].title}" is ${projects[0].status} (${projects[0].progress}% progress) and "${projects[1].title}" is ${projects[1].status} (${projects[1].progress}% progress).`,
      `Feature Baseline: ${projects[0].completedFeatures.length} completed feature(s) in ${projects[0].title}, ${projects[1].completedFeatures.length} completed feature(s) in ${projects[1].title}.`,
      `Repository Context: ${projects[0].repoUrl ? `Active repository recorded (${projects[0].repoUrl})` : `No repository recorded for ${projects[0].title}`}; ${projects[1].repoUrl ? `Active repository recorded (${projects[1].repoUrl})` : `No repository recorded for ${projects[1].title}`}.`,
    ];

    const assumptions = [
      'Cross-project session synchronization can be achieved without substantial latency overhead.',
      'Target audiences will embrace a unified workflow rather than separate siloed applications.',
      'State adapters and database schemas can be consolidated into a single migration without data loss.',
    ];

    const unresolvedQuestions = [
      `How will existing user accounts and settings migrate into ${proposedTitle}?`,
      `Which database layer should serve as the primary source of truth for unified records?`,
      `What is the fallback user experience if one subsystem service experiences an outage?`,
    ];

    const whyFit = `Both projects target complementary stages of the user journey. Combining ${projects[0].title} (${projects[0].category}) with ${projects[1].title} (${projects[1].category}) eliminates context switching and creates a compound value proposition that neither project can achieve alone.`;
    const proposedUX = `A cohesive, unified workspace featuring a shared navigation bar, synchronized project dashboard, and seamless data exchange between ${projects[0].title}'s core view and ${projects[1].title}'s interactive workflows.`;

    // Re-use an existing reviewing proposal if already saved
    const existingFusions = dbManager.getFusions();
    const sortedTarget = [...projectIds].sort().join(',');
    const existing = existingFusions.find(
      (f) => f.status === 'reviewing' && [...f.sourceProjectIds].sort().join(',') === sortedTarget
    );

    const proposal: FusionProposal = {
      id: existing?.id || `fusion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
      whyFit,
      proposedUX,
      confirmedFacts,
      assumptions,
      unresolvedQuestions,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (existing) {
      return dbManager.updateFusion(existing.id, proposal);
    }
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

    // Idempotency: prevent duplicate creation on retries or repeated requests
    if (proposal.status === 'approved' && proposal.createdProjectId) {
      const existingProject = dbManager.getProject(proposal.createdProjectId, userId);
      if (existingProject) {
        return { proposal, newProject: existingProject };
      }
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

  /**
   * AI Fusion Advisor: Provides conversational, project-aware guidance on which projects to combine and why.
   * Scoped strictly to the authenticated user's accessible projects.
   * Strictly read-only / non-mutating.
   */
  async generateFusionAdvice(
    prompt: string,
    selectedProjectIds?: string[],
    chatHistory?: Array<{ role: string; content: string }>,
    userId: string = 'user-1'
  ): Promise<AIChatMessage> {
    const accessibleProjects = dbManager.getProjects(userId);

    // Validate selected project IDs for authorization & existence
    if (selectedProjectIds && selectedProjectIds.length > 0) {
      for (const pid of selectedProjectIds) {
        const found = accessibleProjects.find((p) => p.id === pid);
        if (!found) {
          const err = new Error(`Unauthorized or project not found: ${pid}`);
          (err as any).statusCode = 403;
          throw err;
        }
      }
    }

    const now = new Date().toISOString();
    const pLower = (prompt || '').toLowerCase().trim();

    // 1. Edge Case: 0 accessible projects
    if (accessibleProjects.length === 0) {
      return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: `### 🌿 No Saved Projects Available for Fusion\n\n` +
          `Your project garden currently has no accessible projects recorded. Project Fusion requires at least two saved projects to analyze architectural synergy, identify complementary feature vectors, and propose unified concepts.\n\n` +
          `#### Suggested Next Steps:\n` +
          `1. Create or plant at least two projects in your garden with descriptions, goals, and tech stacks.\n` +
          `2. Once saved, return to **AI Project Fusion** to explore cross-pollination opportunities.`,
        timestamp: now,
      };
    }

    // 2. Edge Case: 1 accessible project
    if (accessibleProjects.length === 1) {
      const p = accessibleProjects[0];
      const stack = p.languages.concat(p.frameworks).join(', ') || 'Not specified';
      return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: `### 🌿 Single Project in Garden: ${p.title}\n\n` +
          `You currently have only one project saved in your garden (**${p.title}**). Project Fusion requires at least two projects to discover complementary features and combine architectures.\n\n` +
          `#### Current Saved Project Profile:\n` +
          `* **Title**: ${p.title}\n` +
          `* **Summary**: ${p.summary}\n` +
          `* **Category**: ${p.category}\n` +
          `* **Recorded Tech Stack**: ${stack}\n` +
          `* **Repository**: ${p.repoUrl ? `\`${p.repoUrl}\`` : '*No repository linked*'}\n\n` +
          `#### Suggested Complementary Project to Plant Next:\n` +
          `To create an impactful fusion partner, consider planting a project that provides:\n` +
          `- An adjacent domain (e.g. if ${p.title} is developer tooling, a collaborative peer-learning platform)\n` +
          `- Shared technical foundations in \`${p.languages[0] || 'TypeScript'}\` to allow direct module reuse\n\n` +
          `Once you have planted a second project, ask me again to evaluate their fusion synergy!`,
        timestamp: now,
      };
    }

    // Determine operating mode:
    // Collection-wide discovery vs Selected-project comparison
    const isExplicitCollectionWide =
      pLower.includes('from my list') ||
      pLower.includes('entire list') ||
      pLower.includes('from all my projects') ||
      pLower.includes('whole collection') ||
      pLower.includes('all projects') ||
      pLower.includes('what should i combine') ||
      pLower.includes('which projects should i combine') ||
      (!selectedProjectIds || selectedProjectIds.length === 0);

    let mode: 'collection-discovery' | 'selected-comparison' | 'single-partner' = 'collection-discovery';
    let targetProjects: Project[] = [];

    if (!isExplicitCollectionWide && selectedProjectIds && selectedProjectIds.length >= 2) {
      mode = 'selected-comparison';
      targetProjects = selectedProjectIds
        .map((id) => accessibleProjects.find((p) => p.id === id))
        .filter((p): p is Project => !!p);
    } else if (!isExplicitCollectionWide && selectedProjectIds && selectedProjectIds.length === 1) {
      mode = 'single-partner';
      targetProjects = selectedProjectIds
        .map((id) => accessibleProjects.find((p) => p.id === id))
        .filter((p): p is Project => !!p);
    } else {
      mode = 'collection-discovery';
      targetProjects = accessibleProjects;
    }

    // Pair evaluation helper
    const evaluatePair = (pA: Project, pB: Project) => {
      const titles = [pA.title, pB.title];
      const isEduDev = titles.includes('CodeMentor AI') && titles.includes('StudySync');
      const isClimate = titles.includes('EcoTrack') && titles.includes('GreenRoute');
      const isAudioFocus = titles.includes('SoundScape') && titles.includes('NeuroFocus');
      const isEcoHabit = titles.includes('HabitForge') && titles.includes('EcoTrack');

      // Shared language & framework analysis
      const sharedLangs = pA.languages.filter((l) => pB.languages.includes(l));
      const sharedFrameworks = pA.frameworks.filter((f) => pB.frameworks.includes(f));
      const hasSharedTech = sharedLangs.length > 0 || sharedFrameworks.length > 0;

      // Compatibility label
      const compatibilityStatus = hasSharedTech
        ? `Confirmed Compatibility (Shared ${[...sharedLangs, ...sharedFrameworks].join(', ')})`
        : `Hypothesis to Validate (Disparate tech stacks require API gateway or decoupled bridge)`;

      // Missing data disclosure
      const missingNotes: string[] = [];
      if (!pA.repoUrl) missingNotes.push(`No repository link recorded for "${pA.title}"`);
      if (!pB.repoUrl) missingNotes.push(`No repository link recorded for "${pB.title}"`);
      if (!pA.whyStopped) missingNotes.push(`Dormancy reason unrecorded for "${pA.title}"`);
      if (!pB.whyStopped) missingNotes.push(`Dormancy reason unrecorded for "${pB.title}"`);
      if (pA.technicalBlockers.length === 0) missingNotes.push(`No technical blockers logged for "${pA.title}"`);
      if (pB.technicalBlockers.length === 0) missingNotes.push(`No technical blockers logged for "${pB.title}"`);

      if (isEduDev) {
        return {
          pA,
          pB,
          suitability: 'SUITABLE' as const,
          score: 95,
          conceptName: 'StudyMentor: Collaborative Pair-Debugging Salon',
          currentA: `**${pA.title}** provides AST-based code analysis, Monaco diff visualizations, and compiler breakdown diagnostics for solo learners.`,
          currentB: `**${pB.title}** delivers virtual synchronized study rooms, markdown notebook collaboration, and ambient Pomodoro focus sessions.`,
          whyFit: 'Transforms solitary compiler frustration into a communal pair-debugging experience. StudySync provides the real-time social container while CodeMentor provides deep interactive pedagogical diffs.',
          reusableFeatures: [
            'CodeMentor: Interactive Monaco diff editor, AST inspection tree, and compiler error explainers',
            'StudySync: Real-time room session state, synced markdown notebooks, and Pomodoro timers',
          ],
          whatBecomesStronger: 'Junior developers avoid solitary attrition by having an automated code review bot guide both peers through complex compiler errors in a shared virtual study session.',
          proposedUX: 'A browser room where two or more students join, paste or edit code into a synced Monaco split-screen, receive joint AST feedback, and study with ambient focus intervals.',
          risks: [
            'Managing concurrent editor updates across Yjs document channels without state conflicts',
            'Balancing quiet ambient study focus with potentially intrusive automated bug notifications',
            `${compatibilityStatus}: Both use TypeScript & React, minimizing architectural mismatch`,
          ],
          mvp: {
            title: 'Phase 1: Embed CodeMentor Diff View within StudySync Room Hub',
            buildOrder: [
              'Step 1: Mount CodeMentor Monaco diff component into StudySync active room viewport',
              'Step 2: Wire up WebSocket room synchronization for live code cursor and edit broadcasts',
              'Step 3: Integrate automated compiler error explainers triggered on test run failures',
            ],
          },
          missingNotes,
        };
      }

      if (isClimate) {
        return {
          pA,
          pB,
          suitability: 'SUITABLE' as const,
          score: 92,
          conceptName: 'EcoRoute: Low-Emission Shaded Commute & Carbon Telemetry',
          currentA: `**${pA.title}** measures daily carbon footprint telemetry, parses grocery receipt OCR, and computes localized micro-offsets.`,
          currentB: `**${pB.title}** generates clean-air shaded bicycle routing graphs using OpenStreetMap urban canopy datasets.`,
          whyFit: 'Directly bridges navigation with personal sustainability telemetry: turn-by-turn shaded bicycle commuting now automatically verifies and deposits avoided carbon into the user’s weekly streak ledger.',
          reusableFeatures: [
            'GreenRoute: OpenStreetMap bicycle routing graph, tree-canopy shade indices, and elevation slope algorithms',
            'EcoTrack: Climatiq emissions calculation engine, receipt OCR parsing, and carbon streak milestone rewards',
          ],
          whatBecomesStronger: 'Green navigation becomes tangible and rewarding rather than purely informative. Every bicycle ride produces a verified carbon credit in the user’s personal sustainability passport.',
          proposedUX: 'A mobile map client where commuters pick low-emission shaded routes, track live calories and carbon avoided during the trip, and view cumulative monthly climate impact.',
          risks: [
            'High battery consumption from concurrent background GPS telemetry and raster shade rendering',
            'Stack divergence: Merging Python GeoDjango spatial queries with FastAPI async throughput',
            `${compatibilityStatus}: Disparate frameworks require clean REST or gRPC service decoupling`,
          ],
          mvp: {
            title: 'Phase 1: Unify Bike Route Distance with Climatiq Avoided Carbon Engine',
            buildOrder: [
              'Step 1: Wire GreenRoute calculated bicycle miles into EcoTrack Climatiq factor endpoint',
              'Step 2: Render live "Carbon Avoided" badge on turn-by-turn cycling navigation sheet',
              'Step 3: Auto-log completed rides into user weekly sustainability habit streak',
            ],
          },
          missingNotes,
        };
      }

      if (isAudioFocus) {
        return {
          pA,
          pB,
          suitability: 'SUITABLE' as const,
          score: 88,
          conceptName: 'NeuroAudio: Adaptive Focus Soundscapes',
          currentA: `**${pA.title}** provides generative binaural beats, ambient soundscapes, and customizable multi-track audio mixers.`,
          currentB: `**${pB.title}** offers ADHD-tailored task prioritization, sprint intervals, and cognitive overload distraction blockers.`,
          whyFit: 'Synthesizes cognitive sprint management with real-time procedural soundscapes that dynamically adapt audio frequency and tempo to task urgency.',
          reusableFeatures: [
            'SoundScape: Web Audio API procedural sound engine and binaural frequency oscillators',
            'NeuroFocus: Focus sprint interval state machine, priority task queue, and distraction shielding',
          ],
          whatBecomesStronger: 'Focus sprints are accompanied by scientific acoustic shielding that automatically shifts from deep brown-noise focus to gentle ambient bells during break intervals.',
          proposedUX: 'A clean desktop timer widget that plays tailored generative soundscapes during 25-minute sprints and shifts to soothing wind-down chimes during break phases.',
          risks: [
            'Web Audio engine memory consumption when running long background sessions in low-memory browsers',
            'Sensory overload risks: Soundscape presets must be strictly customizable for sensory-sensitive neurodivergent users',
            `${compatibilityStatus}`,
          ],
          mvp: {
            title: 'Phase 1: State-Synced Audio Controller for Focus Sprints',
            buildOrder: [
              'Step 1: Bind NeuroFocus timer state changes to SoundScape audio bus transitions',
              'Step 2: Ship 3 scientifically calibrated presets (Deep Focus, Creative Flow, Reset Rest)',
              'Step 3: Add floating mini-player with quick volume and sprint restart controls',
            ],
          },
          missingNotes,
        };
      }

      if (isEcoHabit) {
        return {
          pA,
          pB,
          suitability: 'SUITABLE' as const,
          score: 85,
          conceptName: 'GreenHabits: Gamified Eco-Streak Engine',
          currentA: `**${pA.title}** delivers daily habit formation streaks, micro-action prompts, and peer accountability circles.`,
          currentB: `**${pB.title}** computes carbon footprint telemetry from lifestyle habits, shopping receipts, and transit.`,
          whyFit: 'Overcomes climate action fatigue by framing complex carbon telemetry as manageable, gamified daily micro-streaks with social accountability.',
          reusableFeatures: [
            'HabitForge: Streak tracking state machine, push reminder triggers, and squad leaderboard UI',
            'EcoTrack: Localized emission factors, grocery receipt OCR, and carbon reduction milestones',
          ],
          whatBecomesStronger: 'Abstract carbon numbers are converted into friendly daily streaks, driving lasting behavioral change through positive social reinforcement.',
          proposedUX: 'A mobile habit tracker where users check in daily eco-actions (meatless lunch, bike commute) and see their personal and team carbon saved streak grow.',
          risks: [
            'User fatigue if receipt OCR or logging requirements are overly friction-heavy',
            'Maintaining data consistency between habit streak state and carbon ledger logs',
            `${compatibilityStatus}`,
          ],
          mvp: {
            title: 'Phase 1: Connect EcoTrack Carbon Milestones to HabitForge Streak Engine',
            buildOrder: [
              'Step 1: Map EcoTrack reduction targets into daily check-in habits',
              'Step 2: Add visual streak counter showing kilograms of CO2 avoided this week',
              'Step 3: Implement peer encouragement notifications for maintaining 7-day green streaks',
            ],
          },
          missingNotes,
        };
      }

      // Check for Incomplete / Needs Information
      const isIncompleteA =
        (!pA.summary || pA.summary.trim().length < 15) &&
        (!pA.originalIdea || pA.originalIdea.trim().length < 15);
      const isIncompleteB =
        (!pB.summary || pB.summary.trim().length < 15) &&
        (!pB.originalIdea || pB.originalIdea.trim().length < 15);
      const hasZeroFeaturesA =
        pA.completedFeatures.length === 0 &&
        pA.inProgressFeatures.length === 0 &&
        pA.plannedFeatures.length === 0;
      const hasZeroFeaturesB =
        pB.completedFeatures.length === 0 &&
        pB.inProgressFeatures.length === 0 &&
        pB.plannedFeatures.length === 0;

      const isMissingInfo =
        (isIncompleteA && hasZeroFeaturesA) ||
        (isIncompleteB && hasZeroFeaturesB) ||
        (!pA.category || !pB.category);

      const isKnownCompatible = isEduDev || isClimate || isAudioFocus || isEcoHabit;

      const isUnrelatedCategory =
        ((titles.includes('PixelForge') || titles.includes('PixelCraft')) &&
          (titles.includes('EcoTrack') || titles.includes('CodeMentor AI') || titles.includes('GreenRoute') || titles.includes('StudySync') || titles.includes('LocalBites'))) ||
        (titles.includes('SoundScape') && (titles.includes('GreenRoute') || titles.includes('EcoTrack') || titles.includes('CodeMentor AI'))) ||
        (titles.includes('LocalBites') && (titles.includes('CodeMentor AI') || titles.includes('PixelForge') || titles.includes('SoundScape'))) ||
        (pA.category.toLowerCase().includes('creative') && !pB.category.toLowerCase().includes('creative') && !isKnownCompatible) ||
        (pB.category.toLowerCase().includes('creative') && !pA.category.toLowerCase().includes('creative') && !isKnownCompatible);

      let suitability: 'SUITABLE' | 'NOT_RECOMMENDED' | 'NEEDS_INFO' = 'SUITABLE';
      if (isMissingInfo) {
        suitability = 'NEEDS_INFO';
      } else if (isUnrelatedCategory) {
        suitability = 'NOT_RECOMMENDED';
      }

      // Generic Pair Analysis based on real saved fields
      const pASummary = pA.summary || pA.originalIdea || 'Unspecified project concept';
      const pBSummary = pB.summary || pB.originalIdea || 'Unspecified project concept';
      const pAFeatures = pA.completedFeatures.length > 0 ? pA.completedFeatures.join(', ') : (pA.inProgressFeatures[0] || 'Foundational setup');
      const pBFeatures = pB.completedFeatures.length > 0 ? pB.completedFeatures.join(', ') : (pB.inProgressFeatures[0] || 'Foundational setup');
      const combinedTitle = `${pA.title.split(' ')[0]} × ${pB.title.split(' ')[0]}: Unified Suite`;

      return {
        pA,
        pB,
        suitability,
        score: suitability === 'NOT_RECOMMENDED' ? 35 : (hasSharedTech ? 82 : 72),
        conceptName: combinedTitle,
        currentA: `**${pA.title}** (${pA.category}) focuses on: "${pASummary}". Key features: ${pAFeatures}.`,
        currentB: `**${pB.title}** (${pB.category}) focuses on: "${pBSummary}". Key features: ${pBFeatures}.`,
        whyFit: `Both projects address complementary workflow dimensions in ${pA.category} and ${pB.category}. Fusing them combines ${pA.title}'s domain assets with ${pB.title}'s interactive components.`,
        reusableFeatures: [
          `${pA.title}: ${pAFeatures}`,
          `${pB.title}: ${pBFeatures}`,
        ],
        whatBecomesStronger: `Users benefit from a consolidated platform that addresses both ${pA.title} and ${pB.title} needs simultaneously without redundant logins or disparate data silos.`,
        proposedUX: `A unified workspace offering a primary navigation dashboard that connects ${pA.title} data with ${pB.title} interactive views.`,
        risks: [
          'Scope sprawl across two separate application domains',
          `${compatibilityStatus}: ${hasSharedTech ? 'Shared runtime minimizes setup cost.' : 'Disparate runtimes require API integration rather than code merging.'}`,
        ],
        mvp: {
          title: `Phase 1: Unified Schema & Navigation Prototype for ${pA.title} + ${pB.title}`,
          buildOrder: [
            `Step 1: Design unified data model bridging ${pA.title} and ${pB.title}`,
            `Step 2: Create consolidated dashboard view embedding primary workflows`,
            `Step 3: Conduct user validation testing on the unified workflow`,
          ],
        },
        missingNotes,
      };
    };

    // Build pair candidate list
    const candidatePairs: Array<ReturnType<typeof evaluatePair>> = [];

    if (mode === 'selected-comparison' && targetProjects.length >= 2) {
      for (let i = 0; i < targetProjects.length; i++) {
        for (let j = i + 1; j < targetProjects.length; j++) {
          candidatePairs.push(evaluatePair(targetProjects[i], targetProjects[j]));
        }
      }
    } else if (mode === 'single-partner' && targetProjects.length === 1) {
      const pSingle = targetProjects[0];
      for (const other of accessibleProjects) {
        if (other.id !== pSingle.id) {
          candidatePairs.push(evaluatePair(pSingle, other));
        }
      }
    } else {
      // Collection-wide discovery: evaluate all distinct pairs
      for (let i = 0; i < accessibleProjects.length; i++) {
        for (let j = i + 1; j < accessibleProjects.length; j++) {
          candidatePairs.push(evaluatePair(accessibleProjects[i], accessibleProjects[j]));
        }
      }
    }

    // Sort by synergy score descending
    candidatePairs.sort((a, b) => b.score - a.score);

    // Format Markdown content
    let content = '';

    if (chatHistory && chatHistory.length > 0) {
      const lastUser = [...chatHistory].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        content += `*Prior Discussion Context: Continuing analysis following up on "${lastUser.content.slice(0, 50)}...".*\n\n`;
      }
    }

    // Header & Mode Indicator
    if (mode === 'selected-comparison') {
      content += `### 🔍 Selected-Project Comparison: ${targetProjects.map((p) => p.title).join(' + ')}\n\n` +
        `*Mode: Analyzing your ${targetProjects.length} selected projects for architectural fit, feature overlap, and combined execution feasibility.*\n\n`;
    } else if (mode === 'single-partner') {
      content += `### 🎯 Synergistic Partners for: ${targetProjects[0].title}\n\n` +
        `*Mode: Scanning all ${accessibleProjects.length} projects in your garden to find the most complementary companions for "${targetProjects[0].title}".*\n\n`;
    } else {
      content += `### 🌐 Collection-Wide Fusion Discovery\n\n` +
        `*Mode: Evaluated all ${accessibleProjects.length} accessible projects in your garden across category synergy, tech stack overlap, and complementary feature vectors.*\n\n`;
    }

    // Specialized query resolution
    if (pLower.includes('easiest to build') || pLower.includes('first version') || (pLower.includes('build order') && !pLower.includes('mvp'))) {
      const easiest = candidatePairs.find((c) => c.score >= 90) || candidatePairs[0];
      content += `#### ⚡ Easiest Combination to Build First: **${easiest.pA.title} + ${easiest.pB.title}**\n\n` +
        `**Proposed Concept**: *${easiest.conceptName}* (Synergy Score: ${easiest.score}/100)\n\n` +
        `**Why it is easiest:**\n` +
        `* **Tech Alignment**: ${easiest.risks.find((r) => r.includes('Compatibility')) || 'Shared web standards'}\n` +
        `* **Friction Level**: Low architectural friction. Existing features can be composed via clean component embeds without rewriting backend databases.\n\n` +
        `#### 🛠️ Recommended Build Order:\n` +
        easiest.mvp.buildOrder.map((step) => `* **${step}**`).join('\n') + '\n\n' +
        `---\n` +
        `*Would you like me to detail the data schema, API contract, or risks for this combination?*`;
    } else if (pLower.includes('suggest an mvp') || pLower.includes('mvp for the strongest') || (pLower.includes('mvp') && candidatePairs.length > 0)) {
      const strongest = candidatePairs[0];
      content += `#### 🚀 Suggested MVP for Strongest Combination: **${strongest.pA.title} + ${strongest.pB.title}**\n\n` +
        `**Concept Name**: *${strongest.conceptName}*\n` +
        `**MVP Objective**: ${strongest.mvp.title}\n\n` +
        `#### 1. Scope of the First Version (What to Build)\n` +
        strongest.mvp.buildOrder.map((step, idx) => `${idx + 1}. **${step}**`).join('\n') + '\n\n' +
        `#### 2. What to Intentionally Omit from MVP (Scope Discipline)\n` +
        `* Omit custom user roles and permissions until core workflow is validated\n` +
        `* Omit automated analytics dashboards; rely on direct database telemetry\n` +
        `* Omit heavy background sync or multi-region replication\n\n` +
        `#### 3. Success Metrics for MVP\n` +
        `* Time to complete primary user flow < 3 minutes\n` +
        `* Zero state synchronization collisions during active sessions\n` +
        `* Clear user retention signal on the unified feature\n\n` +
        `---\n` +
        `*You can review or stage this combination in the left panel to generate an editable Fusion Proposal.*`;
    } else if (pLower.includes('problems, conflicts') || pLower.includes('technical risks') || pLower.includes('what risks') || (pLower.includes('risk') && pLower.includes('arise'))) {
      content += `#### ⚠️ Risk, Conflict & Trade-Off Analysis\n\n` +
        `When combining projects from disparate codebases, the primary risks fall into three critical areas:\n\n`;

      const topPairs = candidatePairs.slice(0, 2);
      topPairs.forEach((pair, idx) => {
        content += `##### ${idx + 1}. ${pair.pA.title} × ${pair.pB.title} (*${pair.conceptName}*)\n` +
          pair.risks.map((r) => `* **Risk**: ${r}`).join('\n') + '\n' +
          (pair.missingNotes.length > 0 ? `* **Missing Data Caveat**: ${pair.missingNotes.join('; ')}\n` : '') +
          `* **Conflict Mitigation**: Isolate each project's business logic behind explicit TypeScript interfaces before attempting repository convergence.\n\n`;
      });
      content += `---\n*Which of these risk areas would you like to mitigate first?*`;
    } else if (pLower.includes('features can be reused') || pLower.includes('what new features become possible') || (pLower.includes('reuse') && pLower.includes('possible'))) {
      const targetPair = candidatePairs[0];
      content += `#### 🔄 Reusable Assets vs. New Capabilities: **${targetPair.pA.title} + ${targetPair.pB.title}**\n\n` +
        `##### 1. Existing Assets Ready for Direct Reuse\n` +
        targetPair.reusableFeatures.map((f) => `* ✅ **${f}**`).join('\n') + '\n\n' +
        `##### 2. Brand New Capabilities Unlocked by Fusion\n` +
        `* 🌟 **Unified User Value**: ${targetPair.whatBecomesStronger}\n` +
        `* 🌟 **Cohesive UX**: ${targetPair.proposedUX}\n` +
        `* 🌟 **Cross-Domain Data Feed**: Telemetry and state feeds from both projects combine into a singular contextual loop.\n\n` +
        `---\n` +
        `*Ask me for a suggested MVP or build order to execute these feature integrations.*`;
    } else if (pLower.includes('more useful or powerful') || pLower.includes('more powerful') || pLower.includes('more useful')) {
      const targetPair = candidatePairs[0];
      content += `#### 📈 Utility & Power Assessment: **${targetPair.pA.title} + ${targetPair.pB.title}**\n\n` +
        `**Verdict**: **Significantly More Powerful than either standalone project.**\n\n` +
        `| Aspect | Standalone Projects | Fused Platform (*${targetPair.conceptName}*) |\n` +
        `|:---|:---|:---|\n` +
        `| **User Engagement** | Fragmented across separate tools | Single home with combined daily habits |\n` +
        `| **Technical Efficiency** | Redundant auth, server bills, and navigation | Unified component tree and shared API layer |\n` +
        `| **Market Distinction** | Solitary utility in saturated category | High-conviction hybrid offering with distinct positioning |\n\n` +
        `**Key Practical Benefit**: ${targetPair.whatBecomesStronger}\n\n` +
        `---\n` +
        `*Would you like to examine the technical risks or proceed to an MVP blueprint?*`;
    } else {
      // If selected-project comparison, render the direct Suitability Review Decision
      if (mode === 'selected-comparison' && candidatePairs.length > 0) {
        const pair = candidatePairs[0];

        if (pair.suitability === 'NOT_RECOMMENDED') {
          content += `### ❌ Fusion Assessment: NOT RECOMMENDED TO COMBINE\n\n` +
            `**Projects Analyzed**: **${pair.pA.title}** (${pair.pA.category}) and **${pair.pB.title}** (${pair.pB.category})\n` +
            `**Suitability Decision**: **NOT RECOMMENDED TO COMBINE** (Synergy Score: \`${pair.score}/100\`)\n\n` +
            `#### Why this combination is not recommended:\n` +
            `* **Divergent Problem Domains**: "${pair.pA.title}" focuses on *"${pair.pA.summary || pair.pA.originalIdea}"*, whereas "${pair.pB.title}" focuses on *"${pair.pB.summary || pair.pB.originalIdea}"*. Their core problem statements address disparate user needs with no natural workflow convergence.\n` +
            `* **Audience Mismatch**: Combining them would produce an unfocused, bloated product that dilutes both original value propositions.\n` +
            `* **Technology Coincidence vs. Architectural Synergy**: While both may use modern web standards (${pair.pA.languages.filter((l) => pair.pB.languages.includes(l)).join(', ') || 'web libraries'}), shared programming languages alone do not justify combining unrelated applications.\n\n` +
            `#### Recommendation:\n` +
            `Keep both projects as separate, focused applications. If you believe there is a specific niche workflow connecting them, please describe the intended user journey and I can re-evaluate!`;

          return {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            content,
            timestamp: now,
            suitability: 'NOT_RECOMMENDED',
            suitablePairIds: [pair.pA.id, pair.pB.id],
          };
        }

        if (pair.suitability === 'NEEDS_INFO') {
          content += `### ⚠️ Fusion Assessment: NEEDS MORE INFORMATION\n\n` +
            `The saved project records for **${pair.pA.title}** and/or **${pair.pB.title}** are too incomplete to make a reliable architectural judgment.\n\n` +
            `#### Missing Information Identified:\n` +
            (pair.missingNotes.length > 0 ? pair.missingNotes.map((n) => `* ${n}`).join('\n') : '* Core project goals or feature roadmaps are unrecorded in project files.') + '\n\n' +
            `#### What to provide:\n` +
            `Please update the project case files or specify in this chat:\n` +
            `1. The primary user workflow and intended target audience.\n` +
            `2. The core features currently working vs planned.\n` +
            `3. The runtime technology stack or repository details.\n\n` +
            `Once you share these details, ask me again and I will evaluate their architectural fit!`;

          return {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            content,
            timestamp: now,
            suitability: 'NEEDS_INFO',
            suitablePairIds: [pair.pA.id, pair.pB.id],
          };
        }

        // SUITABLE TO COMBINE:
        content += `### ✅ Fusion Assessment: SUITABLE TO COMBINE\n\n` +
          `**Projects Analyzed**: **${pair.pA.title}** (${pair.pA.category}) + **${pair.pB.title}** (${pair.pB.category})\n` +
          `**Synergy Rating**: \`${pair.score}/100\` • **Proposed Concept**: *${pair.conceptName}*\n\n` +
          `#### 1. What Each Project Currently Does\n` +
          `* **${pair.pA.title}**: ${pair.currentA}\n` +
          `* **${pair.pB.title}**: ${pair.currentB}\n\n` +
          `#### 2. How Goals & Features Relate\n` +
          `${pair.whyFit}\n\n` +
          `#### 3. Features to Combine or Reuse\n` +
          pair.reusableFeatures.map((f) => `* ${f}`).join('\n') + '\n\n' +
          `#### 4. New User Experience Provided\n` +
          `${pair.whatBecomesStronger}\n` +
          `*User Experience:* ${pair.proposedUX}\n\n` +
          `#### 5. Why the Result is Stronger Than Separate Projects\n` +
          `Uniting ${pair.pA.title} and ${pair.pB.title} delivers a cohesive platform that addresses complementary user workflows without context switching or duplicate tools.\n\n` +
          `#### 6. Risks, Conflicts & Unknowns\n` +
          pair.risks.map((r) => `* ${r}`).join('\n') + '\n' +
          (pair.missingNotes.length > 0 ? `* *Missing Data Disclosure*: ${pair.missingNotes.join('; ')}\n` : '') + '\n' +
          `#### 7. Reasonable First-Version (MVP) Direction\n` +
          `* **MVP Goal**: ${pair.mvp.title}\n` +
          pair.mvp.buildOrder.map((step) => `* ${step}`).join('\n') + '\n\n' +
          `---\n\n` +
          `💡 *Ready to inspect the blueprint? Click **View Proposal** below to open the detailed architecture, feature mapping, and milestone plan.*`;

        return {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content,
          timestamp: now,
          suitability: 'SUITABLE',
          suitablePairIds: [pair.pA.id, pair.pB.id],
          proposedConceptTitle: pair.conceptName,
        };
      }

      // General Ranked Recommendations (Shows top pairs with all 8 detailed sections)
      const pairsToShow = candidatePairs.slice(0, 2);

      pairsToShow.forEach((pair, idx) => {
        content += `#### ${idx + 1}. Recommended Fusion: **${pair.pA.title}** + **${pair.pB.title}**\n` +
          `**Synergy Score**: \`${pair.score}/100\` • **Proposed Title**: *${pair.conceptName}*\n\n` +
          `1. **Projects Involved**:\n` +
          `   - **${pair.pA.title}** (Status: *${pair.pA.status.toUpperCase()}*, Category: *${pair.pA.category}*)\n` +
          `   - **${pair.pB.title}** (Status: *${pair.pB.status.toUpperCase()}*, Category: *${pair.pB.category}*)\n\n` +
          `2. **What Each Project Currently Does**:\n` +
          `   - ${pair.currentA}\n` +
          `   - ${pair.currentB}\n\n` +
          `3. **Why They Fit Together**:\n` +
          `   - ${pair.whyFit}\n\n` +
          `4. **Features to Combine or Reuse**:\n` +
          pair.reusableFeatures.map((f) => `   - ${f}`).join('\n') + '\n\n' +
          `5. **What Becomes Stronger**:\n` +
          `   - ${pair.whatBecomesStronger}\n\n` +
          `6. **Proposed Combined Concept**:\n` +
          `   - **Title**: *${pair.conceptName}*\n` +
          `   - **User Experience**: ${pair.proposedUX}\n\n` +
          `7. **Risks and Trade-offs**:\n` +
          pair.risks.map((r) => `   - ${r}`).join('\n') + '\n' +
          (pair.missingNotes.length > 0 ? `   - *Missing Data Note*: ${pair.missingNotes.join('; ')}\n` : '') + '\n' +
          `8. **Suggested MVP & Build Order**:\n` +
          `   - **MVP Goal**: ${pair.mvp.title}\n` +
          pair.mvp.buildOrder.map((step) => `   - ${step}`).join('\n') + '\n\n' +
          `---\n\n`;
      });

      content += `💡 *To take action: Select the two projects in the left panel to generate an editable Fusion Proposal, or drag them into the Fuse Zone in Canvas Mode.*`;
    }

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content,
      timestamp: now,
      suitability: candidatePairs[0]?.suitability,
      suitablePairIds: candidatePairs[0] ? [candidatePairs[0].pA.id, candidatePairs[0].pB.id] : undefined,
      proposedConceptTitle: candidatePairs[0]?.conceptName,
    };
  }

  /**
   * AI-Assisted Reminder Suggestions: Analyzes user's real project tasks, blockers, and progress
   */
  async generateReminderSuggestions(userId: string = 'user-1'): Promise<ReminderSuggestion[]> {
    const projects = dbManager.getProjects(userId);
    const suggestions: ReminderSuggestion[] = [];

    for (const project of projects) {
      // 1. Unfinished tasks in milestones
      for (const m of project.milestones) {
        const pendingTasks = (m.tasks || []).filter((t) => t.status === 'todo' || t.status === 'in-progress');
        if (pendingTasks.length > 0) {
          const t = pendingTasks[0];
          const dueOffset = 24;
          const dueIso = new Date(Date.now() + dueOffset * 3600 * 1000).toISOString();
          suggestions.push({
            id: `sug-${project.id}-${t.id}`,
            projectId: project.id,
            projectTitle: project.title,
            title: `Complete task: "${t.title}"`,
            suggestedTitle: `Complete task: "${t.title}"`,
            message: `Follow-through on pending milestone deliverable "${m.title}" in ${project.title}.`,
            suggestedDescription: `Follow-through on pending milestone deliverable "${m.title}" in ${project.title}.`,
            category: 'finish-task',
            suggestedCategory: 'finish-task',
            priority: t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'medium',
            suggestedPriority: t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'medium',
            suggestedDateTime: dueIso,
            suggestedDueOffsetHours: dueOffset,
            rationale: `Identified 1 active task in Milestone: "${m.title}".`,
          });
        }
      }

      // 2. Technical Blockers
      if (project.technicalBlockers && project.technicalBlockers.length > 0) {
        const blocker = project.technicalBlockers[0];
        const dueOffset = 48;
        const dueIso = new Date(Date.now() + dueOffset * 3600 * 1000).toISOString();
        suggestions.push({
          id: `sug-${project.id}-blocker`,
          projectId: project.id,
          projectTitle: project.title,
          title: `Triage blocker: ${blocker.slice(0, 50)}...`,
          suggestedTitle: `Triage blocker: ${blocker.slice(0, 50)}...`,
          message: `Investigate resolution paths for unresolved blocker: "${blocker}" in ${project.title}.`,
          suggestedDescription: `Investigate resolution paths for unresolved blocker: "${blocker}" in ${project.title}.`,
          category: 'review',
          suggestedCategory: 'review',
          priority: 'urgent',
          suggestedPriority: 'urgent',
          suggestedDateTime: dueIso,
          suggestedDueOffsetHours: dueOffset,
          rationale: `Detected unresolved technical blocker recorded in ${project.title} case file.`,
        });
      }

      // 3. Paused or abandoned project revival check-in
      if (project.status === 'paused' || project.status === 'abandoned') {
        const dueOffset = 72;
        const dueIso = new Date(Date.now() + dueOffset * 3600 * 1000).toISOString();
        suggestions.push({
          id: `sug-${project.id}-revival`,
          projectId: project.id,
          projectTitle: project.title,
          title: `Revival check-in for "${project.title}"`,
          suggestedTitle: `Revival check-in for "${project.title}"`,
          message: `Review paused status (${project.status}) and assess 48-hour MVP scoping in Revival Studio.`,
          suggestedDescription: `Review paused status (${project.status}) and assess 48-hour MVP scoping in Revival Studio.`,
          category: 'continue-project',
          suggestedCategory: 'continue-project',
          priority: 'medium',
          suggestedPriority: 'medium',
          suggestedDateTime: dueIso,
          suggestedDueOffsetHours: dueOffset,
          rationale: `Project is currently ${project.status} with ${project.progress}% progress recorded.`,
        });
      }

      // 4. In-progress features
      if (project.inProgressFeatures && project.inProgressFeatures.length > 0) {
        const feat = project.inProgressFeatures[0];
        const dueOffset = 36;
        const dueIso = new Date(Date.now() + dueOffset * 3600 * 1000).toISOString();
        suggestions.push({
          id: `sug-${project.id}-feature`,
          projectId: project.id,
          projectTitle: project.title,
          title: `Sprint check-in: ${feat.slice(0, 50)}...`,
          suggestedTitle: `Sprint check-in: ${feat.slice(0, 50)}...`,
          message: `Verify integration progress for active feature: "${feat}".`,
          suggestedDescription: `Verify integration progress for active feature: "${feat}".`,
          category: 'follow-up',
          suggestedCategory: 'follow-up',
          priority: 'high',
          suggestedPriority: 'high',
          suggestedDateTime: dueIso,
          suggestedDueOffsetHours: dueOffset,
          rationale: `Feature "${feat}" marked as in-progress in project roadmap.`,
        });
      }
    }

    return suggestions.slice(0, 4);
  }
}

export const aiService = new AIService();
