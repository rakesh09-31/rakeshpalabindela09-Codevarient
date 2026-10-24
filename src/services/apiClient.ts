import {
  Project,
  Team,
  Reminder,
  AIChatMessage,
  FusionProposal,
} from '../types/index.ts';

const BASE_URL = '/api';

export class ApiClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-id': 'user-1',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        let errorMessage = `API Error ${res.status}: ${res.statusText}`;
        try {
          const body = await res.json();
          if (body.error) errorMessage = body.error;
        } catch {
          // fallback
        }
        throw new Error(errorMessage);
      }

      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------------- PROJECTS ----------------
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>
  ): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, updates: Partial<Project>, timelineNote?: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, timelineNote }),
    });
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async reviveProject(
    id: string,
    path: 'restart' | 'continue' | 'change-idea' | 'repurpose' | 'archive',
    note?: string,
    newGoal?: string
  ): Promise<Project> {
    return this.request<Project>(`/projects/${id}/revive`, {
      method: 'POST',
      body: JSON.stringify({ path, note, newGoal }),
    });
  }

  async toggleTask(projectId: string, milestoneId: string, taskId: string): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}/tasks/toggle`, {
      method: 'POST',
      body: JSON.stringify({ milestoneId, taskId }),
    });
  }

  async addAttachment(
    projectId: string,
    file: { name: string; type: string; size: number; url?: string }
  ): Promise<{ project: Project; attachment: any }> {
    return this.request<{ project: Project; attachment: any }>(`/projects/${projectId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(file),
    });
  }

  // ---------------- SERVER-SIDE AI ----------------
  async askAiAssistant(
    projectId: string,
    prompt: string,
    mode?: 'blocker' | 'mvp' | 'tech-alt' | 'idea' | 'roadmap' | 'path' | 'chat'
  ): Promise<AIChatMessage> {
    return this.request<AIChatMessage>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ projectId, prompt, mode }),
    });
  }

  async generateFusion(projectIds: string[]): Promise<FusionProposal> {
    return this.request<FusionProposal>('/ai/fusion', {
      method: 'POST',
      body: JSON.stringify({ projectIds }),
    });
  }

  async approveFusion(
    fusionId: string,
    customTitle?: string,
    customGoal?: string
  ): Promise<{ proposal: FusionProposal; newProject: Project }> {
    return this.request<{ proposal: FusionProposal; newProject: Project }>(
      `/ai/fusion/${fusionId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ customTitle, customGoal }),
      }
    );
  }

  // ---------------- TEAMS ----------------
  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/teams');
  }

  async createTeam(name: string, description: string): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async approveJoinRequest(teamId: string, requestId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/join-requests/${requestId}/approve`, {
      method: 'POST',
    });
  }

  // ---------------- REMINDERS ----------------
  async getReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>('/reminders');
  }

  async createReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<Reminder> {
    return this.request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteReminder(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
