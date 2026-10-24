import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { dbManager } from '../server/db.ts';

console.log('=== RUNNING SOCIAL PROFILE & DISCOVER VERIFICATION SUITE ===\n');

async function runTests() {
  // Test 1: Community Profiles Seeded in SQLite
  console.log('Test 1: Verifying User Profiles in SQLite Database...');
  const users = dbManager.getUserProfiles();
  console.log(`  Discovered ${users.length} registered profiles in SQLite.`);
  assert(users.length >= 5, 'Must have at least 5 community user profiles');
  
  const user1 = users.find((u) => u.id === 'user-1');
  const user2 = users.find((u) => u.id === 'user-2');
  const user3 = users.find((u) => u.id === 'user-3');
  
  assert(user1, 'user-1 (Alex Rivera) must exist');
  assert.strictEqual(user1.name, 'Alex Rivera', 'user-1 name must match');
  assert(user2, 'user-2 (Elena Rostova) must exist');
  assert.strictEqual(user2.name, 'Elena Rostova', 'user-2 name must match');
  assert(user3, 'user-3 (Devon Vance) must exist');
  console.log('  ✓ Core community user profiles verified.\n');

  // Test 2: Social Profile Statistics & Mathematical Success Rate
  console.log('Test 2: Verifying Social Profile Stats & Success Rate Computation...');
  const alexProfile = dbManager.getUserSocialProfile('user-1', 'user-1');
  assert(alexProfile, 'Alex social profile must exist');
  console.log(`  Alex Rivera stats: projects=${alexProfile.projectsCount}, completed=${alexProfile.completedCount}, revived=${alexProfile.revivedCount}, successRate=${alexProfile.successRate}%, followers=${alexProfile.followersCount}, following=${alexProfile.followingCount}`);
  assert(typeof alexProfile.successRate === 'number', 'Success rate must be numeric');
  assert(!isNaN(alexProfile.successRate), 'Success rate must not be NaN');
  assert(alexProfile.successRate >= 0 && alexProfile.successRate <= 100, 'Success rate must be between 0 and 100');

  // Verify zero projects graceful fallback
  const dummyZeroUser = {
    id: 'user-zero-test',
    name: 'Zero Projects User',
    email: 'zero@test.dev',
    skills: [],
    technologies: [],
    availability: 'occasional',
    theme: 'light',
    notificationPrefs: { projectUpdates: true, teamEvents: true, aiRecommendations: true, reminders: true },
    privacyDefaults: { defaultVisibility: 'public', showProfile: true },
    createdAt: new Date().toISOString(),
  };
  const db = new DatabaseSync('data/graveyard.db');
  db.prepare('INSERT OR REPLACE INTO user_profiles (id, data, updated_at) VALUES (?, ?, ?)').run(
    dummyZeroUser.id,
    JSON.stringify(dummyZeroUser),
    new Date().toISOString()
  );

  const zeroSocial = dbManager.getUserSocialProfile('user-zero-test', 'user-1');
  assert(zeroSocial, 'Zero user social profile must exist');
  assert.strictEqual(zeroSocial.projectsCount, 0, 'Zero projects count');
  assert.strictEqual(zeroSocial.successRate, 0, 'Success rate must be 0 for user with 0 projects, not NaN');
  db.prepare('DELETE FROM user_profiles WHERE id = ?').run('user-zero-test');
  console.log('  ✓ Mathematical success rate and 0-project handling verified.\n');

  // Test 3: Follow Relationship State Machine & Rules
  console.log('Test 3: Follow Relationship State Machine & Invariants...');
  // A: Prevent Self-Following
  assert.throws(
    () => {
      dbManager.followUser('user-1', 'user-1');
    },
    /cannot follow yourself/i,
    'Must throw error when attempting to follow self'
  );
  console.log('  ✓ Self-follow rejection verified.');

  // B: Existing seed follow inspection
  const elenaRelative = dbManager.getUserSocialProfile('user-2', 'user-1');
  assert.strictEqual(elenaRelative.followStatus, 'following', 'Alex Rivera should be following Elena Rostova');
  console.log('  ✓ Relative follow status (following) verified.');

  // C: Pending Request & Accept Transition
  const testFollowerId = 'user-5'; // Tariq
  const testTargetId = 'user-3'; // Devon
  // Clean prior test state if any
  dbManager.unfollowUser(testFollowerId, testTargetId);

  // Send request with requiresRequest: true
  const requested = dbManager.followUser(testFollowerId, testTargetId, true);
  assert.strictEqual(requested.status, 'requested', 'Status must be requested');
  const targetRelativeBefore = dbManager.getUserSocialProfile(testTargetId, testFollowerId);
  assert.strictEqual(targetRelativeBefore.followStatus, 'requested', 'Status must reflect requested');

  // Target accepts request
  const acceptResult = dbManager.respondFollowRequest(testFollowerId, testTargetId, 'accept');
  assert(acceptResult, 'Accept must return true');
  const targetRelativeAfter = dbManager.getUserSocialProfile(testTargetId, testFollowerId);
  assert.strictEqual(targetRelativeAfter.followStatus, 'following', 'Status must transition to following upon accept');
  console.log('  ✓ Follow request state transition: requested -> following verified.');

  // Target unfollows
  dbManager.unfollowUser(testFollowerId, testTargetId);
  const targetRelativeUnfollowed = dbManager.getUserSocialProfile(testTargetId, testFollowerId);
  assert.strictEqual(targetRelativeUnfollowed.followStatus, 'none', 'Status must be none after unfollowing');
  console.log('  ✓ Unfollow action successfully reset relationship state.\n');

  // Test 4: Collaboration Requests & Lineage
  console.log('Test 4: Project Collaboration Request Engine...');
  // A: Cannot collaborate on own project
  const ownProj = dbManager.getProjects('user-1')[0];
  assert(ownProj, 'Must find a project owned by user-1');
  assert.throws(
    () => {
      dbManager.createCollaborationRequest(ownProj.id, ownProj.ownerId, 'TypeScript', 'I want to help');
    },
    /cannot request collaboration on your own project/i,
    'Must reject collaboration on own project'
  );
  console.log('  ✓ Owner collaboration rejection verified.');

  // B: Non-owner proposes collaboration
  const collabReq = dbManager.createCollaborationRequest(
    ownProj.id,
    'user-3', // Devon Vance proposes
    'Rust, SIMD, AST Search',
    'I can optimize the search index to run in under 5ms.'
  );
  assert(collabReq, 'Collaboration request created');
  assert.strictEqual(collabReq.status, 'pending', 'Initial status must be pending');
  assert.strictEqual(collabReq.requesterId, 'user-3', 'Requester must be Devon Vance');

  // C: Duplicate prevention: second call returns same pending request
  const dupReq = dbManager.createCollaborationRequest(
    ownProj.id,
    'user-3',
    'Rust, SIMD',
    'Another note'
  );
  assert.strictEqual(dupReq.id, collabReq.id, 'Must return existing pending request without duplicate');
  console.log('  ✓ Duplicate collaboration request prevention verified.');

  // D: Owner accepts collaboration
  const acceptedCollab = dbManager.respondCollaborationRequest(collabReq.id, 'accept', ownProj.ownerId);
  assert.strictEqual(acceptedCollab.status, 'accepted', 'Status must become accepted');

  // Verify member added to project team
  const updatedProj = dbManager.getProject(ownProj.id);
  const devonMember = updatedProj.teamMembers.find((m) => m.id === 'user-3');
  assert(devonMember, 'Devon Vance must now be added to project team members upon acceptance');
  console.log(`  ✓ Accepted collaborator added to team: ${devonMember.name} (${devonMember.role})`);

  // Cleanup test collaboration
  db.prepare('DELETE FROM collaborations WHERE id = ?').run(collabReq.id);
  // Restore team members
  dbManager.updateProject(ownProj.id, {
    teamMembers: ownProj.teamMembers.filter((m) => m.id !== 'user-3'),
  });
  console.log('  ✓ Collaboration lifecycle and cleanup completed.\n');

  // Test 5: Verify Carousel Transition Timing in Code
  console.log('Test 5: Verifying Carousel Transition Timing in Source Code...');
  const fs = await import('node:fs');
  const dashboardCode = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
  assert(
    dashboardCode.includes('220ms') || dashboardCode.includes('duration-[220ms]'),
    'DashboardPage must use 220ms fast transition'
  );
  assert(
    !dashboardCode.includes('setTimeout(() => {') || !dashboardCode.includes(', 450);'),
    'Old 450ms animation delay must be removed'
  );
  console.log('  ✓ Carousel fast switching timing verified (~220ms snappy curve).\n');

  console.log('=== ALL SOCIAL PROFILE & DISCOVER VERIFICATION TESTS PASSED! ===\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
