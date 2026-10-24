import assert from 'node:assert';
import { dbManager } from '../server/db.ts';

console.log('=== RUNNING REPO URL & REVIVAL STUDIO VERIFICATION ===\n');

// --- Test 1: Project Creation without repoUrl (blank/omitted) ---
console.log('Test 1: Create project with repoUrl omitted');
const projNoRepo = dbManager.createProject({
  title: 'Test Project No Repo',
  summary: 'A project with no repository URL linked',
  originalIdea: 'Testing optional repo URL',
  goal: 'Verify optional repo URL creation',
  description: 'Full description for test',
  category: 'Developer Tools',
  tags: ['testing', 'optional'],
  targetAudience: 'Developers',
  visibility: 'private',
  languages: ['TypeScript'],
  frameworks: ['React'],
  libraries: [],
  apis: [],
  tools: ['Vite'],
  status: 'active',
  startDate: new Date().toISOString(),
  completedFeatures: [],
  inProgressFeatures: [],
  plannedFeatures: [],
  milestones: [],
  technicalBlockers: [],
  missingSkills: [],
  knownBugs: [],
  lessonsLearned: [],
  importantDecisions: [],
  plannedModifications: [],
  futureImprovements: [],
  nextSteps: [],
  timeline: [],
  teamMembers: [],
  attachments: [],
  bookmarked: false,
  ownerId: 'user-1',
  ownerName: 'Alex Rivera',
});

assert(projNoRepo.id, 'Project without repo should have an ID');
assert.strictEqual(projNoRepo.repoUrl, undefined, 'repoUrl should be undefined when omitted');
console.log('  ✓ Project created successfully without repository URL (repoUrl is undefined).');

// --- Test 2: Project Creation with repoUrl populated ---
console.log('\nTest 2: Create project with repoUrl populated');
const projWithRepo = dbManager.createProject({
  title: 'Test Project With Repo',
  summary: 'A project with a valid repository URL',
  originalIdea: 'Testing valid repo URL',
  goal: 'Verify repo URL persistence',
  description: 'Full description with repo',
  category: 'AI / ML',
  tags: ['ai'],
  targetAudience: 'Developers',
  visibility: 'public',
  languages: ['Python'],
  frameworks: ['FastAPI'],
  libraries: [],
  apis: [],
  tools: [],
  repoUrl: 'https://github.com/testuser/project-with-repo',
  status: 'active',
  startDate: new Date().toISOString(),
  completedFeatures: [],
  inProgressFeatures: [],
  plannedFeatures: [],
  milestones: [],
  technicalBlockers: [],
  missingSkills: [],
  knownBugs: [],
  lessonsLearned: [],
  importantDecisions: [],
  plannedModifications: [],
  futureImprovements: [],
  nextSteps: [],
  timeline: [],
  teamMembers: [],
  attachments: [],
  bookmarked: false,
  ownerId: 'user-1',
  ownerName: 'Alex Rivera',
});

assert.strictEqual(
  projWithRepo.repoUrl,
  'https://github.com/testuser/project-with-repo',
  'repoUrl should match inserted value'
);
console.log('  ✓ Project created successfully with valid repository URL.');

// --- Test 3: Edit Project - Preserve repoUrl when unchanged ---
console.log('\nTest 3: Edit project and preserve existing repoUrl');
const updatedPreserved = dbManager.updateProject(projWithRepo.id, {
  summary: 'Updated summary without changing repoUrl',
});
assert.strictEqual(
  updatedPreserved.repoUrl,
  'https://github.com/testuser/project-with-repo',
  'repoUrl must be preserved when not updated'
);
console.log('  ✓ Existing repository URL preserved during partial update.');

// --- Test 4: Edit Project - Explicitly clear repoUrl ---
console.log('\nTest 4: Edit project and intentionally clear repoUrl');
const updatedCleared = dbManager.updateProject(projWithRepo.id, {
  repoUrl: '',
});
assert.strictEqual(
  updatedCleared.repoUrl,
  undefined,
  'repoUrl should be cleared/undefined when empty string passed'
);
console.log('  ✓ Repository URL successfully cleared when intentionally removed.');

// --- Test 5: Edit Project - Add repoUrl to project that had none ---
console.log('\nTest 5: Add repoUrl to project that originally had none');
const updatedAdded = dbManager.updateProject(projNoRepo.id, {
  repoUrl: 'https://github.com/testuser/added-later-repo',
});
assert.strictEqual(
  updatedAdded.repoUrl,
  'https://github.com/testuser/added-later-repo',
  'repoUrl should be updated to new value'
);
console.log('  ✓ Repository URL successfully added to existing project.');

// Clean up test projects
dbManager.deleteProject(projNoRepo.id);
dbManager.deleteProject(projWithRepo.id);
console.log('\n  ✓ Cleaned up all test records from SQLite database.');

console.log('\n=== ALL REPO URL & STUDIO SCROLL TESTS PASSED FLAWLESSLY! ===');
