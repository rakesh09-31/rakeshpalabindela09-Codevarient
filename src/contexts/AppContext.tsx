import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Project,
  Team,
  Reminder,
  Notification,
  FusionProposal,
  UserProfile,
  ProjectStatus,
  Milestone,
  Task,
} from '../types';
import { storageService } from '../services/storageService';

interface AppContextType {
  projects: Project[];
  teams: Team[];
  reminders: Reminder[];
  notifications: Notification[];
  fusionProposals: FusionProposal[];
  userProfile: UserProfile;
  sidebarCollapsed: boolean;
  initialized: boolean;

  // Projects
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>) => Project;
  updateProject: (id: string, updates: Partial<Project>, timelineNote?: string) => Project;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project;
  changeProjectStatus: (id: string, status: ProjectStatus, note?: string) => Project;
  reviveProject: (
    id: string,
    path: 'restart' | 'continue' | 'change-idea' | 'repurpose' | 'archive',
    note?: string,
    newGoal?: string
  ) => Project;

  // Tasks & Milestones
  addMilestone: (projectId: string, milestone: Omit<Milestone, 'id' | 'createdAt' | 'tasks'>) => Project;
  deleteMilestone: (projectId: string, milestoneId: string) => Project;
  addTask: (projectId: string, milestoneId: string, task: Omit<Task, 'id' | 'createdAt'>) => Project;
  toggleTaskComplete: (projectId: string, milestoneId: string, taskId: string) => Project;
  deleteTask: (projectId: string, milestoneId: string, taskId: string) => Project;

  // Teams
  createTeam: (name: string, description: string) => Team;
  approveJoinRequest: (teamId: string, requestId: string) => Team;
  rejectJoinRequest: (teamId: string, requestId: string) => Team;
  removeMember: (teamId: string, memberId: string) => Team;

  // Reminders
  createReminder: (data: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => Reminder;
  cancelReminder: (id: string) => Reminder;
  deleteReminder: (id: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Fusion
  createFusionProposal: (data: Omit<FusionProposal, 'id' | 'createdAt' | 'status'>) => FusionProposal;
  approveFusionProposal: (id: string) => { proposal: FusionProposal; newProject: Project };
  rejectFusionProposal: (id: string) => FusionProposal;

  // User & System
  updateUserProfile: (updates: Partial<UserProfile>) => UserProfile;
  resetAllData: () => void;
  refreshProjects: () => void;
  refreshAll: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fusionProposals, setFusionProposals] = useState<FusionProposal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({} as UserProfile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const reloadAll = useCallback(() => {
    storageService.initialize();
    setProjects(storageService.getProjects());
    setTeams(storageService.getTeams());
    setReminders(storageService.getReminders());
    setNotifications(storageService.getNotifications());
    setFusionProposals(storageService.getFusionProposals());
    setUserProfile(storageService.getUserProfile());
    setInitialized(true);
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const refreshProjects = useCallback(() => {
    setProjects(storageService.getProjects());
  }, []);

  const refreshAll = useCallback(() => {
    reloadAll();
  }, [reloadAll]);

  // Projects
  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>) => {
      const res = storageService.createProject(data);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>, timelineNote?: string) => {
      const res = storageService.updateProject(id, updates, timelineNote);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    storageService.deleteProject(id);
    setProjects(storageService.getProjects());
  }, []);

  const duplicateProject = useCallback((id: string) => {
    const res = storageService.duplicateProject(id);
    setProjects(storageService.getProjects());
    return res;
  }, []);

  const changeProjectStatus = useCallback((id: string, status: ProjectStatus, note?: string) => {
    const res = storageService.changeProjectStatus(id, status, note);
    setProjects(storageService.getProjects());
    return res;
  }, []);

  const reviveProject = useCallback(
    (
      id: string,
      path: 'restart' | 'continue' | 'change-idea' | 'repurpose' | 'archive',
      note?: string,
      newGoal?: string
    ) => {
      const res = storageService.reviveProject(id, path, note, newGoal);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  // Tasks & Milestones
  const addMilestone = useCallback(
    (projectId: string, milestone: Omit<Milestone, 'id' | 'createdAt' | 'tasks'>) => {
      const res = storageService.addMilestone(projectId, milestone);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  const deleteMilestone = useCallback((projectId: string, milestoneId: string) => {
    const res = storageService.deleteMilestone(projectId, milestoneId);
    setProjects(storageService.getProjects());
    return res;
  }, []);

  const addTask = useCallback(
    (projectId: string, milestoneId: string, task: Omit<Task, 'id' | 'createdAt'>) => {
      const res = storageService.addTask(projectId, milestoneId, task);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  const toggleTaskComplete = useCallback(
    (projectId: string, milestoneId: string, taskId: string) => {
      const res = storageService.toggleTaskComplete(projectId, milestoneId, taskId);
      setProjects(storageService.getProjects());
      return res;
    },
    []
  );

  const deleteTask = useCallback((projectId: string, milestoneId: string, taskId: string) => {
    const res = storageService.deleteTask(projectId, milestoneId, taskId);
    setProjects(storageService.getProjects());
    return res;
  }, []);

  // Teams
  const createTeam = useCallback((name: string, description: string) => {
    const res = storageService.createTeam(name, description);
    setTeams(storageService.getTeams());
    return res;
  }, []);

  const approveJoinRequest = useCallback((teamId: string, requestId: string) => {
    const res = storageService.approveJoinRequest(teamId, requestId);
    setTeams(storageService.getTeams());
    setNotifications(storageService.getNotifications());
    return res;
  }, []);

  const rejectJoinRequest = useCallback((teamId: string, requestId: string) => {
    const res = storageService.rejectJoinRequest(teamId, requestId);
    setTeams(storageService.getTeams());
    return res;
  }, []);

  const removeMember = useCallback((teamId: string, memberId: string) => {
    const res = storageService.removeMember(teamId, memberId);
    setTeams(storageService.getTeams());
    return res;
  }, []);

  // Reminders
  const createReminder = useCallback(
    (data: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => {
      const res = storageService.createReminder(data);
      setReminders(storageService.getReminders());
      return res;
    },
    []
  );

  const cancelReminder = useCallback((id: string) => {
    const res = storageService.cancelReminder(id);
    setReminders(storageService.getReminders());
    return res;
  }, []);

  const deleteReminder = useCallback((id: string) => {
    storageService.deleteReminder(id);
    setReminders(storageService.getReminders());
  }, []);

  // Notifications
  const markNotificationRead = useCallback((id: string) => {
    storageService.markNotificationRead(id);
    setNotifications(storageService.getNotifications());
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    storageService.markAllNotificationsRead();
    setNotifications(storageService.getNotifications());
  }, []);

  // Fusion
  const createFusionProposal = useCallback(
    (data: Omit<FusionProposal, 'id' | 'createdAt' | 'status'>) => {
      const res = storageService.createFusionProposal(data);
      setFusionProposals(storageService.getFusionProposals());
      return res;
    },
    []
  );

  const approveFusionProposal = useCallback((id: string) => {
    const res = storageService.approveFusionProposal(id);
    setFusionProposals(storageService.getFusionProposals());
    setProjects(storageService.getProjects());
    return res;
  }, []);

  const rejectFusionProposal = useCallback((id: string) => {
    const res = storageService.rejectFusionProposal(id);
    setFusionProposals(storageService.getFusionProposals());
    return res;
  }, []);

  // User & System
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    const res = storageService.updateUserProfile(updates);
    setUserProfile(storageService.getUserProfile());
    return res;
  }, []);

  const resetAllData = useCallback(() => {
    storageService.resetAllData();
    reloadAll();
  }, [reloadAll]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects,
        teams,
        reminders,
        notifications,
        fusionProposals,
        userProfile,
        sidebarCollapsed,
        initialized,
        createProject,
        updateProject,
        deleteProject,
        duplicateProject,
        changeProjectStatus,
        reviveProject,
        addMilestone,
        deleteMilestone,
        addTask,
        toggleTaskComplete,
        deleteTask,
        createTeam,
        approveJoinRequest,
        rejectJoinRequest,
        removeMember,
        createReminder,
        cancelReminder,
        deleteReminder,
        markNotificationRead,
        markAllNotificationsRead,
        createFusionProposal,
        approveFusionProposal,
        rejectFusionProposal,
        updateUserProfile,
        resetAllData,
        refreshProjects,
        refreshAll,
        setSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
