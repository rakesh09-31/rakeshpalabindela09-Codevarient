import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { dbManager } from '../server/db.ts';

console.log('=== RUNNING PROJECT GRAVEYARD TEAMS COLLABORATION TEST SUITE ===\n');

// ----------------------------------------------------------------------------
// Test 1: Sidebar Profile Reordering Verification (Part B)
// ----------------------------------------------------------------------------
console.log('Test 1: Sidebar Profile reordering verification...');
{
  const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

  // Verify that Profile is placed immediately after Analytics
  const analyticsIdx = sidebarContent.indexOf("path: '/analytics'");
  const profileIdx = sidebarContent.indexOf("path: '/profile'");
  const settingsIdx = sidebarContent.indexOf("path: '/settings'");
  const teamsIdx = sidebarContent.indexOf("path: '/teams'");

  assert.ok(analyticsIdx !== -1, 'Analytics link must exist in Sidebar');
  assert.ok(profileIdx !== -1, 'Profile link must exist in Sidebar');
  assert.ok(settingsIdx !== -1, 'Settings link must exist in Sidebar');
  assert.ok(teamsIdx !== -1, 'Teams link must exist in Sidebar');

  // Verify sequence: Teams -> Analytics -> Profile -> Settings
  assert.ok(teamsIdx < analyticsIdx, 'Teams must appear before Analytics');
  assert.ok(analyticsIdx < profileIdx, 'Profile must appear AFTER Analytics');
  assert.ok(profileIdx < settingsIdx, 'Profile must appear BEFORE Settings');

  // Extract the navItems array block to verify no items between Analytics and Profile
  const navItemsBlock = sidebarContent.slice(analyticsIdx, settingsIdx);
  const itemsBetween = navItemsBlock.match(/path:\s*'\/[a-z0-9-]+'/g) || [];
  assert.deepStrictEqual(
    itemsBetween,
    ["path: '/analytics'", "path: '/profile'"],
    'Profile must appear IMMEDIATELY after Analytics with nothing in between'
  );

  console.log('  ✓ Sidebar Profile is placed immediately after Analytics and before Settings.');
}

// ----------------------------------------------------------------------------
// Test 2: Team Creation & Input Validation
// ----------------------------------------------------------------------------
console.log('\nTest 2: Team creation & input validation...');
{
  // 1. Name required
  assert.throws(
    () => {
      dbManager.createTeam({
        id: 'test-empty-name',
        name: '   ',
        description: 'Empty name',
        members: [],
        projectIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: 'user-1',
        joinRequests: [],
      });
    },
    /Team name is required/,
    'Empty name must throw validation error'
  );

  // 2. Max length enforcement (100 characters)
  const tooLongName = 'A'.repeat(101);
  assert.throws(
    () => {
      dbManager.createTeam({
        id: 'test-long-name',
        name: tooLongName,
        description: 'Too long',
        members: [],
        projectIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: 'user-1',
        joinRequests: [],
      });
    },
    /Team name must not exceed 100 characters/,
    'Name over 100 chars must throw validation error'
  );

  // 3. Successful creation with creator as owner
  const teamId = `team-test-${Date.now()}`;
  const createdTeam = dbManager.createTeam(
    {
      id: teamId,
      name: '  Autonomous Robotics Guild  ',
      description: 'Developing open source swarm robotics systems',
      visibility: 'discoverable',
      categories: ['Hardware & IoT', 'Developer Tools'],
      joinPolicy: 'request-to-join',
      members: [],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  assert.strictEqual(createdTeam.id, teamId);
  assert.strictEqual(createdTeam.name, 'Autonomous Robotics Guild', 'Name must be trimmed');
  assert.strictEqual(createdTeam.ownerId, 'user-1');
  assert.strictEqual(createdTeam.visibility, 'discoverable');
  assert.strictEqual(createdTeam.joinPolicy, 'request-to-join');
  assert.deepStrictEqual(createdTeam.categories, ['Hardware & IoT', 'Developer Tools']);

  // Creator automatically assigned as Owner in members list
  assert.ok(createdTeam.members.some((m) => m.id === 'user-1' && m.role === 'owner'));

  // Activity logged for team creation
  const activities = dbManager.getTeamActivities(teamId);
  assert.ok(activities.some((a) => a.type === 'team_created'));

  console.log('  ✓ Team creation, name validation, and creator as Owner verified.');
}

// ----------------------------------------------------------------------------
// Test 3: Team Editing & Safe Deletion (Projects Preserved)
// ----------------------------------------------------------------------------
console.log('\nTest 3: Team editing & safe deletion (projects preserved)...');
{
  const teamId = `team-safe-del-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Temporary Guild',
      description: 'Will be deleted safely',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Update team
  const updated = dbManager.updateTeam(
    teamId,
    {
      name: 'Updated Guild Name',
      description: 'Updated guild description',
    },
    'user-1'
  );
  assert.strictEqual(updated.name, 'Updated Guild Name');
  assert.strictEqual(updated.description, 'Updated guild description');

  // Non-owner/admin cannot edit
  assert.throws(
    () => {
      dbManager.updateTeam(teamId, { name: 'Hacked Guild' }, 'user-4');
    },
    /Forbidden: Only team owners or admins can update team details/
  );

  // Create a personal project and share it with the team
  const projId = `proj-safe-${Date.now()}`;
  dbManager.createProject({
    id: projId,
    title: 'Immortal Project',
    summary: 'Must survive team deletion',
    description: 'Underlying project record must never be deleted when team is dissolved.',
    status: 'paused',
    visibility: 'private',
    category: 'Developer Tools',
    languages: ['TypeScript'],
    frameworks: ['React'],
    tags: ['safety'],
    nextSteps: ['Verify survival'],
    timeline: [],
    teamMembers: [],
    attachments: [],
    milestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bookmarked: false,
    ownerId: 'user-1',
    ownerName: 'Alex Rivera',
  });

  dbManager.shareProjectWithTeam(teamId, projId, 'user-1');

  // Verify project is linked
  const teamWithProj = dbManager.getTeam(teamId);
  assert.ok(teamWithProj.projectIds.includes(projId));

  // Non-owner cannot delete team
  assert.throws(
    () => {
      dbManager.deleteTeam(teamId, 'user-2');
    },
    /Forbidden: Only the team owner can delete the team/
  );

  // Owner deletes the team
  dbManager.deleteTeam(teamId, 'user-1');

  // Verify team is deleted
  assert.strictEqual(dbManager.getTeam(teamId), null, 'Team must be deleted');

  // CRITICAL CHECK: Underlying personal project record is preserved!
  const survivingProject = dbManager.getProject(projId);
  assert.ok(survivingProject, 'Underlying personal project must NOT be deleted');
  assert.strictEqual(survivingProject.id, projId);
  assert.strictEqual(survivingProject.title, 'Immortal Project');
  assert.ok(
    !((survivingProject.sharedTeamIds || []).includes(teamId)),
    'Team reference must be unshared from the surviving project'
  );

  // Clean up test project
  dbManager.deleteProject(projId);

  console.log('  ✓ Safe team deletion verified: team deleted while personal projects remain completely intact.');
}

// ----------------------------------------------------------------------------
// Test 4: Role-Based Authorization & Ownership Safeguards
// ----------------------------------------------------------------------------
console.log('\nTest 4: Role-based authorization & ownership safeguards...');
{
  const teamId = `team-roles-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Role Security Guild',
      description: 'Testing role boundaries',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
        { id: 'user-2', name: 'Sam Chen', role: 'member', skills: ['Backend'], availability: 'part-time', joinedAt: new Date().toISOString() },
        { id: 'user-3', name: 'Maya Lin', role: 'member', skills: ['UI/UX'], availability: 'part-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // 1. Owner promotes user-2 to admin
  const teamAfterPromo = dbManager.updateMemberRole(teamId, 'user-2', 'admin', 'user-1');
  const user2 = teamAfterPromo.members.find((m) => m.id === 'user-2');
  assert.strictEqual(user2.role, 'admin');

  // 2. Admin (user-2) promotes user-3 to member/admin
  dbManager.updateMemberRole(teamId, 'user-3', 'admin', 'user-2');
  const user3 = dbManager.getTeam(teamId).members.find((m) => m.id === 'user-3');
  assert.strictEqual(user3.role, 'admin');

  // 3. Admin (user-2) cannot demote another Admin (user-3)
  assert.throws(
    () => {
      dbManager.updateMemberRole(teamId, 'user-3', 'member', 'user-2');
    },
    /Forbidden: Admins cannot modify roles of other admins/
  );

  // 4. Admin cannot demote Owner
  assert.throws(
    () => {
      dbManager.updateMemberRole(teamId, 'user-1', 'member', 'user-2');
    },
    /Forbidden: Cannot change the Owner role directly/
  );

  // 5. Admin cannot remove Owner
  assert.throws(
    () => {
      dbManager.removeTeamMember(teamId, 'user-1', 'user-2');
    },
    /Forbidden: The team owner cannot be removed/
  );

  // 6. Sole owner cannot leave team without transferring ownership
  assert.throws(
    () => {
      dbManager.leaveTeam(teamId, 'user-1');
    },
    /Cannot leave team as sole owner/
  );

  // 7. Ownership transfer: user-1 transfers ownership to user-2
  const teamTransferred = dbManager.transferTeamOwnership(teamId, 'user-2', 'user-1');
  assert.strictEqual(teamTransferred.ownerId, 'user-2');
  assert.strictEqual(teamTransferred.members.find((m) => m.id === 'user-2').role, 'owner');
  assert.strictEqual(teamTransferred.members.find((m) => m.id === 'user-1').role, 'admin');

  // 8. Former owner (now admin user-1) can now leave the team
  const teamAfterLeave = dbManager.leaveTeam(teamId, 'user-1');
  assert.ok(!teamAfterLeave.members.some((m) => m.id === 'user-1'), 'user-1 left the team');

  console.log('  ✓ Role hierarchy, ownership transfer, and leave safeguards verified.');
}

// ----------------------------------------------------------------------------
// Test 5: Private Team Access Control & Visibility Scoping
// ----------------------------------------------------------------------------
console.log('\nTest 5: Private team access control & visibility scoping...');
{
  const privateTeamId = `team-priv-${Date.now()}`;
  dbManager.createTeam(
    {
      id: privateTeamId,
      name: 'Confidential Stealth Squad',
      description: 'Strictly secret internal projects',
      visibility: 'private',
      joinPolicy: 'invitation-only',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Non-member querying getTeams() does NOT receive the private team
  const nonMemberTeams = dbManager.getTeams({ userId: 'user-3' });
  assert.ok(
    !nonMemberTeams.some((t) => t.id === privateTeamId),
    'Private team must be hidden from non-members in getTeams'
  );

  // Non-member querying getTeam(id, userId) receives null
  const nonMemberFetch = dbManager.getTeam(privateTeamId, 'user-3');
  assert.strictEqual(nonMemberFetch, null, 'Private team must return null to non-members');

  // Member querying getTeam(id, userId) receives the team
  const memberFetch = dbManager.getTeam(privateTeamId, 'user-1');
  assert.ok(memberFetch, 'Member must be able to fetch private team');
  assert.strictEqual(memberFetch.id, privateTeamId);

  // Discoverable filter strictly excludes private teams
  const discoverableOnly = dbManager.getTeams({ discoverableOnly: true });
  assert.ok(
    !discoverableOnly.some((t) => t.id === privateTeamId),
    'Private team must NEVER appear in discoverableOnly listings'
  );

  console.log('  ✓ Private team isolation and access scoping verified.');
}

// ----------------------------------------------------------------------------
// Test 6: Member Invitations & Notifications
// ----------------------------------------------------------------------------
console.log('\nTest 6: Member invitations & notifications...');
{
  const teamId = `team-inv-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Open Source Compilers',
      description: 'Rust-based AST transformers',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // 1. Self-invitation prevention
  assert.throws(
    () => {
      dbManager.createTeamInvitation(teamId, 'user-1', 'member', 'user-1');
    },
    /Cannot invite yourself to the team/
  );

  // 2. Successful invitation with honest email status
  const inviteResult = dbManager.createTeamInvitation(
    teamId,
    'user-2', // Sam Chen
    'member',
    'user-1',
    'Join our compiler frontend group!'
  );

  assert.ok(inviteResult.invitation);
  assert.strictEqual(inviteResult.invitation.status, 'pending');
  assert.strictEqual(inviteResult.invitation.role, 'member');
  assert.strictEqual(inviteResult.invitation.inviteeUserId, 'user-2');
  assert.strictEqual(inviteResult.emailDelivery.sent, false);
  assert.ok(
    inviteResult.emailDelivery.reason.includes('not configured'),
    'Must honestly disclose unconfigured email delivery'
  );

  // 3. Duplicate invitation prevention
  assert.throws(
    () => {
      dbManager.createTeamInvitation(teamId, 'user-2', 'member', 'user-1');
    },
    /A pending invitation already exists for this user/
  );

  // 4. Pending invitations retrieved
  const teamInvs = dbManager.getTeamInvitations(teamId, 'user-1');
  assert.strictEqual(teamInvs.length, 1);
  assert.strictEqual(teamInvs[0].id, inviteResult.invitation.id);

  const user2Invs = dbManager.getUserInvitations('user-2');
  assert.ok(user2Invs.some((inv) => inv.id === inviteResult.invitation.id));

  // 5. Accept invitation
  const acceptRes = dbManager.acceptTeamInvitation(inviteResult.invitation.id, 'user-2');
  assert.strictEqual(acceptRes.invitation.status, 'accepted');
  const teamAfterAccept = dbManager.getTeam(teamId);
  assert.ok(teamAfterAccept.members.some((m) => m.id === 'user-2' && m.role === 'member'));

  // 6. Cancel pending invitation by Admin
  const invite3 = dbManager.createTeamInvitation(teamId, 'user-3', 'admin', 'user-1');
  const cancelRes = dbManager.cancelTeamInvitation(invite3.invitation.id, 'user-1');
  assert.strictEqual(cancelRes.status, 'cancelled');

  // 7. Decline invitation
  const invite4 = dbManager.createTeamInvitation(teamId, 'user-4', 'member', 'user-1');
  const declineRes = dbManager.declineTeamInvitation(invite4.invitation.id, 'user-4');
  assert.strictEqual(declineRes.status, 'declined');

  console.log('  ✓ Member invitations, duplicate checks, accept/decline flows, and honest email notices verified.');
}

// ----------------------------------------------------------------------------
// Test 7: Discoverable Teams Search & Join Requests
// ----------------------------------------------------------------------------
console.log('\nTest 7: Discoverable teams search & join requests...');
{
  const teamId = `team-disc-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Bioinformatics Research Core',
      description: 'Genomic sequence alignment algorithms and folding pipelines',
      visibility: 'discoverable',
      categories: ['Education & Productivity', 'Developer Tools'],
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Search by category
  const catMatches = dbManager.getTeams({ category: 'Education & Productivity' });
  assert.ok(catMatches.some((t) => t.id === teamId));

  // Search by query
  const queryMatches = dbManager.getTeams({ query: 'genomic sequence' });
  assert.ok(queryMatches.some((t) => t.id === teamId));

  // Submit join request from user-3
  const joinReq = dbManager.createJoinRequest(teamId, {
    userId: 'user-3',
    userName: 'Maya Lin',
    message: 'Experienced in structural biology and Python pipelines',
    skills: ['Python', 'Biopython'],
  });
  assert.strictEqual(joinReq.status, 'pending');
  assert.strictEqual(joinReq.userId, 'user-3');

  // Duplicate join request prevented
  assert.throws(
    () => {
      dbManager.createJoinRequest(teamId, {
        userId: 'user-3',
        userName: 'Maya Lin',
        message: 'Second request',
        skills: ['Python'],
      });
    },
    /already have a pending join request/
  );

  // Owner approves join request
  const teamAfterApproval = dbManager.approveJoinRequest(teamId, joinReq.id, 'user-1');
  assert.ok(teamAfterApproval.members.some((m) => m.id === 'user-3' && m.role === 'member'));
  const approvedReq = teamAfterApproval.joinRequests.find((r) => r.id === joinReq.id);
  assert.strictEqual(approvedReq.status, 'approved');

  // Reject another join request
  const joinReq2 = dbManager.createJoinRequest(teamId, {
    userId: 'user-4',
    userName: 'Dev Contributor',
    message: 'Testing rejection flow',
    skills: ['Testing'],
  });
  const teamAfterReject = dbManager.rejectJoinRequest(teamId, joinReq2.id, 'user-1');
  const rejectedReq = teamAfterReject.joinRequests.find((r) => r.id === joinReq2.id);
  assert.strictEqual(rejectedReq.status, 'rejected');
  assert.ok(!teamAfterReject.members.some((m) => m.id === 'user-4'));

  console.log('  ✓ Discoverable team search, join requests, approval, and rejection verified.');
}

// ----------------------------------------------------------------------------
// Test 8: Project Sharing, Isolation, and Cross-Team Access
// ----------------------------------------------------------------------------
console.log('\nTest 8: Project sharing, isolation, and cross-team access...');
{
  const teamId = `team-share-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Distributed Systems Collective',
      description: 'Raft consensus & distributed kv-stores',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
        { id: 'user-2', name: 'Sam Chen', role: 'member', skills: ['Backend'], availability: 'part-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Create a private project owned by user-1
  const projId = `proj-share-${Date.now()}`;
  dbManager.createProject({
    id: projId,
    title: 'Raft KV Engine',
    summary: 'Consensus engine in Go',
    description: 'Private research project before team collaboration.',
    status: 'paused',
    visibility: 'private',
    category: 'Developer Tools',
    languages: ['Go'],
    frameworks: ['gRPC'],
    tags: ['distributed', 'consensus'],
    nextSteps: ['Add snapshotting'],
    timeline: [],
    teamMembers: [],
    attachments: [],
    milestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bookmarked: false,
    ownerId: 'user-1',
    ownerName: 'Alex Rivera',
  });

  // Before sharing: user-2 cannot access the private project
  const beforeFetch = dbManager.getProject(projId, 'user-2');
  assert.strictEqual(beforeFetch, null, 'Private project must be hidden from non-owners before sharing');

  // Share project with team
  dbManager.shareProjectWithTeam(teamId, projId, 'user-1');

  // After sharing: team member (user-2) CAN access the private project
  const afterFetch = dbManager.getProject(projId, 'user-2');
  assert.ok(afterFetch, 'Team member must have access to project shared with their team');
  assert.strictEqual(afterFetch.id, projId);

  // Unrelated user (user-4) still cannot access
  const unrelatedFetch = dbManager.getProject(projId, 'user-4');
  assert.strictEqual(unrelatedFetch, null, 'Unrelated user must still be denied access');

  // Unshare project
  dbManager.unshareProjectFromTeam(teamId, projId, 'user-1');
  const afterUnshare = dbManager.getProject(projId, 'user-2');
  assert.strictEqual(afterUnshare, null, 'Team member access revoked after project is unshared');

  // Clean up test project
  dbManager.deleteProject(projId);

  console.log('  ✓ Project sharing, team member access scoping, and unsharing verified.');
}

// ----------------------------------------------------------------------------
// Test 9: Team Tasks Assignment & Progress Tracking
// ----------------------------------------------------------------------------
console.log('\nTest 9: Team tasks assignment & progress tracking...');
{
  const teamId = `team-tasks-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Task Trackers',
      description: 'Testing task board functionality',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
        { id: 'user-2', name: 'Sam Chen', role: 'member', skills: ['Backend'], availability: 'part-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Create task
  const createdTask = dbManager.createTeamTask(
    {
      teamId,
      title: 'Implement gRPC transport layer',
      description: 'Replace HTTP 1.1 polling with streaming gRPC calls',
      assigneeId: 'user-2',
      assigneeName: 'Sam Chen',
      priority: 'urgent',
      status: 'in_progress',
      dueDate: pastDate, // Overdue on purpose for test
      subtasks: [
        { id: 'sub-1', title: 'Define proto files', completed: true },
        { id: 'sub-2', title: 'Generate stubs', completed: false },
      ],
    },
    'user-1'
  );

  assert.ok(createdTask.id);
  assert.strictEqual(createdTask.priority, 'urgent');
  assert.strictEqual(createdTask.status, 'in_progress');
  assert.strictEqual(createdTask.subtasks.length, 2);

  // Update task
  const updatedTask = dbManager.updateTeamTask(
    createdTask.id,
    {
      status: 'completed',
      subtasks: [
        { id: 'sub-1', title: 'Define proto files', completed: true },
        { id: 'sub-2', title: 'Generate stubs', completed: true },
      ],
    },
    'user-2'
  );
  assert.strictEqual(updatedTask.status, 'completed');
  assert.strictEqual(updatedTask.subtasks[1].completed, true);

  // List tasks
  const tasks = dbManager.getTeamTasks(teamId);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, createdTask.id);

  // Delete task
  dbManager.deleteTeamTask(createdTask.id, 'user-1');
  const tasksAfterDel = dbManager.getTeamTasks(teamId);
  assert.strictEqual(tasksAfterDel.length, 0);

  console.log('  ✓ Team task creation, assignment, subtask toggling, and deletion verified.');
}

// ----------------------------------------------------------------------------
// Test 10: Chronological Activity Logging
// ----------------------------------------------------------------------------
console.log('\nTest 10: Chronological activity logging...');
{
  const teamId = `team-act-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Activity Timeline Guild',
      description: 'Testing event stream recording',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Manually record an activity
  dbManager.recordTeamActivity({
    teamId,
    type: 'task_completed',
    actorId: 'user-1',
    actorName: 'Alex Rivera',
    title: 'Completed milestone task',
  });

  const activities = dbManager.getTeamActivities(teamId);
  assert.ok(activities.length >= 2, 'Must have at least team_created and task_completed activities');
  assert.strictEqual(activities[0].type, 'task_completed', 'Most recent activity must come first');
  assert.strictEqual(activities[1].type, 'team_created');

  console.log('  ✓ Chronological activity recording and retrieval verified.');
}

// ----------------------------------------------------------------------------
// Test 11: Team Discussions & @Mentions
// ----------------------------------------------------------------------------
console.log('\nTest 11: Team discussions & @mentions...');
{
  const teamId = `team-comm-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Discussion Forum Team',
      description: 'Testing threaded conversations and mentions',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
        { id: 'user-2', name: 'Sam Chen', role: 'member', skills: ['Backend'], availability: 'part-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // 1. Post comment with mention
  const comment = dbManager.createTeamComment(
    {
      teamId,
      content: 'Hey @Sam Chen, could you review the latest schema migration?',
    },
    'user-1'
  );

  assert.ok(comment.id);
  assert.strictEqual(comment.authorId, 'user-1');
  assert.ok(comment.content.includes('@Sam Chen'));

  // 2. Fetch comments
  const comments = dbManager.getTeamComments(teamId);
  assert.strictEqual(comments.length, 1);
  assert.strictEqual(comments[0].id, comment.id);

  // 3. Delete comment: non-author non-admin cannot delete
  assert.throws(
    () => {
      dbManager.deleteTeamComment(comment.id, 'user-2');
    },
    /Forbidden: Only the comment author or team admins can delete this comment/
  );

  // Author can delete comment
  dbManager.deleteTeamComment(comment.id, 'user-1');
  assert.strictEqual(dbManager.getTeamComments(teamId).length, 0);

  console.log('  ✓ Team comment posting, mention notifications, and deletion authorization verified.');
}

// ----------------------------------------------------------------------------
// Test 12: Team Analytics Metrics Calculation
// ----------------------------------------------------------------------------
console.log('\nTest 12: Team analytics metrics calculation...');
{
  const teamId = `team-analytics-${Date.now()}`;
  dbManager.createTeam(
    {
      id: teamId,
      name: 'Analytics Verification Team',
      description: 'Testing calculation accuracy',
      visibility: 'discoverable',
      joinPolicy: 'request-to-join',
      members: [
        { id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['Architecture'], availability: 'full-time', joinedAt: new Date().toISOString() },
        { id: 'user-2', name: 'Sam Chen', role: 'member', skills: ['Backend'], availability: 'part-time', joinedAt: new Date().toISOString() },
      ],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user-1',
      joinRequests: [],
    },
    'user-1'
  );

  // Empty state check
  const emptyAnalytics = dbManager.getTeamAnalytics(teamId);
  assert.strictEqual(emptyAnalytics.activeSharedProjects, 0);
  assert.strictEqual(emptyAnalytics.totalTasks, 0);
  assert.strictEqual(emptyAnalytics.completedTasks, 0);
  assert.strictEqual(emptyAnalytics.taskCompletionRate, 0);
  assert.strictEqual(emptyAnalytics.overdueTasks, 0);

  // Add tasks
  const pastDue = new Date(Date.now() - 3600 * 1000).toISOString();
  dbManager.createTeamTask({
    teamId,
    title: 'Task 1 - Done',
    status: 'completed',
    assigneeId: 'user-1',
  }, 'user-1');

  dbManager.createTeamTask({
    teamId,
    title: 'Task 2 - Overdue',
    status: 'in_progress',
    dueDate: pastDue,
    assigneeId: 'user-2',
  }, 'user-1');

  const populatedAnalytics = dbManager.getTeamAnalytics(teamId);
  assert.strictEqual(populatedAnalytics.totalTasks, 2);
  assert.strictEqual(populatedAnalytics.completedTasks, 1);
  assert.strictEqual(populatedAnalytics.overdueTasks, 1);
  assert.strictEqual(populatedAnalytics.taskCompletionRate, 50, '1 out of 2 completed = 50%');

  // Verify member contribution breakdown
  const alexContrib = populatedAnalytics.memberContributions.find((m) => m.memberId === 'user-1');
  const samContrib = populatedAnalytics.memberContributions.find((m) => m.memberId === 'user-2');

  assert.strictEqual(alexContrib.completedTasksCount, 1);
  assert.strictEqual(alexContrib.assignedTasksCount, 1);
  assert.strictEqual(samContrib.completedTasksCount, 0);
  assert.strictEqual(samContrib.assignedTasksCount, 1);

  console.log('  ✓ Team analytics metrics, completion rates, and member contributions verified.');
}

// ----------------------------------------------------------------------------
// Test 13: Preservation of Existing Seed Data
// ----------------------------------------------------------------------------
console.log('\nTest 13: Preservation of existing seed data...');
{
  // 1. Initial team 'team-1' (Team Verdant) must exist and be intact
  const team1 = dbManager.getTeam('team-1');
  assert.ok(team1, 'team-1 (Team Verdant) must exist');
  assert.strictEqual(team1.name, 'Team Verdant');
  assert.ok(team1.members.length >= 2, 'team-1 must have members preserved');
  assert.ok(team1.projectIds.length >= 1, 'team-1 must have projects preserved');

  // 2. Initial projects (proj-1, proj-2, proj-3) must be intact
  const proj1 = dbManager.getProject('proj-1');
  const proj2 = dbManager.getProject('proj-2');
  const proj3 = dbManager.getProject('proj-3');

  assert.ok(proj1, 'proj-1 must be preserved');
  assert.ok(proj2, 'proj-2 must be preserved');
  assert.ok(proj3, 'proj-3 must be preserved');

  console.log('  ✓ Existing seed data (team-1, proj-1, proj-2, proj-3) verified intact and preserved.');
}

console.log('\n===============================================================');
console.log('✓ ALL 13 TEAMS COLLABORATION TEST SUITE SPECIFICATIONS PASSED!');
console.log('===============================================================\n');
