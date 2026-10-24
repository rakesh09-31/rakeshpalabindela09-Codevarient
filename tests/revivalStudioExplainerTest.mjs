import assert from 'assert';
import { dbManager } from '../server/db.ts';
import { aiService } from '../server/aiService.ts';

console.log('=== RUNNING AI PROJECT EXPLAINER IN REVIVAL STUDIO TEST SUITE ===\n');

// Test 1: Project Context Isolation & Scope
console.log('Test 1: Project Context Isolation & Scope...');
{
  const p2 = dbManager.getProject('proj-2', 'user-1');
  assert.ok(p2, 'Project proj-2 must exist');

  const p5 = dbManager.getProject('proj-5', 'user-1');
  assert.ok(p5, 'Project proj-5 must exist');

  // Generate guidance for proj-2
  const p2Guidance = await aiService.generateProjectGuidance(
    'proj-2',
    'Explain this project in detail.',
    'explain-detail',
    'user-1'
  );

  // Must contain proj-2 identity and content
  assert.ok(p2Guidance.content.includes(p2.title), 'Response must include proj-2 title');
  assert.ok(p2Guidance.content.includes(p2.category), 'Response must include proj-2 category');

  // Must NOT leak proj-5 details into proj-2 guidance
  assert.ok(
    !p2Guidance.content.includes(p5.title),
    'Strict context isolation: proj-2 explanation must NOT contain proj-5 title'
  );
  assert.ok(
    !p2Guidance.content.includes(p5.summary),
    'Strict context isolation: proj-2 explanation must NOT contain proj-5 summary'
  );

  console.log('  ✓ Verified strict context isolation between projects: no data leakage.');
}

// Test 2: Missing Data Honesty (No Repository / Missing Fields)
console.log('\nTest 2: Missing Data Honesty (Missing Repo & Unrecorded Fields)...');
{
  // StudySync (proj-5) has no repoUrl
  const p5 = dbManager.getProject('proj-5', 'user-1');
  assert.ok(p5, 'proj-5 must exist');
  assert.strictEqual(p5.repoUrl, undefined, 'proj-5 has no repoUrl recorded');

  const p5StackGuidance = await aiService.generateProjectGuidance(
    'proj-5',
    'Explain the tech stack and architecture.',
    'stack-architecture',
    'user-1'
  );

  assert.ok(
    p5StackGuidance.content.includes('No repository URL is recorded'),
    'AI must explicitly disclose that no repository URL is recorded in the project file'
  );
  assert.ok(
    p5StackGuidance.content.includes('has not inspected actual source files'),
    'AI must explicitly state it has not inspected source files or commits'
  );

  // Test question about code files on a repo-less project
  const p5CodeQuery = await aiService.generateProjectGuidance(
    'proj-5',
    'What does line 50 of the backend server file do?',
    'chat',
    'user-1'
  );

  assert.ok(
    p5CodeQuery.content.includes('No Code Repository Recorded') ||
      p5CodeQuery.content.includes('Information Not Available') ||
      p5CodeQuery.content.includes('no repository URL'),
    'AI must refuse to fabricate code when no repo is available'
  );

  console.log('  ✓ Verified missing data honesty: AI discloses absent repo and never hallucinates source code.');
}

// Test 3: Grounded Workspace Initial Overview
console.log('\nTest 3: Grounded Workspace Initial Overview...');
{
  const p2 = dbManager.getProject('proj-2', 'user-1');
  const overview = await aiService.generateProjectGuidance(
    'proj-2',
    'overview',
    'overview',
    'user-1'
  );

  assert.ok(overview.content.includes('Grounded Project Overview'), 'Must have overview heading');
  assert.ok(overview.content.includes(p2.title), 'Must reference project title');
  assert.ok(overview.content.includes(p2.category), 'Must reference category');
  assert.ok(overview.content.includes(`${p2.progress}%`), 'Must reference weighted progress');
  assert.ok(
    overview.content.includes(p2.status.toUpperCase()),
    'Must reference lifecycle status'
  );

  console.log('  ✓ Grounded initial overview verified with real saved metrics.');
}

// Test 4: All 8 Suggested Question Chips Tested End-to-End
console.log('\nTest 4: All 8 Suggested Question Chips Grounded Synthesis...');
{
  const chips = [
    { prompt: 'Explain this project in detail.', mode: 'explain-detail', expected: ['Comprehensive Project Breakdown', 'Architecture'] },
    { prompt: 'What problem does it solve, and who is it for?', mode: 'problem-audience', expected: ['Problem Statement & Target Audience', 'Target Audience'] },
    { prompt: 'Explain the main features one by one.', mode: 'features-detail', expected: ['Feature-by-Feature Breakdown', 'Completed Features'] },
    { prompt: 'How does the project work?', mode: 'how-it-works', expected: ['System Mechanics', 'User Onboarding'] },
    { prompt: 'Explain the tech stack and architecture.', mode: 'stack-architecture', expected: ['Tech Stack & Architecture', 'Presentation'] },
    { prompt: 'What was completed and what is still unfinished?', mode: 'completed-vs-unfinished', expected: ['Completed vs. Unfinished Work', 'Quantitative Progress'] },
    { prompt: 'What are the biggest blockers to reviving it?', mode: 'blockers-deep', expected: ['Roadblocks & Blockers Analysis', 'Tactical Unblocking'] },
    { prompt: 'What should I do first to continue development?', mode: 'first-steps', expected: ['First Steps to Resume Development', 'Baseline & Dev Environment'] },
  ];

  for (const chip of chips) {
    const res = await aiService.generateProjectGuidance(
      'proj-2',
      chip.prompt,
      chip.mode,
      'user-1'
    );
    assert.ok(res.content && res.content.length > 100, `Response for "${chip.prompt}" must be detailed`);
    for (const exp of chip.expected) {
      assert.ok(
        res.content.includes(exp),
        `Response for "${chip.prompt}" should include section "${exp}"`
      );
    }
    console.log(`  ✓ Chip prompt "${chip.prompt}" passed verification.`);
  }
}

// Test 5: Authorization Enforcement & Safe Failure Handling
console.log('\nTest 5: Authorization Enforcement & Safe Failure Handling...');
{
  // Create a private project to test unauthorized access
  const privateProj = dbManager.createProject({
    id: `proj-private-${Date.now()}`,
    title: 'Secret Hardware Vault',
    summary: 'Classified hardware prototype',
    originalIdea: 'Private IP',
    goal: 'Confidential R&D',
    description: 'Internal only',
    category: 'Hardware',
    tags: ['classified'],
    targetAudience: 'Internal engineers',
    visibility: 'private',
    languages: ['C++'],
    frameworks: [],
    libraries: [],
    apis: [],
    tools: [],
    status: 'paused',
    startDate: new Date().toISOString(),
    completedFeatures: [],
    inProgressFeatures: [],
    plannedFeatures: [],
    milestones: [],
    technicalBlockers: ['FPGA timing closure'],
    missingSkills: [],
    knownBugs: [],
    lessonsLearned: [],
    importantDecisions: [],
    plannedModifications: [],
    futureImprovements: [],
    nextSteps: [],
    teamMembers: [],
    attachments: [],
    bookmarked: false,
    ownerId: 'user-1',
    ownerName: 'Alex Rivera',
  });

  try {
    // Attempt access as stranger 'intruder-99'
    await aiService.generateProjectGuidance(
      privateProj.id,
      'Explain this project',
      'chat',
      'intruder-99'
    );
    assert.fail('Unauthorized access to private project should have thrown 403');
  } catch (err) {
    assert.ok(
      err.message.includes('Unauthorized') || err.message.includes('not found'),
      `Expected 403 unauthorized, got: ${err.message}`
    );
    console.log(`  ✓ Private project access safely rejected for unauthorized user: "${err.message}"`);
  } finally {
    dbManager.deleteProject(privateProj.id);
  }

  try {
    await aiService.generateProjectGuidance(
      'non-existent-id-999',
      'Explain this project',
      'chat',
      'user-1'
    );
    assert.fail('Non-existent project should have thrown');
  } catch (err) {
    assert.ok(
      err.message.includes('not found'),
      `Expected not found error, got: ${err.message}`
    );
    console.log(`  ✓ Non-existent project safely rejected with: "${err.message}"`);
  }
}

// Test 6: Invariant: Questions Do NOT Alter Project Data Or Lifecycle Status
console.log('\nTest 6: Invariant: Asking Questions Does NOT Mutate Project Records...');
{
  const before = dbManager.getProject('proj-2', 'user-1');
  const beforeStatus = before.status;
  const beforeProgress = before.progress;
  const beforeTasksCount = before.milestones[0].tasks.length;

  // Ask 5 consecutive questions
  await aiService.generateProjectGuidance('proj-2', 'What should I do first to continue development?', 'first-steps', 'user-1');
  await aiService.generateProjectGuidance('proj-2', 'Explain this project in detail.', 'explain-detail', 'user-1');
  await aiService.generateProjectGuidance('proj-2', 'How does the project work?', 'how-it-works', 'user-1');

  const after = dbManager.getProject('proj-2', 'user-1');
  assert.strictEqual(after.status, beforeStatus, 'Project status must remain unchanged after AI questions');
  assert.strictEqual(after.progress, beforeProgress, 'Project progress must remain unchanged after AI questions');
  assert.strictEqual(after.milestones[0].tasks.length, beforeTasksCount, 'Task count must remain unchanged without explicit user confirmation');

  console.log('  ✓ Invariant verified: AI Q&A is strictly non-mutating.');
}

console.log('\n=== ALL AI PROJECT EXPLAINER TESTS PASSED FLAWLESSLY! ===');
