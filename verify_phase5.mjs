import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const errors = [];
const pass = (msg) => console.log('✅', msg);
const fail = (msg) => { console.log('❌', msg); errors.push(msg); };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // Login
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 8000 });
    pass('Logged in');

    // Navigate to Time Tracking
    await page.click('text=Time Tracking');
    await page.waitForURL(`${BASE}/time-tracking`, { timeout: 5000 });
    pass('Time Tracking page loaded');

    // Verify timer and log button are visible
    await page.waitForSelector('button:has-text("Start Timer")', { timeout: 3000 });
    pass('Start Timer button visible');

    // ── Log a time entry manually ──
    await page.click('button:has-text("Log Time")');
    await page.waitForSelector('text=Log Time', { timeout: 3000 });

    // Fill date (already defaults to today), set start/end time
    await page.locator('input[type="time"]').nth(0).fill('09:00');
    await page.locator('input[type="time"]').nth(1).fill('11:30');

    // Duration should show 2h 30m
    await page.waitForSelector('text=2h 30m', { timeout: 3000 });
    pass('Duration preview shows 2h 30m');

    // Select project — nth(0) is the page-level filter, nth(1) is the modal project select
    await page.locator('select').nth(1).selectOption({ index: 1 });

    // Add description
    await page.fill('input[placeholder="What did you work on?"]', 'Morning dev session');

    await page.click('button:has-text("Save")');
    // Wait for the modal overlay to disappear (fixed inset-0 backdrop)
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 8000 });
    pass('Log Time modal closed after Save');

    // Entry appears in the list
    await page.waitForSelector('text=Morning dev session', { timeout: 5000 });
    pass('Time entry appears in list');

    // Duration column shows correctly
    await page.waitForSelector('text=2h 30m', { timeout: 3000 });
    pass('Duration 2h 30m displayed in table');

    // ── Test timer start/stop ──
    await page.click('button:has-text("Start Timer")');
    await page.waitForSelector('button:has-text("Stop")', { timeout: 3000 });
    pass('Timer starts — Stop button visible');

    // Wait a moment then stop
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Stop")');

    // Log Time modal should open with prefilled times
    await page.waitForSelector('text=Log Time', { timeout: 3000 });
    pass('Log Time modal opens automatically after stopping timer');

    // Start/end fields should be prefilled
    const startVal = await page.locator('input[type="time"]').nth(0).inputValue();
    if (startVal) pass(`Start time prefilled: ${startVal}`);
    else fail('Start time not prefilled from timer');

    await page.click('button:has-text("Cancel")');

    // ── Filters ──
    const projectFilter = page.locator('select').first();
    await projectFilter.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    pass('Project filter applied');
    await projectFilter.selectOption({ index: 0 });

    // ── Timesheets tab ──
    await page.click('button:has-text("Timesheets")');
    await page.waitForTimeout(500);
    pass('Timesheets tab loaded');

    // Create a timesheet
    await page.click('button:has-text("New Timesheet")');
    await page.waitForSelector('text=New Timesheet', { timeout: 3000 });
    await page.locator('input[type="date"]').nth(0).fill('2026-05-18');
    await page.locator('input[type="date"]').nth(1).fill('2026-05-24');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 8000 });
    pass('New Timesheet modal closed after Save');

    await page.waitForSelector('text=2026-05-18', { timeout: 5000 });
    pass('Timesheet appears in list');

    // Submit the timesheet
    await page.click('button:has-text("Submit")');
    await page.waitForSelector('text=SUBMITTED', { timeout: 5000 });
    pass('Timesheet status changed to SUBMITTED');

    // Edit a time entry
    await page.click('button:has-text("Time Log")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('text=Edit Time Entry', { timeout: 3000 });
    await page.fill('input[placeholder="What did you work on?"]', 'Morning dev session — updated');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 8000 });
    pass('Edit Time Entry modal closed');
    await page.waitForSelector('text=Morning dev session — updated', { timeout: 5000 });
    pass('Time entry description updated');

  } catch (e) {
    fail(`Unexpected error: ${e.message}`);
    await page.screenshot({ path: 'verify_phase5_error.png' });
    console.log('Screenshot: verify_phase5_error.png');
  } finally {
    await browser.close();
  }

  console.log('\n' + (errors.length === 0
    ? '🎉 Phase 5 PASS — all checks passed'
    : `💥 Phase 5 FAIL — ${errors.length} issue(s): ${errors.join('; ')}`));
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
