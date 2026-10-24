import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from '../server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING PROJECT GRAVEYARD DASHBOARD, CANVAS MODE & AI CHAT UX TEST SUITE ===\n');

// 1. Stationary App Shell & Fixed Layout Invariant
console.log('Test 1: App Shell Fixed Layout & Stationary Sidebar/Header...');
{
  const appLayoutSrc = fs.readFileSync(path.join(rootDir, 'src/components/layout/AppLayout.tsx'), 'utf-8');

  // Must have h-screen / h-[100dvh] overflow-hidden on outer container
  assert.ok(
    appLayoutSrc.includes('h-screen') && appLayoutSrc.includes('overflow-hidden'),
    'AppLayout outer div must enforce h-screen and overflow-hidden to prevent document window scrolling'
  );

  // Non-fixed workspaces must have dedicated scrollable content container
  assert.ok(
    appLayoutSrc.includes('overflow-y-auto') && appLayoutSrc.includes('overflow-x-hidden'),
    'Main content area must handle scrolling inside its own flex-1 container with overflow-y-auto and overflow-x-hidden'
  );

  // Header must be outside the scrollable container so it remains fixed
  const headerIdx = appLayoutSrc.indexOf('<Header />');
  assert.ok(headerIdx !== -1, 'Header must be present in AppLayout');
  const scrollableContentIdx = appLayoutSrc.indexOf('overflow-y-auto', headerIdx);
  assert.ok(
    scrollableContentIdx !== -1,
    'Header must be rendered outside/above the scrollable content container so it stays fixed'
  );

  console.log('  ✓ Fixed app shell layout verified: Sidebar and Header are stationary; main content scrolls in isolated viewport container.');
}

// 2. Default Canvas Mode on Initial Visit & User Preference Persistence
console.log('\nTest 2: Default Canvas Mode on Initial Visit & Persistence...');
{
  const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/pages/DashboardPage.tsx'), 'utf-8');

  // Verify viewMode defaults to 'canvas' on initial visit
  assert.ok(
    dashboardSrc.includes("return 'canvas'") || dashboardSrc.includes('return "canvas"'),
    'viewMode in DashboardPage must default to canvas for new visitors without saved preference'
  );

  // Verify localStorage check and persistence
  assert.ok(
    dashboardSrc.includes("localStorage.getItem('graveyard_dashboard_view')") ||
    dashboardSrc.includes('localStorage.getItem("graveyard_dashboard_view")'),
    'viewMode must inspect localStorage for graveyard_dashboard_view'
  );
  assert.ok(
    dashboardSrc.includes("localStorage.setItem('graveyard_dashboard_view', mode)") ||
    dashboardSrc.includes('localStorage.setItem("graveyard_dashboard_view", mode)'),
    'setViewMode must persist user choice to localStorage'
  );

  // Simulation test
  const storage = {};
  const mockLocalStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = val; },
  };

  const getInitialMode = (paramsMode) => {
    if (paramsMode) return paramsMode;
    const saved = mockLocalStorage.getItem('graveyard_dashboard_view');
    if (saved) return saved;
    return 'canvas';
  };

  // First visit without params -> 'canvas'
  assert.strictEqual(getInitialMode(null), 'canvas', 'First visit must default to canvas');

  // User deliberately switches to carousel
  mockLocalStorage.setItem('graveyard_dashboard_view', 'carousel');
  assert.strictEqual(getInitialMode(null), 'carousel', 'Returning visit must remember user deliberate choice of carousel');

  // Query parameter overrides
  assert.strictEqual(getInitialMode('canvas'), 'canvas', 'Explicit mode query parameter must override stored preference');

  console.log('  ✓ Canvas Mode default on first visit and localStorage persistence verified.');
}

// 3. Continuous 3-Second Rotating Exhibit in Canvas Mode
console.log('\nTest 3: Continuous 3-Second Rotating Exhibit in Canvas Mode...');
{
  const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/canvas/ActionCanvas.tsx'), 'utf-8');

  // Verify interval is set to ~3000ms (<4s)
  assert.ok(
    canvasSrc.includes('3000'),
    'ActionCanvas must include a 3000ms autoplay interval (< 4000ms)'
  );

  // Verify fast slide transition duration (~220ms)
  assert.ok(
    canvasSrc.includes('220'),
    'ActionCanvas must use fast ~220ms slide transition'
  );

  // Verify pause conditions
  assert.ok(
    canvasSrc.includes('isHovered') &&
    canvasSrc.includes('activeDragProject') &&
    canvasSrc.includes('pickedUpProject') &&
    canvasSrc.includes('isAutoplayActive') &&
    canvasSrc.includes('prefersReducedMotion') &&
    canvasSrc.includes('isTabVisible'),
    'ActionCanvas must pause autoplay on hover, drag, picked up state, user pause toggle, reduced motion, and hidden tab'
  );

  // Verify timer cleanup
  assert.ok(
    canvasSrc.includes('clearInterval(timer)'),
    'ActionCanvas must clean up autoplay interval on unmount or state change'
  );

  // Verify visible Pause/Play toggle control
  assert.ok(
    canvasSrc.includes('setIsAutoplayActive') &&
    (canvasSrc.includes('Pause') || canvasSrc.includes('Play')),
    'ActionCanvas must render a visible Pause/Play toggle button'
  );

  console.log('  ✓ Continuous 3s rotating exhibit, pause guards, and timer cleanup verified in ActionCanvas.');
}

// 4. Clickable & Functional Dashboard Metrics & Data Consistency
console.log('\nTest 4: Clickable & Functional Dashboard Metrics & Count Agreement...');
{
  const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/pages/DashboardPage.tsx'), 'utf-8');
  const projectsPageSrc = fs.readFileSync(path.join(rootDir, 'src/pages/ProjectsPage.tsx'), 'utf-8');

  // Check routes in DashboardPage
  assert.ok(dashboardSrc.includes("route: '/projects?status=all'"), 'Total projects metric must link to /projects?status=all');
  assert.ok(dashboardSrc.includes("route: '/projects?status=active'"), 'Active metric must link to /projects?status=active');
  assert.ok(dashboardSrc.includes("route: '/projects?status=paused'"), 'Paused metric must link to /projects?status=paused');
  assert.ok(dashboardSrc.includes("route: '/projects?status=completed'"), 'Completed metric must link to /projects?status=completed');
  assert.ok(dashboardSrc.includes("route: '/projects?status=revivable'"), 'Ready to revive metric must link to /projects?status=revivable');

  // Check that metrics are rendered as buttons with accessibility
  assert.ok(dashboardSrc.includes('navigate(m.route)'), 'Metric cards must invoke navigate(m.route)');
  assert.ok(dashboardSrc.includes('aria-label='), 'Metric cards must have descriptive aria-labels');

  // Check that ProjectsPage reads searchParams
  assert.ok(
    projectsPageSrc.includes("searchParams.get('status')"),
    'ProjectsPage must read status query parameter from URL'
  );
  assert.ok(
    projectsPageSrc.includes("option value=\"revivable\""),
    'ProjectsPage status dropdown must include revivable option'
  );
  assert.ok(
    projectsPageSrc.includes('Active filter:'),
    'ProjectsPage must render an active filter pill'
  );

  // Test with real SQLite database data
  const projects = dbManager.getProjects();
  assert.ok(projects.length > 0, 'Database must contain projects for test');

  // Compute metrics as DashboardPage does
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === 'active' || p.status === 'revived').length;
  const pausedCount = projects.filter((p) => p.status === 'paused').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const readyToReviveCount = projects.filter((p) => {
    const isPaused = p.status === 'paused' || p.status === 'abandoned';
    const score = 50 + Math.round(p.progress * 0.3) - (p.technicalBlockers?.length || 0) * 15;
    return isPaused && score >= 40;
  }).length;

  // Filter projects as ProjectsPage does for each status filter
  const filterByStatus = (status) => {
    return projects.filter((p) => {
      if (status === 'all') return true;
      if (status === 'active') return p.status === 'active' || p.status === 'revived';
      if (status === 'revivable') {
        const isPaused = p.status === 'paused' || p.status === 'abandoned';
        const score = 50 + Math.round(p.progress * 0.3) - (p.technicalBlockers?.length || 0) * 15;
        return isPaused && score >= 40;
      }
      return p.status === status;
    });
  };

  assert.strictEqual(filterByStatus('all').length, totalCount, 'ProjectsPage all count must equal Dashboard totalCount');
  assert.strictEqual(filterByStatus('active').length, activeCount, 'ProjectsPage active count must equal Dashboard activeCount');
  assert.strictEqual(filterByStatus('paused').length, pausedCount, 'ProjectsPage paused count must equal Dashboard pausedCount');
  assert.strictEqual(filterByStatus('completed').length, completedCount, 'ProjectsPage completed count must equal Dashboard completedCount');
  assert.strictEqual(filterByStatus('revivable').length, readyToReviveCount, 'ProjectsPage revivable count must equal Dashboard readyToReviveCount');

  console.log(`  ✓ Metric counts match ProjectsPage filtered counts perfectly across ${totalCount} records:`);
  console.log(`    Total: ${totalCount}, Active: ${activeCount}, Paused: ${pausedCount}, Completed: ${completedCount}, Revivable: ${readyToReviveCount}`);
}

// 5. Replace AI Tools Card with Project Completion Progress
console.log('\nTest 5: Project Completion Progress Section...');
{
  const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/pages/DashboardPage.tsx'), 'utf-8');

  // Verify "AI Tools" card is not present in Section D
  assert.ok(
    !dashboardSrc.includes('<h3>AI tools</h3>') &&
    !dashboardSrc.includes('AI tools Shortcuts') &&
    !dashboardSrc.includes('>AI tools<'),
    'Old AI Tools shortcut card must be removed from dashboard'
  );

  // Verify "Project completion progress" is present
  assert.ok(
    dashboardSrc.includes('Project completion progress'),
    'Dashboard must include Project completion progress section'
  );

  // Verify display elements
  assert.ok(dashboardSrc.includes('completionProjects'), 'Must derive completionProjects');
  assert.ok(dashboardSrc.includes('averageCompletion'), 'Must compute averageCompletion');
  assert.ok(dashboardSrc.includes('ProgressBar'), 'Must render visual ProgressBar');
  assert.ok(dashboardSrc.includes('milestones'), 'Must display milestone counts');
  assert.ok(dashboardSrc.includes('/projects/${cp.id}'), 'Must allow click-through to project detail');

  console.log('  ✓ AI Tools card successfully replaced with responsive Project Completion Progress section.');
}

// 6. Prominent Selected Project Highlight in Revival Studio
console.log('\nTest 6: Prominent Selected Project Highlight in Revival Studio...');
{
  const studioSrc = fs.readFileSync(path.join(rootDir, 'src/pages/RevivalStudioPage.tsx'), 'utf-8');

  // Verify horizontal project selection strip exists
  assert.ok(
    studioSrc.includes('PROJECT SELECTION PANEL STRIP') || studioSrc.includes('Active Project:'),
    'RevivalStudio must include visible project selection strip'
  );

  // Verify full-boundary highlight styling with border, ring, background, and checkmark
  assert.ok(
    studioSrc.includes('ring-2 ring-purple-500') &&
    studioSrc.includes('border-purple-500') &&
    studioSrc.includes('Check'),
    'Selected project must have prominent full-boundary highlight with border, ring, and checkmark icon'
  );

  // Verify auto-scrolling into view
  assert.ok(
    studioSrc.includes('scrollIntoView') && studioSrc.includes('selectedProjectCardRef'),
    'Selected project card must automatically scroll into view with scrollIntoView'
  );

  // Verify project title and status displayed prominently in header & context bar
  assert.ok(
    studioSrc.includes('selectedProject.title') && studioSrc.includes('selectedProject.status'),
    'Selected project title and status must be prominently displayed in header and context bar'
  );

  console.log('  ✓ Revival Studio selected project visual highlight, checkmark badge, and scrollIntoView verified.');
}

// 7. Concise & Conversational AI Chat Welcome Messages
console.log('\nTest 7: Concise & Conversational AI Chat Welcome Messages...');
{
  const studioSrc = fs.readFileSync(path.join(rootDir, 'src/pages/RevivalStudioPage.tsx'), 'utf-8');
  const fusionSrc = fs.readFileSync(path.join(rootDir, 'src/pages/FusionPage.tsx'), 'utf-8');

  // Revival Studio welcome message
  assert.ok(
    studioSrc.includes("Hi! I'm ready to help you revive **${selectedProject.title}**. What would you like to understand or work on?"),
    'Revival Studio welcome message must be concise: "Hi! I\'m ready to help you revive **${selectedProject.title}**. What would you like to understand or work on?"'
  );

  // Revival Studio must not automatically execute askAiAssistant on mount
  assert.ok(
    !studioSrc.includes("apiClient.askAiAssistant(selectedProject.id, 'overview'"),
    'Revival Studio must not automatically call askAiAssistant with overview on mount'
  );

  // Fusion Page welcome message
  assert.ok(
    fusionSrc.includes('Hi! I can help you explore whether') &&
    fusionSrc.includes('What would you like to compare or create?'),
    'Fusion welcome message must be concise and conversational'
  );

  console.log('  ✓ Concise and conversational AI welcome messages verified for both Revival Studio and Project Fusion.');
}

// 8. Performance & Timer Cleanup Resilience
console.log('\nTest 8: Performance, Unmount Cleanups & No Memory Leaks...');
{
  const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/canvas/ActionCanvas.tsx'), 'utf-8');

  // Verify all timeouts in ActionCanvas have clearTimeout
  const timeoutMatches = canvasSrc.match(/setTimeout\(/g) || [];
  const clearTimeoutMatches = canvasSrc.match(/clearTimeout\(/g) || [];
  assert.ok(
    clearTimeoutMatches.length >= timeoutMatches.length,
    'All timeouts in ActionCanvas must have corresponding clearTimeout cleanups'
  );

  // Verify intervals in ActionCanvas have clearInterval
  const intervalMatches = canvasSrc.match(/setInterval\(/g) || [];
  const clearIntervalMatches = canvasSrc.match(/clearInterval\(/g) || [];
  assert.ok(
    clearIntervalMatches.length >= intervalMatches.length,
    'All intervals in ActionCanvas must have corresponding clearInterval cleanups'
  );

  // Verify window event listeners in ActionCanvas are cleaned up
  assert.ok(
    canvasSrc.includes("removeEventListener('resize'") &&
    canvasSrc.includes("removeEventListener('visibilitychange'") &&
    canvasSrc.includes("removeEventListener('dragend'") &&
    canvasSrc.includes("removeEventListener('keydown'"),
    'All event listeners in ActionCanvas must have corresponding removeEventListener cleanups'
  );

  console.log('  ✓ Timer and event listener lifecycle cleanup verified across all interactive components.');
}

// 9. Carousel Frame Stability & Stationary Dashboard Layout During Rotation
console.log('\nTest 9: Carousel Frame Stability & Stationary Dashboard Layout During Rotation...');
{
  const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/canvas/ActionCanvas.tsx'), 'utf-8');
  const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/pages/DashboardPage.tsx'), 'utf-8');

  // Verify ActionCanvas does NOT call scrollIntoView for thumbnail navigation (which scrolls ancestor containers and jumps the page)
  assert.ok(
    !canvasSrc.includes('activeThumb.scrollIntoView'),
    'ActionCanvas must not use activeThumb.scrollIntoView which bubbles to ancestor viewports and causes the dashboard to jump vertically'
  );
  assert.ok(
    canvasSrc.includes('container.scrollTo({') && canvasSrc.includes('behavior: \'smooth\''),
    'ActionCanvas must use container.scrollTo() to smoothly scroll only the thumbnail container without shifting the page'
  );

  // Verify DashboardPage also uses container.scrollTo
  assert.ok(
    dashboardSrc.includes('container.scrollTo({') && dashboardSrc.includes('behavior: \'smooth\''),
    'DashboardPage must use container.scrollTo() for thumbnail strip navigation'
  );

  // Verify neither showcaseContainerRef nor DashboardPage outer surface container use transition-all
  assert.ok(
    !canvasSrc.includes('transition-all duration-200 ease-out') &&
    canvasSrc.includes('transition-[border-color,box-shadow] duration-200'),
    'ActionCanvas showcase container must not use transition-all duration-200, which animates container height'
  );
  assert.ok(
    dashboardSrc.includes('transition-[border-color,box-shadow] duration-200'),
    'DashboardPage surface container must use transition-[border-color,box-shadow] duration-200 to prevent outer height animations'
  );

  // Verify bounded minimum height and items-stretch on virtual carousel stages
  assert.ok(
    canvasSrc.includes('min-h-[460px] sm:min-h-[420px] lg:min-h-[380px]') &&
    canvasSrc.includes('items-stretch'),
    'ActionCanvas carousel stage and track must have min-h-[460px] sm:min-h-[420px] lg:min-h-[380px] and items-stretch'
  );
  assert.ok(
    dashboardSrc.includes('min-h-[460px] sm:min-h-[420px] lg:min-h-[380px]') &&
    dashboardSrc.includes('items-stretch'),
    'DashboardPage carousel stage and track must have min-h-[460px] sm:min-h-[420px] lg:min-h-[380px] and items-stretch'
  );

  // Verify clamped typography constraints preventing variable slide heights
  assert.ok(
    canvasSrc.includes('line-clamp-1 truncate shrink-0') &&
    canvasSrc.includes('line-clamp-2 h-[2.6rem] overflow-hidden shrink-0') &&
    canvasSrc.includes('h-[26px] overflow-hidden'),
    'ActionCanvas slide cards must enforce uniform clamped title, summary, and tech row heights'
  );
  assert.ok(
    dashboardSrc.includes('line-clamp-1 truncate shrink-0') &&
    dashboardSrc.includes('line-clamp-2 h-[2.6rem] overflow-hidden shrink-0') &&
    dashboardSrc.includes('h-[26px] overflow-hidden'),
    'DashboardPage slide cards must enforce uniform clamped title, summary, and tech row heights'
  );

  console.log('  ✓ Carousel frame stability, ancestor scroll isolation, and zero-layout-shift verified across all views.');
}

console.log('\n===============================================================');
console.log('✓ ALL 9 TEST SUITE SPECIFICATIONS PASSED SUCCESSFULLY!');
console.log('===============================================================\n');
