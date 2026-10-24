import {
  Project,
  Team,
  TeamVisibility,
  TeamJoinPolicy,
  TeamInvitation,
  TeamTask,
  TeamActivityEvent,
  TeamComment,
  TeamAnalytics,
  JoinRequest,
  Reminder,
  ReminderMetrics,
  ReminderEvent,
  ReminderSuggestion,
  ProviderConfigStatus,
  AIChatMessage,
  FusionProposal,
  UserProfile,
  UserSocialProfile,
  CollaborationRequest,
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
    mode?: string,
    chatHistory?: Array<{ role: string; content: string }>
  ): Promise<AIChatMessage> {
    return this.request<AIChatMessage>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ projectId, prompt, mode, chatHistory }),
    });
  }

  async askAiFusionAdvisor(
    prompt: string,
    selectedProjectIds?: string[],
    chatHistory?: Array<{ role: string; content: string }>
  ): Promise<AIChatMessage> {
    return this.request<AIChatMessage>('/ai/fusion/advisor', {
      method: 'POST',
      body: JSON.stringify({ prompt, selectedProjectIds, chatHistory }),
    });
  }

  async generateFusion(projectIds: string[]): Promise<FusionProposal> {
    return this.request<FusionProposal>('/ai/fusion', {
      method: 'POST',
      body: JSON.stringify({ projectIds }),
    });
  }

  async getFusionProposal(
    fusionId: string
  ): Promise<{ proposal: FusionProposal; sourceProjects: Project[] }> {
    return this.request<{ proposal: FusionProposal; sourceProjects: Project[] }>(
      `/ai/fusion/${fusionId}`,
      { method: 'GET' }
    );
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

  // ---------------- TEAMS & COLLABORATION ----------------
  async getTeams(params?: { visibility?: string; category?: string; q?: string; mine?: boolean }): Promise<Team[]> {
    let query = '';
    if (params) {
      const qp = new URLSearchParams();
      if (params.visibility) qp.set('visibility', params.visibility);
      if (params.category) qp.set('category', params.category);
      if (params.q) qp.set('q', params.q);
      if (params.mine) qp.set('mine', 'true');
      const qs = qp.toString();
      if (qs) query = `?${qs}`;
    }
    return this.request<Team[]>(`/teams${query}`);
  }

  async getTeam(id: string): Promise<Team> {
    return this.request<Team>(`/teams/${id}`);
  }

  async createTeam(data: {
    name: string;
    description?: string;
    avatar?: string;
    visibility?: TeamVisibility;
    categories?: string[];
    joinPolicy?: TeamJoinPolicy;
  }): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    return this.request<Team>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTeam(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  async transferTeamOwnership(teamId: string, newOwnerId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    });
  }

  async leaveTeam(teamId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/leave`, {
      method: 'POST',
    });
  }

  async updateMemberRole(teamId: string, memberId: string, role: 'admin' | 'member'): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/members/${memberId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(teamId: string, memberId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    return this.request<TeamInvitation[]>(`/teams/${teamId}/invitations`);
  }

  async inviteMember(
    teamId: string,
    inviteeIdentifier: string,
    role: 'admin' | 'member' = 'member',
    message?: string
  ): Promise<{ invitation: TeamInvitation; emailDelivery: { sent: boolean; reason: string } }> {
    return this.request<{ invitation: TeamInvitation; emailDelivery: { sent: boolean; reason: string } }>(
      `/teams/${teamId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({ inviteeIdentifier, role, message }),
      }
    );
  }

  async cancelInvitation(teamId: string, invitationId: string): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(`/teams/${teamId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async getUserInvitations(): Promise<TeamInvitation[]> {
    return this.request<TeamInvitation[]>('/user/invitations');
  }

  async acceptInvitation(invitationId: string): Promise<{ team: Team; invitation: TeamInvitation }> {
    return this.request<{ team: Team; invitation: TeamInvitation }>(`/invitations/${invitationId}/accept`, {
      method: 'POST',
    });
  }

  async declineInvitation(invitationId: string): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(`/invitations/${invitationId}/decline`, {
      method: 'POST',
    });
  }

  async submitJoinRequest(teamId: string, message: string, skills: string[]): Promise<JoinRequest> {
    return this.request<JoinRequest>(`/teams/${teamId}/join-requests`, {
      method: 'POST',
      body: JSON.stringify({ message, skills }),
    });
  }

  async approveJoinRequest(teamId: string, requestId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/join-requests/${requestId}/approve`, {
      method: 'POST',
    });
  }

  async rejectJoinRequest(teamId: string, requestId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/join-requests/${requestId}/reject`, {
      method: 'POST',
    });
  }

  async shareProjectWithTeam(teamId: string, projectId: string): Promise<{ team: Team; project: Project }> {
    return this.request<{ team: Team; project: Project }>(`/teams/${teamId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  async unshareProjectFromTeam(teamId: string, projectId: string): Promise<{ team: Team; project: Project }> {
    return this.request<{ team: Team; project: Project }>(`/teams/${teamId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getTeamTasks(teamId: string): Promise<TeamTask[]> {
    return this.request<TeamTask[]>(`/teams/${teamId}/tasks`);
  }

  async createTeamTask(data: Omit<TeamTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamTask> {
    return this.request<TeamTask>(`/teams/${data.teamId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeamTask(teamId: string, taskId: string, updates: Partial<TeamTask>): Promise<TeamTask> {
    return this.request<TeamTask>(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTeamTask(teamId: string, taskId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async getTeamActivities(teamId: string): Promise<TeamActivityEvent[]> {
    return this.request<TeamActivityEvent[]>(`/teams/${teamId}/activities`);
  }

  async getTeamComments(teamId: string, options?: { projectId?: string; taskId?: string }): Promise<TeamComment[]> {
    let query = '';
    if (options?.projectId || options?.taskId) {
      const qp = new URLSearchParams();
      if (options.projectId) qp.set('projectId', options.projectId);
      if (options.taskId) qp.set('taskId', options.taskId);
      query = `?${qp.toString()}`;
    }
    return this.request<TeamComment[]>(`/teams/${teamId}/comments${query}`);
  }

  async createTeamComment(data: Omit<TeamComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamComment> {
    return this.request<TeamComment>(`/teams/${data.teamId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTeamComment(teamId: string, commentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/teams/${teamId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async getTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
    return this.request<TeamAnalytics>(`/teams/${teamId}/analytics`);
  }

  // ---------------- REMINDERS ----------------
  async getReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>('/reminders');
  }

  async getReminderMetrics(): Promise<ReminderMetrics> {
    return this.request<ReminderMetrics>('/reminders/metrics');
  }

  async getReminderHistory(): Promise<ReminderEvent[]> {
    return this.request<ReminderEvent[]>('/reminders/history');
  }

  async getReminderProviderStatus(): Promise<ProviderConfigStatus> {
    return this.request<ProviderConfigStatus>('/reminders/provider-status');
  }

  async createReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<Reminder> {
    return this.request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    return this.request<Reminder>(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async completeReminder(id: string): Promise<{ success: boolean; nextReminder?: Reminder }> {
    return this.request<{ success: boolean; nextReminder?: Reminder }>(`/reminders/${id}/complete`, {
      method: 'POST',
    });
  }

  async dismissReminder(id: string): Promise<Reminder> {
    return this.request<Reminder>(`/reminders/${id}/dismiss`, {
      method: 'POST',
    });
  }

  async snoozeReminder(
    id: string,
    options: { hours?: number; minutes?: number; customDateTime?: string }
  ): Promise<Reminder> {
    return this.request<Reminder>(`/reminders/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async deleteReminder(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  }

  async getAiReminderSuggestions(): Promise<ReminderSuggestion[]> {
    return this.request<ReminderSuggestion[]>('/ai/reminders/suggestions', {
      method: 'POST',
    });
  }

  // ---------------- USERS & SOCIAL ----------------
  async getUsers(): Promise<UserSocialProfile[]> {
    return this.request<UserSocialProfile[]>('/users');
  }

  async getUser(id: string): Promise<UserSocialProfile> {
    return this.request<UserSocialProfile>(`/users/${id}`);
  }

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserSocialProfile> {
    return this.request<UserSocialProfile>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getUserFollowers(id: string): Promise<{ user: UserProfile; status: 'following' | 'requested' }[]> {
    return this.request<{ user: UserProfile; status: 'following' | 'requested' }[]>(`/users/${id}/followers`);
  }

  async getUserFollowing(id: string): Promise<{ user: UserProfile; status: 'following' | 'requested' }[]> {
    return this.request<{ user: UserProfile; status: 'following' | 'requested' }[]>(`/users/${id}/following`);
  }

  async followUser(targetId: string, requiresRequest?: boolean): Promise<{ success: boolean; status: string }> {
    return this.request<{ success: boolean; status: string }>(`/users/${targetId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ requiresRequest }),
    });
  }

  async unfollowUser(targetId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/users/${targetId}/follow`, {
      method: 'DELETE',
    });
  }

  async respondFollowRequest(followerId: string, action: 'accept' | 'decline'): Promise<{ success: boolean; action: string }> {
    return this.request<{ success: boolean; action: string }>(`/users/${followerId}/follow/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ---------------- COLLABORATIONS ----------------
  async getCollaborationRequests(projectId?: string): Promise<CollaborationRequest[]> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return this.request<CollaborationRequest[]>(`/collaborations${query}`);
  }

  async createCollaborationRequest(data: {
    projectId: string;
    skills: string;
    message: string;
  }): Promise<CollaborationRequest> {
    return this.request<CollaborationRequest>('/collaborations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async respondCollaborationRequest(
    requestId: string,
    action: 'accept' | 'decline'
  ): Promise<CollaborationRequest> {
    return this.request<CollaborationRequest>(`/collaborations/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }
}

export const apiClient = new ApiClient();
