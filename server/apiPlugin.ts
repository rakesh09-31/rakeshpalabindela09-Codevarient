import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dbManager } from './db.ts';
import { aiService } from './aiService.ts';
import type { Project, Team, Reminder } from '../src/types/index.ts';
import {
  validateEmail,
  validatePhone,
  scheduleNotificationJobs,
  calculateNextOccurrence,
  getProviderConfigStatus,
  startNotificationScheduler,
} from './notificationScheduler.ts';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, data: any, statusCode: number = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, message: string, statusCode: number = 400) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

export function apiPlugin(): Plugin {
  return {
    name: 'project-graveyard-api',
    configureServer(server: ViteDevServer) {
      // Start server-side notification scheduler worker
      startNotificationScheduler();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const method = req.method || 'GET';
        const userId = (req.headers['x-user-id'] as string) || 'user-1';

        try {
          // ---------------- HEALTH ----------------
          if (url === '/api/health') {
            return sendJson(res, { status: 'healthy', storage: 'sqlite', timestamp: new Date().toISOString() });
          }

          // ---------------- AI ASSISTANT ----------------
          // POST /api/ai/assistant
          if (url === '/api/ai/assistant' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { projectId, prompt, mode, chatHistory } = body;
            if (!projectId || !prompt) {
              return sendError(res, 'projectId and prompt are required.', 400);
            }
            try {
              const response = await aiService.generateProjectGuidance(projectId, prompt, mode, userId, chatHistory);
              return sendJson(res, response);
            } catch (err: any) {
              return sendError(res, err.message, err.statusCode || 500);
            }
          }

          // ---------------- AI FUSION ----------------
          // POST /api/ai/fusion/advisor
          if (url === '/api/ai/fusion/advisor' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { prompt, selectedProjectIds, chatHistory } = body;
            if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
              return sendError(res, 'A prompt question is required for the AI Fusion Advisor.', 400);
            }
            try {
              const response = await aiService.generateFusionAdvice(
                prompt,
                selectedProjectIds,
                chatHistory,
                userId
              );
              return sendJson(res, response);
            } catch (err: any) {
              return sendError(res, err.message, err.statusCode || 500);
            }
          }

          // POST /api/ai/fusion
          if (url === '/api/ai/fusion' && method === 'POST') {
            const body = await parseJsonBody(req);
            const { projectIds } = body;
            if (!projectIds || !Array.isArray(projectIds) || projectIds.length < 2) {
              return sendError(res, 'At least 2 source project IDs are required for fusion.', 400);
            }
            try {
              const proposal = await aiService.generateProjectFusion(projectIds, userId);
              return sendJson(res, proposal, 201);
            } catch (err: any) {
              return sendError(res, err.message, err.statusCode || 500);
            }
          }

          // GET /api/ai/fusion/:id
          const fusionGetMatch = url.match(/^\/api\/ai\/fusion\/([^/]+)$/);
          if (fusionGetMatch && method === 'GET') {
            const fusionId = fusionGetMatch[1];
            const proposal = dbManager.getFusion(fusionId);
            if (!proposal) {
              return sendError(res, 'Fusion proposal not found or expired.', 404);
            }
            // Authorization check: verify current user has access to all source projects
            const sourceProjects: Project[] = [];
            for (const sid of proposal.sourceProjectIds) {
              const p = dbManager.getProject(sid, userId);
              if (!p) {
                return sendError(res, `Unauthorized or project not found: ${sid}`, 403);
              }
              sourceProjects.push(p);
            }
            return sendJson(res, { proposal, sourceProjects });
          }

          // POST /api/ai/fusion/:id/approve
          const fusionApproveMatch = url.match(/^\/api\/ai\/fusion\/([^/]+)\/approve$/);
          if (fusionApproveMatch && method === 'POST') {
            const fusionId = fusionApproveMatch[1];
            const body = await parseJsonBody(req);
            try {
              const result = await aiService.approveProjectFusion(
                fusionId,
                body.customTitle,
                body.customGoal,
                userId
              );
              return sendJson(res, result);
            } catch (err: any) {
              return sendError(res, err.message, err.statusCode || 500);
            }
          }

          // ---------------- PROJECTS ----------------
          // GET /api/projects
          if (url === '/api/projects' && method === 'GET') {
            const projects = dbManager.getProjects(userId);
            return sendJson(res, projects);
          }

          // POST /api/projects
          if (url === '/api/projects' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.title || !body.title.trim()) {
              return sendError(res, 'Project title is required.', 400);
            }
            if (!body.summary || !body.summary.trim()) {
              return sendError(res, 'Project summary is required.', 400);
            }

            const id = body.id || `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            const now = new Date().toISOString();

            const project: Project = {
              ...body,
              id,
              ownerId: userId,
              ownerName: body.ownerName || 'Alex Rivera',
              status: body.status || 'active',
              visibility: body.visibility || 'team',
              languages: body.languages || [],
              frameworks: body.frameworks || [],
              libraries: body.libraries || [],
              apis: body.apis || [],
              tools: body.tools || [],
              tags: body.tags || [],
              completedFeatures: body.completedFeatures || [],
              inProgressFeatures: body.inProgressFeatures || [],
              plannedFeatures: body.plannedFeatures || [],
              milestones: body.milestones || [],
              technicalBlockers: body.technicalBlockers || [],
              missingSkills: body.missingSkills || [],
              knownBugs: body.knownBugs || [],
              lessonsLearned: body.lessonsLearned || [],
              importantDecisions: body.importantDecisions || [],
              plannedModifications: body.plannedModifications || [],
              futureImprovements: body.futureImprovements || [],
              nextSteps: body.nextSteps || [],
              teamMembers: body.teamMembers || [
                {
                  id: userId,
                  name: 'Alex Rivera',
                  role: 'owner',
                  skills: ['Full Stack'],
                  availability: 'full-time',
                  joinedAt: now,
                },
              ],
              attachments: body.attachments || [],
              timeline: [
                {
                  id: `tl-${Date.now().toString(36)}`,
                  type: 'created',
                  title: 'Project planted in Graveyard',
                  description: `Initial idea: ${body.summary}`,
                  timestamp: now,
                },
              ],
              bookmarked: Boolean(body.bookmarked),
              createdAt: now,
              updatedAt: now,
            };

            const created = dbManager.createProject(project);
            return sendJson(res, created, 201);
          }

          // Single project routes: /api/projects/:id/...
          const projectMatch = url.match(/^\/api\/projects\/([^/?]+)(\/.*)?$/);
          if (projectMatch) {
            const projectId = projectMatch[1];
            const subPath = projectMatch[2] || '';

            // GET /api/projects/:id
            if (subPath === '' && method === 'GET') {
              const project = dbManager.getProject(projectId, userId);
              if (!project) return sendError(res, 'Project not found or unauthorized', 404);
              return sendJson(res, project);
            }

            // PUT /api/projects/:id
            if (subPath === '' && method === 'PUT') {
              const body = await parseJsonBody(req);
              try {
                const updated = dbManager.updateProject(projectId, body, body.timelineNote);
                return sendJson(res, updated);
              } catch (err: any) {
                return sendError(res, err.message, 400);
              }
            }

            // DELETE /api/projects/:id
            if (subPath === '' && method === 'DELETE') {
              dbManager.deleteProject(projectId);
              return sendJson(res, { success: true, id: projectId });
            }

            // POST /api/projects/:id/revive
            if (subPath === '/revive' && method === 'POST') {
              const body = await parseJsonBody(req);
              const { path, note, newGoal } = body;
              if (!path) return sendError(res, 'Revival path is required', 400);
              try {
                const revived = dbManager.reviveProject(projectId, path, note, newGoal);
                return sendJson(res, revived);
              } catch (err: any) {
                return sendError(res, err.message, 400);
              }
            }

            // POST /api/projects/:id/tasks/toggle
            if (subPath === '/tasks/toggle' && method === 'POST') {
              const body = await parseJsonBody(req);
              const { milestoneId, taskId } = body;
              if (!milestoneId || !taskId) return sendError(res, 'milestoneId and taskId are required', 400);
              try {
                const updated = dbManager.toggleTask(projectId, milestoneId, taskId);
                return sendJson(res, updated);
              } catch (err: any) {
                return sendError(res, err.message, 400);
              }
            }

            // POST /api/projects/:id/attachments
            if (subPath === '/attachments' && method === 'POST') {
              const body = await parseJsonBody(req);
              const project = dbManager.getProject(projectId, userId);
              if (!project) return sendError(res, 'Project not found', 404);
              const attachment = {
                id: `att-${Date.now().toString(36)}`,
                name: body.name || 'Untitled Document',
                type: body.type || 'text/plain',
                size: body.size || 1024,
                url: body.url,
                uploadedAt: new Date().toISOString(),
              };
              const updated = dbManager.updateProject(projectId, {
                attachments: [attachment, ...project.attachments],
              }, `Attached document "${attachment.name}"`);
              return sendJson(res, { project: updated, attachment });
            }
          }

          // ---------------- TEAMS ----------------
          // GET /api/teams
          if (url === '/api/teams' && method === 'GET') {
            const teams = dbManager.getTeams();
            return sendJson(res, teams);
          }

          // POST /api/teams
          if (url === '/api/teams' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.name) return sendError(res, 'Team name is required', 400);
            const now = new Date().toISOString();
            const newTeam: Team = {
              id: `team-${Date.now().toString(36)}`,
              name: body.name.trim(),
              description: body.description?.trim() || '',
              ownerId: userId,
              projectIds: body.projectIds || [],
              members: [
                {
                  id: userId,
                  name: 'Alex Rivera',
                  role: 'owner',
                  skills: ['Full Stack', 'Architecture'],
                  availability: 'full-time',
                  joinedAt: now,
                },
              ],
              joinRequests: [],
              createdAt: now,
              updatedAt: now,
            };
            const created = dbManager.createTeam(newTeam);
            return sendJson(res, created, 201);
          }

          // POST /api/teams/:id/join-requests/:reqId/approve
          const joinApproveMatch = url.match(/^\/api\/teams\/([^/]+)\/join-requests\/([^/]+)\/approve$/);
          if (joinApproveMatch && method === 'POST') {
            const [, teamId, reqId] = joinApproveMatch;
            const teams = dbManager.getTeams();
            const team = teams.find((t) => t.id === teamId);
            if (!team) return sendError(res, 'Team not found', 404);
            const reqItem = team.joinRequests.find((r) => r.id === reqId);
            if (!reqItem) return sendError(res, 'Join request not found', 404);
            reqItem.status = 'approved';
            team.members.push({
              id: reqItem.userId,
              name: reqItem.userName,
              avatar: reqItem.userAvatar,
              role: 'member',
              skills: reqItem.skills,
              availability: 'part-time',
              joinedAt: new Date().toISOString(),
            });
            const updated = dbManager.updateTeam(teamId, {
              members: team.members,
              joinRequests: team.joinRequests,
            });
            return sendJson(res, updated);
          }

          // ---------------- REMINDERS & FOLLOW-THROUGH CENTER ----------------
          // GET /api/reminders/metrics
          if (url === '/api/reminders/metrics' && method === 'GET') {
            const metrics = dbManager.getReminderMetrics(userId);
            return sendJson(res, metrics);
          }

          // GET /api/reminders/history
          if (url === '/api/reminders/history' && method === 'GET') {
            const events = dbManager.getReminderEvents(userId);
            return sendJson(res, events);
          }

          // GET /api/reminders/provider-status
          if (url === '/api/reminders/provider-status' && method === 'GET') {
            return sendJson(res, getProviderConfigStatus());
          }

          // POST /api/ai/reminders/suggestions
          if (url === '/api/ai/reminders/suggestions' && method === 'POST') {
            const suggestions = await aiService.generateReminderSuggestions(userId);
            return sendJson(res, suggestions);
          }

          // POST /api/reminders/:id/complete
          const reminderCompleteMatch = url.match(/^\/api\/reminders\/([^/?]+)\/complete$/);
          if (reminderCompleteMatch && method === 'POST') {
            const id = reminderCompleteMatch[1];
            const existing = dbManager.getReminder(id, userId);
            if (!existing) return sendError(res, 'Reminder not found', 404);

            dbManager.cancelPendingJobsForReminder(id);
            const now = new Date().toISOString();
            let nextReminder: Reminder | undefined;

            if (existing.recurrence && existing.recurrence !== 'once') {
              const nextIso = calculateNextOccurrence(existing.dateTime, existing.recurrence, existing.customRecurrenceDays);
              const updated = dbManager.updateReminder(id, {
                dateTime: nextIso,
                status: 'upcoming',
                enabled: true,
                updatedAt: now,
              }, userId);
              scheduleNotificationJobs(updated);
              nextReminder = updated;
            } else {
              dbManager.updateReminder(id, {
                status: 'completed',
                enabled: false,
                updatedAt: now,
              }, userId);
            }

            dbManager.createReminderEvent({
              id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              reminderId: id,
              userId,
              eventType: 'completed',
              details: `Completed reminder "${existing.title}"${nextReminder ? `; next occurrence scheduled for ${new Date(nextReminder.dateTime).toLocaleString()}` : ''}`,
              timestamp: now,
            });

            return sendJson(res, { success: true, nextReminder });
          }

          // POST /api/reminders/:id/dismiss
          const reminderDismissMatch = url.match(/^\/api\/reminders\/([^/?]+)\/dismiss$/);
          if (reminderDismissMatch && method === 'POST') {
            const id = reminderDismissMatch[1];
            const existing = dbManager.getReminder(id, userId);
            if (!existing) return sendError(res, 'Reminder not found', 404);

            dbManager.cancelPendingJobsForReminder(id);
            const now = new Date().toISOString();
            const updated = dbManager.updateReminder(id, {
              status: 'dismissed',
              enabled: false,
              updatedAt: now,
            }, userId);

            dbManager.createReminderEvent({
              id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              reminderId: id,
              userId,
              eventType: 'dismissed',
              details: `Dismissed reminder "${existing.title}"`,
              timestamp: now,
            });

            return sendJson(res, updated);
          }

          // POST /api/reminders/:id/snooze
          const reminderSnoozeMatch = url.match(/^\/api\/reminders\/([^/?]+)\/snooze$/);
          if (reminderSnoozeMatch && method === 'POST') {
            const id = reminderSnoozeMatch[1];
            const body = await parseJsonBody(req);
            const existing = dbManager.getReminder(id, userId);
            if (!existing) return sendError(res, 'Reminder not found', 404);

            let newDueMs: number;
            if (body.customDateTime && !isNaN(new Date(body.customDateTime).getTime())) {
              newDueMs = new Date(body.customDateTime).getTime();
            } else if (body.minutes) {
              newDueMs = Date.now() + body.minutes * 60 * 1000;
            } else {
              const hours = body.hours || 24;
              newDueMs = Date.now() + hours * 3600 * 1000;
            }

            const newDueIso = new Date(newDueMs).toISOString();
            const now = new Date().toISOString();

            const updated = dbManager.updateReminder(id, {
              dateTime: newDueIso,
              status: 'upcoming',
              enabled: true,
              snoozeCount: (existing.snoozeCount || 0) + 1,
              updatedAt: now,
            }, userId);

            scheduleNotificationJobs(updated);

            dbManager.createReminderEvent({
              id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              reminderId: id,
              userId,
              eventType: 'snoozed',
              details: `Snoozed reminder "${existing.title}" to ${new Date(newDueIso).toLocaleString()}`,
              timestamp: now,
            });

            return sendJson(res, updated);
          }

          // GET /api/reminders
          if (url === '/api/reminders' && method === 'GET') {
            const reminders = dbManager.getReminders(userId);
            return sendJson(res, reminders);
          }

          // POST /api/reminders
          if (url === '/api/reminders' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.title || !body.title.trim()) {
              return sendError(res, 'Reminder title is required', 400);
            }
            if (!body.dateTime || isNaN(new Date(body.dateTime).getTime())) {
              return sendError(res, 'Valid due date and time is required', 400);
            }

            const channels = Array.isArray(body.channels) && body.channels.length > 0
              ? body.channels
              : body.channel === 'both' ? ['in-app', 'email'] : [body.channel || 'in-app'];

            if (channels.includes('email')) {
              if (!body.contactEmail || !validateEmail(body.contactEmail)) {
                return sendError(res, 'A valid contact email address is required for email reminders', 400);
              }
            }

            if (channels.includes('whatsapp')) {
              const phoneCheck = validatePhone(body.contactPhone || '');
              if (!phoneCheck.valid) {
                return sendError(res, phoneCheck.error || 'A valid phone number with country code is required for WhatsApp reminders', 400);
              }
              if (!body.whatsappConsent) {
                return sendError(res, 'Explicit consent is required to receive WhatsApp reminders', 400);
              }
            }

            const now = new Date().toISOString();
            const reminder: Reminder = {
              id: body.id || `rem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              userId,
              projectId: body.projectId || undefined,
              projectTitle: body.projectTitle || undefined,
              title: body.title.trim(),
              message: body.message?.trim() || body.description?.trim() || '',
              description: body.description?.trim() || body.message?.trim() || '',
              category: body.category || 'follow-up',
              priority: body.priority || 'medium',
              dateTime: new Date(body.dateTime).toISOString(),
              timezone: body.timezone || 'UTC',
              recurrence: body.recurrence || 'once',
              customRecurrenceDays: body.customRecurrenceDays,
              channel: body.channel || 'in-app',
              channels,
              contactEmail: body.contactEmail?.trim(),
              contactPhone: body.contactPhone?.trim(),
              whatsappConsent: Boolean(body.whatsappConsent),
              whatsappConsentTimestamp: body.whatsappConsent ? now : undefined,
              notificationSchedule: body.notificationSchedule || 'at-due-time',
              customLeadTimeMinutes: body.customLeadTimeMinutes,
              enabled: body.enabled !== false,
              status: 'upcoming',
              snoozeCount: 0,
              createdAt: now,
              updatedAt: now,
            };

            const created = dbManager.createReminder(reminder);
            scheduleNotificationJobs(created);

            dbManager.createReminderEvent({
              id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              reminderId: created.id,
              userId,
              eventType: 'created',
              details: `Created reminder "${created.title}" due at ${new Date(created.dateTime).toLocaleString()}`,
              timestamp: now,
            });

            return sendJson(res, created, 201);
          }

          // PATCH /api/reminders/:id
          const reminderPatchMatch = url.match(/^\/api\/reminders\/([^/?]+)$/);
          if (reminderPatchMatch && method === 'PATCH') {
            const body = await parseJsonBody(req);
            const id = reminderPatchMatch[1];
            const existing = dbManager.getReminder(id, userId);
            if (!existing) return sendError(res, 'Reminder not found', 404);

            if (body.channels && body.channels.includes('email') && body.contactEmail) {
              if (!validateEmail(body.contactEmail)) {
                return sendError(res, 'A valid contact email address is required', 400);
              }
            }
            if (body.channels && body.channels.includes('whatsapp') && body.contactPhone) {
              const phoneCheck = validatePhone(body.contactPhone);
              if (!phoneCheck.valid) {
                return sendError(res, phoneCheck.error || 'A valid phone number is required', 400);
              }
            }

            const updated = dbManager.updateReminder(id, body, userId);

            // Reschedule jobs if timing, channels, or schedule changed
            if (body.dateTime || body.notificationSchedule || body.channels || body.status || body.enabled !== undefined) {
              scheduleNotificationJobs(updated);
            }

            dbManager.createReminderEvent({
              id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              reminderId: id,
              userId,
              eventType: 'rescheduled',
              details: `Updated reminder "${updated.title}"`,
              timestamp: new Date().toISOString(),
            });

            return sendJson(res, updated);
          }

          // DELETE /api/reminders/:id
          const reminderDelMatch = url.match(/^\/api\/reminders\/([^/?]+)$/);
          if (reminderDelMatch && method === 'DELETE') {
            const id = reminderDelMatch[1];
            const existing = dbManager.getReminder(id, userId);
            if (!existing) return sendError(res, 'Reminder not found', 404);

            dbManager.deleteReminder(id, userId);
            return sendJson(res, { success: true });
          }

          // ---------------- USERS & SOCIAL ----------------
          // GET /api/users
          if (url === '/api/users' && method === 'GET') {
            const allUsers = dbManager.getUserProfiles();
            const socialProfiles = allUsers.map((u) => dbManager.getUserSocialProfile(u.id, userId));
            return sendJson(res, socialProfiles);
          }

          // GET /api/users/:id/followers
          const followersMatch = url.match(/^\/api\/users\/([^/?]+)\/followers$/);
          if (followersMatch && method === 'GET') {
            const followers = dbManager.getFollowers(followersMatch[1]);
            return sendJson(res, followers);
          }

          // GET /api/users/:id/following
          const followingMatch = url.match(/^\/api\/users\/([^/?]+)\/following$/);
          if (followingMatch && method === 'GET') {
            const following = dbManager.getFollowing(followingMatch[1]);
            return sendJson(res, following);
          }

          // POST /api/users/:id/follow
          const followPostMatch = url.match(/^\/api\/users\/([^/?]+)\/follow$/);
          if (followPostMatch && method === 'POST') {
            const body = await parseJsonBody(req).catch(() => ({}));
            const result = dbManager.followUser(userId, followPostMatch[1], body.requiresRequest);
            return sendJson(res, result);
          }

          // DELETE /api/users/:id/follow
          const followDelMatch = url.match(/^\/api\/users\/([^/?]+)\/follow$/);
          if (followDelMatch && method === 'DELETE') {
            dbManager.unfollowUser(userId, followDelMatch[1]);
            return sendJson(res, { success: true });
          }

          // POST /api/users/:id/follow/respond (Accept or decline follow request)
          const followRespondMatch = url.match(/^\/api\/users\/([^/?]+)\/follow\/respond$/);
          if (followRespondMatch && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.action || !['accept', 'decline'].includes(body.action)) {
              return sendError(res, "Action must be 'accept' or 'decline'", 400);
            }
            dbManager.respondFollowRequest(followRespondMatch[1], userId, body.action);
            return sendJson(res, { success: true, action: body.action });
          }

          // GET /api/users/:id
          const userGetMatch = url.match(/^\/api\/users\/([^/?]+)$/);
          if (userGetMatch && method === 'GET') {
            const profile = dbManager.getUserSocialProfile(userGetMatch[1], userId);
            if (!profile) return sendError(res, 'User not found', 404);
            return sendJson(res, profile);
          }

          // PUT /api/users/:id
          const userPutMatch = url.match(/^\/api\/users\/([^/?]+)$/);
          if (userPutMatch && method === 'PUT') {
            const body = await parseJsonBody(req);
            const updated = dbManager.updateUserProfile(userPutMatch[1], body);
            const social = dbManager.getUserSocialProfile(userPutMatch[1], userId);
            return sendJson(res, social || updated);
          }

          // ---------------- COLLABORATIONS ----------------
          // GET /api/collaborations
          if (url.startsWith('/api/collaborations') && method === 'GET') {
            const urlObj = new URL(url, 'http://localhost');
            const projectId = urlObj.searchParams.get('projectId') || undefined;
            const requests = dbManager.getCollaborationRequests(projectId, userId);
            return sendJson(res, requests);
          }

          // POST /api/collaborations
          if (url === '/api/collaborations' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.projectId) return sendError(res, 'projectId is required', 400);
            if (!body.message) return sendError(res, 'message is required', 400);
            const result = dbManager.createCollaborationRequest(
              body.projectId,
              userId,
              body.skills || '',
              body.message
            );
            return sendJson(res, result, 201);
          }

          // POST /api/collaborations/:id/respond
          const collabRespondMatch = url.match(/^\/api\/collaborations\/([^/?]+)\/respond$/);
          if (collabRespondMatch && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.action || !['accept', 'decline'].includes(body.action)) {
              return sendError(res, "Action must be 'accept' or 'decline'", 400);
            }
            const result = dbManager.respondCollaborationRequest(
              collabRespondMatch[1],
              body.action,
              userId
            );
            return sendJson(res, result);
          }

          // Fallback 404 for unmatched /api routes
          return sendError(res, `API route not found: ${method} ${url}`, 404);
        } catch (error: any) {
          console.error('[API Middleware Error]', error);
          return sendError(res, error.message || 'Internal Server Error', 500);
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: any) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const method = req.method || 'GET';
        const userId = (req.headers['x-user-id'] as string) || 'user-1';

        try {
          if (url === '/api/health') {
            return sendJson(res, { status: 'healthy', storage: 'sqlite', timestamp: new Date().toISOString() });
          }
          if (url.startsWith('/api/projects') && method === 'GET') {
            return sendJson(res, dbManager.getProjects(userId));
          }
          if (url.startsWith('/api/teams') && method === 'GET') {
            return sendJson(res, dbManager.getTeams());
          }
          if (url.startsWith('/api/reminders') && method === 'GET') {
            return sendJson(res, dbManager.getReminders());
          }
          if (url.startsWith('/api/users') && method === 'GET') {
            const allUsers = dbManager.getUserProfiles();
            return sendJson(res, allUsers.map((u) => dbManager.getUserSocialProfile(u.id, userId)));
          }
          if (url.startsWith('/api/collaborations') && method === 'GET') {
            return sendJson(res, dbManager.getCollaborationRequests(undefined, userId));
          }
          return next();
        } catch {
          return next();
        }
      });
    },
  };
}
