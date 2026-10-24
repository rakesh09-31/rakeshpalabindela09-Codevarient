import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectStatus,
  Milestone,
  Task,
  TimelineEvent,
  Team,
  Reminder,
  Notification,
  UserProfile,
  FusionProposal,
  UserSocialProfile,
} from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_TEAMS,
  INITIAL_REMINDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
  INITIAL_COMMUNITY_USERS,
} from '../data/seedData';

const KEYS = {
  PROJECTS: 'graveyard_projects_v2',
  TEAMS: 'graveyard_teams_v2',
  REMINDERS: 'graveyard_reminders_v2',
  NOTIFICATIONS: 'graveyard_notifications_v2',
  USER_PROFILE: 'graveyard_user_profile_v2',
  COMMUNITY_USERS: 'graveyard_community_users_v2',
  FOLLOWS: 'graveyard_follows_v2',
  COLLABORATIONS: 'graveyard_collaborations_v2',
  FUSIONS: 'graveyard_fusions_v2',
  INITIALIZED: 'graveyard_initialized_v2',
};

export function calculateProjectProgress(project: Project): number {
  const allTasks: Task[] = [];
  project.milestones.forEach((m) => {
    if (m.tasks && m.tasks.length > 0) {
      allTasks.push(...m.tasks);
    }
  });

  if (allTasks.length === 0) {
    return project.progress || 0;
  }

  const totalWeight = allTasks.reduce((sum, t) => sum + (t.weight || 1), 0);
  const completedWeight = allTasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.weight || 1), 0);

  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
}

export const storageService = {
  initialize(): void {
    try {
      const initialized = localStorage.getItem(KEYS.INITIALIZED);
      if (!initialized) {
        this.saveProjects(INITIAL_PROJECTS);
        this.saveTeams(INITIAL_TEAMS);
        this.saveReminders(INITIAL_REMINDERS);
        this.saveNotifications(INITIAL_NOTIFICATIONS);
        this.saveUserProfile(INITIAL_USER_PROFILE);
        this.saveFusionProposals([]);
        localStorage.setItem(KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('Failed to initialize storage:', e);
    }
  },

  // ---------------- PROJECT OPERATIONS ----------------
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(KEYS.PROJECTS);
      if (!data) {
        this.saveProjects(INITIAL_PROJECTS);
        return INITIAL_PROJECTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
      return INITIAL_PROJECTS;
    }
  },

  getProject(id: string): Project | undefined {
    return this.getProjects().find((p) => p.id === id);
  },

  saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects:', e);
    }
  },

  createProject(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>
  ): Project {
    const projects = this.getProjects();
    const now = new Date().toISOString();
    const id = `proj-${uuidv4().slice(0, 8)}`;

    const newProject: Project = {
      ...data,
      id,
      progress: 0,
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${uuidv4().slice(0, 8)}`,
          type: 'created',
          title: 'Project planted in Graveyard',
          description: `Initial idea: ${data.summary || data.title}`,
          timestamp: now,
        },
      ],
      teamMembers: data.teamMembers || [
        {
          id: 'user-1',
          name: 'Alex Rivera',
          role: 'owner',
          skills: ['Full Stack'],
          availability: 'full-time',
          joinedAt: now,
        },
      ],
      attachments: data.attachments || [],
      milestones: data.milestones || [],
    };

    newProject.progress = calculateProjectProgress(newProject);
    projects.unshift(newProject);
    this.saveProjects(projects);
    return newProject;
  },

  updateProject(id: string, updates: Partial<Project>, timelineNote?: string): Project {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const existing = projects[index];
    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    if ('repoUrl' in updates) {
      updated.repoUrl = updates.repoUrl ? updates.repoUrl : undefined;
    }

    if (timelineNote) {
      updated.timeline.unshift({
        id: `tl-${uuidv4().slice(0, 8)}`,
        type: 'edited',
        title: 'Project updated',
        description: timelineNote,
        timestamp: now,
      });
    }

    updated.progress = calculateProjectProgress(updated);
    projects[index] = updated;
    this.saveProjects(projects);
    return updated;
  },

  deleteProject(id: string): void {
    const projects = this.getProjects().filter((p) => p.id !== id);
    this.saveProjects(projects);
  },

  duplicateProject(id: string): Project {
    const project = this.getProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const newId = `proj-${uuidv4().slice(0, 8)}`;
    const cloned: Project = {
      ...JSON.parse(JSON.stringify(project)),
      id: newId,
      title: `${project.title} (Clone)`,
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${uuidv4().slice(0, 8)}`,
          type: 'created',
          title: `Cloned from ${project.title}`,
          description: 'Created a standalone duplicate for new experimentation.',
          timestamp: now,
        },
      ],
    };

    const projects = this.getProjects();
    projects.unshift(cloned);
    this.saveProjects(projects);
    return cloned;
  },

  changeProjectStatus(id: string, status: ProjectStatus, note?: string): Project {
    const project = this.getProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const timelineEvent: TimelineEvent = {
      id: `tl-${uuidv4().slice(0, 8)}`,
      type:
        status === 'active'
          ? 'resumed'
          : status === 'paused'
          ? 'paused'
          : status === 'completed'
          ? 'completed'
          : status === 'archived'
          ? 'archived'
          : 'edited',
      title: `Status changed to ${status}`,
      description: note || `Project status marked as ${status}.`,
      timestamp: now,
    };

    const updates: Partial<Project> = {
      status,
      pauseDate: status === 'paused' || status === 'abandoned' ? now : project.pauseDate,
      completionDate: status === 'completed' ? now : undefined,
    };

    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    const updated = {
      ...project,
      ...updates,
      updatedAt: now,
      timeline: [timelineEvent, ...project.timeline],
    };

    projects[index] = updated;
    this.saveProjects(projects);
    return updated;
  },

  reviveProject(
    id: string,
    path: 'restart' | 'continue' | 'change-idea' | 'repurpose' | 'archive',
    note?: string,
    newGoal?: string
  ): Project {
    const project = this.getProject(id);
    if (!project) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const updates: Partial<Project> = {};
    let eventTitle = '';
    let eventDesc = note || '';

    switch (path) {
      case 'restart':
        eventTitle = 'Revived via Fresh Restart';
        eventDesc = note || 'Fresh slate initialized while preserving previous project memory.';
        updates.status = 'active';
        updates.progress = 0;
        updates.completedFeatures = [];
        updates.startDate = now;
        updates.pauseDate = undefined;
        // reset task states
        updates.milestones = project.milestones.map((m) => ({
          ...m,
          tasks: m.tasks.map((t) => ({ ...t, status: 'todo' as const, completedAt: undefined })),
          completedAt: undefined,
        }));
        break;

      case 'continue':
        eventTitle = 'Revived: Resumed Active Development';
        eventDesc = note || 'Picked up from existing milestone progress and resolved prior blockers.';
        updates.status = 'active';
        updates.pauseDate = undefined;
        break;

      case 'change-idea':
        eventTitle = 'Revived via Pivot (Changed Idea)';
        eventDesc =
          note ||
          `Concept evolved. Previous goal: "${project.goal}". New focus: "${newGoal || project.goal}"`;
        updates.status = 'active';
        updates.pauseDate = undefined;
        if (newGoal) updates.goal = newGoal;
        break;

      case 'repurpose':
        eventTitle = 'Revived via Repurposing Assets';
        eventDesc =
          note ||
          `Re-allocating code and research to new purpose: "${newGoal || 'New architectural spin'}"`;
        updates.status = 'active';
        updates.pauseDate = undefined;
        if (newGoal) updates.summary = newGoal;
        break;

      case 'archive':
        eventTitle = 'Archived for Long-Term Preservation';
        eventDesc = note || 'Preserved in digital museum vault without active sprints.';
        updates.status = 'archived';
        break;
    }

    const event: TimelineEvent = {
      id: `tl-${uuidv4().slice(0, 8)}`,
      type:
        path === 'restart'
          ? 'restarted'
          : path === 'change-idea'
          ? 'idea-changed'
          : path === 'repurpose'
          ? 'repurposed'
          : path === 'archive'
          ? 'archived'
          : 'revived',
      title: eventTitle,
      description: eventDesc,
      timestamp: now,
    };

    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === id);
    const updated = {
      ...project,
      ...updates,
      updatedAt: now,
      timeline: [event, ...project.timeline],
    };
    updated.progress = calculateProjectProgress(updated);

    projects[index] = updated;
    this.saveProjects(projects);
    return updated;
  },

  // ---------------- TASKS & MILESTONES ----------------
  addMilestone(
    projectId: string,
    milestone: Omit<Milestone, 'id' | 'createdAt' | 'tasks'>
  ): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const now = new Date().toISOString();
    const newMilestone: Milestone = {
      ...milestone,
      id: `m-${uuidv4().slice(0, 8)}`,
      tasks: [],
      createdAt: now,
    };

    project.milestones.push(newMilestone);
    project.timeline.unshift({
      id: `tl-${uuidv4().slice(0, 8)}`,
      type: 'edited',
      title: `Milestone Added: ${newMilestone.title}`,
      timestamp: now,
    });

    return this.updateProject(projectId, { milestones: project.milestones });
  },

  deleteMilestone(projectId: string, milestoneId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const filtered = project.milestones.filter((m) => m.id !== milestoneId);
    return this.updateProject(projectId, { milestones: filtered });
  },

  addTask(
    projectId: string,
    milestoneId: string,
    task: Omit<Task, 'id' | 'createdAt'>
  ): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: `t-${uuidv4().slice(0, 8)}`,
      createdAt: now,
    };

    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    milestone.tasks.push(newTask);
    project.timeline.unshift({
      id: `tl-${uuidv4().slice(0, 8)}`,
      type: 'edited',
      title: `Task Added: ${newTask.title}`,
      description: `Added to ${milestone.title}`,
      timestamp: now,
    });

    return this.updateProject(projectId, { milestones: project.milestones });
  },

  toggleTaskComplete(projectId: string, milestoneId: string, taskId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    const task = milestone.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    const willBeCompleted = task.status !== 'completed';
    task.status = willBeCompleted ? 'completed' : 'todo';
    task.completedAt = willBeCompleted ? now : undefined;

    // Check if entire milestone is completed
    const allCompleted = milestone.tasks.length > 0 && milestone.tasks.every((t) => t.status === 'completed');
    if (allCompleted && !milestone.completedAt) {
      milestone.completedAt = now;
      project.timeline.unshift({
        id: `tl-${uuidv4().slice(0, 8)}`,
        type: 'milestone-completed',
        title: `Milestone Completed: ${milestone.title}`,
        description: 'All milestone deliverables completed!',
        timestamp: now,
      });
    } else if (!allCompleted && milestone.completedAt) {
      milestone.completedAt = undefined;
    }

    if (willBeCompleted) {
      project.timeline.unshift({
        id: `tl-${uuidv4().slice(0, 8)}`,
        type: 'task-completed',
        title: `Task Completed: ${task.title}`,
        timestamp: now,
      });
    }

    return this.updateProject(projectId, { milestones: project.milestones });
  },

  deleteTask(projectId: string, milestoneId: string, taskId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    milestone.tasks = milestone.tasks.filter((t) => t.id !== taskId);
    return this.updateProject(projectId, { milestones: project.milestones });
  },

  // ---------------- TEAMS OPERATIONS ----------------
  getTeams(): Team[] {
    try {
      const data = localStorage.getItem(KEYS.TEAMS);
      if (!data) {
        this.saveTeams(INITIAL_TEAMS);
        return INITIAL_TEAMS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load teams:', e);
      return INITIAL_TEAMS;
    }
  },

  saveTeams(teams: Team[]): void {
    try {
      localStorage.setItem(KEYS.TEAMS, JSON.stringify(teams));
    } catch (e) {
      console.error('Failed to save teams:', e);
    }
  },

  createTeam(name: string, description: string): Team {
    const teams = this.getTeams();
    const now = new Date().toISOString();
    const newTeam: Team = {
      id: `team-${uuidv4().slice(0, 8)}`,
      name,
      description,
      ownerId: 'user-1',
      projectIds: [],
      members: [
        {
          id: 'user-1',
          name: 'Alex Rivera',
          role: 'owner',
          skills: ['Full Stack', 'Product'],
          availability: 'full-time',
          joinedAt: now,
        },
      ],
      joinRequests: [],
      createdAt: now,
      updatedAt: now,
    };

    teams.unshift(newTeam);
    this.saveTeams(teams);
    return newTeam;
  },

  approveJoinRequest(teamId: string, requestId: string): Team {
    const teams = this.getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const req = team.joinRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Join request not found');

    req.status = 'approved';
    const now = new Date().toISOString();
    team.members.push({
      id: req.userId,
      name: req.userName,
      avatar: req.userAvatar,
      role: 'member',
      skills: req.skills,
      availability: 'part-time',
      joinedAt: now,
    });
    team.updatedAt = now;

    this.saveTeams(teams);
    return team;
  },

  rejectJoinRequest(teamId: string, requestId: string): Team {
    const teams = this.getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const req = team.joinRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Join request not found');

    req.status = 'rejected';
    team.updatedAt = new Date().toISOString();

    this.saveTeams(teams);
    return team;
  },

  removeMember(teamId: string, memberId: string): Team {
    const teams = this.getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error('Team not found');

    team.members = team.members.filter((m) => m.id !== memberId);
    team.updatedAt = new Date().toISOString();

    this.saveTeams(teams);
    return team;
  },

  // ---------------- REMINDERS OPERATIONS ----------------
  getReminders(): Reminder[] {
    try {
      const data = localStorage.getItem(KEYS.REMINDERS);
      if (!data) {
        this.saveReminders(INITIAL_REMINDERS);
        return INITIAL_REMINDERS;
      }
      const parsed: Reminder[] = JSON.parse(data);
      const cleaned = parsed.filter((r) => !r.id.startsWith('rem-test-'));
      if (cleaned.length !== parsed.length) {
        this.saveReminders(cleaned);
      }
      return cleaned.length > 0 ? cleaned : INITIAL_REMINDERS;
    } catch (e) {
      console.error('Failed to load reminders:', e);
      return INITIAL_REMINDERS;
    }
  },

  saveReminders(reminders: Reminder[]): void {
    try {
      localStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save reminders:', e);
    }
  },

  createReminder(
    data: Omit<Reminder, 'id' | 'createdAt' | 'status'>
  ): Reminder {
    const reminders = this.getReminders();
    const now = new Date().toISOString();
    const newReminder: Reminder = {
      ...data,
      id: `rem-${uuidv4().slice(0, 8)}`,
      status: 'upcoming',
      createdAt: now,
    };

    reminders.unshift(newReminder);
    this.saveReminders(reminders);
    return newReminder;
  },

  cancelReminder(id: string): Reminder {
    const reminders = this.getReminders();
    const rem = reminders.find((r) => r.id === id);
    if (!rem) throw new Error('Reminder not found');

    rem.status = 'cancelled';
    rem.enabled = false;
    this.saveReminders(reminders);
    return rem;
  },

  completeReminder(id: string): Reminder {
    const reminders = this.getReminders();
    const rem = reminders.find((r) => r.id === id);
    if (!rem) throw new Error('Reminder not found');

    rem.status = 'completed';
    rem.enabled = false;
    this.saveReminders(reminders);
    return rem;
  },

  snoozeReminder(id: string, hours: number = 24): Reminder {
    const reminders = this.getReminders();
    const rem = reminders.find((r) => r.id === id);
    if (!rem) throw new Error('Reminder not found');

    const currentDue = new Date(rem.dateTime).getTime();
    const baseTime = isNaN(currentDue) || currentDue < Date.now() ? Date.now() : currentDue;
    rem.dateTime = new Date(baseTime + hours * 3600000).toISOString();
    rem.status = 'upcoming';
    rem.enabled = true;
    this.saveReminders(reminders);
    return rem;
  },

  restoreReminder(id: string): Reminder {
    const reminders = this.getReminders();
    const rem = reminders.find((r) => r.id === id);
    if (!rem) throw new Error('Reminder not found');

    rem.status = 'upcoming';
    rem.enabled = true;
    this.saveReminders(reminders);
    return rem;
  },

  deleteReminder(id: string): void {
    const reminders = this.getReminders().filter((r) => r.id !== id);
    this.saveReminders(reminders);
  },

  // ---------------- NOTIFICATIONS OPERATIONS ----------------
  getNotifications(): Notification[] {
    try {
      const data = localStorage.getItem(KEYS.NOTIFICATIONS);
      if (!data) {
        this.saveNotifications(INITIAL_NOTIFICATIONS);
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load notifications:', e);
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: Notification[]): void {
    try {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  },

  markNotificationRead(id: string): void {
    const notifications = this.getNotifications();
    const n = notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.saveNotifications(notifications);
    }
  },

  markAllNotificationsRead(): void {
    const notifications = this.getNotifications().map((n) => ({ ...n, read: true }));
    this.saveNotifications(notifications);
  },

  addNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const notifications = this.getNotifications();
    const newNotif: Notification = {
      ...data,
      id: `notif-${uuidv4().slice(0, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(newNotif);
    this.saveNotifications(notifications);
    return newNotif;
  },

  // ---------------- FUSION OPERATIONS ----------------
  getFusionProposals(): FusionProposal[] {
    try {
      const data = localStorage.getItem(KEYS.FUSIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load fusion proposals:', e);
      return [];
    }
  },

  saveFusionProposals(proposals: FusionProposal[]): void {
    try {
      localStorage.setItem(KEYS.FUSIONS, JSON.stringify(proposals));
    } catch (e) {
      console.error('Failed to save fusions:', e);
    }
  },

  createFusionProposal(
    proposal: Omit<FusionProposal, 'id' | 'createdAt' | 'status'>
  ): FusionProposal {
    const proposals = this.getFusionProposals();
    const newProposal: FusionProposal = {
      ...proposal,
      id: `fusion-${uuidv4().slice(0, 8)}`,
      status: 'reviewing',
      createdAt: new Date().toISOString(),
    };

    proposals.unshift(newProposal);
    this.saveFusionProposals(proposals);
    return newProposal;
  },

  approveFusionProposal(id: string): { proposal: FusionProposal; newProject: Project } {
    const proposals = this.getFusionProposals();
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Proposal not found');

    const sourceProjects = proposal.sourceProjectIds
      .map((sid) => this.getProject(sid))
      .filter((p): p is Project => !!p);

    const now = new Date().toISOString();
    const newProjectId = `proj-${uuidv4().slice(0, 8)}`;

    // Merge frameworks and languages
    const languages = Array.from(new Set(sourceProjects.flatMap((p) => p.languages)));
    const frameworks = Array.from(new Set(sourceProjects.flatMap((p) => p.frameworks)));
    const tags = Array.from(new Set(['fused-concept', 'ai-fusion', ...sourceProjects.flatMap((p) => p.tags)]));

    const newProject: Project = {
      id: newProjectId,
      title: proposal.proposedTitle,
      summary: proposal.proposedGoal,
      originalIdea: proposal.proposedProblem,
      goal: proposal.proposedGoal,
      description: `Synthesized via AI Project Fusion by combining ${sourceProjects.map((p) => p.title).join(' + ')}.\n\nCore Innovation: ${proposal.proposedProblem}`,
      category: sourceProjects[0]?.category || 'Cross-Disciplinary',
      tags,
      targetAudience: sourceProjects.map((p) => p.targetAudience).join(' and '),
      visibility: 'team',

      languages,
      frameworks,
      libraries: proposal.proposedStack,
      apis: [],
      tools: ['Vite', 'Docker'],

      status: 'active',
      progress: 15,
      startDate: now,
      completedFeatures: ['Concept synthesis & capability matrix mapping'],
      inProgressFeatures: proposal.proposedFeatures.slice(0, 2),
      plannedFeatures: proposal.proposedFeatures.slice(2),
      milestones: proposal.proposedMilestones.map((m, idx) => ({
        id: `m-fused-${idx}`,
        title: m.title,
        description: m.description,
        createdAt: now,
        tasks: [
          {
            id: `t-fused-${idx}-1`,
            title: `Implement architectural foundation for ${m.title}`,
            status: 'todo',
            priority: 'high',
            weight: 3,
            createdAt: now,
          },
        ],
      })),

      technicalBlockers: [],
      missingSkills: [],
      knownBugs: [],
      lessonsLearned: [
        `Synthesized from lessons of ${sourceProjects.map((p) => p.title).join(', ')}.`,
      ],
      importantDecisions: [
        'Merged architectural capabilities into single cohesive platform.',
      ],
      plannedModifications: [],
      futureImprovements: [],
      nextSteps: [
        'Review fused milestone 1 scope',
        'Begin unifying shared core components',
      ],

      timeline: [
        {
          id: `tl-${uuidv4().slice(0, 8)}`,
          type: 'fused',
          title: `Project born from AI Fusion`,
          description: `Fused from source projects: ${sourceProjects.map((p) => p.title).join(' and ')}`,
          timestamp: now,
        },
      ],
      teamMembers: [
        {
          id: 'user-1',
          name: 'Alex Rivera',
          role: 'owner',
          skills: ['Full Stack', 'Architecture'],
          availability: 'full-time',
          joinedAt: now,
        },
      ],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      bookmarked: true,
      ownerId: 'user-1',
      ownerName: 'Alex Rivera',
      fusedFrom: proposal.sourceProjectIds,
    };

    // Update source projects with timeline events
    sourceProjects.forEach((src) => {
      this.updateProject(src.id, {
        fusedInto: newProjectId,
      });
      const p = this.getProject(src.id);
      if (p) {
        p.timeline.unshift({
          id: `tl-${uuidv4().slice(0, 8)}`,
          type: 'fused',
          title: `Fused into "${newProject.title}"`,
          description: `Capabilities merged into new project via AI Project Fusion.`,
          timestamp: now,
        });
        const allProjects = this.getProjects();
        const sidx = allProjects.findIndex((item) => item.id === src.id);
        if (sidx !== -1) {
          allProjects[sidx] = p;
          this.saveProjects(allProjects);
        }
      }
    });

    const allProjects = this.getProjects();
    allProjects.unshift(newProject);
    this.saveProjects(allProjects);

    proposal.status = 'approved';
    proposal.createdProjectId = newProjectId;
    this.saveFusionProposals(proposals);

    return { proposal, newProject };
  },

  rejectFusionProposal(id: string): FusionProposal {
    const proposals = this.getFusionProposals();
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'rejected';
    this.saveFusionProposals(proposals);
    return proposal;
  },

  // ---------------- USER OPERATIONS ----------------
  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(KEYS.USER_PROFILE);
      if (!data) {
        this.saveUserProfile(INITIAL_USER_PROFILE);
        return INITIAL_USER_PROFILE;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load user profile:', e);
      return INITIAL_USER_PROFILE;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save user profile:', e);
    }
  },

  updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    const updated = { ...current, ...updates };
    this.saveUserProfile(updated);
    return updated;
  },

  getCommunityUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(KEYS.COMMUNITY_USERS);
      if (!data) {
        localStorage.setItem(KEYS.COMMUNITY_USERS, JSON.stringify(INITIAL_COMMUNITY_USERS));
        return INITIAL_COMMUNITY_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_COMMUNITY_USERS;
    }
  },

  getUserSocialProfile(id: string, currentUserId: string = 'user-1'): UserSocialProfile | null {
    const users = this.getCommunityUsers();
    const user = users.find((u) => u.id === id) || (id === 'user-1' ? this.getUserProfile() : null);
    if (!user) return null;

    const allProjects = this.getProjects();
    const userProjects = allProjects.filter((p) => p.ownerId === id || (p.teamMembers && p.teamMembers.some((m) => m.id === id)));
    const projectsCount = userProjects.length;
    const completedCount = userProjects.filter((p) => p.status === 'completed').length;
    const revivedCount = userProjects.filter((p) => p.status === 'revived').length;
    const successRate = projectsCount > 0 ? Math.round(((completedCount + revivedCount) / projectsCount) * 100) : 0;

    let followStatus: 'none' | 'following' | 'requested' | 'incoming_request' = 'none';
    if (id !== currentUserId) {
      if (id === 'user-2') followStatus = 'following';
      else if (id === 'user-3') followStatus = 'requested';
    }

    return {
      ...user,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, ''),
      projectsCount,
      completedCount,
      revivedCount,
      successRate,
      followersCount: id === 'user-1' ? 2 : 1,
      followingCount: id === 'user-1' ? 1 : 1,
      followStatus,
    };
  },

  resetAllData(): void {
    try {
      localStorage.removeItem(KEYS.PROJECTS);
      localStorage.removeItem(KEYS.TEAMS);
      localStorage.removeItem(KEYS.REMINDERS);
      localStorage.removeItem(KEYS.NOTIFICATIONS);
      localStorage.removeItem(KEYS.USER_PROFILE);
      localStorage.removeItem(KEYS.FUSIONS);
      localStorage.removeItem(KEYS.INITIALIZED);
      this.initialize();
    } catch (e) {
      console.error('Failed to reset all data:', e);
    }
  },
};

export default storageService;
