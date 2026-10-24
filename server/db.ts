import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type {
  Project,
  Team,
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

  // ---------------- PROJECT CRUD ----------------
  getProjects(userId: string = 'user-1'): Project[] {
    const rows = this.db.prepare('SELECT data FROM projects ORDER BY updated_at DESC').all() as { data: string }[];
    const all = rows.map((r) => JSON.parse(r.data) as Project);
    // Filter visible to requesting user: user is owner OR member OR visibility is public or team
    return all.filter((p) => {
      if (p.visibility === 'public') return true;
      if (p.ownerId === userId) return true;
      if (p.teamMembers && p.teamMembers.some((m) => m.id === userId)) return true;
      if (p.visibility === 'team') return true;
      return false;
    });
  }

  getProject(id: string, userId: string = 'user-1'): Project | null {
    const row = this.db.prepare('SELECT data FROM projects WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) return null;
    const project = JSON.parse(row.data) as Project;
    // Authorization check: if private and not owned or member -> deny
    if (project.visibility === 'private' && project.ownerId !== userId && !project.teamMembers.some((m) => m.id === userId)) {
      return null;
    }
    return project;
  }

  createProject(project: Project): Project {
    const now = new Date().toISOString();
    project.id = project.id || `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    project.ownerId = project.ownerId || 'user-1';
    project.category = project.category || 'General';
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

  // ---------------- TEAMS CRUD ----------------
  getTeams(): Team[] {
    const rows = this.db.prepare('SELECT data FROM teams ORDER BY updated_at DESC').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as Team);
  }

  createTeam(team: Team): Team {
    const stmt = this.db.prepare(`
      INSERT INTO teams (id, name, owner_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(team.id, team.name, team.ownerId, JSON.stringify(team), team.createdAt, team.updatedAt);
    return team;
  }

  updateTeam(id: string, updates: Partial<Team>): Team {
    const rows = this.db.prepare('SELECT data FROM teams WHERE id = ?').get(id) as { data: string } | undefined;
    if (!rows) throw new Error('Team not found');
    const existing = JSON.parse(rows.data) as Team;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const stmt = this.db.prepare('UPDATE teams SET name = ?, data = ?, updated_at = ? WHERE id = ?');
    stmt.run(updated.name, JSON.stringify(updated), updated.updatedAt, id);
    return updated;
  }

  deleteTeam(id: string): void {
    const stmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
    stmt.run(id);
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
