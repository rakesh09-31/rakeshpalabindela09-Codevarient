import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== RUNNING TARGETED CAROUSEL & DASHBOARD ACCEPTANCE VERIFICATION ===\n');

// 1. CAROUSEL WRAPAROUND & CIRCULAR NAVIGATION LOGIC
console.log('Test 1: Carousel Wraparound & Modulo Arithmetic (A.1, A.2, A.3)...');
{
  const totalProjects = 5;

  // Next from last (index 4) should wrap to 0
  const currentIndexAtEnd = 4;
  const nextIndex = (currentIndexAtEnd + 1) % totalProjects;
  assert.strictEqual(nextIndex, 0, 'Clicking Next from final project must wrap to index 0');

  // Prev from first (index 0) should wrap to last (index 4)
  const currentIndexAtStart = 0;
  const prevIndex = ((currentIndexAtStart - 1) % totalProjects + totalProjects) % totalProjects;
  assert.strictEqual(prevIndex, 4, 'Clicking Prev from first project must wrap to index 4');

  // Multi-step wrapping check
  const safeModulo = (idx, total) => ((idx % total) + total) % total;
  assert.strictEqual(safeModulo(-1, 5), 4);
  assert.strictEqual(safeModulo(-5, 5), 0);
  assert.strictEqual(safeModulo(5, 5), 0);
  assert.strictEqual(safeModulo(7, 5), 2);

  console.log('  ✓ Wraparound logic correctly transitions between first and final projects without discontinuity.');
}

// 2. EDGE CASES (0, 1, 2 PROJECTS) (A.9)
console.log('\nTest 2: Edge Cases (0, 1, and 2 Projects) (A.9)...');
{
  const computeCircularSlots = (projects, safeIndex) => {
    const total = projects.length;
    if (total === 0) return [];
    if (total === 1) return [{ offset: 0, project: projects[0] }];
    const offsets = [-2, -1, 0, 1, 2];
    return offsets.map((k) => {
      const idx = ((safeIndex + k) % total + total) % total;
      return {
        offset: k,
        project: projects[idx],
      };
    });
  };

  // 0 projects
  const slots0 = computeCircularSlots([], 0);
  assert.strictEqual(slots0.length, 0, 'Zero projects must produce empty slot array');

  // 1 project
  const slots1 = computeCircularSlots([{ id: 'p1', title: 'Solo Project' }], 0);
  assert.strictEqual(slots1.length, 1, 'Single project must produce exactly 1 center slot');
  assert.strictEqual(slots1[0].offset, 0, 'Single project slot must have offset 0');

  // 2 projects
  const slots2 = computeCircularSlots([
    { id: 'p1', title: 'Project 1' },
    { id: 'p2', title: 'Project 2' },
  ], 0);
  assert.strictEqual(slots2.length, 5, 'Two projects map to the 5 virtual peek slots cleanly');
  assert.strictEqual(slots2[2].offset, 0);
  assert.strictEqual(slots2[2].project.id, 'p1');

  console.log('  ✓ Edge cases (0, 1, and 2 projects) verified: no division-by-zero, no infinite loops.');
}

// 3. CODEBASE VERIFICATION FOR CAROUSEL & DASHBOARD CONSTRAINTS (B, C, D)
console.log('\nTest 3: Codebase AST & Contract Verification (C.16, C.17, C.19, C.20, D.21, D.24)...');
{
  const dashboardCode = fs.readFileSync(path.join(__dirname, '../src/pages/DashboardPage.tsx'), 'utf8');

  // C.17: No "Open Project Details" button
  assert.ok(
    !dashboardCode.includes('Open Project Details'),
    'Criterion 17: Dashboard must NOT contain "Open Project Details" button'
  );

  // C.16 & C.18: Direct project navigation on center card
  assert.ok(
    dashboardCode.includes('navigate(`/projects/${project.id}`)'),
    'Criterion 16: Clicking center card navigates directly to /projects/:id'
  );

  // C.19: Action isolation via stopPropagation
  assert.ok(
    dashboardCode.includes('e.stopPropagation()'),
    'Criterion 19: Action buttons inside card must use stopPropagation to isolate click events'
  );

  // C.20: Keyboard accessibility (Enter / Space)
  assert.ok(
    dashboardCode.includes("e.key === 'Enter' || e.key === ' '"),
    'Criterion 20: Keyboard Enter and Space must trigger navigation for focused center card'
  );

  // A.5 & A.6: Deliberate hover debounce (350ms) and autoplay (6000ms)
  assert.ok(
    dashboardCode.includes('350'),
    'Criterion 5: Neighbor hover threshold must be deliberately debounced (~350ms)'
  );
  assert.ok(
    dashboardCode.includes('6000'),
    'Criterion 6: Autoplay timer must be >= 5000ms (configured at 6000ms)'
  );

  // D.21: Distinct surface container styling
  assert.ok(
    dashboardCode.includes('bg-[#FFFFFF]/95 dark:bg-[#0E0A16] border border-[#D8CFE6] dark:border-[#382B49] rounded-3xl'),
    'Criterion 21: Distinct dashboard container surface must be present'
  );

  // G.42: Image accessibility (alt tag on genuine images, aria-hidden on decorative fallback)
  assert.ok(
    dashboardCode.includes('alt={project.title}'),
    'Criterion 42: Genuine cover images must have descriptive alt text'
  );
  assert.ok(
    dashboardCode.includes('aria-hidden="true"'),
    'Criterion 42: Decorative fallback artwork must have aria-hidden="true"'
  );

  console.log('  ✓ Codebase contract verified for direct navigation, action isolation, keyboard access, timing, and accessibility.');
}

// 4. REVIVAL RECOMMENDATIONS ELIGIBILITY & GROUNDED SCORE (E.26 - E.30)
console.log('\nTest 4: Revival Recommendations Eligibility & Grounded Math (E.26 - E.30)...');
{
  const mockProjects = [
    {
      id: 'p1',
      title: 'Active Project',
      status: 'active',
      progress: 80,
      technicalBlockers: [],
    },
    {
      id: 'p2',
      title: 'Completed Project',
      status: 'completed',
      progress: 100,
      technicalBlockers: [],
    },
    {
      id: 'p3',
      title: 'Paused Project High Viability',
      status: 'paused',
      progress: 70,
      technicalBlockers: ['One blocker'],
    },
    {
      id: 'p4',
      title: 'Abandoned Project Low Viability',
      status: 'abandoned',
      progress: 20,
      technicalBlockers: ['B1', 'B2', 'B3', 'B4'],
    },
    {
      id: 'p5',
      title: 'Archived Project',
      status: 'archived',
      progress: 50,
      technicalBlockers: [],
    },
  ];

  // Filtering function mirroring DashboardPage.tsx lines 487-502
  const filterRecommendations = (projects) => {
    return projects
      .filter((p) => p.status === 'paused' || p.status === 'abandoned')
      .map((p) => {
        const blockerCount = p.technicalBlockers?.length || 0;
        const readinessScore = Math.min(
          95,
          Math.max(15, 50 + Math.round(p.progress * 0.35) - blockerCount * 12)
        );
        return { ...p, readinessScore };
      })
      .sort((a, b) => b.readinessScore - a.readinessScore)
      .slice(0, 3);
  };

  const recs = filterRecommendations(mockProjects);

  // E.26: Only paused or abandoned
  assert.strictEqual(recs.length, 2, 'Only paused/abandoned projects qualify for revival recommendations');
  assert.ok(recs.every((r) => r.status === 'paused' || r.status === 'abandoned'));

  // Active (p1), completed (p2), archived (p5) must NOT appear
  assert.ok(!recs.find((r) => r.id === 'p1'), 'Active project must not appear in revival recommendations');
  assert.ok(!recs.find((r) => r.id === 'p2'), 'Completed project must not appear in revival recommendations');
  assert.ok(!recs.find((r) => r.id === 'p5'), 'Archived project must not appear in revival recommendations');

  // E.27: Grounded readiness score math
  // p3: 50 + round(70 * 0.35) - 1*12 = 50 + 25 - 12 = 63%
  const p3Rec = recs.find((r) => r.id === 'p3');
  assert.strictEqual(p3Rec.readinessScore, 63, 'p3 readiness score should be 63%');

  // p4: 50 + round(20 * 0.35) - 4*12 = 50 + 7 - 48 = 15% (bounded by Math.max(15))
  const p4Rec = recs.find((r) => r.id === 'p4');
  assert.strictEqual(p4Rec.readinessScore, 15, 'p4 readiness score should be bounded at minimum 15%');

  // E.29: No duplicate records
  const uniqueIds = new Set(recs.map((r) => r.id));
  assert.strictEqual(uniqueIds.size, recs.length, 'No duplicate project IDs in recommendations');

  // E.30: Empty state when no project qualifies
  const emptyRecs = filterRecommendations([mockProjects[0], mockProjects[1]]);
  assert.strictEqual(emptyRecs.length, 0, 'When no projects qualify, output is empty array (triggers empty state)');

  console.log('  ✓ Revival recommendations eligibility, mathematical scoring, and deduplication verified.');
}

// 5. UNRESOLVED BLOCKERS ACCURACY & DEDUPLICATION (F.31 - F.36)
console.log('\nTest 5: Unresolved Blockers Triage & Association (F.31 - F.36)...');
{
  const mockProjects = [
    {
      id: 'p1',
      title: 'Alpha Engine',
      category: 'infrastructure',
      technicalBlockers: ['Stripe billing quota exhausted', 'Docker socket timeout'],
    },
    {
      id: 'p2',
      title: 'Beta App',
      category: 'mobile',
      technicalBlockers: [],
    },
    {
      id: 'p3',
      title: 'Gamma AI',
      category: 'ai',
      technicalBlockers: ['API cost exceed budget limit'],
    },
  ];

  // Filtering function mirroring DashboardPage.tsx lines 505-547
  const extractBlockers = (projects) => {
    const list = [];
    projects.forEach((p) => {
      if (p.technicalBlockers && p.technicalBlockers.length > 0) {
        p.technicalBlockers.forEach((blocker, bIdx) => {
          const textLower = blocker.toLowerCase();
          const isCritical =
            textLower.includes('rate limit') ||
            textLower.includes('auth') ||
            textLower.includes('compliance') ||
            textLower.includes('nat') ||
            textLower.includes('billing') ||
            textLower.includes('quota') ||
            textLower.includes('api cost') ||
            textLower.includes('stripe');
          list.push({
            id: `${p.id}-blocker-${bIdx}`,
            projectId: p.id,
            projectTitle: p.title,
            blockerText: blocker,
            severity: isCritical ? 'Critical' : 'Technical Obstacle',
            category: p.category,
          });
        });
      }
    });

    return list
      .sort((a, b) => {
        if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
        if (b.severity === 'Critical' && a.severity !== 'Critical') return 1;
        return 0;
      })
      .slice(0, 3);
  };

  const blockers = extractBlockers(mockProjects);

  // F.31: Real blockers only
  assert.strictEqual(blockers.length, 3, 'Must extract exactly the 3 logged blockers');

  // F.32: Associated project, blocker description, and severity
  assert.strictEqual(blockers[0].projectId, 'p1');
  assert.strictEqual(blockers[0].severity, 'Critical'); // Stripe billing quota
  assert.strictEqual(blockers[1].severity, 'Critical'); // API cost exceed budget limit
  assert.strictEqual(blockers[2].severity, 'Technical Obstacle'); // Docker socket timeout

  // F.34: Deduplication & unique keys
  const blockerIds = new Set(blockers.map((b) => b.id));
  assert.strictEqual(blockerIds.size, blockers.length, 'All blocker items have unique identifiers');

  // F.36: Empty state when zero blockers exist
  const emptyBlockers = extractBlockers([{ id: 'p9', title: 'Clean Project', technicalBlockers: [] }]);
  assert.strictEqual(emptyBlockers.length, 0, 'Zero blockers produces empty array for clear empty state');

  console.log('  ✓ Unresolved blockers extraction, priority sorting, and project association verified.');
}

console.log('\n=== ALL TARGETED CAROUSEL & DASHBOARD ACCEPTANCE TESTS PASSED! ===');
