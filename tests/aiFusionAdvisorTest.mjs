import assert from 'assert';
import { dbManager } from '../server/db.ts';
import { aiService } from '../server/aiService.ts';

console.log('=== RUNNING AI PROJECT FUSION ADVISOR TEST SUITE ===\n');

// ----------------------------------------------------------------------------
// Test 1: Loading Accessible Projects & Strict Authorization Enforcement
// ----------------------------------------------------------------------------
console.log('Test 1: Accessible Projects Scoping & Authorization Enforcement...');
{
  const accessible = dbManager.getProjects('user-1');
  assert.ok(accessible.length >= 2, 'User-1 must have multiple accessible projects');

  // Create a private project owned by an isolated third party
  const privateProjId = `proj-fusion-priv-${Date.now()}`;
  dbManager.createProject({
    id: privateProjId,
    title: 'Top Secret Defense Algorithm',
    summary: 'Classified cryptographic protocol',
    ownerId: 'user-isolated-99',
    visibility: 'private',
    category: 'Security',
    languages: ['Rust'],
    frameworks: ['Tokio'],
    libraries: [],
    apis: [],
    tools: [],
    tags: [],
    completedFeatures: ['Zero-knowledge proof pipeline'],
    inProgressFeatures: [],
    plannedFeatures: [],
    milestones: [],
    status: 'paused',
    progress: 40,
    technicalBlockers: ['Key generation latency'],
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerName: 'Isolated Agent',
  });

  // Attempting to ask fusion advice with this private project must throw 403
  let caughtError = null;
  try {
    await aiService.generateFusionAdvice(
      'Can I combine these projects?',
      [privateProjId, 'proj-2'],
      [],
      'user-1'
    );
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Unauthorized access to private project must throw an error');
  assert.strictEqual(caughtError.statusCode, 403, 'Error status code must be 403 Forbidden');
  assert.ok(
    caughtError.message.includes('Unauthorized or project not found'),
    'Error message must indicate unauthorized project access'
  );

  // Clean up temporary private project
  dbManager.deleteProject(privateProjId);
  console.log('  ✓ Verified: Scoping strictly isolates accessible projects and rejects unauthorized IDs with 403.');
}

// ----------------------------------------------------------------------------
// Test 2: Collection-Wide Discovery & All 8 Detailed Recommendation Criteria
// ----------------------------------------------------------------------------
console.log('\nTest 2: Collection-Wide Pair Recommendations & 8 Required Sections...');
{
  const response = await aiService.generateFusionAdvice(
    'Which projects should I combine from my list, and why?',
    [],
    [],
    'user-1'
  );

  assert.ok(response.content.includes('Collection-Wide Fusion Discovery'), 'Must declare collection-wide mode');
  assert.ok(response.content.includes('CodeMentor AI') || response.content.includes('EcoTrack'), 'Must identify suitable pairs');

  // Verify the 8 specific required sections
  assert.ok(response.content.includes('1. **Projects Involved**'), 'Criterion 1: Projects involved must be present');
  assert.ok(response.content.includes('2. **What Each Project Currently Does**'), 'Criterion 2: Current purpose & features must be present');
  assert.ok(response.content.includes('3. **Why They Fit Together**'), 'Criterion 3: Why fit must be present');
  assert.ok(response.content.includes('4. **Features to Combine or Reuse**'), 'Criterion 4: Features to combine/reuse must be present');
  assert.ok(response.content.includes('5. **What Becomes Stronger**'), 'Criterion 5: Practical benefit & new capability must be present');
  assert.ok(response.content.includes('6. **Proposed Combined Concept**'), 'Criterion 6: Combined concept name & UX must be present');
  assert.ok(response.content.includes('7. **Risks and Trade-offs**'), 'Criterion 7: Risks and trade-offs must be present');
  assert.ok(response.content.includes('8. **Suggested MVP & Build Order**'), 'Criterion 8: Suggested MVP & build order must be present');

  // Verify technology compatibility labeling (confirmed vs hypothesis)
  assert.ok(
    response.content.includes('Confirmed Compatibility') || response.content.includes('Hypothesis to Validate'),
    'Tech compatibility must be explicitly labeled as Confirmed Compatibility or Hypothesis to Validate'
  );

  console.log('  ✓ Collection-wide discovery returns ranked pairs satisfying all 8 detailed criteria.');
}

// ----------------------------------------------------------------------------
// Test 3: Selected-Project Comparison Mode
// ----------------------------------------------------------------------------
console.log('\nTest 3: Selected-Project Comparison Mode...');
{
  const selected = ['proj-2', 'proj-5']; // CodeMentor AI + StudySync
  const response = await aiService.generateFusionAdvice(
    'Can I combine these selected projects?',
    selected,
    [],
    'user-1'
  );

  assert.ok(
    response.content.includes('Selected-Project Comparison:') &&
      response.content.includes('CodeMentor AI') &&
      response.content.includes('StudySync'),
    'Must declare Selected-Project Comparison mode with the exact selected titles'
  );
  assert.ok(
    response.content.includes('StudyMentor: Collaborative Pair-Debugging Salon'),
    'Must formulate unified concept title'
  );
  assert.ok(
    response.content.includes('Monaco diff'),
    'Must reference CodeMentor Monaco diff features'
  );
  assert.ok(
    response.content.includes('study rooms'),
    'Must reference StudySync study rooms features'
  );

  console.log('  ✓ Selected-project comparison strictly evaluates the chosen projects with grounded details.');
}

// ----------------------------------------------------------------------------
// Test 4: Missing Data Honesty (Discloses Missing Repositories & Unrecorded Data)
// ----------------------------------------------------------------------------
console.log('\nTest 4: Missing Project Data Honesty...');
{
  const p5 = dbManager.getProject('proj-5', 'user-1');
  assert.ok(p5, 'proj-5 must exist');
  assert.strictEqual(p5.repoUrl, undefined, 'proj-5 has no repoUrl');

  const response = await aiService.generateFusionAdvice(
    'What problems, conflicts, or technical risks might arise?',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );

  assert.ok(
    response.content.includes('No repository link recorded for "StudySync"'),
    'AI must explicitly disclose that no repository link is recorded for StudySync'
  );
  console.log('  ✓ Missing repository link disclosed honestly without hallucinating repository source files.');
}

// ----------------------------------------------------------------------------
// Test 5: Specialized Natural Language Fusion Question Handlers
// ----------------------------------------------------------------------------
console.log('\nTest 5: Specialized Natural Language Fusion Questions...');
{
  // Question A: Reusable vs New Features
  const qA = await aiService.generateFusionAdvice(
    'Which features can be reused, and what new features become possible?',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );
  assert.ok(qA.content.includes('Existing Assets Ready for Direct Reuse'), 'Must list existing reusable assets');
  assert.ok(qA.content.includes('Brand New Capabilities Unlocked by Fusion'), 'Must list brand new unlocked capabilities');

  // Question B: Utility & Power Assessment
  const qB = await aiService.generateFusionAdvice(
    'Would combining these projects make the result more useful or powerful?',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );
  assert.ok(qB.content.includes('Utility & Power Assessment'), 'Must provide structured utility assessment');
  assert.ok(qB.content.includes('Significantly More Powerful'), 'Must synthesize grounded comparative verdict');

  // Question C: Technical Risks & Conflicts
  const qC = await aiService.generateFusionAdvice(
    'What problems, conflicts, or technical risks might arise?',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );
  assert.ok(qC.content.includes('Risk, Conflict & Trade-Off Analysis'), 'Must provide detailed technical risk analysis');

  // Question D: Easiest to Build First
  const qD = await aiService.generateFusionAdvice(
    'Which combination is easiest to build first?',
    [],
    [],
    'user-1'
  );
  assert.ok(qD.content.includes('Easiest Combination to Build First'), 'Must identify lowest-friction build path');
  assert.ok(qD.content.includes('Recommended Build Order'), 'Must provide concrete build order');

  // Question E: Suggested MVP
  const qE = await aiService.generateFusionAdvice(
    'Suggest an MVP for the strongest combination.',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );
  assert.ok(qE.content.includes('Scope of the First Version (What to Build)'), 'Must detail MVP scope');
  assert.ok(qE.content.includes('What to Intentionally Omit from MVP'), 'Must enforce scope discipline');

  console.log('  ✓ All 5 specialized natural-language fusion questions answered with grounded precision.');
}

// ----------------------------------------------------------------------------
// Test 6: Invariant: Asking Questions Does NOT Mutate Any Project or Database Records
// ----------------------------------------------------------------------------
console.log('\nTest 6: Invariant: Non-Mutating Advisory Engine...');
{
  const projectsBefore = dbManager.getProjects('user-1');
  const fusionsBefore = dbManager.getFusions();

  await aiService.generateFusionAdvice(
    'Which projects should I combine from my list, and why?',
    [],
    [],
    'user-1'
  );
  await aiService.generateFusionAdvice(
    'Suggest an MVP for the strongest combination.',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );

  const projectsAfter = dbManager.getProjects('user-1');
  const fusionsAfter = dbManager.getFusions();

  assert.strictEqual(
    projectsAfter.length,
    projectsBefore.length,
    'Projects count must remain identical before and after AI consultation'
  );
  assert.strictEqual(
    fusionsAfter.length,
    fusionsBefore.length,
    'Fusions table must not receive unapproved records from chat responses alone'
  );

  console.log('  ✓ Invariant verified: AI Q&A is strictly non-mutating and requires explicit user approval to plant.');
}

// ----------------------------------------------------------------------------
// Test 7: Preserving Canvas Protocol & Proposal Approval
// ----------------------------------------------------------------------------
console.log('\nTest 7: Preserving Canvas Protocol & Proposal Approval...');
{
  // Generate proposal via existing workflow
  const proposal = await aiService.generateProjectFusion(['proj-2', 'proj-5'], 'user-1');
  assert.ok(proposal.id, 'Proposal must have an ID');
  assert.strictEqual(proposal.status, 'reviewing', 'Newly generated proposal must start in reviewing status');

  // Execute explicit approval
  const { newProject, proposal: approvedProp } = await aiService.approveProjectFusion(
    proposal.id,
    'StudyMentor Omniscience Test',
    'Communal Code Review & Ambient Focus Salon',
    'user-1'
  );

  assert.strictEqual(approvedProp.status, 'approved', 'Proposal must transition to approved');
  assert.ok(newProject.id, 'New fused project must be created with ID');
  assert.strictEqual(newProject.title, 'StudyMentor Omniscience Test', 'Custom title preserved');
  assert.ok(newProject.tags.includes('ai-fusion'), 'New project tagged with ai-fusion');

  // Clean up created project and fusion proposal from test database
  dbManager.deleteProject(newProject.id);
  dbManager.deleteFusion(proposal.id);

  console.log('  ✓ Preserved Canvas Protocol: explicit proposal review and confirmation successfully executed and cleaned up.');
}

// ----------------------------------------------------------------------------
// Test 8: Suitability Outcome — SUITABLE TO COMBINE
// ----------------------------------------------------------------------------
console.log('\nTest 8: Fusion Suitability: SUITABLE TO COMBINE...');
{
  const response = await aiService.generateFusionAdvice(
    'Review the fusion suitability of combining CodeMentor AI and StudySync.',
    ['proj-2', 'proj-5'],
    [],
    'user-1'
  );

  assert.strictEqual(response.suitability, 'SUITABLE', 'Suitability state must be SUITABLE');
  assert.deepStrictEqual(response.suitablePairIds, ['proj-2', 'proj-5'], 'Must identify suitable pair IDs');
  assert.ok(response.proposedConceptTitle, 'Must generate proposed concept title');
  assert.ok(response.content.includes('SUITABLE TO COMBINE'), 'Must state SUITABLE TO COMBINE in content');
  assert.ok(response.content.includes('What Each Project Currently Does'), 'Must explain current functionality');
  assert.ok(response.content.includes('How Goals & Features Relate'), 'Must explain goal relationship');
  assert.ok(response.content.includes('Why the Result is Stronger Than Separate Projects'), 'Must explain why stronger');
  assert.ok(response.content.includes('Reasonable First-Version (MVP) Direction'), 'Must suggest MVP direction');
  assert.ok(response.content.includes('View Proposal'), 'Must mention View Proposal guidance');

  console.log('  ✓ SUITABLE TO COMBINE outcome generated with all required analysis dimensions.');
}

// ----------------------------------------------------------------------------
// Test 9: Suitability Outcome — NOT RECOMMENDED TO COMBINE
// ----------------------------------------------------------------------------
console.log('\nTest 9: Fusion Suitability: NOT RECOMMENDED TO COMBINE...');
{
  // PixelForge (Creative Tools & Gaming) and EcoTrack (Climate & Sustainability)
  const response = await aiService.generateFusionAdvice(
    'Review the fusion suitability of combining PixelForge and EcoTrack.',
    ['proj-4', 'proj-1'],
    [],
    'user-1'
  );

  assert.strictEqual(response.suitability, 'NOT_RECOMMENDED', 'Suitability state must be NOT_RECOMMENDED');
  assert.ok(response.content.includes('NOT RECOMMENDED TO COMBINE'), 'Must state NOT RECOMMENDED TO COMBINE in content');
  assert.ok(response.content.includes('Divergent Problem Domains'), 'Must explain divergent problem domains');
  assert.ok(response.content.includes('Audience Mismatch'), 'Must explain audience mismatch');
  assert.ok(
    response.content.includes('Keep both projects as separate, focused applications'),
    'Must advise keeping projects separate rather than forcing a combination'
  );

  console.log('  ✓ NOT RECOMMENDED TO COMBINE outcome correctly prevents forced combinations with honest rationale.');
}

// ----------------------------------------------------------------------------
// Test 10: Suitability Outcome — NEEDS MORE INFORMATION
// ----------------------------------------------------------------------------
console.log('\nTest 10: Fusion Suitability: NEEDS MORE INFORMATION...');
{
  const incompleteId = `proj-incomplete-${Date.now()}`;
  dbManager.createProject({
    id: incompleteId,
    title: 'Mystery Project',
    summary: '',
    originalIdea: '',
    ownerId: 'user-1',
    visibility: 'public',
    category: '',
    languages: [],
    frameworks: [],
    libraries: [],
    apis: [],
    tools: [],
    tags: [],
    completedFeatures: [],
    inProgressFeatures: [],
    plannedFeatures: [],
    milestones: [],
    status: 'paused',
    progress: 0,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerName: 'Alex Rivera',
  });

  const response = await aiService.generateFusionAdvice(
    'Review the fusion suitability of combining Mystery Project and CodeMentor AI.',
    [incompleteId, 'proj-2'],
    [],
    'user-1'
  );

  assert.strictEqual(response.suitability, 'NEEDS_INFO', 'Suitability state must be NEEDS_INFO');
  assert.ok(response.content.includes('NEEDS MORE INFORMATION'), 'Must declare NEEDS MORE INFORMATION');
  assert.ok(response.content.includes('Missing Information Identified'), 'Must identify missing information');
  assert.ok(response.content.includes('What to provide'), 'Must explain what details user needs to provide');

  // Clean up
  dbManager.deleteProject(incompleteId);

  console.log('  ✓ NEEDS MORE INFORMATION outcome appropriately requests missing project scope before deciding.');
}

// ----------------------------------------------------------------------------
// Test 11: Idempotency of Approval & Preservation of Source Lineage
// ----------------------------------------------------------------------------
console.log('\nTest 11: Idempotent Proposal Approval & Source Lineage...');
{
  const countBefore = dbManager.getProjects('user-1').length;
  const proposal = await aiService.generateProjectFusion(['proj-2', 'proj-5'], 'user-1');

  // First approval
  const { newProject: firstProject, proposal: firstApproved } = await aiService.approveProjectFusion(
    proposal.id,
    'StudyMentor Idempotency Test',
    'AI-Guided Pair Programming & Collaborative Revision',
    'user-1'
  );

  assert.strictEqual(firstApproved.status, 'approved');
  assert.strictEqual(firstApproved.createdProjectId, firstProject.id);
  assert.strictEqual(dbManager.getProjects('user-1').length, countBefore + 1, 'Exactly 1 project added');

  // Second approval of SAME proposal ID (simulating duplicate click or network retry)
  const { newProject: secondProject, proposal: secondApproved } = await aiService.approveProjectFusion(
    proposal.id,
    'StudyMentor Idempotency Test',
    'AI-Guided Pair Programming & Collaborative Revision',
    'user-1'
  );

  assert.strictEqual(secondProject.id, firstProject.id, 'Idempotency: Must return identical project instance');
  assert.strictEqual(secondApproved.status, 'approved', 'Must retain approved status');
  assert.strictEqual(
    dbManager.getProjects('user-1').length,
    countBefore + 1,
    'Idempotency: Must NOT create duplicate project'
  );

  // Lineage verification
  assert.deepStrictEqual(firstProject.fusedFrom, ['proj-2', 'proj-5'], 'New project tracks fusedFrom parent IDs');

  const p2 = dbManager.getProject('proj-2', 'user-1');
  const p5 = dbManager.getProject('proj-5', 'user-1');
  assert.ok(p2, 'Parent proj-2 must NOT be deleted');
  assert.ok(p5, 'Parent proj-5 must NOT be deleted');
  assert.strictEqual(p2.fusedInto, firstProject.id, 'Parent proj-2 must record fusedInto project ID');
  assert.strictEqual(p5.fusedInto, firstProject.id, 'Parent proj-5 must record fusedInto project ID');
  assert.ok(
    p2.timeline.some((t) => t.type === 'fused' && t.title.includes('Fused into')),
    'Parent proj-2 must record fused timeline event'
  );
  assert.ok(
    p5.timeline.some((t) => t.type === 'fused' && t.title.includes('Fused into')),
    'Parent proj-5 must record fused timeline event'
  );

  // Clean up
  dbManager.deleteProject(firstProject.id);
  dbManager.deleteFusion(proposal.id);

  console.log('  ✓ Idempotency strictly prevents duplicate project creation and maintains complete parent lineage.');
}

// ----------------------------------------------------------------------------
// Test 12: Dedicated Proposal Persistence, Rich Hierarchy & Authorization Security
// ----------------------------------------------------------------------------
console.log('\nTest 12: Dedicated Proposal Persistence & Rich Hierarchy Data...');
{
  const proposal = await aiService.generateProjectFusion(['proj-2', 'proj-5'], 'user-1');
  assert.ok(proposal.id, 'Proposal must be assigned an ID and persisted in SQLite');

  // Verify retrieval via dbManager.getFusion
  const fetched = dbManager.getFusion(proposal.id);
  assert.ok(fetched, 'Fetched proposal must not be null');
  assert.strictEqual(fetched.id, proposal.id, 'IDs must match');
  assert.strictEqual(fetched.status, 'reviewing', 'Initial status must be reviewing');

  // Verify all required detailed hierarchy sections
  assert.ok(fetched.whyFit && fetched.whyFit.length > 20, 'Why fit explanation must be populated');
  assert.ok(fetched.proposedUX && fetched.proposedUX.length > 20, 'Proposed UX description must be populated');
  assert.ok(Array.isArray(fetched.confirmedFacts) && fetched.confirmedFacts.length >= 2, 'Confirmed facts must have at least 2 entries');
  assert.ok(Array.isArray(fetched.assumptions) && fetched.assumptions.length >= 2, 'Assumptions must have at least 2 entries');
  assert.ok(Array.isArray(fetched.unresolvedQuestions) && fetched.unresolvedQuestions.length >= 2, 'Unresolved questions must have at least 2 entries');
  assert.ok(Array.isArray(fetched.proposedMilestones) && fetched.proposedMilestones.length >= 3, 'Milestones must contain implementation sequence');

  // Verify not-found handling
  const nonExistent = dbManager.getFusion('invalid-proposal-999');
  assert.strictEqual(nonExistent, null, 'Non-existent proposal query must return null');

  // Verify authorization enforcement on private projects
  const privateId = `proj-priv-prop-${Date.now()}`;
  dbManager.createProject({
    id: privateId,
    title: 'Private Classified Project',
    summary: 'Secret',
    ownerId: 'user-isolated-99',
    visibility: 'private',
    category: 'Security',
    languages: ['Rust'],
    frameworks: [],
    libraries: [],
    apis: [],
    tools: [],
    tags: [],
    completedFeatures: [],
    inProgressFeatures: [],
    plannedFeatures: [],
    milestones: [],
    status: 'paused',
    progress: 10,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerName: 'Isolated User',
  });

  // Proposal with private project
  const privateProposal = {
    ...proposal,
    id: `fusion-private-${Date.now()}`,
    sourceProjectIds: [privateId, 'proj-2'],
  };
  dbManager.createFusion(privateProposal);

  // When user-1 checks permissions for this proposal, private project cannot be retrieved
  const pCheck = dbManager.getProject(privateId, 'user-1');
  assert.strictEqual(pCheck, null, 'User-1 must NOT have access to private project of isolated user');

  // Clean up
  dbManager.deleteFusion(proposal.id);
  dbManager.deleteFusion(privateProposal.id);
  dbManager.deleteProject(privateId);

  console.log('  ✓ Dedicated proposal persistence, rich hierarchy fields, and authorization security verified.');
}

// ----------------------------------------------------------------------------
// Test 13: Dedicated Proposal Route & Clean Fusion Advisor Chat Contract
// ----------------------------------------------------------------------------
console.log('\nTest 13: Dedicated Proposal Route & Clean Chat Contract...');
{
  const fs = await import('fs');
  // 1. Verify routes in App.tsx
  const appCode = fs.readFileSync('src/App.tsx', 'utf-8');
  assert.ok(
    appCode.includes('fusion/proposal/:proposalId'),
    'App.tsx must register dedicated route /fusion/proposal/:proposalId'
  );
  assert.ok(
    appCode.includes('FusionProposalPage'),
    'App.tsx must import FusionProposalPage'
  );

  // 2. Verify FusionPage.tsx chat panel cleanliness (no inline drawer)
  const fusionPageCode = fs.readFileSync('src/pages/FusionPage.tsx', 'utf-8');
  assert.ok(
    !fusionPageCode.includes('id="proposal-detail-section"'),
    'FusionPage.tsx must NOT contain inline proposal-detail-section drawer below chat'
  );
  assert.ok(
    !fusionPageCode.includes('isViewingProposal'),
    'FusionPage.tsx must NOT retain local inline drawer toggle state'
  );
  assert.ok(
    fusionPageCode.includes('/fusion/proposal/'),
    'FusionPage.tsx must navigate to dedicated /fusion/proposal/:id route when View Proposal is clicked'
  );

  // 3. Verify FusionProposalPage.tsx exists with Review & Approve section
  const proposalPageCode = fs.readFileSync('src/pages/FusionProposalPage.tsx', 'utf-8');
  assert.ok(
    proposalPageCode.includes('Review & Approve Fused Project'),
    'FusionProposalPage.tsx must contain dedicated Review & Approve section'
  );
  assert.ok(
    proposalPageCode.includes('Back to Fusion Advisor'),
    'FusionProposalPage.tsx must provide Back to Fusion Advisor navigation'
  );
  assert.ok(
    proposalPageCode.includes('Confirm Project Creation'),
    'FusionProposalPage.tsx must require explicit confirmation modal before creating project'
  );

  console.log('  ✓ Codebase contract verified: dedicated proposal route is separate, and chat panel remains clean.');
}

console.log('\n=== ALL AI PROJECT FUSION ADVISOR TESTS PASSED FLAWLESSLY! ===');
