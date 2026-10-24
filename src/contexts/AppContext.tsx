import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Project,
  Team,
  Reminder,
  Notification,
  FusionProposal,
  UserProfile,
  UserSocialProfile,
  CollaborationRequest,
  ProjectStatus,
  Milestone,
  Task,
} from '../types';
import { storageService } from '../services/storageService';
import { apiClient } from '../services/apiClient';

interface AppContextType {
  projects: Project[];
  teams: Team[];
  reminders: Reminder[];
  notifications: Notification[];
  fusionProposals: FusionProposal[];
  userProfile: UserProfile;
  users: UserSocialProfile[];
  collaborationRequests: CollaborationRequest[];
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  theme: 'light' | 'dark';

  // Social & Community
  refreshUsers: () => Promise<void>;
  getUserProfileById: (id: string) => Promise<UserSocialProfile | null>;
  followUser: (targetId: string, requiresRequest?: boolean) => Promise<void>;
  unfollowUser: (targetId: string) => Promise<void>;
  respondFollowRequest: (followerId: string, action: 'accept' | 'decline') => Promise<void>;
  sendCollaborationRequest: (projectId: string, skills: string, message: string) => Promise<CollaborationRequest>;
  respondCollaborationRequest: (requestId: string, action: 'accept' | 'decline') => Promise<CollaborationRequest>;

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
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  cancelReminder: (id: string) => Reminder;
  completeReminder: (id: string) => Reminder;
  snoozeReminder: (id: string, hours?: number, minutes?: number, customDateTime?: string) => Reminder;
  restoreReminder: (id: string) => Reminder;
  deleteReminder: (id: string) => void;
  refreshReminders: () => void;

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
  setMobileDrawerOpen: (open: boolean) => void;
  toggleTheme: () => void;
  initialized: boolean;
  initError: string | null;
  isSyncing: boolean;
  reloadAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      storageService.initialize();
      return storageService.getProjects();
    } catch {
      return [];
    }
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      return storageService.getTeams();
    } catch {
      return [];
    }
  });
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      return storageService.getReminders();
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      return storageService.getNotifications();
    } catch {
      return [];
    }
  });
  const [fusionProposals, setFusionProposals] = useState<FusionProposal[]>(() => {
    try {
      return storageService.getFusionProposals();
    } catch {
      return [];
    }
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      return storageService.getUserProfile();
    } catch {
      return {} as UserProfile;
    }
  });
  const [users, setUsers] = useState<UserSocialProfile[]>([]);
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const queryTheme = new URLSearchParams(window.location.search).get('theme');
        if (queryTheme === 'dark' || queryTheme === 'light') return queryTheme;
      }
      const saved = localStorage.getItem('graveyard_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // fallback
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('graveyard_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [initError, setInitError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const reloadAll = useCallback(async () => {
    try {
      setInitError(null);
      storageService.initialize();
      setProjects(storageService.getProjects());
      setTeams(storageService.getTeams());
      setReminders(storageService.getReminders());
      setNotifications(storageService.getNotifications());
      setFusionProposals(storageService.getFusionProposals());
      setUserProfile(storageService.getUserProfile());
      setInitialized(true);

      // Asynchronously synchronize with SQLite server database
      setIsSyncing(true);
      try {
        const [serverProjects, serverTeams, serverReminders, serverUsers, serverCollabs] = await Promise.allSettled([
          apiClient.getProjects(),
          apiClient.getTeams(),
          apiClient.getReminders(),
          apiClient.getUsers(),
          apiClient.getCollaborationRequests(),
        ]);

        if (serverProjects.status === 'fulfilled' && serverProjects.value && serverProjects.value.length > 0) {
          setProjects(serverProjects.value);
          storageService.saveProjects(serverProjects.value);
        }
        if (serverTeams.status === 'fulfilled' && serverTeams.value && serverTeams.value.length > 0) {
          setTeams(serverTeams.value);
          storageService.saveTeams(serverTeams.value);
        }
        if (serverReminders.status === 'fulfilled' && serverReminders.value && serverReminders.value.length > 0) {
          setReminders(serverReminders.value);
          storageService.saveReminders(serverReminders.value);
        }
        if (serverUsers.status === 'fulfilled' && serverUsers.value && serverUsers.value.length > 0) {
          setUsers(serverUsers.value);
        }
        if (serverCollabs.status === 'fulfilled' && serverCollabs.value) {
          setCollaborationRequests(serverCollabs.value);
        }
      } catch (syncErr) {
        console.warn('Backend sync warning (local storage active):', syncErr);
      } finally {
        setIsSyncing(false);
      }
    } catch (err: unknown) {
      console.error('App initialization failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown storage initialization error';
      setInitError(msg);
      setInitialized(false);
    }
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const refreshProjects = useCallback(() => {
    setProjects(storageService.getProjects());
    apiClient.getProjects().then((serverProjects) => {
      if (serverProjects && serverProjects.length > 0) {
        setProjects(serverProjects);
        storageService.saveProjects(serverProjects);
      }
    }).catch(() => {});
  }, []);

  const refreshAll = useCallback(() => {
    reloadAll();
  }, [reloadAll]);

  // Projects
  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>) => {
      const res = storageService.createProject(data);
      setProjects(storageService.getProjects());
      apiClient.createProject(res).catch(() => {});
      return res;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>, timelineNote?: string) => {
      const res = storageService.updateProject(id, updates, timelineNote);
      setProjects(storageService.getProjects());
      apiClient.updateProject(id, updates, timelineNote).catch(() => {});
      return res;
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    storageService.deleteProject(id);
    setProjects(storageService.getProjects());
    apiClient.deleteProject(id).catch(() => {});
  }, []);

  const duplicateProject = useCallback((id: string) => {
    const res = storageService.duplicateProject(id);
    setProjects(storageService.getProjects());
    apiClient.createProject(res).catch(() => {});
    return res;
  }, []);

  const changeProjectStatus = useCallback((id: string, status: ProjectStatus, note?: string) => {
    const res = storageService.changeProjectStatus(id, status, note);
    setProjects(storageService.getProjects());
    apiClient.updateProject(id, {
      status,
      pauseDate: res.pauseDate,
      completionDate: res.completionDate,
    }, note).catch(() => {});
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
      apiClient.reviveProject(id, path, note, newGoal).catch(() => {});
      return res;
    },
    []
  );

  // Tasks & Milestones
  const addMilestone = useCallback(
    (projectId: string, milestone: Omit<Milestone, 'id' | 'createdAt' | 'tasks'>) => {
      const res = storageService.addMilestone(projectId, milestone);
      setProjects(storageService.getProjects());
      apiClient.updateProject(projectId, { milestones: res.milestones }).catch(() => {});
      return res;
    },
    []
  );

  const deleteMilestone = useCallback((projectId: string, milestoneId: string) => {
    const res = storageService.deleteMilestone(projectId, milestoneId);
    setProjects(storageService.getProjects());
    apiClient.updateProject(projectId, { milestones: res.milestones }).catch(() => {});
    return res;
  }, []);

  const addTask = useCallback(
    (projectId: string, milestoneId: string, task: Omit<Task, 'id' | 'createdAt'>) => {
      const res = storageService.addTask(projectId, milestoneId, task);
      setProjects(storageService.getProjects());
      apiClient.updateProject(projectId, { milestones: res.milestones }).catch(() => {});
      return res;
    },
    []
  );

  const toggleTaskComplete = useCallback(
    (projectId: string, milestoneId: string, taskId: string) => {
      const res = storageService.toggleTaskComplete(projectId, milestoneId, taskId);
      setProjects(storageService.getProjects());
      apiClient.toggleTask(projectId, milestoneId, taskId).catch(() => {});
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
      apiClient.createReminder(data).then((serverReminder) => {
        if (serverReminder) {
          apiClient.getReminders().then((list) => {
            if (list) {
              setReminders(list);
              storageService.saveReminders(list);
            }
          }).catch(() => {});
        }
      }).catch((e) => console.error('Failed to create reminder on server:', e));
      return res;
    },
    []
  );

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    const list = storageService.getReminders();
    const idx = list.findIndex((r) => r.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      storageService.saveReminders(list);
      setReminders([...list]);
    }
    apiClient.updateReminder(id, updates).then(() => {
      apiClient.getReminders().then((serverList) => {
        if (serverList) {
          setReminders(serverList);
          storageService.saveReminders(serverList);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const cancelReminder = useCallback((id: string) => {
    const res = storageService.cancelReminder(id);
    setReminders(storageService.getReminders());
    apiClient.dismissReminder(id).then(() => {
      apiClient.getReminders().then((list) => {
        if (list) {
          setReminders(list);
          storageService.saveReminders(list);
        }
      }).catch(() => {});
    }).catch(() => {});
    return res;
  }, []);

  const completeReminder = useCallback((id: string) => {
    const res = storageService.completeReminder(id);
    setReminders(storageService.getReminders());
    apiClient.completeReminder(id).then(() => {
      apiClient.getReminders().then((list) => {
        if (list) {
          setReminders(list);
          storageService.saveReminders(list);
        }
      }).catch(() => {});
    }).catch(() => {});
    return res;
  }, []);

  const snoozeReminder = useCallback((id: string, hours: number = 24, minutes?: number, customDateTime?: string) => {
    const res = storageService.snoozeReminder(id, hours);
    setReminders(storageService.getReminders());
    apiClient.snoozeReminder(id, { hours, minutes, customDateTime }).then(() => {
      apiClient.getReminders().then((list) => {
        if (list) {
          setReminders(list);
          storageService.saveReminders(list);
        }
      }).catch(() => {});
    }).catch(() => {});
    return res;
  }, []);

  const restoreReminder = useCallback((id: string) => {
    const res = storageService.restoreReminder(id);
    setReminders(storageService.getReminders());
    apiClient.updateReminder(id, { status: 'upcoming', enabled: true }).then(() => {
      apiClient.getReminders().then((list) => {
        if (list) {
          setReminders(list);
          storageService.saveReminders(list);
        }
      }).catch(() => {});
    }).catch(() => {});
    return res;
  }, []);

  const deleteReminder = useCallback((id: string) => {
    storageService.deleteReminder(id);
    setReminders(storageService.getReminders());
    apiClient.deleteReminder(id).then(() => {
      apiClient.getReminders().then((list) => {
        if (list) {
          setReminders(list);
          storageService.saveReminders(list);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const refreshReminders = useCallback(() => {
    apiClient.getReminders().then((list) => {
      if (list) {
        setReminders(list);
        storageService.saveReminders(list);
      }
    }).catch(() => {});
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

  const refreshUsers = useCallback(async () => {
    try {
      const serverUsers = await apiClient.getUsers();
      if (serverUsers && serverUsers.length > 0) {
        setUsers(serverUsers);
      }
    } catch {
      const community = storageService.getCommunityUsers();
      const mapped = community
        .map((u) => storageService.getUserSocialProfile(u.id, userProfile.id || 'user-1'))
        .filter(Boolean) as UserSocialProfile[];
      setUsers(mapped);
    }
  }, [userProfile.id]);

  const getUserProfileById = useCallback(
    async (id: string): Promise<UserSocialProfile | null> => {
      try {
        const u = await apiClient.getUser(id);
        return u;
      } catch {
        return storageService.getUserSocialProfile(id, userProfile.id || 'user-1');
      }
    },
    [userProfile.id]
  );

  const followUser = useCallback(
    async (targetId: string, requiresRequest?: boolean) => {
      try {
        await apiClient.followUser(targetId, requiresRequest);
        await refreshUsers();
      } catch (e) {
        console.error('Failed to follow user:', e);
        throw e;
      }
    },
    [refreshUsers]
  );

  const unfollowUser = useCallback(
    async (targetId: string) => {
      try {
        await apiClient.unfollowUser(targetId);
        await refreshUsers();
      } catch (e) {
        console.error('Failed to unfollow user:', e);
        throw e;
      }
    },
    [refreshUsers]
  );

  const respondFollowRequest = useCallback(
    async (followerId: string, action: 'accept' | 'decline') => {
      try {
        await apiClient.respondFollowRequest(followerId, action);
        await refreshUsers();
      } catch (e) {
        console.error('Failed to respond to follow request:', e);
        throw e;
      }
    },
    [refreshUsers]
  );

  const sendCollaborationRequest = useCallback(
    async (projectId: string, skills: string, message: string) => {
      try {
        const created = await apiClient.createCollaborationRequest({
          projectId,
          skills,
          message,
        });
        setCollaborationRequests((prev) => [created, ...prev]);
        return created;
      } catch (e) {
        console.error('Failed to create collaboration request:', e);
        throw e;
      }
    },
    []
  );

  const respondCollaborationRequest = useCallback(
    async (requestId: string, action: 'accept' | 'decline') => {
      try {
        const updated = await apiClient.respondCollaborationRequest(requestId, action);
        setCollaborationRequests((prev) =>
          prev.map((r) => (r.id === requestId ? updated : r))
        );
        if (action === 'accept') {
          refreshProjects();
        }
        return updated;
      } catch (e) {
        console.error('Failed to respond to collaboration request:', e);
        throw e;
      }
    },
    [refreshProjects]
  );

  return (
    <AppContext.Provider
      value={{
        projects,
        teams,
        reminders,
        notifications,
        fusionProposals,
        userProfile,
        users,
        collaborationRequests,
        sidebarCollapsed,
        mobileDrawerOpen,
        theme,
        initialized,
        initError,
        isSyncing,
        reloadAll,
        refreshUsers,
        getUserProfileById,
        followUser,
        unfollowUser,
        respondFollowRequest,
        sendCollaborationRequest,
        respondCollaborationRequest,
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
        updateReminder,
        cancelReminder,
        completeReminder,
        snoozeReminder,
        restoreReminder,
        deleteReminder,
        refreshReminders,
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
        setMobileDrawerOpen,
        toggleTheme,
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
