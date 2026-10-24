export type ProjectStatus = 'active' | 'paused' | 'abandoned' | 'completed' | 'archived' | 'revived';
export type ProjectVisibility = 'private' | 'public' | 'team';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'blocked';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  weight: number; // 1-5
  completedAt?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'edited' | 'paused' | 'resumed' | 'completed' | 'archived' | 'revived' | 'restarted' | 'idea-changed' | 'repurposed' | 'milestone-completed' | 'task-completed' | 'team-joined' | 'team-left' | 'reminder-set' | 'fused' | 'ai-suggestion' | 'blocker-resolved' | 'comment';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  skills: string[];
  availability: 'full-time' | 'part-time' | 'occasional' | 'unavailable';
  joinedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  // Basics
  title: string;
  summary: string;
  originalIdea: string;
  goal: string;
  description: string;
  category: string;
  tags: string[];
  targetAudience: string;
  visibility: ProjectVisibility;

  // Technical
  languages: string[];
  frameworks: string[];
  libraries: string[];
  apis: string[];
  tools: string[];
  repoUrl?: string;
  demoUrl?: string;
  readmeUrl?: string;

  // Progress
  status: ProjectStatus;
  progress: number; // 0-100
  startDate: string;
  pauseDate?: string;
  completionDate?: string;
  plannedCompletionDate?: string;
  completedFeatures: string[];
  inProgressFeatures: string[];
  plannedFeatures: string[];
  milestones: Milestone[];

  // Abandonment / Memory
  whyStopped?: string;
  technicalBlockers: string[];
  missingSkills: string[];
  knownBugs: string[];
  lessonsLearned: string[];
  importantDecisions: string[];
  plannedModifications: string[];
  futureImprovements: string[];
  nextSteps: string[];

  // Meta
  timeline: TimelineEvent[];
  teamMembers: TeamMember[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  bookmarked: boolean;
  fusedFrom?: string[]; // IDs of source projects
  fusedInto?: string; // ID of fused project

  // Owner
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  members: TeamMember[];
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  joinRequests: JoinRequest[];
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  skills: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Reminder {
  id: string;
  projectId?: string;
  projectTitle?: string;
  title: string;
  message: string;
  dateTime: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  channel: 'in-app' | 'email' | 'both';
  enabled: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'project-update' | 'team-event' | 'ai-recommendation' | 'reminder' | 'join-request' | 'general';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface FusionProposal {
  id: string;
  sourceProjectIds: string[];
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
  // Analysis
  sharedCapabilities: string[];
  complementaryFeatures: string[];
  // Proposed
  proposedTitle: string;
  proposedProblem: string;
  proposedGoal: string;
  proposedFeatures: string[];
  proposedStack: string[];
  proposedDependencies: string[];
  risks: string[];
  tradeoffs: string[];
  proposedMilestones: { title: string; description: string; }[];
  createdAt: string;
  createdProjectId?: string; // set after approval
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  skills: string[];
  technologies: string[];
  availability: 'full-time' | 'part-time' | 'occasional';
  theme: 'light' | 'dark' | 'system';
  notificationPrefs: {
    projectUpdates: boolean;
    teamEvents: boolean;
    aiRecommendations: boolean;
    reminders: boolean;
  };
  privacyDefaults: {
    defaultVisibility: ProjectVisibility;
    showProfile: boolean;
  };
  createdAt: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isSimulated?: boolean;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  id: string;
  type: 'update-field' | 'add-task' | 'change-status' | 'add-feature';
  label: string;
  description: string;
  applied: boolean;
  data: Record<string, unknown>;
}
