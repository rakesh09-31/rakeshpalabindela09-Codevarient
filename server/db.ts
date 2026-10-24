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
} from '../src/types/index.ts';
import {
  INITIAL_PROJECTS,
  INITIAL_TEAMS,
  INITIAL_REMINDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
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
    `);
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
  getReminders(): Reminder[] {
    const rows = this.db.prepare('SELECT data FROM reminders ORDER BY created_at DESC').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as Reminder);
  }

  createReminder(reminder: Reminder): Reminder {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (id, project_id, title, status, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(reminder.id, reminder.projectId || null, reminder.title, reminder.status, JSON.stringify(reminder), reminder.createdAt);
    return reminder;
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder {
    const row = this.db.prepare('SELECT data FROM reminders WHERE id = ?').get(id) as { data: string } | undefined;
    if (!row) throw new Error('Reminder not found');
    const existing = JSON.parse(row.data) as Reminder;
    const updated = { ...existing, ...updates };
    const stmt = this.db.prepare('UPDATE reminders SET status = ?, data = ? WHERE id = ?');
    stmt.run(updated.status, JSON.stringify(updated), id);
    return updated;
  }

  deleteReminder(id: string): void {
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
    stmt.run(id);
  }

  // ---------------- FUSIONS ----------------
  getFusions(): FusionProposal[] {
    const rows = this.db.prepare('SELECT data FROM fusions ORDER BY created_at DESC').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as FusionProposal);
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
