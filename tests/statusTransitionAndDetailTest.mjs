import assert from 'node:assert';
import { dbManager } from '../server/db.ts';

console.log('=== RUNNING PROJECT DETAIL & STATUS TRANSITION VERIFICATION ===\n');

try {
  // Test 1: Query existing project (proj-1)
  console.log('Test 1: Inspecting projects via dbManager...');
  const project1 = dbManager.getProject('proj-1');
  assert(project1, 'Project proj-1 should exist');
  console.log(`  ✓ Discovered project: "${project1.title}" with current status="${project1.status}"`);

  // Test 2: Create a temporary test project to test all lifecycle status transitions
  console.log('\nTest 2: Testing valid lifecycle status transitions on temporary project...');
  const testId = `proj-test-status-${Date.now()}`;
  const now = new Date().toISOString();

  const initialProject = {
    id: testId,
    title: 'Status Transition Testbed',
    summary: 'A project to test active, paused, revived, completed, abandoned, and archived states.',
    originalIdea: 'Testing project lifecycle transitions',
    goal: 'Verify all 6 lifecycle statuses update faithfully',
    description: 'Detailed description testing preservation of blockers and milestones.',
    category: 'Developer Tools',
    tags: ['testing', 'lifecycle'],
    targetAudience: 'Engineers',
    visibility: 'team',
    languages: ['TypeScript'],
    frameworks: ['React'],
    libraries: [],
    apis: [],
    tools: ['Vite'],
    status: 'paused',
    progress: 40,
    startDate: '2024-01-15T00:00:00.000Z',
    pauseDate: '2024-03-01T00:00:00.000Z',
    completedFeatures: ['Core scaffold'],
    inProgressFeatures: ['Status management UI'],
    plannedFeatures: ['Analytics integration'],
    milestones: [
      {
        id: 'm-1',
        title: 'Initial Scaffolding',
        description: 'Set up Vite and TypeScript',
        tasks: [
          { id: 't-1', title: 'Task 1', priority: 'high', weight: 3, status: 'completed' },
          { id: 't-2', title: 'Task 2', priority: 'medium', weight: 2, status: 'todo' },
        ],
      },
    ],
    technicalBlockers: ['Simulated Rate Limit Bottleneck'],
    missingSkills: [],
    knownBugs: [],
    lessonsLearned: ['Always test state transitions thoroughly'],
    importantDecisions: [],
    plannedModifications: [],
    futureImprovements: [],
    nextSteps: ['Resume active development', 'Benchmark local LLMs'],
    timeline: [
      {
        id: 'tl-init',
        type: 'created',
        title: 'Project Created',
        description: 'Planted in garden',
        timestamp: now,
      },
    ],
    teamMembers: [
      {
        id: 'user-1',
        name: 'Alex Rivera',
        role: 'owner',
        skills: ['Full Stack'],
        availability: 'full-time',
        joinedAt: now,
      },
    ],
    attachments: [],
    bookmarked: false,
    ownerId: 'user-1',
    ownerName: 'Alex Rivera',
    createdAt: now,
    updatedAt: now,
  };

  const created = dbManager.createProject(initialProject);
  assert.strictEqual(created.id, testId);
  console.log(`  ✓ Planted test project "${created.title}" with status="${created.status}"`);

  // Transition A: Paused -> Active (Resume)
  console.log('\n  Transition A: Paused -> Active (Resume)...');
  {
    const note = 'Resumed development for sprint 4';
    const updated = dbManager.updateProject(testId, { status: 'active' }, note);
    assert.strictEqual(updated.status, 'active');
    assert.strictEqual(updated.milestones.length, 1, 'Milestones must not be altered');
    assert.strictEqual(updated.technicalBlockers.length, 1, 'Blockers must not be altered');
    assert.strictEqual(updated.timeline[0].description, note);
    console.log('    ✓ Resumed successfully: status="active", timeline note logged, blockers and milestones preserved.');
  }

  // Transition B: Active -> Revived
  console.log('  Transition B: Active -> Revived...');
  {
    const note = 'Pivoted concept and marked revived';
    const updated = dbManager.updateProject(testId, { status: 'revived' }, note);
    assert.strictEqual(updated.status, 'revived');
    assert.strictEqual(updated.timeline[0].description, note);
    console.log('    ✓ Revived successfully: status="revived", timeline logged.');
  }

  // Transition C: Revived -> Completed
  console.log('  Transition C: Revived -> Completed...');
  {
    const note = 'All deliverables shipped and demo recorded';
    const completionDate = new Date().toISOString();
    const updated = dbManager.updateProject(testId, { status: 'completed', completionDate }, note);
    assert.strictEqual(updated.status, 'completed');
    assert.strictEqual(updated.completionDate, completionDate);
    console.log('    ✓ Completed successfully: status="completed", completionDate populated.');
  }

  // Transition D: Completed -> Abandoned
  console.log('  Transition D: Completed -> Abandoned...');
  {
    const note = 'Market conditions shifted, discontinued further maintenance';
    const pauseDate = new Date().toISOString();
    const updated = dbManager.updateProject(testId, { status: 'abandoned', pauseDate }, note);
    assert.strictEqual(updated.status, 'abandoned');
    assert.strictEqual(updated.pauseDate, pauseDate);
    console.log('    ✓ Abandoned successfully: status="abandoned", pauseDate recorded.');
  }

  // Transition E: Abandoned -> Archived
  console.log('  Transition E: Abandoned -> Archived...');
  {
    const note = 'Moved to long-term digital vault archive';
    const updated = dbManager.updateProject(testId, { status: 'archived' }, note);
    assert.strictEqual(updated.status, 'archived');
    console.log('    ✓ Archived successfully: status="archived", cold storage state verified.');
  }

  // Test 3: Inspect Project proj-5 (StudySync - Paused, No Repo)
  console.log('\nTest 3: Verifying StudySync (proj-5) paused state and missing optional fields...');
  const proj5 = dbManager.getProject('proj-5');
  assert(proj5, 'proj-5 should exist');
  assert.strictEqual(proj5.status, 'paused');
  assert.strictEqual(proj5.repoUrl, undefined, 'proj-5 has no repoUrl');
  console.log(`  ✓ Verified StudySync: status="${proj5.status}", repoUrl is undefined, blockers count=${proj5.technicalBlockers.length}`);

  // Clean up test project
  dbManager.deleteProject(testId);
  console.log('\n  ✓ Cleaned up temporary test project from SQLite database.');

  console.log('\n=== ALL PROJECT DETAIL & STATUS TRANSITION TESTS PASSED! ===');
} catch (err) {
  console.error('Test failed:', err);
  process.exit(1);
}
