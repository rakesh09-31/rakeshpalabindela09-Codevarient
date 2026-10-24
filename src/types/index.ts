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

export type ReminderCategory = 'continue-project' | 'finish-task' | 'review' | 'deadline' | 'follow-up';
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderChannel = 'in-app' | 'email' | 'whatsapp';
export type NotificationSchedule = 'at-due-time' | '10m-before' | '1h-before' | '1d-before' | 'custom';
export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReminderStatus = 'upcoming' | 'completed' | 'cancelled' | 'dismissed';

export interface Reminder {
  id: string;
  userId?: string;
  projectId?: string;
  projectTitle?: string;
  title: string;
  message: string;
  description?: string;
  category?: ReminderCategory;
  priority?: ReminderPriority;
  dateTime: string;
  timezone?: string;
  recurrence: ReminderRecurrence;
  customRecurrenceDays?: number;
  channel: 'in-app' | 'email' | 'both' | 'whatsapp' | 'all';
  channels?: ReminderChannel[];
  contactEmail?: string;
  contactPhone?: string;
  whatsappConsent?: boolean;
  whatsappConsentTimestamp?: string;
  notificationSchedule?: NotificationSchedule;
  customLeadTimeMinutes?: number;
  enabled: boolean;
  status: ReminderStatus;
  snoozeCount?: number;
  lastNotifiedAt?: string;
  deliveryStatus?: {
    email?: 'scheduled' | 'sent' | 'failed' | 'not-configured';
    whatsapp?: 'scheduled' | 'sent' | 'failed' | 'not-configured' | 'missing-consent';
    inApp?: 'scheduled' | 'sent' | 'failed';
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduledNotificationJob {
  id: string;
  reminderId: string;
  userId: string;
  channel: ReminderChannel;
  scheduledFor: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  idempotencyKey: string;
  attemptCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  providerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEvent {
  id: string;
  reminderId: string;
  userId: string;
  eventType: 'created' | 'updated' | 'rescheduled' | 'snoozed' | 'completed' | 'dismissed' | 'notification_sent' | 'notification_failed' | 'dispatched' | 'failed';
  details: string;
  timestamp: string;
  channel?: ReminderChannel;
}

export interface ReminderMetrics {
  total: number;
  upcoming: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  thisWeek: number;
  later: number;
  completed: number;
  dismissed: number;
  completionRate: number;
}

export interface ReminderSuggestion {
  id: string;
  projectId: string;
  projectTitle: string;
  title?: string;
  suggestedTitle: string;
  message?: string;
  suggestedDescription: string;
  category?: ReminderCategory;
  suggestedCategory: ReminderCategory;
  priority?: ReminderPriority;
  suggestedPriority: ReminderPriority;
  suggestedDateTime?: string;
  suggestedDueOffsetHours: number;
  rationale: string;
}

export interface ProviderConfigStatus {
  email: {
    configured: boolean;
    provider: string;
    details: string;
  };
  whatsapp: {
    configured: boolean;
    provider: string;
    details: string;
  };
  inApp?: {
    configured: boolean;
    provider: string;
    details: string;
  };
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
  // Detailed synthesis fields
  whyFit?: string;
  proposedUX?: string;
  confirmedFacts?: string[];
  assumptions?: string[];
  unresolvedQuestions?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
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

export type FollowStatus = 'none' | 'following' | 'requested' | 'incoming_request';

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  status: 'following' | 'requested';
  createdAt: string;
  updatedAt: string;
}

export interface UserSocialProfile extends UserProfile {
  username: string;
  followersCount: number;
  followingCount: number;
  projectsCount: number;
  completedCount: number;
  revivedCount: number;
  successRate: number; // (completed + revived) / total * 100
  followStatus?: FollowStatus;
}

export interface CollaborationRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  requesterUsername: string;
  ownerId: string;
  skills: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isSimulated?: boolean;
  suggestions?: AISuggestion[];
  suitability?: 'SUITABLE' | 'NOT_RECOMMENDED' | 'NEEDS_INFO';
  suitablePairIds?: string[];
  proposedConceptTitle?: string;
}

export interface AISuggestion {
  id: string;
  type: 'update-field' | 'add-task' | 'change-status' | 'add-feature';
  label: string;
  description: string;
  applied: boolean;
  data: Record<string, unknown>;
}
