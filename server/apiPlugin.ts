import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dbManager } from './db.ts';
import { aiService } from './aiService.ts';
import type { Project, Team, Reminder } from '../src/types/index.ts';

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
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
            const { projectId, prompt, mode } = body;
            if (!projectId || !prompt) {
              return sendError(res, 'projectId and prompt are required.', 400);
            }
            try {
              const response = await aiService.generateProjectGuidance(projectId, prompt, mode, userId);
              return sendJson(res, response);
            } catch (err: any) {
              return sendError(res, err.message, err.statusCode || 500);
            }
          }

          // ---------------- AI FUSION ----------------
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

          // POST /api/ai/fusion/:id/approve
          const fusionApproveMatch = url.match(/^\/api\/ai\/fusion\/([^\/]+)\/approve$/);
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
          const projectMatch = url.match(/^\/api\/projects\/([^\/\?]+)(\/.*)?$/);
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
          const joinApproveMatch = url.match(/^\/api\/teams\/([^\/]+)\/join-requests\/([^\/]+)\/approve$/);
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

          // ---------------- REMINDERS ----------------
          // GET /api/reminders
          if (url === '/api/reminders' && method === 'GET') {
            const reminders = dbManager.getReminders();
            return sendJson(res, reminders);
          }

          // POST /api/reminders
          if (url === '/api/reminders' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.title) return sendError(res, 'Reminder title is required', 400);
            const reminder: Reminder = {
              id: `rem-${Date.now().toString(36)}`,
              projectId: body.projectId,
              projectTitle: body.projectTitle,
              title: body.title.trim(),
              message: body.message?.trim() || '',
              dateTime: body.dateTime || new Date().toISOString(),
              recurrence: body.recurrence || 'once',
              channel: body.channel || 'in-app',
              enabled: true,
              status: 'upcoming',
              createdAt: new Date().toISOString(),
            };
            const created = dbManager.createReminder(reminder);
            return sendJson(res, created, 201);
          }

          // PATCH /api/reminders/:id
          const reminderPatchMatch = url.match(/^\/api\/reminders\/([^/?]+)$/);
          if (reminderPatchMatch && method === 'PATCH') {
            const body = await parseJsonBody(req);
            const updated = dbManager.updateReminder(reminderPatchMatch[1], body);
            return sendJson(res, updated);
          }

          // DELETE /api/reminders/:id
          const reminderDelMatch = url.match(/^\/api\/reminders\/([^/?]+)$/);
          if (reminderDelMatch && method === 'DELETE') {
            dbManager.deleteReminder(reminderDelMatch[1]);
            return sendJson(res, { success: true });
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
          return next();
        } catch {
          return next();
        }
      });
    },
  };
}
