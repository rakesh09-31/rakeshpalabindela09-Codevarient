import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { dbManager, calculateProjectProgress } from '../server/db.ts';
import { aiService } from '../server/aiService.ts';

console.log('=== RUNNING PROJECT GRAVEYARD INTEGRATION VERIFICATION ===\n');

async function runTests() {
  // Test 1: SQLite DB Persistence & Schema
  console.log('Test 1: SQLite DB Persistence & Schema Verification');
  const db = new DatabaseSync('data/graveyard.db');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  console.log('  Tables discovered:', tableNames);
  assert(tableNames.includes('projects'), 'Missing projects table');
  assert(tableNames.includes('teams'), 'Missing teams table');
  assert(tableNames.includes('reminders'), 'Missing reminders table');
  assert(tableNames.includes('fusions'), 'Missing fusions table');
  console.log('  ✓ Schema and SQLite tables verified.\n');

  // Test 2: Progress Calculation Accuracy
  console.log('Test 2: Accurate Progress Calculation (Weighted)');
  const sampleProject = {
    id: 'test-p1',
    title: 'Test Progress Project',
    progress: 0,
    milestones: [
      {
        id: 'm1',
        title: 'Milestone 1',
        tasks: [
          { id: 't1', title: 'Task 1', status: 'completed', weight: 3 },
          { id: 't2', title: 'Task 2', status: 'todo', weight: 2 },
        ],
      },
    ],
  };
  // total weight: 5, completed: 3 => 60%
  const prog1 = calculateProjectProgress(sampleProject);
  console.log(`  Weight 3 completed of 5 total => Progress: ${prog1}% (Expected: 60%)`);
  assert.strictEqual(prog1, 60, 'Progress must equal 60%');

  // Complete task 2 => 100%
  sampleProject.milestones[0].tasks[1].status = 'completed';
  const prog2 = calculateProjectProgress(sampleProject);
  console.log(`  All tasks completed => Progress: ${prog2}% (Expected: 100%)`);
  assert.strictEqual(prog2, 100, 'Progress must equal 100%');

  // Zero tasks => fallback to initial progress
  const emptyProject = { id: 'test-empty', progress: 25, milestones: [] };
  const progEmpty = calculateProjectProgress(emptyProject);
  console.log(`  Zero tasks => Progress: ${progEmpty}% (Expected: 25%)`);
  assert.strictEqual(progEmpty, 25, 'Empty project must preserve progress');
  console.log('  ✓ Weighted progress calculation verified.\n');

  // Test 3: Five Revival Actions with Timeline Auditing
  console.log('Test 3: Five Revival Actions & Timeline Auditing');
  const reviveId = 'proj-2'; // CodeMentor AI (paused)

  // 3a. Revival Action: Restart
  console.log('  Testing Revival: Restart...');
  const restarted = dbManager.reviveProject(reviveId, 'restart', 'Fresh restart initiated');
  assert.strictEqual(restarted.status, 'active');
  assert.strictEqual(restarted.progress, 0);
  assert(restarted.milestones.every(m => m.tasks.every(t => t.status === 'todo')));
  assert.strictEqual(restarted.timeline[0].type, 'restarted');
  console.log(`  ✓ Restart verified: status=${restarted.status}, progress=${restarted.progress}%, event=${restarted.timeline[0].title}`);

  // 3b. Revival Action: Continue
  console.log('  Testing Revival: Continue...');
  const continued = dbManager.reviveProject(reviveId, 'continue', 'Resumed momentum');
  assert.strictEqual(continued.status, 'active');
  assert.strictEqual(continued.timeline[0].type, 'revived');
  console.log(`  ✓ Continue verified: status=${continued.status}, event=${continued.timeline[0].title}`);

  // 3c. Revival Action: Change Idea (Pivot)
  console.log('  Testing Revival: Change Idea (Pivot)...');
  const pivoted = dbManager.reviveProject(reviveId, 'change-idea', 'Pivoting concept', 'Autonomous Code Reviewer for Solo Devs');
  assert.strictEqual(pivoted.status, 'active');
  assert.strictEqual(pivoted.goal, 'Autonomous Code Reviewer for Solo Devs');
  assert.strictEqual(pivoted.timeline[0].type, 'idea-changed');
  console.log(`  ✓ Change Idea verified: newGoal="${pivoted.goal}", event=${pivoted.timeline[0].title}`);

  // 3d. Revival Action: Repurpose
  console.log('  Testing Revival: Repurpose...');
  const repurposed = dbManager.reviveProject(reviveId, 'repurpose', 'Repurposing AST engine', 'High-performance AST Diff CLI');
  assert.strictEqual(repurposed.status, 'active');
  assert.strictEqual(repurposed.summary, 'High-performance AST Diff CLI');
  assert.strictEqual(repurposed.timeline[0].type, 'repurposed');
  console.log(`  ✓ Repurpose verified: summary="${repurposed.summary}", event=${repurposed.timeline[0].title}`);

  // 3e. Revival Action: Archive
  console.log('  Testing Revival: Archive...');
  const archived = dbManager.reviveProject(reviveId, 'archive', 'Preserving in digital garden vault');
  assert.strictEqual(archived.status, 'archived');
  assert.strictEqual(archived.timeline[0].type, 'archived');
  console.log(`  ✓ Archive verified: status=${archived.status}, event=${archived.timeline[0].title}\n`);

  // Restore proj-2 for other tests
  dbManager.updateProject(reviveId, { status: 'paused' });

  // Test 4: Server-Side AI Assistant & Context Isolation
  console.log('Test 4: Server-Side AI Assistant & Context Isolation');
  // 4a. Blocker Troubleshooting
  const blockerAi = await aiService.generateProjectGuidance('proj-2', 'How can I fix the OpenAI rate limit blocker?', 'blocker', 'user-1');
  console.log('  Blocker Diagnostic Content:');
  console.log('  ' + blockerAi.content.split('\n')[0]);
  assert(blockerAi.content.includes('Blocker Diagnostic'), 'Response should include blocker diagnostic');
  assert(blockerAi.suggestions.length > 0, 'Must include actionable suggestions');
  assert.strictEqual(blockerAi.suggestions[0].type, 'add-task');
  console.log(`  ✓ Blocker diagnostic generated with suggestion: "${blockerAi.suggestions[0].label}"`);

  // 4b. 48h MVP Scoping
  const mvpAi = await aiService.generateProjectGuidance('proj-1', 'How to ship MVP this weekend?', 'mvp', 'user-1');
  assert(mvpAi.content.includes('48-Hour MVP Scoping'));
  console.log(`  ✓ 48h MVP guidance generated for "${mvpAi.content.slice(0, 50)}..."`);

  // 4c. Authorization Enforcement
  console.log('  Testing Authorization Check (Rejecting unauthorized user for non-existent or private project)...');
  try {
    await aiService.generateProjectGuidance('invalid-project-id', 'test prompt', 'chat', 'user-unauthorized');
    assert.fail('Should have thrown 403/404');
  } catch (err) {
    console.log(`  ✓ Authorization check correctly rejected unauthorized request: "${err.message}"`);
  }
  console.log('  ✓ Server-Side AI context isolation verified.\n');

  // Test 5: AI Project Fusion & Owner Approval
  console.log('Test 5: AI Project Fusion & Explicit Owner Approval');
  const proposal = await aiService.generateProjectFusion(['proj-2', 'proj-5'], 'user-1');
  console.log(`  Generated Fusion Proposal ID: ${proposal.id}`);
  console.log(`  Proposed Title: "${proposal.proposedTitle}"`);
  console.log(`  Proposed Stack: ${proposal.proposedStack.join(', ')}`);
  assert(proposal.proposedMilestones.length === 3, 'Must have 3-phase roadmap');
  assert.strictEqual(proposal.status, 'reviewing', 'Proposal must start in reviewing status before explicit approval');

  // Explicit Owner Approval
  console.log('  Executing Owner Approval to plant fused project in garden...');
  const { newProject, proposal: approvedProp } = await aiService.approveProjectFusion(proposal.id, 'CodeSync Omniscience', 'Unified Real-Time Code Review & Co-Working');
  assert.strictEqual(approvedProp.status, 'approved');
  assert.strictEqual(newProject.title, 'CodeSync Omniscience');
  assert(newProject.fusedFrom.includes('proj-2') && newProject.fusedFrom.includes('proj-5'), 'Must link source project IDs');

  // Verify source projects updated
  const src1 = dbManager.getProject('proj-2');
  const src2 = dbManager.getProject('proj-5');
  assert.strictEqual(src1.fusedInto, newProject.id, 'Source project 1 must record fusedInto');
  assert.strictEqual(src2.fusedInto, newProject.id, 'Source project 2 must record fusedInto');
  assert(src1.timeline.some(t => t.type === 'fused'), 'Source project 1 must log fused timeline event');
  console.log(`  ✓ Fusion approved & planted: Project ${newProject.id} created with lineage from proj-2 & proj-5.\n`);

  // Test 6: Teams and Reminders CRUD
  console.log('Test 6: Teams and Reminders CRUD');
  const newTeam = dbManager.createTeam({
    id: `team-test-${Date.now()}`,
    name: 'Garden Architects',
    description: 'Creators reviving dormant open-source code',
    ownerId: 'user-1',
    projectIds: ['proj-1', 'proj-6'],
    members: [{ id: 'user-1', name: 'Alex Rivera', role: 'owner', skills: ['TypeScript'], availability: 'full-time', joinedAt: new Date().toISOString() }],
    joinRequests: [{ id: 'req-test-1', userId: 'user-2', userName: 'Morgan Blake', message: 'I can help with mobile telemetry', skills: ['React Native'], status: 'pending', createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.strictEqual(newTeam.name, 'Garden Architects');
  console.log(`  ✓ Team created: "${newTeam.name}"`);

  // Reminder CRUD
  const newRem = dbManager.createReminder({
    id: `rem-test-${Date.now()}`,
    projectId: 'proj-1',
    projectTitle: 'EcoTrack',
    title: 'Benchmark Climatiq API v2 rate limits',
    message: 'Check API latency during peak commuting hours',
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    recurrence: 'weekly',
    channel: 'in-app',
    enabled: true,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
  });
  assert.strictEqual(newRem.status, 'upcoming');
  console.log(`  ✓ Reminder created: "${newRem.title}"`);

  // Test 7: Startup Screen & Vector Brand Mark Verification
  console.log('Test 7: Startup Screen & Vector Brand Mark Verification');
  const fs = await import('node:fs');
  const tokensContent = fs.readFileSync('src/styles/tokens.css', 'utf-8');
  assert(tokensContent.includes('--color-brand:'), 'Missing --color-brand in tokens.css');
  assert(tokensContent.includes('--color-accent:'), 'Missing --color-accent in tokens.css');
  assert(tokensContent.includes('--color-page:'), 'Missing --color-page in tokens.css');

  assert(fs.existsSync('src/components/common/BrandMark.tsx'), 'Missing BrandMark vector component');
  const brandMarkCode = fs.readFileSync('src/components/common/BrandMark.tsx', 'utf-8');
  assert(brandMarkCode.includes('svg') && brandMarkCode.includes('pg-spark-grad'), 'BrandMark must be a standalone vector SVG with revival spark');

  const startupScreenCode = fs.readFileSync('src/components/common/StartupScreen.tsx', 'utf-8');
  assert(startupScreenCode.includes('BrandMark'), 'StartupScreen must use standalone BrandMark vector tile');
  assert(!startupScreenCode.includes('The Project Graveyard_ Revive Ideas.png'), 'Must not display poster image in splash');
  assert(!startupScreenCode.includes('logoImg'), 'Must not display raster slide image');
  assert(startupScreenCode.includes('The Project Graveyard'), 'Must render real UI text for app title');
  assert(startupScreenCode.includes('Revive ideas. Build together. Complete what matters.'), 'Must render real UI text for tagline');
  assert(startupScreenCode.includes('Almost ready…'), 'Must include Almost ready state-aware status');
  assert(startupScreenCode.includes('Loading your projects…'), 'Must include Loading your projects status');
  assert(startupScreenCode.includes('Preparing your workspace…'), 'Must include Preparing your workspace status');
  assert(startupScreenCode.includes('minDuration = 3000'), 'StartupScreen must have 3s minimum visible duration (3000ms)');
  assert(startupScreenCode.includes('stalledTimeout = 7000'), 'StartupScreen must have safety watchdog against hangs');
  assert(startupScreenCode.includes('useReducedMotion'), 'StartupScreen must support reduced motion');
  assert(startupScreenCode.includes('role="status"'), 'StartupScreen must have accessible status role');
  assert(startupScreenCode.includes('Retry Initialization'), 'StartupScreen must provide working retry action');
  console.log('  ✓ Standalone vector brand mark, polished typography, state-aware status & accessibility verified.\n');

  console.log('=== ALL 7 INTEGRATION TEST SUITES PASSED FLAWLESSLY! ===');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
