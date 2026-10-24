import type { Project, ProjectStatus } from '../types/index.ts';

export interface ProjectDragPayload {
  type: 'project';
  id: string;
  title: string;
  status: ProjectStatus;
  category: string;
  summary?: string;
  progress?: number;
}

export interface DraftDragPayload {
  type: 'draft';
  formData: {
    title?: string;
    summary?: string;
    category?: string;
    repoUrl?: string;
    [key: string]: any;
  };
}

export interface StatusDragPayload {
  type: 'status';
  projectId: string;
  currentStatus: ProjectStatus;
}

export interface ReminderDragPayload {
  type: 'reminder';
  id: string;
  title: string;
  recurring?: boolean;
}

export type CanvasDragPayload =
  | ProjectDragPayload
  | DraftDragPayload
  | StatusDragPayload
  | ReminderDragPayload;

export const CANVAS_DND_MIME = 'application/x-project-graveyard-dnd';

export function serializeDragPayload(payload: CanvasDragPayload): string {
  return JSON.stringify(payload);
}

export function deserializeDragPayload(raw: string): CanvasDragPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as CanvasDragPayload;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

// Validation rules
export function validateReviveDrop(project: { status: ProjectStatus; title: string }): {
  valid: boolean;
  reason?: string;
} {
  if (project.status === 'paused' || project.status === 'abandoned') {
    return { valid: true };
  }
  if (project.status === 'active') {
    return {
      valid: false,
      reason: `"${project.title}" is already actively in development and does not need revival.`,
    };
  }
  if (project.status === 'completed') {
    return {
      valid: false,
      reason: `"${project.title}" is marked as completed/shipped. It cannot be revived without restarting.`,
    };
  }
  if (project.status === 'archived') {
    return {
      valid: false,
      reason: `"${project.title}" is in cold storage archive. Move to paused before revival.`,
    };
  }
  return {
    valid: false,
    reason: `Only paused or abandoned projects are eligible for Revival Studio.`,
  };
}

export function validateFuseDrop(
  slot1: Project | null,
  dropping: Project
): { valid: boolean; reason?: string } {
  if (!slot1) {
    return { valid: true };
  }
  if (slot1.id === dropping.id) {
    return {
      valid: false,
      reason: `Cannot fuse "${dropping.title}" with itself. Please drop a different project.`,
    };
  }
  return { valid: true };
}

export function validateDraftSave(formData: { title?: string; summary?: string; category?: string }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!formData.title || !formData.title.trim()) {
    errors.push('Project Title is required.');
  }
  if (!formData.summary || !formData.summary.trim()) {
    errors.push('Short Summary is required.');
  }
  if (!formData.category || !formData.category.trim()) {
    errors.push('Category selection is required.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
