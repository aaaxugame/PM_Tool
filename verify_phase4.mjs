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

    // ── Global Tasks page ──
    await page.click('text=Tasks');
    await page.waitForURL(`${BASE}/tasks`, { timeout: 5000 });
    pass('Tasks page loaded');

    // Create a task from global page
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=New Task', { timeout: 3000 });

    // Fill task name
    await page.locator('input[type="text"]').first().fill('Write unit tests');

    // Modal has selects: [0]=page filter, [1]=project, [2]=milestone(disabled), [3]=status, [4]=priority, [5]=assignee
    // Select project in modal (nth(1) — nth(0) is the page-level project filter)
    await page.locator('select').nth(1).selectOption({ index: 1 });
    await page.waitForTimeout(300); // wait for milestone dropdown to update

    // Set priority to HIGH (nth(4))
    await page.locator('select').nth(4).selectOption('HIGH');

    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Task', { state: 'detached', timeout: 8000 });
    pass('New Task modal closed after Save');

    await page.waitForSelector('text=Write unit tests', { timeout: 5000 });
    pass('Task "Write unit tests" appears in list');

    // Check priority color is rendered
    const priorityCell = await page.locator('text=HIGH').first();
    if (await priorityCell.isVisible()) pass('HIGH priority label is visible');
    else fail('HIGH priority label not visible');

    // Cycle status by clicking the status badge
    await page.locator('button:has-text("TODO")').first().click();
    await page.waitForSelector('button:has-text("IN PROGRESS")', { timeout: 5000 });
    pass('Task status cycled TODO → IN PROGRESS');

    // Filter by project
    const filterSelect = page.locator('select').first();
    await filterSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    pass('Project filter applied without error');

    // Reset filter
    await filterSelect.selectOption({ index: 0 });
    await page.waitForTimeout(300);

    // ── Tasks from Project Detail page ──
    await page.click('text=Projects');
    await page.waitForURL(`${BASE}/projects`, { timeout: 5000 });
    // Click first project
    await page.locator('table tbody tr td').first().click();
    await page.waitForURL(/\/projects\/\d+/, { timeout: 5000 });
    await page.waitForSelector('h1', { timeout: 5000 });
    pass('Navigated to project detail');

    // Switch to Tasks tab
    await page.click('button:has-text("Tasks")');
    await page.waitForTimeout(300);
    pass('Tasks tab visible in project detail');

    // Create task from project detail
    await page.click('button:has-text("Add Task")');
    await page.waitForSelector('text=New Task', { timeout: 3000 });
    await page.locator('input[type="text"]').first().fill('Fix navigation bug');
    // Project should be pre-selected — just save
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Task', { state: 'detached', timeout: 8000 });
    pass('Task created from project detail page');

    await page.waitForSelector('text=Fix navigation bug', { timeout: 5000 });
    pass('Task appears in project detail Tasks tab');

    // Edit task
    await page.click('tr:has-text("Fix navigation bug") button:has-text("Edit")');
    await page.waitForSelector('text=Edit Task', { timeout: 3000 });
    await page.locator('input[type="text"]').first().fill('Fix navigation bug v2');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Edit Task', { state: 'detached', timeout: 8000 });
    pass('Edit Task modal closed');
    await page.waitForSelector('text=Fix navigation bug v2', { timeout: 5000 });
    pass('Task name updated');

  } catch (e) {
    fail(`Unexpected error: ${e.message}`);
    await page.screenshot({ path: 'verify_phase4_error.png' });
    console.log('Screenshot: verify_phase4_error.png');
  } finally {
    await browser.close();
  }

  console.log('\n' + (errors.length === 0
    ? '🎉 Phase 4 PASS — all checks passed'
    : `💥 Phase 4 FAIL — ${errors.length} issue(s): ${errors.join('; ')}`));
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
