import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dbManager } from './db.ts';
import { aiService } from './aiService.ts';
import type { Project, Reminder } from '../src/types/index.ts';
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

          // ---------------- TEAMS & COLLABORATION ----------------
          // GET /api/teams
          if (url.startsWith('/api/teams') && !url.includes('/join-requests') && !url.includes('/projects') && !url.includes('/tasks') && !url.includes('/activities') && !url.includes('/comments') && !url.includes('/analytics') && !url.includes('/invitations') && !url.includes('/transfer-ownership') && !url.includes('/leave') && !url.includes('/members') && method === 'GET') {
            const urlObj = new URL(url, 'http://localhost');
            const pathParts = urlObj.pathname.split('/').filter(Boolean); // ['api', 'teams', optional id]
            if (pathParts.length === 2) {
              const visibility = urlObj.searchParams.get('visibility') || undefined;
              const category = urlObj.searchParams.get('category') || undefined;
              const q = urlObj.searchParams.get('q') || undefined;
              const mine = urlObj.searchParams.get('mine') === 'true';

              let teams = dbManager.getTeams({ userId, visibility, category, query: q });
              if (mine) {
                teams = teams.filter((t) => t.ownerId === userId || (t.members && t.members.some((m) => m.id === userId)));
              }
              return sendJson(res, teams);
            } else if (pathParts.length === 3) {
              const teamId = pathParts[2];
              const team = dbManager.getTeam(teamId, userId);
              if (!team) return sendError(res, 'Team not found or access denied', 404);
              return sendJson(res, team);
            }
          }

          // POST /api/teams
          if (url === '/api/teams' && method === 'POST') {
            try {
              const body = await parseJsonBody(req);
              if (!body.name || !body.name.trim()) {
                return sendError(res, 'Team name is required', 400);
              }
              const created = dbManager.createTeam(body, userId);
              return sendJson(res, created, 201);
            } catch (err: any) {
              return sendError(res, err.message, 400);
            }
          }

          // PATCH /api/teams/:id
          const teamPatchMatch = url.match(/^\/api\/teams\/([^/?]+)$/);
          if (teamPatchMatch && method === 'PATCH') {
            try {
              const teamId = teamPatchMatch[1];
              const body = await parseJsonBody(req);
              const updated = dbManager.updateTeam(teamId, body, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id
          const teamDeleteMatch = url.match(/^\/api\/teams\/([^/?]+)$/);
          if (teamDeleteMatch && method === 'DELETE') {
            try {
              const teamId = teamDeleteMatch[1];
              dbManager.deleteTeam(teamId, userId);
              return sendJson(res, { success: true });
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/transfer-ownership
          const transferOwnershipMatch = url.match(/^\/api\/teams\/([^/]+)\/transfer-ownership$/);
          if (transferOwnershipMatch && method === 'POST') {
            try {
              const teamId = transferOwnershipMatch[1];
              const body = await parseJsonBody(req);
              if (!body.newOwnerId) return sendError(res, 'newOwnerId is required', 400);
              const updated = dbManager.transferTeamOwnership(teamId, body.newOwnerId, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/leave
          const leaveTeamMatch = url.match(/^\/api\/teams\/([^/]+)\/leave$/);
          if (leaveTeamMatch && method === 'POST') {
            try {
              const teamId = leaveTeamMatch[1];
              const updated = dbManager.leaveTeam(teamId, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              return sendError(res, err.message, 400);
            }
          }

          // POST /api/teams/:id/members/:memberId/role
          const roleMatch = url.match(/^\/api\/teams\/([^/]+)\/members\/([^/]+)\/role$/);
          if (roleMatch && method === 'POST') {
            try {
              const [, teamId, memberId] = roleMatch;
              const body = await parseJsonBody(req);
              if (!body.role || (body.role !== 'admin' && body.role !== 'member')) {
                return sendError(res, 'Valid role (admin or member) is required', 400);
              }
              const updated = dbManager.updateMemberRole(teamId, memberId, body.role, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id/members/:memberId
          const removeMemberMatch = url.match(/^\/api\/teams\/([^/]+)\/members\/([^/]+)$/);
          if (removeMemberMatch && method === 'DELETE') {
            try {
              const [, teamId, memberId] = removeMemberMatch;
              const updated = dbManager.removeTeamMember(teamId, memberId, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/teams/:id/invitations
          const teamInvitationsGetMatch = url.match(/^\/api\/teams\/([^/]+)\/invitations$/);
          if (teamInvitationsGetMatch && method === 'GET') {
            try {
              const teamId = teamInvitationsGetMatch[1];
              const invitations = dbManager.getTeamInvitations(teamId, userId);
              return sendJson(res, invitations);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/invitations
          const teamInvitationsPostMatch = url.match(/^\/api\/teams\/([^/]+)\/invitations$/);
          if (teamInvitationsPostMatch && method === 'POST') {
            try {
              const teamId = teamInvitationsPostMatch[1];
              const body = await parseJsonBody(req);
              if (!body.inviteeIdentifier || !body.inviteeIdentifier.trim()) {
                return sendError(res, 'inviteeIdentifier (email or username) is required', 400);
              }
              const result = dbManager.createTeamInvitation(
                teamId,
                body.inviteeIdentifier,
                body.role || 'member',
                userId,
                body.message
              );
              return sendJson(res, result, 201);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id/invitations/:invId
          const teamInvitationsDeleteMatch = url.match(/^\/api\/teams\/([^/]+)\/invitations\/([^/]+)$/);
          if (teamInvitationsDeleteMatch && method === 'DELETE') {
            try {
              const [, , invId] = teamInvitationsDeleteMatch;
              const cancelled = dbManager.cancelTeamInvitation(invId, userId);
              return sendJson(res, cancelled);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/user/invitations
          if (url === '/api/user/invitations' && method === 'GET') {
            try {
              const profile = dbManager.getUserSocialProfile(userId);
              const invitations = dbManager.getUserInvitations(userId, profile?.email);
              return sendJson(res, invitations);
            } catch (err: any) {
              return sendError(res, err.message, 400);
            }
          }

          // POST /api/invitations/:id/accept
          const acceptInvMatch = url.match(/^\/api\/invitations\/([^/]+)\/accept$/);
          if (acceptInvMatch && method === 'POST') {
            try {
              const invId = acceptInvMatch[1];
              const result = dbManager.acceptTeamInvitation(invId, userId);
              return sendJson(res, result);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/invitations/:id/decline
          const declineInvMatch = url.match(/^\/api\/invitations\/([^/]+)\/decline$/);
          if (declineInvMatch && method === 'POST') {
            try {
              const invId = declineInvMatch[1];
              const result = dbManager.declineTeamInvitation(invId, userId);
              return sendJson(res, result);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/join-requests
          const joinRequestPostMatch = url.match(/^\/api\/teams\/([^/]+)\/join-requests$/);
          if (joinRequestPostMatch && method === 'POST') {
            try {
              const teamId = joinRequestPostMatch[1];
              const body = await parseJsonBody(req);
              const user = dbManager.getUserSocialProfile(userId);
              const newReq = dbManager.createJoinRequest(teamId, {
                userId,
                userName: user?.name || 'Anonymous User',
                userAvatar: user?.avatar,
                message: body.message || 'I would like to contribute to this team.',
                skills: body.skills || user?.skills || [],
              });
              return sendJson(res, newReq, 201);
            } catch (err: any) {
              return sendError(res, err.message, 400);
            }
          }

          // POST /api/teams/:id/join-requests/:reqId/approve
          const joinApproveMatch = url.match(/^\/api\/teams\/([^/]+)\/join-requests\/([^/]+)\/approve$/);
          if (joinApproveMatch && method === 'POST') {
            try {
              const [, teamId, reqId] = joinApproveMatch;
              const updated = dbManager.approveJoinRequest(teamId, reqId, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/join-requests/:reqId/reject
          const joinRejectMatch = url.match(/^\/api\/teams\/([^/]+)\/join-requests\/([^/]+)\/reject$/);
          if (joinRejectMatch && method === 'POST') {
            try {
              const [, teamId, reqId] = joinRejectMatch;
              const updated = dbManager.rejectJoinRequest(teamId, reqId, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/projects (share project)
          const shareProjectMatch = url.match(/^\/api\/teams\/([^/]+)\/projects$/);
          if (shareProjectMatch && method === 'POST') {
            try {
              const teamId = shareProjectMatch[1];
              const body = await parseJsonBody(req);
              if (!body.projectId) return sendError(res, 'projectId is required', 400);
              const result = dbManager.shareProjectWithTeam(teamId, body.projectId, userId);
              return sendJson(res, result);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id/projects/:projectId (unshare project)
          const unshareProjectMatch = url.match(/^\/api\/teams\/([^/]+)\/projects\/([^/]+)$/);
          if (unshareProjectMatch && method === 'DELETE') {
            try {
              const [, teamId, projectId] = unshareProjectMatch;
              const result = dbManager.unshareProjectFromTeam(teamId, projectId, userId);
              return sendJson(res, result);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/teams/:id/tasks
          const teamTasksGetMatch = url.match(/^\/api\/teams\/([^/]+)\/tasks$/);
          if (teamTasksGetMatch && method === 'GET') {
            try {
              const teamId = teamTasksGetMatch[1];
              const tasks = dbManager.getTeamTasks(teamId, userId);
              return sendJson(res, tasks);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/tasks
          const teamTasksPostMatch = url.match(/^\/api\/teams\/([^/]+)\/tasks$/);
          if (teamTasksPostMatch && method === 'POST') {
            try {
              const teamId = teamTasksPostMatch[1];
              const body = await parseJsonBody(req);
              if (!body.title || !body.title.trim()) {
                return sendError(res, 'Task title is required', 400);
              }
              const created = dbManager.createTeamTask({ ...body, teamId }, userId);
              return sendJson(res, created, 201);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // PATCH /api/teams/:id/tasks/:taskId
          const teamTasksPatchMatch = url.match(/^\/api\/teams\/([^/]+)\/tasks\/([^/]+)$/);
          if (teamTasksPatchMatch && method === 'PATCH') {
            try {
              const [, , taskId] = teamTasksPatchMatch;
              const body = await parseJsonBody(req);
              const updated = dbManager.updateTeamTask(taskId, body, userId);
              return sendJson(res, updated);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id/tasks/:taskId
          const teamTasksDeleteMatch = url.match(/^\/api\/teams\/([^/]+)\/tasks\/([^/]+)$/);
          if (teamTasksDeleteMatch && method === 'DELETE') {
            try {
              const [, , taskId] = teamTasksDeleteMatch;
              dbManager.deleteTeamTask(taskId, userId);
              return sendJson(res, { success: true });
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/teams/:id/activities
          const teamActivitiesGetMatch = url.match(/^\/api\/teams\/([^/]+)\/activities$/);
          if (teamActivitiesGetMatch && method === 'GET') {
            try {
              const teamId = teamActivitiesGetMatch[1];
              const activities = dbManager.getTeamActivities(teamId, userId);
              return sendJson(res, activities);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/teams/:id/comments
          const teamCommentsGetMatch = url.match(/^\/api\/teams\/([^/?]+)\/comments/);
          if (teamCommentsGetMatch && method === 'GET') {
            try {
              const teamId = teamCommentsGetMatch[1];
              const urlObj = new URL(url, 'http://localhost');
              const projectId = urlObj.searchParams.get('projectId') || undefined;
              const taskId = urlObj.searchParams.get('taskId') || undefined;
              const comments = dbManager.getTeamComments(teamId, { projectId, taskId }, userId);
              return sendJson(res, comments);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // POST /api/teams/:id/comments
          const teamCommentsPostMatch = url.match(/^\/api\/teams\/([^/]+)\/comments$/);
          if (teamCommentsPostMatch && method === 'POST') {
            try {
              const teamId = teamCommentsPostMatch[1];
              const body = await parseJsonBody(req);
              if (!body.content || !body.content.trim()) {
                return sendError(res, 'Comment content is required', 400);
              }
              const created = dbManager.createTeamComment({ ...body, teamId }, userId);
              return sendJson(res, created, 201);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // DELETE /api/teams/:id/comments/:commentId
          const teamCommentsDeleteMatch = url.match(/^\/api\/teams\/([^/]+)\/comments\/([^/]+)$/);
          if (teamCommentsDeleteMatch && method === 'DELETE') {
            try {
              const [, , commentId] = teamCommentsDeleteMatch;
              dbManager.deleteTeamComment(commentId, userId);
              return sendJson(res, { success: true });
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
          }

          // GET /api/teams/:id/analytics
          const teamAnalyticsGetMatch = url.match(/^\/api\/teams\/([^/]+)\/analytics$/);
          if (teamAnalyticsGetMatch && method === 'GET') {
            try {
              const teamId = teamAnalyticsGetMatch[1];
              const analytics = dbManager.getTeamAnalytics(teamId, userId);
              return sendJson(res, analytics);
            } catch (err: any) {
              const status = err.message.includes('Forbidden') ? 403 : 400;
              return sendError(res, err.message, status);
            }
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
