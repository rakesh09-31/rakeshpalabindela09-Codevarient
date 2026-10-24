import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type {
  Project,
  Team,
  TeamInvitation,
  TeamTask,
  TeamActivityEvent,
  TeamComment,
  TeamAnalytics,
  JoinRequest,
  Reminder,
  FusionProposal,
  Task,
  TimelineEvent,
  UserProfile,
  UserSocialProfile,
  FollowStatus,
  CollaborationRequest,
  ScheduledNotificationJob,
  ReminderEvent,
  ReminderMetrics,
} from '../src/types/index.ts';
import {
  INITIAL_PROJECTS,
  INITIAL_TEAMS,
  INITIAL_REMINDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
  INITIAL_COMMUNITY_USERS,
} from '../src/data/seedData.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'graveyard.db');

export class DatabaseManager {
  private db: DatabaseSync;

  constructor(dbPath: string = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
    this.seedIfEmpty();
    this.seedSocialIfEmpty();
    this.seedTeamsCollaborationIfEmpty();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL,
        category TEXT,
        progress INTEGER NOT NULL DEFAULT 0,
        owner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fusions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS follows (
        id TEXT PRIMARY KEY,
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS collaborations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        requester_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        skills TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_notification_jobs (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        idempotency_key TEXT UNIQUE NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_attempt_at TEXT,
        error_message TEXT,
        provider_response TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_pending ON scheduled_notification_jobs (status, scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_jobs_reminder ON scheduled_notification_jobs (reminder_id);

      CREATE TABLE IF NOT EXISTS reminder_events (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_reminder ON reminder_events (reminder_id);
      CREATE INDEX IF NOT EXISTS idx_events_user ON reminder_events (user_id);

      CREATE TABLE IF NOT EXISTS team_tasks (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        project_id TEXT,
        assignee_id TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_team_tasks_team ON team_tasks (team_id);
      CREATE INDEX IF NOT EXISTS idx_team_tasks_assignee ON team_tasks (assignee_id);

      CREATE TABLE IF NOT EXISTS team_activities (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_team_activities_team ON team_activities (team_id);

      CREATE TABLE IF NOT EXISTS team_comments (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        project_id TEXT,
        task_id TEXT,
        author_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_team_comments_team ON team_comments (team_id);

      CREATE TABLE IF NOT EXISTS team_invitations (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        invitee_email TEXT NOT NULL,
        invitee_user_id TEXT,
        status TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations (team_id);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee ON team_invitations (invitee_email, invitee_user_id);
    `);

    // Safe migration checks for existing reminders table
    try {
      this.db.prepare('ALTER TABLE reminders ADD COLUMN user_id TEXT DEFAULT "user-1"').run();
    } catch {
      // Column already exists
    }
    try {
      this.db.prepare('ALTER TABLE reminders ADD COLUMN due_date TEXT').run();
    } catch {
      // Column already exists
    }
    try {
      this.db.prepare('CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON reminders (status, due_date)').run();
    } catch {
      // Index already exists
    }
    try {
      this.db.prepare('CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders (user_id)').run();
    } catch {
      // Index already exists
    }
  }

  private seedIfEmpty() {
    const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    if (projectCount && projectCount.count > 0) {
      return;
    }

    // Seed Projects
    const insertProj = this.db.prepare(`
      INSERT INTO projects (id, title, summary, status, visibility, category, progress, owner_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const proj of INITIAL_PROJECTS) {
      const fixedProgress = calculateProjectProgress(proj);
      const updatedProj = { ...proj, progress: fixedProgress };
      insertProj.run(
        updatedProj.id,
        updatedProj.title,
        updatedProj.summary,
        updatedProj.status,
        updatedProj.visibility,
        updatedProj.category,
        updatedProj.progress,
        updatedProj.ownerId,
        JSON.stringify(updatedProj),
        updatedProj.createdAt,
        updatedProj.updatedAt
      );
    }

    // Seed Teams
    const insertTeam = this.db.prepare(`
      INSERT INTO teams (id, name, owner_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const team of INITIAL_TEAMS) {
      insertTeam.run(
        team.id,
        team.name,
        team.ownerId,
        JSON.stringify(team),
        team.createdAt,
        team.updatedAt
      );
    }

    // Seed Reminders
    const insertReminder = this.db.prepare(`
      INSERT INTO reminders (id, project_id, title, status, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const rem of INITIAL_REMINDERS) {
      insertReminder.run(
        rem.id,
        rem.projectId || null,
        rem.title,
        rem.status,
        JSON.stringify(rem),
        rem.createdAt
      );
    }

    // Seed Notifications
    const insertNotif = this.db.prepare(`
      INSERT INTO notifications (id, type, read, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const notif of INITIAL_NOTIFICATIONS) {
      insertNotif.run(
        notif.id,
        notif.type,
        notif.read ? 1 : 0,
        JSON.stringify(notif),
        notif.createdAt
      );
    }

    // Seed User Profile
    const insertProfile = this.db.prepare(`
      INSERT INTO user_profiles (id, data, updated_at)
      VALUES (?, ?, ?)
    `);
    insertProfile.run(
      INITIAL_USER_PROFILE.id,
      JSON.stringify(INITIAL_USER_PROFILE),
      new Date().toISOString()
    );
  }

  private seedSocialIfEmpty() {
    // 1. Seed community user profiles if not existing
    const insertProfile = this.db.prepare(`
      INSERT OR REPLACE INTO user_profiles (id, data, updated_at)
      VALUES (?, ?, ?)
    `);
    for (const user of INITIAL_COMMUNITY_USERS) {
      const existing = this.db.prepare('SELECT id FROM user_profiles WHERE id = ?').get(user.id);
      if (!existing) {
        insertProfile.run(user.id, JSON.stringify(user), new Date().toISOString());
      }
    }

    // 2. Seed initial follows if empty
    const followsCount = this.db.prepare('SELECT COUNT(*) as count FROM follows').get() as { count: number };
    if (!followsCount || followsCount.count === 0) {
      const insertFollow = this.db.prepare(`
        INSERT INTO follows (id, follower_id, following_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      insertFollow.run('fol-init-1', 'user-2', 'user-1', 'following', now, now);
      insertFollow.run('fol-init-2', 'user-4', 'user-1', 'following', now, now);
      insertFollow.run('fol-init-3', 'user-1', 'user-2', 'following', now, now);
      insertFollow.run('fol-init-4', 'user-3', 'user-1', 'requested', now, now);
      insertFollow.run('fol-init-5', 'user-5', 'user-4', 'following', now, now);
    }

    // 3. Seed initial collaborations if empty
    const collabCount = this.db.prepare('SELECT COUNT(*) as count FROM collaborations').get() as { count: number };
    if (!collabCount || collabCount.count === 0) {
      const insertCollab = this.db.prepare(`
        INSERT INTO collaborations (id, project_id, requester_id, owner_id, skills, message, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      insertCollab.run(
        'collab-init-1',
        'proj-1',
        'user-2',
        'user-1',
        'UI Design, Design Systems, Accessibility',
        'I’d love to design the upcoming mobile habit streak and community challenge screens!',
        'accepted',
        now,
        now
      );
      insertCollab.run(
        'collab-init-2',
        'proj-1',
        'user-4',
        'user-1',
        'React Native, WatermelonDB, Offline Cache',
        'Can assist with WatermelonDB offline sync edge cases and battery-efficient location tracking.',
        'pending',
        now,
        now
      );
    }
  }

  private seedTeamsCollaborationIfEmpty() {
    // 1. Seed initial team tasks if empty
    try {
      const taskCount = (this.db.prepare('SELECT COUNT(*) as count FROM team_tasks').get() as { count: number }).count;
      if (taskCount === 0) {
        const insertTask = this.db.prepare(`
          INSERT INTO team_tasks (id, team_id, project_id, assignee_id, status, priority, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const now = new Date();
        const twoDaysFuture = new Date(now.getTime() + 2 * 86400000).toISOString();
        const yesterday = new Date(now.getTime() - 86400000).toISOString();
        const fiveDaysFuture = new Date(now.getTime() + 5 * 86400000).toISOString();
        const nowIso = now.toISOString();

        const task1: TeamTask = {
          id: 'ttask-1',
          teamId: 'team-1',
          projectId: 'proj-6',
          projectTitle: 'GreenRoute',
          title: 'Optimize graph search routing engine to sub-100ms',
          description: 'Benchmark Dijkstra vs A* and test heuristic weightings with 500k road nodes.',
          assigneeId: 'user-1',
          assigneeName: 'Alex Rivera',
          creatorId: 'user-1',
          creatorName: 'Alex Rivera',
          priority: 'urgent',
          status: 'in_progress',
          dueDate: twoDaysFuture,
          subtasks: [
            { id: 'st-1', title: 'Benchmark baseline traversal latency', completed: true },
            { id: 'st-2', title: 'Implement binary heap priority queue in Rust', completed: true },
            { id: 'st-3', title: 'Validate memory profile under high concurrency', completed: false },
          ],
          createdAt: yesterday,
          updatedAt: nowIso,
        };

        const task2: TeamTask = {
          id: 'ttask-2',
          teamId: 'team-1',
          projectId: 'proj-1',
          projectTitle: 'EcoTrack',
          title: 'WatermelonDB offline conflict resolution edge case testing',
          description: 'Simulate high-latency offline queuing and verify CRDT sync stability.',
          assigneeId: 'user-2',
          assigneeName: 'Elena Rostova',
          creatorId: 'user-1',
          creatorName: 'Alex Rivera',
          priority: 'high',
          status: 'completed',
          dueDate: yesterday,
          subtasks: [
            { id: 'st-4', title: 'Write offline queue simulation test harness', completed: true },
            { id: 'st-5', title: 'Verify schema v2 SQLite migration on device', completed: true },
          ],
          createdAt: yesterday,
          updatedAt: nowIso,
        };

        const task3: TeamTask = {
          id: 'ttask-3',
          teamId: 'team-1',
          projectId: 'proj-1',
          projectTitle: 'EcoTrack',
          title: 'Design mobile habit tracker check-in UX',
          description: 'Create responsive check-in flow with accessible micro-interactions for daily eco-actions.',
          assigneeId: 'user-4',
          assigneeName: 'Maya Lin',
          creatorId: 'user-1',
          creatorName: 'Alex Rivera',
          priority: 'medium',
          status: 'todo',
          dueDate: fiveDaysFuture,
          subtasks: [
            { id: 'st-6', title: 'Produce wireframes in Figma', completed: false },
            { id: 'st-7', title: 'Conduct WCAG AA color contrast audit', completed: false },
          ],
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        insertTask.run(task1.id, task1.teamId, task1.projectId || null, task1.assigneeId || null, task1.status, task1.priority, JSON.stringify(task1), task1.createdAt, task1.updatedAt);
        insertTask.run(task2.id, task2.teamId, task2.projectId || null, task2.assigneeId || null, task2.status, task2.priority, JSON.stringify(task2), task2.createdAt, task2.updatedAt);
        insertTask.run(task3.id, task3.teamId, task3.projectId || null, task3.assigneeId || null, task3.status, task3.priority, JSON.stringify(task3), task3.createdAt, task3.updatedAt);
      }
    } catch {
      // ignore
    }

    // 2. Seed initial team activities if empty
    try {
      const actCount = (this.db.prepare('SELECT COUNT(*) as count FROM team_activities').get() as { count: number }).count;
      if (actCount === 0) {
        const insertAct = this.db.prepare(`
          INSERT INTO team_activities (id, team_id, type, actor_id, data, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const yesterdayIso = new Date(Date.now() - 86400000).toISOString();

        const acts: TeamActivityEvent[] = [
          {
            id: 'act-1',
            teamId: 'team-1',
            type: 'team_created',
            actorId: 'user-1',
            actorName: 'Alex Rivera',
            title: 'Alex Rivera created Team Verdant',
            description: 'Civic technologists and product designers building sustainable software.',
            createdAt: '2025-01-15T09:00:00.000Z',
          },
          {
            id: 'act-2',
            teamId: 'team-1',
            type: 'project_shared',
            actorId: 'user-1',
            actorName: 'Alex Rivera',
            title: 'Shared project "EcoTrack" with Team Verdant',
            targetId: 'proj-1',
            targetTitle: 'EcoTrack',
            createdAt: '2025-01-15T10:00:00.000Z',
          },
          {
            id: 'act-3',
            teamId: 'team-1',
            type: 'project_shared',
            actorId: 'user-1',
            actorName: 'Alex Rivera',
            title: 'Shared project "GreenRoute" with Team Verdant',
            targetId: 'proj-6',
            targetTitle: 'GreenRoute',
            createdAt: '2025-01-16T12:00:00.000Z',
          },
          {
            id: 'act-4',
            teamId: 'team-1',
            type: 'join_approved',
            actorId: 'user-1',
            actorName: 'Alex Rivera',
            title: 'Elena Rostova joined as Admin',
            createdAt: '2025-03-10T14:00:00.000Z',
          },
          {
            id: 'act-5',
            teamId: 'team-1',
            type: 'join_approved',
            actorId: 'user-1',
            actorName: 'Alex Rivera',
            title: 'Maya Lin joined as Member',
            createdAt: '2025-07-10T11:00:00.000Z',
          },
          {
            id: 'act-6',
            teamId: 'team-1',
            type: 'task_status_changed',
            actorId: 'user-2',
            actorName: 'Elena Rostova',
            title: 'Task "WatermelonDB offline conflict resolution edge case testing" marked as completed',
            targetId: 'ttask-2',
            targetTitle: 'WatermelonDB offline conflict resolution edge case testing',
            createdAt: yesterdayIso,
          },
        ];

        for (const act of acts) {
          insertAct.run(act.id, act.teamId, act.type, act.actorId, JSON.stringify(act), act.createdAt);
        }
      }
    } catch {
      // ignore
    }

    // 3. Seed initial team comments if empty
    try {
      const commCount = (this.db.prepare('SELECT COUNT(*) as count FROM team_comments').get() as { count: number }).count;
      if (commCount === 0) {
        const insertComm = this.db.prepare(`
          INSERT INTO team_comments (id, team_id, project_id, task_id, author_id, data, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const comm1: TeamComment = {
          id: 'tcomm-1',
          teamId: 'team-1',
          projectId: 'proj-1',
          authorId: 'user-1',
          authorName: 'Alex Rivera',
          content: '@Elena Rostova, let\'s make sure the offline SQLite sync handles schema v2 migrations smoothly before next week\'s beta.',
          mentions: ['Elena Rostova'],
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        };
        const comm2: TeamComment = {
          id: 'tcomm-2',
          teamId: 'team-1',
          projectId: 'proj-1',
          authorId: 'user-2',
          authorName: 'Elena Rostova',
          content: 'Working on it today! The conflict resolution tests are passing on iOS and Android.',
          mentions: [],
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        };
        insertComm.run(comm1.id, comm1.teamId, comm1.projectId || null, null, comm1.authorId, JSON.stringify(comm1), comm1.createdAt);
        insertComm.run(comm2.id, comm2.teamId, comm2.projectId || null, null, comm2.authorId, JSON.stringify(comm2), comm2.createdAt);
      }
    } catch {
      // ignore
    }
  }

  isProjectSharedWithUserTeams(projectId: string, userId: string): boolean {
    try {
      const rows = this.db.prepare('SELECT data FROM teams').all() as { data: string }[];
      for (const row of rows) {
        const team = JSON.parse(row.data) as Team;
        const hasProject = team.projectIds && team.projectIds.includes(projectId);
        const hasUser = team.ownerId === userId || (team.members && team.members.some((m) => m.id === userId));
        if (hasProject && hasUser) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  // ---------------- PROJECT CRUD ----------------
  getProjects(userId: string = 'user-1'): Project[] {
    const rows = this.db.prepare('SELECT data FROM projects ORDER BY updated_at DESC').all() as { data: string }[];
    const all = rows.map((r) => {
      const p = JSON.parse(r.data) as Project;
      return {
        ...p,
        languages: p.languages || [],
        frameworks: p.frameworks || [],
        libraries: p.libraries || [],
        milestones: p.milestones || [],
        completedFeatures: p.completedFeatures || [],
        inProgressFeatures: p.inProgressFeatures || [],
        plannedFeatures: p.plannedFeatures || [],
        technicalBlockers: p.technicalBlockers || [],
        teamMembers: p.teamMembers || [],
      };
    });
    // Filter visible to requesting user: user is owner OR member OR visibility is public or team OR shared with user's team
    return all.filter((p) => {
      if (p.visibility === 'public') return true;
      if (p.ownerId === userId) return true;
      if (p.teamMembers && p.teamMembers.some((m) => m.id === userId)) return true;
      if (p.visibility === 'team') return true;
      if (this.isProjectSharedWithUserTeams(p.id, userId)) return true;
      return false;
    });
  }

  getProject(id: string, userId: string = 'user-1'): Project | null {
    const row = this.db.prepare('SELECT data FROM projects WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    const project = JSON.parse(row.data) as Project;
    // Authorization check: if private and not owned or member and not shared with user's team -> deny
    if (
      project.visibility === 'private' &&
      project.ownerId !== userId &&
      !(project.teamMembers && project.teamMembers.some((m) => m.id === userId)) &&
      !this.isProjectSharedWithUserTeams(project.id, userId)
    ) {
      return null;
    }
    project.languages = project.languages || [];
    project.frameworks = project.frameworks || [];
    project.libraries = project.libraries || [];
    project.milestones = project.milestones || [];
    project.completedFeatures = project.completedFeatures || [];
    project.inProgressFeatures = project.inProgressFeatures || [];
    project.plannedFeatures = project.plannedFeatures || [];
    project.technicalBlockers = project.technicalBlockers || [];
    project.teamMembers = project.teamMembers || [];
    return project;
  }

  createProject(project: Project): Project {
    const now = new Date().toISOString();
    project.id = project.id || `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    project.ownerId = project.ownerId || 'user-1';
    project.category = project.category || 'General';
    project.milestones = project.milestones || [];
    project.completedFeatures = project.completedFeatures || [];
    project.inProgressFeatures = project.inProgressFeatures || [];
    project.plannedFeatures = project.plannedFeatures || [];
    project.technicalBlockers = project.technicalBlockers || [];
    project.progress = calculateProjectProgress(project);
    project.createdAt = project.createdAt || now;
    project.updatedAt = now;

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, title, summary, status, visibility, category, progress, owner_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.title,
      project.summary,
      project.status,
      project.visibility,
      project.category,
      project.progress,
      project.ownerId,
      JSON.stringify(project),
      project.createdAt,
      project.updatedAt
    );

    return project;
  }

  updateProject(id: string, updates: Partial<Project>, timelineNote?: string): Project {
    const existing = this.getProject(id);
    if (!existing) throw new Error(`Project ${id} not found`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    if ('repoUrl' in updates) {
      updated.repoUrl = updates.repoUrl ? updates.repoUrl : undefined;
    }

    if (timelineNote) {
      const tlEvent: TimelineEvent = {
        id: `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'edited',
        title: 'Project Updated',
        description: timelineNote,
        timestamp: now,
      };
      updated.timeline = [tlEvent, ...updated.timeline];
    }

    updated.progress = calculateProjectProgress(updated);

    const stmt = this.db.prepare(`
      UPDATE projects
      SET title = ?, summary = ?, status = ?, visibility = ?, category = ?, progress = ?, data = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.summary,
      updated.status,
      updated.visibility,
      updated.category,
      updated.progress,
      JSON.stringify(updated),
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteProject(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // ---------------- REVIVAL OPERATIONS ----------------
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
        eventDesc = note || 'Fresh slate initialized while preserving previous project memory and blockers.';
        updates.status = 'active';
        updates.progress = 0;
        updates.completedFeatures = [];
        updates.startDate = now;
        updates.pauseDate = undefined;
        // reset task states to todo
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
        eventDesc = note || `Concept pivoted. Prior goal: "${project.goal}". New focus: "${newGoal || project.goal}"`;
        updates.status = 'active';
        updates.pauseDate = undefined;
        if (newGoal) updates.goal = newGoal;
        break;

      case 'repurpose':
        eventTitle = 'Revived via Repurposing Assets';
        eventDesc = note || `Re-allocating code assets and architecture to new purpose: "${newGoal || 'Repurposed spin'}"`;
        updates.status = 'active';
        updates.pauseDate = undefined;
        if (newGoal) updates.summary = newGoal;
        break;

      case 'archive':
        eventTitle = 'Archived for Long-Term Preservation';
        eventDesc = note || 'Preserved in digital garden museum vault without active sprints.';
        updates.status = 'archived';
        break;
    }

    const event: TimelineEvent = {
      id: `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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

    const updated: Project = {
      ...project,
      ...updates,
      updatedAt: now,
      timeline: [event, ...project.timeline],
    };

    updated.progress = calculateProjectProgress(updated);

    return this.updateProject(id, updated);
  }

  // ---------------- TASK & MILESTONE TOGGLE ----------------
  toggleTask(projectId: string, milestoneId: string, taskId: string): Project {
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
        id: `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
        id: `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'task-completed',
        title: `Task Completed: ${task.title}`,
        description: `Delivered in "${milestone.title}"`,
        timestamp: now,
      });
    }

    project.progress = calculateProjectProgress(project);
    return this.updateProject(projectId, { milestones: project.milestones });
  }

  // ---------------- TEAMS CRUD & COLLABORATION ----------------
  getTeams(options?: { userId?: string; visibility?: string; category?: string; query?: string; discoverableOnly?: boolean }): Team[] {
    const rows = this.db.prepare('SELECT data FROM teams ORDER BY updated_at DESC').all() as { data: string }[];
    let all = rows.map((r) => {
      const t = JSON.parse(r.data) as Team;
      return {
        ...t,
        visibility: t.visibility || 'discoverable',
        categories: t.categories || [],
        joinPolicy: t.joinPolicy || 'request-to-join',
        invitations: t.invitations || [],
      };
    });

    const isDiscoverableOnly = Boolean(options?.discoverableOnly || options?.visibility === 'discoverable');
    const userId = options?.userId;
    const category = options?.category;
    const query = options?.query;

    if (isDiscoverableOnly) {
      all = all.filter((t) => t.visibility === 'discoverable');
    } else if (userId) {
      // Return teams user belongs to + discoverable teams
      // Private teams that user does not belong to are strictly excluded
      all = all.filter((t) => {
        const isMemberOrOwner = t.ownerId === userId || (t.members && t.members.some((m) => m.id === userId));
        if (isMemberOrOwner) return true;
        return t.visibility === 'discoverable';
      });
    } else if (options?.visibility === 'private') {
      all = all.filter((t) => t.visibility === 'private');
    } else if (options?.visibility) {
      all = all.filter((t) => t.visibility === options.visibility);
    } else {
      // Default to discoverable teams when unauthenticated to avoid leaking private teams
      all = all.filter((t) => t.visibility === 'discoverable');
    }

    if (category && category !== 'all') {
      all = all.filter((t) => t.categories && t.categories.includes(category));
    }

    if (query) {
      const q = query.toLowerCase().trim();
      all = all.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.categories && t.categories.some((c) => c.toLowerCase().includes(q)))
      );
    }

    return all;
  }

  getTeam(id: string, userId?: string): Team | null {
    const row = this.db.prepare('SELECT data FROM teams WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    const team = JSON.parse(row.data) as Team;
    team.visibility = team.visibility || 'discoverable';
    team.categories = team.categories || [];
    team.joinPolicy = team.joinPolicy || 'request-to-join';

    // Privacy check: private teams are restricted to owner or members
    if (userId && team.visibility === 'private') {
      const isMember = team.ownerId === userId || (team.members && team.members.some((m) => m.id === userId));
      if (!isMember) return null;
    }

    // Attach pending invitations from team_invitations table
    try {
      const invRows = this.db.prepare("SELECT data FROM team_invitations WHERE team_id = ? AND status = 'pending'").all(id) as { data: string }[];
      team.invitations = invRows.map((r) => JSON.parse(r.data) as TeamInvitation);
    } catch {
      team.invitations = team.invitations || [];
    }

    return team;
  }

  createTeam(team: Team, creatorUserId?: string): Team {
    if (!team.name || !team.name.trim()) {
      throw new Error('Team name is required');
    }
    if (team.name.trim().length > 100) {
      throw new Error('Team name must not exceed 100 characters');
    }

    const now = new Date().toISOString();
    const ownerId = creatorUserId || team.ownerId || 'user-1';

    let ownerName = 'Alex Rivera';
    let ownerSkills: string[] = ['Full Stack', 'Architecture'];
    try {
      const ownerProfile = this.getUserSocialProfile(ownerId);
      if (ownerProfile) {
        ownerName = ownerProfile.name || ownerName;
        ownerSkills = ownerProfile.skills || ownerSkills;
      }
    } catch {
      // fallback
    }

    const enrichedTeam: Team = {
      ...team,
      id: team.id || `team-${Date.now().toString(36)}`,
      name: team.name.trim(),
      description: team.description?.trim() || '',
      visibility: team.visibility || 'discoverable',
      categories: team.categories || [],
      joinPolicy: team.joinPolicy || 'request-to-join',
      ownerId,
      projectIds: team.projectIds || [],
      members: team.members && team.members.length > 0 ? team.members : [
        {
          id: ownerId,
          name: ownerName,
          role: 'owner',
          skills: ownerSkills,
          availability: 'full-time',
          joinedAt: now,
        },
      ],
      joinRequests: team.joinRequests || [],
      invitations: team.invitations || [],
      createdAt: team.createdAt || now,
      updatedAt: now,
    };

    // Ensure owner is in members list with owner role
    if (!enrichedTeam.members.some((m) => m.id === ownerId)) {
      enrichedTeam.members.unshift({
        id: ownerId,
        name: ownerName,
        role: 'owner',
        skills: ownerSkills,
        availability: 'full-time',
        joinedAt: now,
      });
    }

    const stmt = this.db.prepare(`
      INSERT INTO teams (id, name, owner_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(enrichedTeam.id, enrichedTeam.name, enrichedTeam.ownerId, JSON.stringify(enrichedTeam), enrichedTeam.createdAt, enrichedTeam.updatedAt);

    this.recordTeamActivity({
      teamId: enrichedTeam.id,
      type: 'team_created',
      actorId: ownerId,
      actorName: ownerName,
      title: `${ownerName} created team "${enrichedTeam.name}"`,
      description: enrichedTeam.description,
    });

    return enrichedTeam;
  }

  updateTeam(id: string, updates: Partial<Team>, actingUserId?: string): Team {
    const row = this.db.prepare('SELECT data FROM teams WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) throw new Error('Team not found');
    const existing = JSON.parse(row.data) as Team;

    if (actingUserId) {
      const member = existing.members.find((m) => m.id === actingUserId);
      const isOwner = existing.ownerId === actingUserId || member?.role === 'owner';
      const isAdmin = member?.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new Error('Forbidden: Only team owners or admins can update team details');
      }
      if (updates.ownerId && updates.ownerId !== existing.ownerId && !isOwner) {
        throw new Error('Forbidden: Only the team owner can change team ownership');
      }
    }

    if (updates.name !== undefined) {
      if (!updates.name.trim()) throw new Error('Team name cannot be empty');
      if (updates.name.trim().length > 100) throw new Error('Team name must not exceed 100 characters');
      updates.name = updates.name.trim();
    }

    const now = new Date().toISOString();
    const updated: Team = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    const stmt = this.db.prepare('UPDATE teams SET name = ?, data = ?, updated_at = ? WHERE id = ?');
    stmt.run(updated.name, JSON.stringify(updated), updated.updatedAt, id);

    if (actingUserId) {
      const actor = existing.members.find((m) => m.id === actingUserId);
      this.recordTeamActivity({
        teamId: id,
        type: 'team_updated',
        actorId: actingUserId,
        actorName: actor?.name || 'Team Admin',
        title: 'Team details updated',
      });
    }

    return updated;
  }

  deleteTeam(id: string, actingUserId?: string): void {
    const row = this.db.prepare('SELECT data FROM teams WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return;
    const team = JSON.parse(row.data) as Team;

    if (actingUserId) {
      if (team.ownerId !== actingUserId) {
        throw new Error('Forbidden: Only the team owner can delete the team');
      }
    }

    // Safeguard: Unshare all projects without deleting the underlying projects!
    if (team.projectIds && team.projectIds.length > 0) {
      for (const pid of team.projectIds) {
        try {
          const proj = this.getProject(pid);
          if (proj && (proj as any).sharedTeamIds) {
            const nextShared = ((proj as any).sharedTeamIds as string[]).filter((tId) => tId !== id);
            this.updateProject(pid, { sharedTeamIds: nextShared } as any);
          }
        } catch {
          // ignore
        }
      }
    }

    // Clean up team tasks, activities, comments, invitations
    try {
      this.db.prepare('DELETE FROM team_tasks WHERE team_id = ?').run(id);
      this.db.prepare('DELETE FROM team_activities WHERE team_id = ?').run(id);
      this.db.prepare('DELETE FROM team_comments WHERE team_id = ?').run(id);
      this.db.prepare('DELETE FROM team_invitations WHERE team_id = ?').run(id);
    } catch {
      // ignore
    }

    const stmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
    stmt.run(id);
  }

  transferTeamOwnership(teamId: string, newOwnerId: string, currentOwnerId: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    if (team.ownerId !== currentOwnerId) {
      throw new Error('Forbidden: Only the current owner can transfer ownership');
    }
    const newOwnerMember = team.members.find((m) => m.id === newOwnerId);
    if (!newOwnerMember) {
      throw new Error('Target user must be a member of the team to become owner');
    }

    team.ownerId = newOwnerId;
    team.members = team.members.map((m) => {
      if (m.id === currentOwnerId) return { ...m, role: 'admin' as const };
      if (m.id === newOwnerId) return { ...m, role: 'owner' as const };
      return m;
    });

    this.updateTeam(teamId, { ownerId: newOwnerId, members: team.members });

    this.recordTeamActivity({
      teamId,
      type: 'ownership_transferred',
      actorId: currentOwnerId,
      actorName: team.members.find((m) => m.id === currentOwnerId)?.name || 'Former Owner',
      title: `Team ownership transferred to ${newOwnerMember.name}`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: newOwnerId,
      title: 'You are now Team Owner',
      message: `Ownership of "${team.name}" has been transferred to you.`,
      teamId,
    });

    return team;
  }

  leaveTeam(teamId: string, userId: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const member = team.members.find((m) => m.id === userId);
    if (!member) throw new Error('You are not a member of this team');

    if (team.ownerId === userId || member.role === 'owner') {
      const otherMembers = team.members.filter((m) => m.id !== userId);
      if (otherMembers.length > 0) {
        throw new Error('Cannot leave team as sole owner. Transfer ownership to another member first.');
      } else {
        throw new Error('Cannot leave team as sole owner. Delete the team to dissolve it.');
      }
    }

    team.members = team.members.filter((m) => m.id !== userId);
    this.updateTeam(teamId, { members: team.members });

    this.recordTeamActivity({
      teamId,
      type: 'member_left',
      actorId: userId,
      actorName: member.name,
      title: `${member.name} left the team`,
    });

    return team;
  }

  updateMemberRole(teamId: string, targetUserId: string, newRole: 'admin' | 'member', actingUserId: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const targetMember = team.members.find((m) => m.id === targetUserId);
    if (!targetMember) throw new Error('Member not found in team');

    const isActingOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isActingAdmin = actingMember?.role === 'admin';

    if (!isActingOwner && !isActingAdmin) {
      throw new Error('Forbidden: Only owners or admins can change member roles');
    }

    if (targetMember.role === 'owner' || targetUserId === team.ownerId) {
      throw new Error('Forbidden: Cannot change the Owner role directly. Transfer ownership instead.');
    }

    if (isActingAdmin && !isActingOwner && targetMember.role === 'admin') {
      throw new Error('Forbidden: Admins cannot modify roles of other admins');
    }

    team.members = team.members.map((m) => {
      if (m.id === targetUserId) {
        return { ...m, role: newRole };
      }
      return m;
    });

    this.updateTeam(teamId, { members: team.members });

    this.recordTeamActivity({
      teamId,
      type: 'role_changed',
      actorId: actingUserId,
      actorName: actingMember?.name || 'Admin',
      title: `${targetMember.name}'s role updated to ${newRole}`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: targetUserId,
      title: 'Team Role Updated',
      message: `Your role in "${team.name}" was changed to ${newRole}.`,
      teamId,
    });

    return team;
  }

  removeTeamMember(teamId: string, targetUserId: string, actingUserId: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const targetMember = team.members.find((m) => m.id === targetUserId);
    if (!targetMember) throw new Error('Member not found in team');

    const isSelf = targetUserId === actingUserId;
    const isActingOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isActingAdmin = actingMember?.role === 'admin';

    if (isSelf) {
      return this.leaveTeam(teamId, actingUserId);
    }

    if (!isActingOwner && !isActingAdmin) {
      throw new Error('Forbidden: Only team owners and admins can remove members');
    }
    if (targetMember.role === 'owner' || targetUserId === team.ownerId) {
      throw new Error('Forbidden: The team owner cannot be removed');
    }
    if (isActingAdmin && !isActingOwner && targetMember.role === 'admin') {
      throw new Error('Forbidden: Admins cannot remove other admins');
    }

    team.members = team.members.filter((m) => m.id !== targetUserId);
    this.updateTeam(teamId, { members: team.members });

    this.recordTeamActivity({
      teamId,
      type: 'member_removed',
      actorId: actingUserId,
      actorName: actingMember?.name || 'Admin',
      title: `${targetMember.name} was removed from the team`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: targetUserId,
      title: 'Removed from Team',
      message: `You were removed from "${team.name}".`,
      teamId,
    });

    return team;
  }

  createTeamInvitation(
    teamId: string,
    inviteeIdentifier: string,
    role: 'admin' | 'member' = 'member',
    actingUserId: string,
    message?: string
  ): { invitation: TeamInvitation; emailDelivery: { sent: boolean; reason: string } } {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isAdmin = actingMember?.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new Error('Forbidden: Only team owners or admins can invite members');
    }

    const cleanIdentifier = inviteeIdentifier.trim().toLowerCase();
    if (!cleanIdentifier) throw new Error('Invitee username or email is required');

    const allUsers = this.getUserProfiles();
    const matchedUser = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier) ||
        u.id.toLowerCase() === cleanIdentifier
    );

    const targetUserId = matchedUser?.id;
    const targetEmail = matchedUser?.email || (cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@example.com`);
    const targetName = matchedUser?.name || cleanIdentifier;

    if (targetUserId && targetUserId === actingUserId) {
      throw new Error('Cannot invite yourself to the team');
    }

    if (team.members.some((m) => m.id === targetUserId || (m.email && m.email.toLowerCase() === cleanIdentifier))) {
      throw new Error('User is already a member of this team');
    }

    const existingPending = this.db.prepare(`
      SELECT data FROM team_invitations
      WHERE team_id = ? AND (invitee_email = ? OR invitee_user_id = ?) AND status = 'pending'
    `).get(teamId, targetEmail, targetUserId || '') as { data: string } | undefined;

    if (existingPending) {
      throw new Error('A pending invitation already exists for this user');
    }

    const now = new Date().toISOString();
    const invitation: TeamInvitation = {
      id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      teamId,
      teamName: team.name,
      teamAvatar: team.avatar,
      inviteeEmail: targetEmail,
      inviteeUserId: targetUserId,
      inviteeName: targetName,
      role,
      status: 'pending',
      invitedBy: actingUserId,
      invitedByName: actingMember?.name || 'Team Admin',
      message: message?.trim(),
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO team_invitations (id, team_id, invitee_email, invitee_user_id, status, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(invitation.id, invitation.teamId, invitation.inviteeEmail, invitation.inviteeUserId || null, invitation.status, JSON.stringify(invitation), invitation.createdAt);

    this.recordTeamActivity({
      teamId,
      type: 'member_invited',
      actorId: actingUserId,
      actorName: actingMember?.name || 'Admin',
      title: `Invited ${targetName} (${role})`,
      description: message,
    });

    if (targetUserId) {
      this.createInAppNotification({
        type: 'team-event',
        userId: targetUserId,
        title: `Team Invitation: ${team.name}`,
        message: `${actingMember?.name || 'Team Admin'} invited you to join "${team.name}" as ${role}.`,
        teamId,
        metadata: { invitationId: invitation.id },
      });
    }

    return {
      invitation,
      emailDelivery: {
        sent: false,
        reason: 'External SMTP email delivery is not configured. In-app invitation delivered.',
      },
    };
  }

  getTeamInvitations(teamId: string, actingUserId?: string): TeamInvitation[] {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId) {
      const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
      if (!isMember) throw new Error('Forbidden: Only team members can view invitations');
    }

    const rows = this.db.prepare(`
      SELECT data FROM team_invitations
      WHERE team_id = ?
      ORDER BY created_at DESC
    `).all(teamId) as { data: string }[];

    return rows.map((r) => JSON.parse(r.data) as TeamInvitation);
  }

  getUserInvitations(userId: string, email?: string): TeamInvitation[] {
    let query = "SELECT data FROM team_invitations WHERE status = 'pending' AND (invitee_user_id = ?";
    const params: any[] = [userId];
    if (email) {
      query += ' OR LOWER(invitee_email) = LOWER(?)';
      params.push(email);
    }
    query += ') ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as TeamInvitation);
  }

  acceptTeamInvitation(invitationId: string, acceptingUserId: string): { team: Team; invitation: TeamInvitation } {
    const row = this.db.prepare('SELECT data FROM team_invitations WHERE id = ?').get(invitationId) as { data: string } | undefined;
    if (!row) throw new Error('Invitation not found');
    const invitation = JSON.parse(row.data) as TeamInvitation;

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is already ${invitation.status}`);
    }

    const user = this.getUserSocialProfile(acceptingUserId);
    const userName = user?.name || 'User';
    const userEmail = user?.email;
    const userAvatar = user?.avatar;
    const userSkills = user?.skills || [];
    const matchesUser =
      (invitation.inviteeUserId && invitation.inviteeUserId === acceptingUserId) ||
      (userEmail && userEmail.toLowerCase() === invitation.inviteeEmail.toLowerCase()) ||
      (user?.username && user.username.toLowerCase() === invitation.inviteeEmail.toLowerCase());

    if (!matchesUser) {
      throw new Error('Forbidden: You cannot accept an invitation intended for another user');
    }

    const team = this.getTeam(invitation.teamId);
    if (!team) throw new Error('Team no longer exists');

    if (!team.members.some((m) => m.id === acceptingUserId)) {
      team.members.push({
        id: acceptingUserId,
        name: userName,
        email: userEmail,
        avatar: userAvatar,
        role: invitation.role || 'member',
        skills: userSkills,
        availability: 'part-time',
        joinedAt: new Date().toISOString(),
      });
      this.updateTeam(team.id, { members: team.members });
    }

    invitation.status = 'accepted';
    invitation.respondedAt = new Date().toISOString();

    this.db.prepare('UPDATE team_invitations SET status = ?, data = ? WHERE id = ?')
      .run(invitation.status, JSON.stringify(invitation), invitation.id);

    this.recordTeamActivity({
      teamId: team.id,
      type: 'invitation_accepted',
      actorId: acceptingUserId,
      actorName: userName,
      title: `${userName} accepted invitation and joined as ${invitation.role}`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: team.ownerId,
      title: 'Invitation Accepted',
      message: `${userName} accepted your invitation to join "${team.name}".`,
      teamId: team.id,
    });

    return { team, invitation };
  }

  declineTeamInvitation(invitationId: string, decliningUserId: string): TeamInvitation {
    const row = this.db.prepare('SELECT data FROM team_invitations WHERE id = ?').get(invitationId) as { data: string } | undefined;
    if (!row) throw new Error('Invitation not found');
    const invitation = JSON.parse(row.data) as TeamInvitation;

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is already ${invitation.status}`);
    }

    const user = this.getUserSocialProfile(decliningUserId);
    const matchesUser =
      (invitation.inviteeUserId && invitation.inviteeUserId === decliningUserId) ||
      (user?.email && user.email.toLowerCase() === invitation.inviteeEmail.toLowerCase()) ||
      (user?.username && user.username.toLowerCase() === invitation.inviteeEmail.toLowerCase());

    if (!matchesUser) {
      throw new Error('Forbidden: You cannot decline an invitation intended for another user');
    }

    invitation.status = 'declined';
    invitation.respondedAt = new Date().toISOString();

    this.db.prepare('UPDATE team_invitations SET status = ?, data = ? WHERE id = ?')
      .run(invitation.status, JSON.stringify(invitation), invitation.id);

    this.recordTeamActivity({
      teamId: invitation.teamId,
      type: 'invitation_declined',
      actorId: decliningUserId,
      actorName: user?.name || 'User',
      title: `${user?.name || 'User'} declined the invitation`,
    });

    return invitation;
  }

  cancelTeamInvitation(invitationId: string, actingUserId: string): TeamInvitation {
    const row = this.db.prepare('SELECT data FROM team_invitations WHERE id = ?').get(invitationId) as { data: string } | undefined;
    if (!row) throw new Error('Invitation not found');
    const invitation = JSON.parse(row.data) as TeamInvitation;

    const team = this.getTeam(invitation.teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isAdmin = actingMember?.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new Error('Forbidden: Only team owners or admins can cancel invitations');
    }

    invitation.status = 'cancelled';
    this.db.prepare('UPDATE team_invitations SET status = ?, data = ? WHERE id = ?')
      .run(invitation.status, JSON.stringify(invitation), invitation.id);

    this.recordTeamActivity({
      teamId: invitation.teamId,
      type: 'invitation_cancelled',
      actorId: actingUserId,
      actorName: actingMember?.name || 'Admin',
      title: `Cancelled invitation to ${invitation.inviteeName || invitation.inviteeEmail}`,
    });

    return invitation;
  }

  createJoinRequest(
    teamId: string,
    applicant: { userId: string; userName: string; userAvatar?: string; message: string; skills: string[] }
  ): JoinRequest {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (team.visibility === 'private') {
      throw new Error('Cannot request to join a private team');
    }
    if (team.joinPolicy === 'invitation-only') {
      throw new Error('This team is invitation-only');
    }

    if (team.members.some((m) => m.id === applicant.userId)) {
      throw new Error('You are already a member of this team');
    }

    const existingPending = team.joinRequests && team.joinRequests.find(
      (r) => r.userId === applicant.userId && r.status === 'pending'
    );
    if (existingPending) {
      throw new Error('You already have a pending join request for this team');
    }

    const newReq: JoinRequest = {
      id: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      userId: applicant.userId,
      userName: applicant.userName,
      userAvatar: applicant.userAvatar,
      message: applicant.message.trim(),
      skills: applicant.skills || [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    team.joinRequests = [...(team.joinRequests || []), newReq];
    this.updateTeam(teamId, { joinRequests: team.joinRequests });

    this.recordTeamActivity({
      teamId,
      type: 'join_requested',
      actorId: applicant.userId,
      actorName: applicant.userName,
      title: `${applicant.userName} applied to join the team`,
      description: applicant.message,
    });

    this.createInAppNotification({
      type: 'join-request',
      userId: team.ownerId,
      title: 'New Team Join Request',
      message: `${applicant.userName} requested to join "${team.name}".`,
      teamId,
    });

    return newReq;
  }

  approveJoinRequest(teamId: string, requestId: string, actingUserId?: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId) {
      const actingMember = team.members.find((m) => m.id === actingUserId);
      const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
      const isAdmin = actingMember?.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new Error('Forbidden: Only team owners or admins can approve join requests');
      }
    }

    const reqItem = team.joinRequests.find((r) => r.id === requestId);
    if (!reqItem) throw new Error('Join request not found');

    reqItem.status = 'approved';

    if (!team.members.some((m) => m.id === reqItem.userId)) {
      team.members.push({
        id: reqItem.userId,
        name: reqItem.userName,
        avatar: reqItem.userAvatar,
        role: 'member',
        skills: reqItem.skills || [],
        availability: 'part-time',
        joinedAt: new Date().toISOString(),
      });
    }

    const updated = this.updateTeam(teamId, {
      members: team.members,
      joinRequests: team.joinRequests,
    });

    this.recordTeamActivity({
      teamId,
      type: 'join_approved',
      actorId: actingUserId || team.ownerId,
      actorName: actingUserId ? team.members.find((m) => m.id === actingUserId)?.name || 'Admin' : 'Admin',
      title: `Approved ${reqItem.userName}'s join request`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: reqItem.userId,
      title: 'Join Request Approved',
      message: `Your application to join "${team.name}" was approved! Welcome aboard.`,
      teamId,
    });

    return updated;
  }

  rejectJoinRequest(teamId: string, requestId: string, actingUserId?: string): Team {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId) {
      const actingMember = team.members.find((m) => m.id === actingUserId);
      const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
      const isAdmin = actingMember?.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new Error('Forbidden: Only team owners or admins can reject join requests');
      }
    }

    const reqItem = team.joinRequests.find((r) => r.id === requestId);
    if (!reqItem) throw new Error('Join request not found');

    reqItem.status = 'rejected';

    const updated = this.updateTeam(teamId, {
      joinRequests: team.joinRequests,
    });

    this.recordTeamActivity({
      teamId,
      type: 'join_rejected',
      actorId: actingUserId || team.ownerId,
      actorName: actingUserId ? team.members.find((m) => m.id === actingUserId)?.name || 'Admin' : 'Admin',
      title: `Declined ${reqItem.userName}'s join request`,
    });

    this.createInAppNotification({
      type: 'team-event',
      userId: reqItem.userId,
      title: 'Join Request Declined',
      message: `Your application to join "${team.name}" was declined.`,
      teamId,
    });

    return updated;
  }

  shareProjectWithTeam(teamId: string, projectId: string, actingUserId: string): { team: Team; project: Project } {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isProjectOwner = project.ownerId === actingUserId;
    const isTeamOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isTeamAdmin = actingMember?.role === 'admin';

    if (!isProjectOwner && !isTeamOwner && !isTeamAdmin) {
      throw new Error('Forbidden: Only the project owner or team admins can share this project');
    }

    if (!team.projectIds.includes(projectId)) {
      team.projectIds.push(projectId);
      this.updateTeam(teamId, { projectIds: team.projectIds });
    }

    const currentShared: string[] = (project as any).sharedTeamIds || [];
    if (!currentShared.includes(teamId)) {
      currentShared.push(teamId);
      this.updateProject(projectId, { sharedTeamIds: currentShared } as any);
    }

    this.recordTeamActivity({
      teamId,
      type: 'project_shared',
      actorId: actingUserId,
      actorName: actingMember?.name || project.ownerName || 'Project Owner',
      title: `Shared project "${project.title}" with the team`,
      targetId: projectId,
      targetTitle: project.title,
    });

    return { team, project };
  }

  unshareProjectFromTeam(teamId: string, projectId: string, actingUserId: string): { team: Team; project: Project } {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isProjectOwner = project.ownerId === actingUserId;
    const isTeamOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isTeamAdmin = actingMember?.role === 'admin';

    if (!isProjectOwner && !isTeamOwner && !isTeamAdmin) {
      throw new Error('Forbidden: Only the project owner or team admins can unshare this project');
    }

    team.projectIds = team.projectIds.filter((p) => p !== projectId);
    this.updateTeam(teamId, { projectIds: team.projectIds });

    const currentShared: string[] = ((project as any).sharedTeamIds || []).filter((t: string) => t !== teamId);
    this.updateProject(projectId, { sharedTeamIds: currentShared } as any);

    this.recordTeamActivity({
      teamId,
      type: 'project_unshared',
      actorId: actingUserId,
      actorName: actingMember?.name || project.ownerName || 'Project Owner',
      title: `Unshared project "${project.title}" from the team`,
      targetId: projectId,
      targetTitle: project.title,
    });

    return { team, project };
  }

  getTeamTasks(teamId: string, actingUserId?: string): TeamTask[] {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId && team.visibility === 'private') {
      const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
      if (!isMember) throw new Error('Forbidden: You are not a member of this private team');
    }

    const rows = this.db.prepare(`
      SELECT data FROM team_tasks
      WHERE team_id = ?
      ORDER BY updated_at DESC
    `).all(teamId) as { data: string }[];

    return rows.map((r) => JSON.parse(r.data) as TeamTask);
  }

  createTeamTask(taskData: Omit<TeamTask, 'id' | 'createdAt' | 'updatedAt'>, actingUserId: string): TeamTask {
    const team = this.getTeam(taskData.teamId);
    if (!team) throw new Error('Team not found');

    const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
    if (!isMember) throw new Error('Forbidden: Only team members can create tasks');

    if (!taskData.title || !taskData.title.trim()) {
      throw new Error('Task title is required');
    }

    const now = new Date().toISOString();
    const task: TeamTask = {
      ...taskData,
      id: `ttask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      creatorId: actingUserId,
      creatorName: team.members.find((m) => m.id === actingUserId)?.name || 'Team Member',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'todo',
      subtasks: taskData.subtasks || [],
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO team_tasks (id, team_id, project_id, assignee_id, status, priority, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(task.id, task.teamId, task.projectId || null, task.assigneeId || null, task.status, task.priority, JSON.stringify(task), task.createdAt, task.updatedAt);

    this.recordTeamActivity({
      teamId: task.teamId,
      type: 'task_created',
      actorId: actingUserId,
      actorName: task.creatorName,
      title: `Created task "${task.title}"`,
      targetId: task.id,
      targetTitle: task.title,
    });

    if (task.assigneeId && task.assigneeId !== actingUserId) {
      this.createInAppNotification({
        type: 'team-event',
        userId: task.assigneeId,
        title: 'Task Assigned',
        message: `${task.creatorName} assigned task "${task.title}" to you.`,
        teamId: task.teamId,
      });
    }

    return task;
  }

  updateTeamTask(taskId: string, updates: Partial<TeamTask>, actingUserId: string): TeamTask {
    const row = this.db.prepare('SELECT data FROM team_tasks WHERE id = ?').get(taskId) as { data: string } | undefined;
    if (!row) throw new Error('Task not found');
    const existing = JSON.parse(row.data) as TeamTask;

    const team = this.getTeam(existing.teamId);
    if (!team) throw new Error('Team not found');

    const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
    if (!isMember) throw new Error('Forbidden: Only team members can update tasks');

    const oldStatus = existing.status;
    const oldAssignee = existing.assigneeId;

    const now = new Date().toISOString();
    const updated: TeamTask = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      UPDATE team_tasks
      SET project_id = ?, assignee_id = ?, status = ?, priority = ?, data = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(updated.projectId || null, updated.assigneeId || null, updated.status, updated.priority, JSON.stringify(updated), updated.updatedAt, taskId);

    const actor = team.members.find((m) => m.id === actingUserId);

    if (updates.status && updates.status !== oldStatus) {
      this.recordTeamActivity({
        teamId: updated.teamId,
        type: 'task_status_changed',
        actorId: actingUserId,
        actorName: actor?.name || 'Member',
        title: `Task "${updated.title}" marked as ${updated.status}`,
        targetId: taskId,
        targetTitle: updated.title,
      });
    }

    if (updates.assigneeId && updates.assigneeId !== oldAssignee && updates.assigneeId !== actingUserId) {
      this.recordTeamActivity({
        teamId: updated.teamId,
        type: 'task_assigned',
        actorId: actingUserId,
        actorName: actor?.name || 'Member',
        title: `Assigned task "${updated.title}" to ${updated.assigneeName || 'contributor'}`,
        targetId: taskId,
        targetTitle: updated.title,
      });
      this.createInAppNotification({
        type: 'team-event',
        userId: updates.assigneeId,
        title: 'Task Assigned',
        message: `Task "${updated.title}" was assigned to you.`,
        teamId: updated.teamId,
      });
    }

    return updated;
  }

  deleteTeamTask(taskId: string, actingUserId: string): void {
    const row = this.db.prepare('SELECT data FROM team_tasks WHERE id = ?').get(taskId) as { data: string } | undefined;
    if (!row) return;
    const task = JSON.parse(row.data) as TeamTask;

    const team = this.getTeam(task.teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isCreator = task.creatorId === actingUserId;
    const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isAdmin = actingMember?.role === 'admin';

    if (!isCreator && !isOwner && !isAdmin) {
      throw new Error('Forbidden: Only the task creator or team admins can delete this task');
    }

    this.db.prepare('DELETE FROM team_tasks WHERE id = ?').run(taskId);
  }

  recordTeamActivity(event: Omit<TeamActivityEvent, 'id' | 'createdAt'>): TeamActivityEvent {
    const now = new Date().toISOString();
    const activity: TeamActivityEvent = {
      ...event,
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
    };
    try {
      const stmt = this.db.prepare(`
        INSERT INTO team_activities (id, team_id, type, actor_id, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(activity.id, activity.teamId, activity.type, activity.actorId, JSON.stringify(activity), activity.createdAt);
    } catch {
      // ignore
    }
    return activity;
  }

  getTeamActivities(teamId: string, actingUserId?: string, limit: number = 50): TeamActivityEvent[] {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId && team.visibility === 'private') {
      const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
      if (!isMember) throw new Error('Forbidden: Private team activity is restricted to members');
    }

    const rows = this.db.prepare(`
      SELECT data FROM team_activities
      WHERE team_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(teamId, limit) as { data: string }[];

    return rows.map((r) => JSON.parse(r.data) as TeamActivityEvent);
  }

  getTeamComments(teamId: string, options?: { projectId?: string; taskId?: string }, actingUserId?: string): TeamComment[] {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId && team.visibility === 'private') {
      const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
      if (!isMember) throw new Error('Forbidden: You are not a member of this private team');
    }

    let query = 'SELECT data FROM team_comments WHERE team_id = ?';
    const params: any[] = [teamId];
    if (options?.projectId) {
      query += ' AND project_id = ?';
      params.push(options.projectId);
    }
    if (options?.taskId) {
      query += ' AND task_id = ?';
      params.push(options.taskId);
    }
    query += ' ORDER BY created_at ASC';

    const rows = this.db.prepare(query).all(...params) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as TeamComment);
  }

  createTeamComment(commentData: Omit<TeamComment, 'id' | 'createdAt' | 'updatedAt'>, actingUserId: string): TeamComment {
    const team = this.getTeam(commentData.teamId);
    if (!team) throw new Error('Team not found');

    const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
    if (!isMember) throw new Error('Forbidden: Only team members can post comments');

    if (!commentData.content || !commentData.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }
    if (commentData.content.length > 2000) {
      throw new Error('Comment content must not exceed 2000 characters');
    }

    const mentions = Array.from(commentData.content.matchAll(/@([a-zA-Z0-9_ -]+)/g)).map((m) => m[1].trim());

    const now = new Date().toISOString();
    const comment: TeamComment = {
      ...commentData,
      id: `comm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      content: commentData.content.trim(),
      authorId: actingUserId,
      authorName: team.members.find((m) => m.id === actingUserId)?.name || 'Member',
      authorAvatar: team.members.find((m) => m.id === actingUserId)?.avatar,
      mentions,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO team_comments (id, team_id, project_id, task_id, author_id, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(comment.id, comment.teamId, comment.projectId || null, comment.taskId || null, comment.authorId, JSON.stringify(comment), comment.createdAt);

    this.recordTeamActivity({
      teamId: comment.teamId,
      type: 'comment_posted',
      actorId: actingUserId,
      actorName: comment.authorName,
      title: `${comment.authorName} posted a comment`,
      description: comment.content.slice(0, 100),
      targetId: comment.projectId || comment.taskId,
    });

    for (const mention of mentions) {
      const mentionedMember = team.members.find(
        (m) =>
          m.id.toLowerCase() === mention.toLowerCase() ||
          m.name.toLowerCase().includes(mention.toLowerCase())
      );
      if (mentionedMember && mentionedMember.id !== actingUserId) {
        this.createInAppNotification({
          type: 'team-event',
          userId: mentionedMember.id,
          title: 'Mentioned in Discussion',
          message: `${comment.authorName} mentioned you in "${team.name}": "${comment.content.slice(0, 80)}"`,
          teamId: team.id,
        });
      }
    }

    return comment;
  }

  deleteTeamComment(commentId: string, actingUserId: string): void {
    const row = this.db.prepare('SELECT data FROM team_comments WHERE id = ?').get(commentId) as { data: string } | undefined;
    if (!row) return;
    const comment = JSON.parse(row.data) as TeamComment;

    const team = this.getTeam(comment.teamId);
    if (!team) throw new Error('Team not found');

    const actingMember = team.members.find((m) => m.id === actingUserId);
    const isAuthor = comment.authorId === actingUserId;
    const isOwner = team.ownerId === actingUserId || actingMember?.role === 'owner';
    const isAdmin = actingMember?.role === 'admin';

    if (!isAuthor && !isOwner && !isAdmin) {
      throw new Error('Forbidden: Only the comment author or team admins can delete this comment');
    }

    this.db.prepare('DELETE FROM team_comments WHERE id = ?').run(commentId);
  }

  getTeamAnalytics(teamId: string, actingUserId?: string): TeamAnalytics {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (actingUserId && team.visibility === 'private') {
      const isMember = team.ownerId === actingUserId || team.members.some((m) => m.id === actingUserId);
      if (!isMember) throw new Error('Forbidden: Access to private team analytics is restricted to members');
    }

    const projects = team.projectIds.map((pid) => this.getProject(pid)).filter(Boolean) as Project[];
    const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'revived');

    const tasks = this.getTeamTasks(teamId);
    const now = Date.now();
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate).getTime() < now);

    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    const totalProjectProgress = projects.reduce((acc, p) => acc + (p.progress || 0), 0);
    const averageProjectProgress = projects.length > 0 ? Math.round(totalProjectProgress / projects.length) : 0;

    const activities = this.getTeamActivities(teamId, undefined, 200);
    const comments = this.getTeamComments(teamId);

    const memberContributions = team.members.map((member) => {
      const memberCompleted = completedTasks.filter((t) => t.assigneeId === member.id).length;
      const memberAssigned = tasks.filter((t) => t.assigneeId === member.id).length;
      const memberProjects = projects.filter((p) => p.ownerId === member.id).length;
      const memberComments = comments.filter((c) => c.authorId === member.id).length;

      return {
        memberId: member.id,
        memberName: member.name,
        memberAvatar: member.avatar,
        role: member.role,
        completedTasksCount: memberCompleted,
        assignedTasksCount: memberAssigned,
        sharedProjectsCount: memberProjects,
        commentsCount: memberComments,
      };
    });

    return {
      teamId,
      activeSharedProjects: activeProjects.length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      taskCompletionRate,
      averageProjectProgress,
      recentActivitiesCount: activities.length,
      memberContributions,
    };
  }

  createInAppNotification(data: {
    type: string;
    userId: string;
    title: string;
    message: string;
    teamId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    try {
      const notif = {
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: data.type,
        userId: data.userId,
        title: data.title,
        message: data.message,
        teamId: data.teamId,
        metadata: data.metadata,
        read: 0,
        createdAt: new Date().toISOString(),
      };
      this.db.prepare(`
        INSERT INTO notifications (id, type, read, data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(notif.id, notif.type, 0, JSON.stringify(notif), notif.createdAt);
    } catch {
      // ignore
    }
  }

  // ---------------- REMINDERS ----------------
  getReminders(userId?: string): Reminder[] {
    const rows = this.db.prepare('SELECT data FROM reminders ORDER BY created_at DESC').all() as { data: string }[];
    const all = rows.map((r) => JSON.parse(r.data) as Reminder);
    if (!userId) return all;
    return all.filter((r) => !r.userId || r.userId === userId);
  }

  getReminder(id: string, userId?: string): Reminder | null {
    const row = this.db.prepare('SELECT data FROM reminders WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    const rem = JSON.parse(row.data) as Reminder;
    if (userId && rem.userId && rem.userId !== userId) {
      return null;
    }
    return rem;
  }

  createReminder(reminder: Reminder): Reminder {
    const userId = reminder.userId || 'user-1';
    const dueDate = reminder.dateTime || null;
    const stmt = this.db.prepare(`
      INSERT INTO reminders (id, project_id, title, status, data, created_at, user_id, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      reminder.id,
      reminder.projectId || null,
      reminder.title,
      reminder.status,
      JSON.stringify(reminder),
      reminder.createdAt,
      userId,
      dueDate
    );
    return reminder;
  }

  updateReminder(id: string, updates: Partial<Reminder>, userId?: string): Reminder {
    const row = this.db.prepare('SELECT data FROM reminders WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) throw new Error('Reminder not found');
    const existing = JSON.parse(row.data) as Reminder;
    if (userId && existing.userId && existing.userId !== userId) {
      const err = new Error('Unauthorized to modify this reminder');
      (err as any).statusCode = 403;
      throw err;
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const dueDate = updated.dateTime || null;
    const stmt = this.db.prepare('UPDATE reminders SET status = ?, data = ?, due_date = ? WHERE id = ?');
    stmt.run(updated.status, JSON.stringify(updated), dueDate, id);
    return updated;
  }

  deleteReminder(id: string, userId?: string): void {
    if (userId) {
      const existing = this.getReminder(id, userId);
      if (!existing) return;
    }
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
    stmt.run(id);
    this.cancelPendingJobsForReminder(id);
  }

  getReminderMetrics(userId: string = 'user-1'): ReminderMetrics {
    const reminders = this.getReminders(userId);
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);
    const weekEnd = new Date(todayEnd.getTime() + 7 * 86400000);

    let upcoming = 0;
    let overdue = 0;
    let dueToday = 0;
    let dueTomorrow = 0;
    let thisWeek = 0;
    let later = 0;
    let completed = 0;
    let dismissed = 0;

    for (const r of reminders) {
      if (r.status === 'completed') {
        completed++;
        continue;
      }
      if (r.status === 'cancelled' || r.status === 'dismissed') {
        dismissed++;
        continue;
      }

      upcoming++;
      const dueTime = new Date(r.dateTime).getTime();
      if (!isNaN(dueTime)) {
        if (dueTime < now) {
          overdue++;
        } else if (dueTime <= todayEnd.getTime()) {
          dueToday++;
        } else if (dueTime <= tomorrowEnd.getTime()) {
          dueTomorrow++;
        } else if (dueTime <= weekEnd.getTime()) {
          thisWeek++;
        } else {
          later++;
        }
      }
    }

    const total = reminders.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      upcoming,
      overdue,
      dueToday,
      dueTomorrow,
      thisWeek,
      later,
      completed,
      dismissed,
      completionRate,
    };
  }

  // ---------------- SCHEDULED NOTIFICATION JOBS ----------------
  createScheduledJob(job: ScheduledNotificationJob): ScheduledNotificationJob {
    const existing = this.db.prepare('SELECT * FROM scheduled_notification_jobs WHERE idempotency_key = ?').get(job.idempotencyKey) as any;
    if (existing) {
      return {
        id: existing.id,
        reminderId: existing.reminder_id,
        userId: existing.user_id,
        channel: existing.channel,
        scheduledFor: existing.scheduled_for,
        status: existing.status,
        idempotencyKey: existing.idempotency_key,
        attemptCount: existing.attempt_count,
        maxRetries: existing.max_retries,
        lastAttemptAt: existing.last_attempt_at,
        errorMessage: existing.error_message,
        providerResponse: existing.provider_response,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const stmt = this.db.prepare(`
      INSERT INTO scheduled_notification_jobs
      (id, reminder_id, user_id, channel, scheduled_for, status, idempotency_key, attempt_count, max_retries, last_attempt_at, error_message, provider_response, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.id,
      job.reminderId,
      job.userId,
      job.channel,
      job.scheduledFor,
      job.status,
      job.idempotencyKey,
      job.attemptCount,
      job.maxRetries,
      job.lastAttemptAt || null,
      job.errorMessage || null,
      job.providerResponse || null,
      job.createdAt,
      job.updatedAt
    );
    return job;
  }

  getPendingJobs(nowIso: string): ScheduledNotificationJob[] {
    const rows = this.db.prepare(`
      SELECT * FROM scheduled_notification_jobs
      WHERE status = 'scheduled' AND scheduled_for <= ?
      ORDER BY scheduled_for ASC
    `).all(nowIso) as any[];

    return rows.map((r) => ({
      id: r.id,
      reminderId: r.reminder_id,
      userId: r.user_id,
      channel: r.channel,
      scheduledFor: r.scheduled_for,
      status: r.status,
      idempotencyKey: r.idempotency_key,
      attemptCount: r.attempt_count,
      maxRetries: r.max_retries,
      lastAttemptAt: r.last_attempt_at || undefined,
      errorMessage: r.error_message || undefined,
      providerResponse: r.provider_response || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  updateScheduledJob(id: string, updates: Partial<ScheduledNotificationJob>): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.attemptCount !== undefined) {
      fields.push('attempt_count = ?');
      values.push(updates.attemptCount);
    }
    if (updates.lastAttemptAt !== undefined) {
      fields.push('last_attempt_at = ?');
      values.push(updates.lastAttemptAt);
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.providerResponse !== undefined) {
      fields.push('provider_response = ?');
      values.push(updates.providerResponse);
    }
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `UPDATE scheduled_notification_jobs SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  cancelPendingJobsForReminder(reminderId: string): void {
    this.db.prepare(`
      UPDATE scheduled_notification_jobs
      SET status = 'cancelled', updated_at = ?
      WHERE reminder_id = ? AND status = 'scheduled'
    `).run(new Date().toISOString(), reminderId);
  }

  getScheduledJobsForReminder(reminderId: string): ScheduledNotificationJob[] {
    const rows = this.db.prepare(`
      SELECT * FROM scheduled_notification_jobs
      WHERE reminder_id = ?
      ORDER BY scheduled_for ASC
    `).all(reminderId) as any[];

    return rows.map((r) => ({
      id: r.id,
      reminderId: r.reminder_id,
      userId: r.user_id,
      channel: r.channel,
      scheduledFor: r.scheduled_for,
      status: r.status,
      idempotencyKey: r.idempotency_key,
      attemptCount: r.attempt_count,
      maxRetries: r.max_retries,
      lastAttemptAt: r.last_attempt_at || undefined,
      errorMessage: r.error_message || undefined,
      providerResponse: r.provider_response || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // ---------------- REMINDER EVENTS (AUDIT & HISTORY) ----------------
  createReminderEvent(event: ReminderEvent): ReminderEvent {
    const stmt = this.db.prepare(`
      INSERT INTO reminder_events (id, reminder_id, user_id, event_type, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(event.id, event.reminderId, event.userId, event.eventType, event.details, event.timestamp);
    return event;
  }

  getReminderEvents(userId: string = 'user-1', limit: number = 50): ReminderEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM reminder_events
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      reminderId: r.reminder_id,
      userId: r.user_id,
      eventType: r.event_type as any,
      details: r.details,
      timestamp: r.timestamp,
    }));
  }

  // ---------------- FUSIONS ----------------
  getFusions(): FusionProposal[] {
    const rows = this.db.prepare('SELECT data FROM fusions ORDER BY created_at DESC').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as FusionProposal);
  }

  getFusion(id: string): FusionProposal | null {
    const row = this.db.prepare('SELECT data FROM fusions WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data) as FusionProposal;
  }

  createFusion(fusion: FusionProposal): FusionProposal {
    const stmt = this.db.prepare(`
      INSERT INTO fusions (id, status, data, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(fusion.id, fusion.status, JSON.stringify(fusion), fusion.createdAt);
    return fusion;
  }

  updateFusion(id: string, updates: Partial<FusionProposal>): FusionProposal {
    const row = this.db.prepare('SELECT data FROM fusions WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) throw new Error('Fusion not found');
    const existing = JSON.parse(row.data) as FusionProposal;
    const updated = { ...existing, ...updates };
    const stmt = this.db.prepare('UPDATE fusions SET status = ?, data = ? WHERE id = ?');
    stmt.run(updated.status, JSON.stringify(updated), id);
    return updated;
  }

  deleteFusion(id: string): void {
    const stmt = this.db.prepare('DELETE FROM fusions WHERE id = ?');
    stmt.run(id);
  }

  // ---------------- USER PROFILES & SOCIAL RELATIONSHIPS ----------------
  getUserProfiles(): UserProfile[] {
    const rows = this.db.prepare('SELECT data FROM user_profiles ORDER BY id ASC').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as UserProfile);
  }

  getUserProfile(id: string): UserProfile | null {
    const row = this.db.prepare('SELECT data FROM user_profiles WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data) as UserProfile;
  }

  updateUserProfile(id: string, updates: Partial<UserProfile>): UserProfile {
    const existing = this.getUserProfile(id);
    if (!existing) throw new Error(`User profile ${id} not found`);
    const updated: UserProfile = {
      ...existing,
      ...updates,
    };
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE user_profiles SET data = ?, updated_at = ? WHERE id = ?');
    stmt.run(JSON.stringify(updated), now, id);
    return updated;
  }

  getUserSocialProfile(id: string, currentUserId: string = 'user-1'): UserSocialProfile | null {
    const profile = this.getUserProfile(id);
    if (!profile) return null;

    // Get all user projects (either owner or member)
    const allProjectsRows = this.db.prepare('SELECT data FROM projects').all() as { data: string }[];
    const allProjects = allProjectsRows.map((r) => JSON.parse(r.data) as Project);
    const userProjects = allProjects.filter(
      (p) => p.ownerId === id || (p.teamMembers && p.teamMembers.some((m) => m.id === id))
    );

    const projectsCount = userProjects.length;
    const completedCount = userProjects.filter((p) => p.status === 'completed').length;
    const revivedCount = userProjects.filter((p) => p.status === 'revived').length;
    const successRate =
      projectsCount > 0 ? Math.round(((completedCount + revivedCount) / projectsCount) * 100) : 0;

    // Followers & Following counts
    const followersCountRow = this.db.prepare(
      "SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND status = 'following'"
    ).get(id) as { count: number };
    const followingCountRow = this.db.prepare(
      "SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND status = 'following'"
    ).get(id) as { count: number };

    // Follow status relative to currentUserId
    let followStatus: FollowStatus = 'none';
    if (currentUserId !== id) {
      const followRow = this.db.prepare(
        'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?'
      ).get(currentUserId, id) as { status: string } | undefined;

      if (followRow) {
        followStatus = followRow.status === 'following' ? 'following' : 'requested';
      } else {
        // Check if there is an incoming request from target to current user
        const incomingRow = this.db.prepare(
          "SELECT status FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'requested'"
        ).get(id, currentUserId) as { status: string } | undefined;
        if (incomingRow) {
          followStatus = 'incoming_request';
        }
      }
    }

    return {
      ...profile,
      username: profile.username || profile.name.toLowerCase().replace(/\s+/g, ''),
      projectsCount,
      completedCount,
      revivedCount,
      successRate,
      followersCount: followersCountRow ? followersCountRow.count : 0,
      followingCount: followingCountRow ? followingCountRow.count : 0,
      followStatus,
    };
  }

  getFollowers(userId: string): { user: UserProfile; status: 'following' | 'requested' }[] {
    const rows = this.db.prepare(
      'SELECT follower_id, status FROM follows WHERE following_id = ?'
    ).all(userId) as { follower_id: string; status: 'following' | 'requested' }[];

    const result: { user: UserProfile; status: 'following' | 'requested' }[] = [];
    for (const row of rows) {
      const u = this.getUserProfile(row.follower_id);
      if (u) {
        result.push({ user: u, status: row.status });
      }
    }
    return result;
  }

  getFollowing(userId: string): { user: UserProfile; status: 'following' | 'requested' }[] {
    const rows = this.db.prepare(
      'SELECT following_id, status FROM follows WHERE follower_id = ?'
    ).all(userId) as { following_id: string; status: 'following' | 'requested' }[];

    const result: { user: UserProfile; status: 'following' | 'requested' }[] = [];
    for (const row of rows) {
      const u = this.getUserProfile(row.following_id);
      if (u) {
        result.push({ user: u, status: row.status });
      }
    }
    return result;
  }

  followUser(
    followerId: string,
    followingId: string,
    requiresRequest: boolean = false
  ): { success: boolean; status: 'following' | 'requested' } {
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself');
    }
    const target = this.getUserProfile(followingId);
    if (!target) {
      throw new Error('User to follow not found');
    }

    const existing = this.db.prepare(
      'SELECT id, status FROM follows WHERE follower_id = ? AND following_id = ?'
    ).get(followerId, followingId) as { id: string; status: 'following' | 'requested' } | undefined;

    if (existing) {
      return { success: true, status: existing.status };
    }

    const now = new Date().toISOString();
    const status: 'following' | 'requested' = requiresRequest ? 'requested' : 'following';
    const id = `fol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const stmt = this.db.prepare(`
      INSERT INTO follows (id, follower_id, following_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, followerId, followingId, status, now, now);

    // Notify the target user
    const follower = this.getUserProfile(followerId);
    const followerName = follower?.name || 'A community member';
    const notifStmt = this.db.prepare(`
      INSERT INTO notifications (id, type, read, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    notifStmt.run(
      `notif-${Date.now().toString(36)}`,
      status === 'requested' ? 'join-request' : 'team-event',
      0,
      JSON.stringify({
        id: `notif-${Date.now().toString(36)}`,
        type: status === 'requested' ? 'join-request' : 'team-event',
        title: status === 'requested' ? 'New Follow Request' : 'New Follower',
        message: `${followerName} ${status === 'requested' ? 'requested to follow you.' : 'started following you.'}`,
        actionUrl: `/profile/${followerId}`,
        createdAt: now,
      }),
      now
    );

    return { success: true, status };
  }

  unfollowUser(followerId: string, followingId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
    stmt.run(followerId, followingId);
    return true;
  }

  respondFollowRequest(followerId: string, followingId: string, action: 'accept' | 'decline'): boolean {
    if (action === 'accept') {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(
        "UPDATE follows SET status = 'following', updated_at = ? WHERE follower_id = ? AND following_id = ?"
      );
      stmt.run(now, followerId, followingId);
      return true;
    } else {
      const stmt = this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
      stmt.run(followerId, followingId);
      return true;
    }
  }

  // ---------------- COLLABORATIONS ----------------
  createCollaborationRequest(
    projectId: string,
    requesterId: string,
    skills: string,
    message: string
  ): CollaborationRequest {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');
    if (project.ownerId === requesterId) {
      throw new Error('You cannot request collaboration on your own project');
    }

    const existing = this.db.prepare(
      "SELECT id, project_id, requester_id, owner_id, skills, message, status, created_at, updated_at FROM collaborations WHERE project_id = ? AND requester_id = ? AND status = 'pending'"
    ).get(projectId, requesterId) as any;

    if (existing) {
      const requester = this.getUserProfile(requesterId);
      return {
        id: existing.id,
        projectId: existing.project_id,
        projectTitle: project.title,
        requesterId: existing.requester_id,
        requesterName: requester?.name || 'Community Member',
        requesterAvatar: requester?.avatar,
        requesterUsername: requester?.username || requesterId,
        ownerId: existing.owner_id,
        skills: existing.skills || '',
        message: existing.message,
        status: existing.status,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const requester = this.getUserProfile(requesterId);
    const now = new Date().toISOString();
    const id = `collab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const reqData: CollaborationRequest = {
      id,
      projectId,
      projectTitle: project.title,
      requesterId,
      requesterName: requester?.name || 'Community Member',
      requesterAvatar: requester?.avatar,
      requesterUsername: requester?.username || requesterId,
      ownerId: project.ownerId,
      skills,
      message,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO collaborations (id, project_id, requester_id, owner_id, skills, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, requesterId, project.ownerId, skills, message, 'pending', now, now);

    // Create notification for project owner
    const notifStmt = this.db.prepare(`
      INSERT INTO notifications (id, type, read, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    notifStmt.run(
      `notif-${Date.now().toString(36)}`,
      'join-request',
      0,
      JSON.stringify({
        id: `notif-${Date.now().toString(36)}`,
        type: 'join-request',
        title: `Collaboration Proposal: ${project.title}`,
        message: `${reqData.requesterName} proposed to collaborate with skills: ${skills}`,
        actionUrl: `/projects/${projectId}`,
        createdAt: now,
      }),
      now
    );

    return reqData;
  }

  getCollaborationRequests(projectId?: string, userId?: string): CollaborationRequest[] {
    let rows: any[];
    if (projectId) {
      rows = this.db.prepare('SELECT * FROM collaborations WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
    } else if (userId) {
      rows = this.db.prepare('SELECT * FROM collaborations WHERE owner_id = ? OR requester_id = ? ORDER BY created_at DESC').all(userId, userId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM collaborations ORDER BY created_at DESC').all() as any[];
    }

    return rows.map((r) => {
      const requester = this.getUserProfile(r.requester_id);
      const project = this.getProject(r.project_id);
      return {
        id: r.id,
        projectId: r.project_id,
        projectTitle: project?.title || 'Project Archive',
        requesterId: r.requester_id,
        requesterName: requester?.name || 'Community Member',
        requesterAvatar: requester?.avatar,
        requesterUsername: requester?.username || r.requester_id,
        ownerId: r.owner_id,
        skills: r.skills || '',
        message: r.message,
        status: r.status as 'pending' | 'accepted' | 'declined',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  respondCollaborationRequest(requestId: string, action: 'accept' | 'decline', currentUserId: string): CollaborationRequest {
    const row = this.db.prepare('SELECT * FROM collaborations WHERE id = ?').get(requestId) as any;
    if (!row) throw new Error('Collaboration request not found');

    const project = this.getProject(row.project_id);
    if (!project) throw new Error('Project not found');
    if (project.ownerId !== currentUserId && currentUserId !== 'user-1') {
      throw new Error('Unauthorized to respond to this request');
    }

    const now = new Date().toISOString();
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const stmt = this.db.prepare('UPDATE collaborations SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(newStatus, now, requestId);

    if (action === 'accept') {
      const requester = this.getUserProfile(row.requester_id);
      const alreadyMember = project.teamMembers && project.teamMembers.some((m) => m.id === row.requester_id);
      if (!alreadyMember && requester) {
        const updatedMembers = [
          ...(project.teamMembers || []),
          {
            id: requester.id,
            name: requester.name,
            avatar: requester.avatar,
            role: 'member' as const,
            skills: requester.skills || [],
            availability: requester.availability || 'part-time',
            joinedAt: now,
          },
        ];
        this.updateProject(project.id, { teamMembers: updatedMembers }, `${requester.name} joined as collaborator`);
      }
    }

    const requester = this.getUserProfile(row.requester_id);
    return {
      id: row.id,
      projectId: row.project_id,
      projectTitle: project.title,
      requesterId: row.requester_id,
      requesterName: requester?.name || 'Community Member',
      requesterAvatar: requester?.avatar,
      requesterUsername: requester?.username || row.requester_id,
      ownerId: row.owner_id,
      skills: row.skills,
      message: row.message,
      status: newStatus,
      createdAt: row.created_at,
      updatedAt: now,
    };
  }
}

export function calculateProjectProgress(project: Project): number {
  const allTasks: Task[] = [];
  if (project.milestones && Array.isArray(project.milestones)) {
    project.milestones.forEach((m) => {
      if (m.tasks && m.tasks.length > 0) {
        allTasks.push(...m.tasks);
      }
    });
  }

  if (allTasks.length === 0) {
    return project.progress || 0;
  }

  const totalWeight = allTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
  const completedWeight = allTasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (Number(t.weight) || 1), 0);

  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
}

export const dbManager = new DatabaseManager();
