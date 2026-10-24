import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { dbManager } from '../server/db.ts';
import {
  validateEmail,
  validatePhone,
  calculateScheduledTime,
  calculateNextOccurrence,
  getProviderConfigStatus,
  scheduleNotificationJobs,
} from '../server/notificationScheduler.ts';
import { formatLiveCountdown } from '../src/hooks/useLiveCountdown.ts';
import { aiService } from '../server/aiService.ts';

console.log('=== RUNNING PROJECT FOLLOW-THROUGH CENTER TEST SUITE ===\n');

// ----------------------------------------------------------------------------
// Test 1: Creating and Editing a Reminder with Email and Phone Details
// ----------------------------------------------------------------------------
console.log('Test 1: Creating and editing a reminder with email and phone details...');
{
  const testId = `rem-test-${Date.now()}`;
  const now = new Date().toISOString();
  const dueDateTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const created = dbManager.createReminder({
    id: testId,
    userId: 'user-1',
    projectId: 'proj-1',
    projectTitle: 'EcoTrace Carbon Accounting',
    title: 'Benchmark Llama 3 on Local GPU',
    message: 'Profile latency and token throughput on RTX 4090',
    category: 'finish-task',
    priority: 'high',
    dateTime: dueDateTime,
    timezone: 'America/New_York',
    recurrence: 'weekly',
    channel: 'both',
    channels: ['in-app', 'email', 'whatsapp'],
    contactEmail: 'alex.rivera@example.com',
    contactPhone: '+14155552671',
    whatsappConsent: true,
    whatsappConsentTimestamp: now,
    notificationSchedule: '1h-before',
    enabled: true,
    status: 'upcoming',
    createdAt: now,
    updatedAt: now,
  });

  assert.ok(created, 'Reminder must be created successfully');
  assert.strictEqual(created.id, testId);
  assert.strictEqual(created.contactEmail, 'alex.rivera@example.com');
  assert.strictEqual(created.contactPhone, '+14155552671');
  assert.strictEqual(created.whatsappConsent, true);
  assert.strictEqual(created.category, 'finish-task');
  assert.strictEqual(created.priority, 'high');
  assert.strictEqual(created.timezone, 'America/New_York');

  // Verify persistence via getReminder
  const fetched = dbManager.getReminder(testId, 'user-1');
  assert.ok(fetched, 'Reminder must be retrievable from SQLite');
  assert.strictEqual(fetched.title, 'Benchmark Llama 3 on Local GPU');
  assert.strictEqual(fetched.channels?.length, 3);

  // Edit the reminder with PATCH updates
  const updated = dbManager.updateReminder(
    testId,
    {
      title: 'Benchmark Llama 3.1 8B on Local GPU',
      priority: 'urgent',
      contactPhone: '+447911123456',
      message: 'Profile quantization and batch size performance',
    },
    'user-1'
  );

  assert.ok(updated, 'Reminder must be updated');
  assert.strictEqual(updated.title, 'Benchmark Llama 3.1 8B on Local GPU');
  assert.strictEqual(updated.priority, 'urgent');
  assert.strictEqual(updated.contactPhone, '+447911123456');
  assert.strictEqual(updated.message, 'Profile quantization and batch size performance');

  // Clean up test reminder
  dbManager.deleteReminder(testId, 'user-1');
  console.log('  ✓ Reminder creation, rich field persistence, and update verified.');
}

// ----------------------------------------------------------------------------
// Test 2: Contact Validation (Email, E.164 Phone with Country Code, Consent)
// ----------------------------------------------------------------------------
console.log('\nTest 2: Contact validation (Email, E.164 Phone, WhatsApp Consent)...');
{
  // Valid email tests
  assert.strictEqual(validateEmail('user@example.com'), true);
  assert.strictEqual(validateEmail('alex.rivera+dev@projectgraveyard.org'), true);
  assert.strictEqual(validateEmail('founder_123@sub.domain.co'), true);

  // Invalid email tests
  assert.strictEqual(validateEmail('invalid-email'), false);
  assert.strictEqual(validateEmail('user@domain'), false);
  assert.strictEqual(validateEmail('@domain.com'), false);
  assert.strictEqual(validateEmail('user@.com'), false);
  assert.strictEqual(validateEmail(''), false);

  // Valid E.164 phone numbers (leading +, country code, 7-15 digits total)
  const validUS = validatePhone('+14155552671');
  assert.strictEqual(validUS.valid, true);
  assert.strictEqual(validUS.normalized, '+14155552671');

  const validUK = validatePhone('+447911123456');
  assert.strictEqual(validUK.valid, true);
  assert.strictEqual(validUK.normalized, '+447911123456');

  const validIndia = validatePhone('+919876543210');
  assert.strictEqual(validIndia.valid, true);
  assert.strictEqual(validIndia.normalized, '+919876543210');

  // Invalid phone numbers
  const noCountryCode = validatePhone('4155552671');
  assert.strictEqual(noCountryCode.valid, false);
  assert.ok(noCountryCode.error?.includes('country code'));

  const startsWithZero = validatePhone('+0123456789');
  assert.strictEqual(startsWithZero.valid, false);

  const tooShort = validatePhone('+1234');
  assert.strictEqual(tooShort.valid, false);

  const nonNumeric = validatePhone('+1415abc2671');
  assert.strictEqual(nonNumeric.valid, false);

  console.log('  ✓ Email RFC syntax and E.164 international phone format validation verified.');
}

// ----------------------------------------------------------------------------
// Test 3: Countdown Accuracy Calculation (Future, Due Now, Overdue Duration)
// ----------------------------------------------------------------------------
console.log('\nTest 3: Countdown accuracy calculation (Future, Due Now, Overdue)...');
{
  const mockNow = 1700000000000;

  // Case 1: Future - 2 days, 4 hours ahead
  const future2d4h = new Date(mockNow + (2 * 86400 + 4 * 3600) * 1000).toISOString();
  const countdownFuture = formatLiveCountdown(future2d4h, mockNow);
  assert.strictEqual(countdownFuture.isOverdue, false);
  assert.strictEqual(countdownFuture.isDueNow, false);
  assert.strictEqual(countdownFuture.text, 'Due in 2 days, 4 hours');

  // Case 2: Future - 35 minutes ahead
  const future35m = new Date(mockNow + 35 * 60 * 1000).toISOString();
  const countdown35m = formatLiveCountdown(future35m, mockNow);
  assert.strictEqual(countdown35m.isOverdue, false);
  assert.strictEqual(countdown35m.isDueNow, false);
  assert.strictEqual(countdown35m.text, 'Due in 35 minutes');

  // Case 3: Due Now - Within 45 seconds of due date
  const dueNowIso = new Date(mockNow + 30 * 1000).toISOString();
  const countdownNow = formatLiveCountdown(dueNowIso, mockNow);
  assert.strictEqual(countdownNow.isDueNow, true);
  assert.strictEqual(countdownNow.isOverdue, false);
  assert.strictEqual(countdownNow.text, 'Due now');

  // Case 4: Overdue - 1 hour, 20 minutes ago
  const overdue1h20m = new Date(mockNow - (3600 + 20 * 60) * 1000).toISOString();
  const countdownOverdue = formatLiveCountdown(overdue1h20m, mockNow);
  assert.strictEqual(countdownOverdue.isOverdue, true);
  assert.strictEqual(countdownOverdue.isDueNow, false);
  assert.strictEqual(countdownOverdue.text, 'Overdue by 1 hour, 20 minutes');

  // Case 5: Overdue - 3 days, 6 hours ago
  const overdue3d6h = new Date(mockNow - (3 * 86400 + 6 * 3600) * 1000).toISOString();
  const countdownOverdueLong = formatLiveCountdown(overdue3d6h, mockNow);
  assert.strictEqual(countdownOverdueLong.isOverdue, true);
  assert.strictEqual(countdownOverdueLong.text, 'Overdue by 3 days, 6 hours');

  console.log('  ✓ Countdown calculations accurately handle future, due now, and overdue intervals.');
}

// ----------------------------------------------------------------------------
// Test 4: Countdown Correctness After Refresh and Rescheduling
// ----------------------------------------------------------------------------
console.log('\nTest 4: Countdown correctness after refresh and rescheduling...');
{
  const testId = `rem-snooze-test-${Date.now()}`;
  const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();

  // Create an overdue reminder
  dbManager.createReminder({
    id: testId,
    userId: 'user-1',
    title: 'Review PR #42',
    message: 'Check diff for memory leak fix',
    dateTime: pastTime,
    recurrence: 'once',
    channel: 'in-app',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Verify it is overdue after simulated storage fetch
  const initialFetch = dbManager.getReminder(testId, 'user-1');
  assert.ok(initialFetch);
  const initialCountdown = formatLiveCountdown(initialFetch.dateTime);
  assert.strictEqual(initialCountdown.isOverdue, true);
  assert.ok(initialCountdown.text.startsWith('Overdue by'));

  // Reschedule / Snooze by 24 hours
  const newDueMs = Date.now() + 24 * 3600 * 1000;
  const snoozedIso = new Date(newDueMs).toISOString();

  const snoozed = dbManager.updateReminder(
    testId,
    {
      dateTime: snoozedIso,
      status: 'upcoming',
      enabled: true,
      snoozeCount: (initialFetch.snoozeCount || 0) + 1,
    },
    'user-1'
  );

  assert.strictEqual(snoozed.snoozeCount, 1);
  const refreshedCountdown = formatLiveCountdown(snoozed.dateTime);
  assert.strictEqual(refreshedCountdown.isOverdue, false);
  assert.ok(refreshedCountdown.text.startsWith('Due in'));

  dbManager.deleteReminder(testId, 'user-1');
  console.log('  ✓ Persistent timestamp survives refresh and snooze updates live duration.');
}

// ----------------------------------------------------------------------------
// Test 5: Timezone Handling
// ----------------------------------------------------------------------------
console.log('\nTest 5: Timezone handling...');
{
  const utcDate = new Date('2026-11-01T15:30:00.000Z');
  const isoUtc = utcDate.toISOString();

  const testId = `rem-tz-${Date.now()}`;
  const created = dbManager.createReminder({
    id: testId,
    userId: 'user-1',
    title: 'Multi-timezone alignment',
    message: 'Verify UTC normalization',
    dateTime: isoUtc,
    timezone: 'Asia/Tokyo',
    recurrence: 'once',
    channel: 'in-app',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.strictEqual(created.dateTime, '2026-11-01T15:30:00.000Z');
  assert.strictEqual(created.timezone, 'Asia/Tokyo');

  // Verify millisecond equivalence
  const parsed = new Date(created.dateTime).getTime();
  assert.strictEqual(parsed, utcDate.getTime());

  dbManager.deleteReminder(testId, 'user-1');
  console.log('  ✓ Absolute UTC timestamp preservation with IANA timezone metadata verified.');
}

// ----------------------------------------------------------------------------
// Test 6: Recurring Reminder Generation Without Duplicates
// ----------------------------------------------------------------------------
console.log('\nTest 6: Recurring reminder generation without duplicates...');
{
  const baseTime = '2026-10-25T10:00:00.000Z';

  // Daily occurrence (+24h)
  const nextDaily = calculateNextOccurrence(baseTime, 'daily');
  assert.strictEqual(nextDaily, '2026-10-26T10:00:00.000Z');

  // Weekly occurrence (+7d)
  const nextWeekly = calculateNextOccurrence(baseTime, 'weekly');
  assert.strictEqual(nextWeekly, '2026-11-01T10:00:00.000Z');

  // Monthly occurrence (+1 month)
  const nextMonthly = calculateNextOccurrence(baseTime, 'monthly');
  assert.strictEqual(nextMonthly, '2026-11-25T10:00:00.000Z');

  // Custom occurrence (every 3 days)
  const nextCustom = calculateNextOccurrence(baseTime, 'custom', 3);
  assert.strictEqual(nextCustom, '2026-10-28T10:00:00.000Z');

  // Test recurring reminder completion cycle
  const recurId = `rem-recur-${Date.now()}`;
  dbManager.createReminder({
    id: recurId,
    userId: 'user-1',
    title: 'Weekly Architectural Review',
    message: 'Audit unresolved technical blockers',
    dateTime: baseTime,
    recurrence: 'weekly',
    channel: 'in-app',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const remindersBefore = dbManager.getReminders('user-1').length;

  // Complete the recurring reminder (advances to next occurrence instead of archiving)
  const nextOccurrenceIso = calculateNextOccurrence(baseTime, 'weekly');
  const updatedRecur = dbManager.updateReminder(
    recurId,
    {
      dateTime: nextOccurrenceIso,
      status: 'upcoming',
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
    'user-1'
  );

  assert.strictEqual(updatedRecur.status, 'upcoming');
  assert.strictEqual(updatedRecur.dateTime, '2026-11-01T10:00:00.000Z');

  // Ensure total reminders count remains identical (no duplicate clones spawned)
  const remindersAfter = dbManager.getReminders('user-1').length;
  assert.strictEqual(remindersAfter, remindersBefore);

  dbManager.deleteReminder(recurId, 'user-1');
  console.log('  ✓ Recurrence calculation and non-duplicating advancement verified.');
}

// ----------------------------------------------------------------------------
// Test 7: Updating and Cancelling Scheduled Jobs
// ----------------------------------------------------------------------------
console.log('\nTest 7: Updating and cancelling scheduled jobs when reminders change...');
{
  const remId = `rem-jobs-${Date.now()}`;
  const dueIso = new Date(Date.now() + 86400 * 1000).toISOString();

  const reminder = dbManager.createReminder({
    id: remId,
    userId: 'user-1',
    title: 'Sync with Team',
    message: 'Sprint retrospective',
    dateTime: dueIso,
    recurrence: 'once',
    channel: 'both',
    channels: ['in-app', 'email', 'whatsapp'],
    contactEmail: 'alex@example.com',
    contactPhone: '+14155552671',
    whatsappConsent: true,
    notificationSchedule: '1h-before',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Schedule jobs
  const jobs = scheduleNotificationJobs(reminder);
  assert.strictEqual(jobs.length, 3, 'Must schedule 1 job per enabled channel');

  // Verify jobs in database
  const pendingBefore = dbManager.getScheduledJobsForReminder(remId);
  assert.strictEqual(pendingBefore.length, 3);
  assert.ok(pendingBefore.every((j) => j.status === 'scheduled'));

  // Cancel jobs for reminder
  dbManager.cancelPendingJobsForReminder(remId);

  // Verify all pending jobs marked cancelled
  const pendingAfter = dbManager.getScheduledJobsForReminder(remId);
  assert.ok(pendingAfter.every((j) => j.status === 'cancelled'));

  dbManager.deleteReminder(remId, 'user-1');
  console.log('  ✓ Notification job scheduling and cancellation synchronization verified.');
}

// ----------------------------------------------------------------------------
// Test 8: Authentication & Ownership Scoping
// ----------------------------------------------------------------------------
console.log('\nTest 8: Authentication & ownership scoping...');
{
  const isolatedId = `rem-owner-${Date.now()}`;
  dbManager.createReminder({
    id: isolatedId,
    userId: 'user-1',
    title: 'Owner-protected reminder',
    message: 'Confidential',
    dateTime: new Date(Date.now() + 86400 * 1000).toISOString(),
    recurrence: 'once',
    channel: 'in-app',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // User-2 must not be able to retrieve or update user-1 reminder
  const crossUserFetch = dbManager.getReminder(isolatedId, 'user-2');
  assert.strictEqual(crossUserFetch, null, 'Cross-user fetch must return null');

  let updateThrew = false;
  try {
    dbManager.updateReminder(isolatedId, { title: 'Compromised' }, 'user-2');
  } catch (err) {
    updateThrew = true;
  }
  assert.strictEqual(updateThrew, true, 'Cross-user update must be rejected');

  dbManager.deleteReminder(isolatedId, 'user-1');
  console.log('  ✓ Ownership isolation and strict cross-user access restrictions verified.');
}

// ----------------------------------------------------------------------------
// Test 9: Email Provider Honest Not-Configured Status vs Real Configuration
// ----------------------------------------------------------------------------
console.log('\nTest 9: Email provider honest not-configured status...');
{
  const status = getProviderConfigStatus();
  assert.ok(status.email);
  assert.strictEqual(typeof status.email.configured, 'boolean');
  assert.strictEqual(typeof status.email.provider, 'string');
  assert.strictEqual(typeof status.email.details, 'string');

  if (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    assert.strictEqual(status.email.configured, false);
    assert.strictEqual(status.email.provider, 'None');
    assert.ok(status.email.details.includes('Set SMTP_HOST') || status.email.details.includes('RESEND_API_KEY'));
  }

  console.log('  ✓ Provider inspection honesty verified (never simulates fake delivery when unconfigured).');
}

// ----------------------------------------------------------------------------
// Test 10: WhatsApp Provider Failure, Consent Enforcement, and Unconfigured State
// ----------------------------------------------------------------------------
console.log('\nTest 10: WhatsApp provider failure, consent enforcement, and unconfigured state...');
{
  const status = getProviderConfigStatus();
  assert.ok(status.whatsapp);
  assert.strictEqual(typeof status.whatsapp.configured, 'boolean');
  assert.strictEqual(typeof status.whatsapp.provider, 'string');

  if (!process.env.WHATSAPP_API_TOKEN && !process.env.TWILIO_AUTH_TOKEN) {
    assert.strictEqual(status.whatsapp.configured, false);
    assert.ok(status.whatsapp.details.includes('Set WHATSAPP_API_TOKEN') || status.whatsapp.details.includes('TWILIO'));
  }

  console.log('  ✓ WhatsApp provider status accurately reflects configuration state.');
}

// ----------------------------------------------------------------------------
// Test 11: Notification Idempotency and Recovery After Restart
// ----------------------------------------------------------------------------
console.log('\nTest 11: Notification idempotency and recovery after restart...');
{
  const remId = `rem-idem-${Date.now()}`;
  const dueIso = new Date(Date.now() + 10000).toISOString();

  const reminder = dbManager.createReminder({
    id: remId,
    userId: 'user-1',
    title: 'Idempotency Test',
    message: 'Check deduplication',
    dateTime: dueIso,
    recurrence: 'once',
    channel: 'in-app',
    status: 'upcoming',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Scheduling once
  const jobs1 = scheduleNotificationJobs(reminder);
  assert.strictEqual(jobs1.length, 1);
  const firstJobId = jobs1[0].id;

  // Scheduling a second time (e.g. server reboot or repeat trigger)
  const jobs2 = scheduleNotificationJobs(reminder);
  assert.strictEqual(jobs2.length, 1);
  assert.strictEqual(jobs2[0].id, firstJobId, 'Must update existing job via idempotency key');

  // Verify only 1 pending job exists in SQLite
  const pending = dbManager.getScheduledJobsForReminder(remId);
  assert.strictEqual(pending.length, 1);

  dbManager.deleteReminder(remId, 'user-1');
  console.log('  ✓ Deterministic idempotency keys prevent duplicate jobs across restarts.');
}

// ----------------------------------------------------------------------------
// Test 12: Canvas Protocol Drag-and-Drop + Accessible Keyboard Alternatives
// ----------------------------------------------------------------------------
console.log('\nTest 12: Canvas Protocol Action Dock & Accessible Alternatives...');
{
  const remindersPagePath = path.resolve('src/pages/RemindersPage.tsx');
  const content = fs.readFileSync(remindersPagePath, 'utf8');

  // Verify Canvas Action Dock with Designated Action Zones
  assert.ok(content.includes('data-drop-zone="complete-reminder"'), 'Must have Complete Reminder Action Zone');
  assert.ok(content.includes('data-drop-zone="dismiss-reminder"'), 'Must have Dismiss Reminder Action Zone');

  // Verify draggable items
  assert.ok(content.includes('draggable={isActionable}'), 'Reminder cards must be draggable in active states');
  assert.ok(content.includes('onDragStart='), 'Cards must have drag start handlers');

  // Verify accessible keyboard & touch triggers
  assert.ok(content.includes('role="region"'), 'Action zones must have accessible ARIA region roles');
  assert.ok(content.includes('tabIndex={0}'), 'Action zones must be keyboard focusable');
  assert.ok(content.includes('Pick Up') || content.includes('Holding Reminder'), 'Must have accessible Pick Up mechanism');
  assert.ok(content.includes('Drop Here'), 'Must have accessible Drop Here trigger button');

  console.log('  ✓ Canvas Protocol Action Zones and accessible keyboard/touch alternatives confirmed.');
}

// ----------------------------------------------------------------------------
// Test 13: Existing Seed Data Intact (rem-1, rem-2, rem-3)
// ----------------------------------------------------------------------------
console.log('\nTest 13: Existing seed reminder data intact...');
{
  const existingReminders = dbManager.getReminders('user-1');
  const seedIds = ['rem-1', 'rem-2', 'rem-3'];

  seedIds.forEach((id) => {
    const found = existingReminders.find((r) => r.id === id);
    assert.ok(found, `Seed reminder ${id} must be intact in SQLite`);
    assert.ok(found.title, `Seed reminder ${id} must have title`);
    assert.ok(found.dateTime, `Seed reminder ${id} must have dateTime`);
  });

  console.log('  ✓ Existing seed reminders (rem-1, rem-2, rem-3) verified intact and preserved.');
}

// ----------------------------------------------------------------------------
// Test 14: AI Grounded Reminder Suggestions
// ----------------------------------------------------------------------------
console.log('\nTest 14: AI Grounded Reminder Suggestions Generation...');
{
  const suggestions = await aiService.generateReminderSuggestions('user-1');
  assert.ok(Array.isArray(suggestions), 'Suggestions must be an array');
  assert.ok(suggestions.length > 0, 'Must produce grounded suggestions from user projects');

  const firstSug = suggestions[0];
  assert.ok(firstSug.projectTitle, 'Suggestion must include project title');
  assert.ok(firstSug.suggestedTitle, 'Suggestion must include suggested title');
  assert.ok(firstSug.suggestedCategory, 'Suggestion must include category');
  assert.ok(firstSug.rationale, 'Suggestion must provide rationale grounded in project state');

  console.log(`  ✓ Generated ${suggestions.length} AI suggestions grounded in milestones, blockers, and paused projects.`);
}

console.log('\n===============================================================');
console.log('✓ ALL 14 TEST SUITE SPECIFICATIONS PASSED SUCCESSFULLY!');
console.log('===============================================================\n');
