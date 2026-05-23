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

    // Navigate to Projects
    await page.click('text=Projects');
    await page.waitForURL(`${BASE}/projects`, { timeout: 5000 });
    pass('Projects page loaded');

    // Create a project
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=New Project', { timeout: 3000 });
    await page.fill('input[type="text"]', 'Alpha Launch');
    // Select client - pick first non-empty option
    const select = page.locator('select').first();
    await select.selectOption({ index: 1 });
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Project', { state: 'detached', timeout: 8000 });
    pass('New Project modal closed after Save');
    await page.waitForSelector('text=Alpha Launch', { timeout: 5000 });
    pass('Project "Alpha Launch" appears in list');

    // Click into project detail
    await page.click('text=Alpha Launch');
    await page.waitForURL(/\/projects\/\d+/, { timeout: 5000 });
    pass('Project detail page opened');

    // Check header — wait for data to load
    await page.waitForSelector('h1:has-text("Alpha Launch")', { timeout: 8000 });
    pass('Detail page shows project name');

    // Add a milestone
    await page.click('button:has-text("Add Milestone")');
    await page.waitForSelector('text=New Milestone', { timeout: 3000 });
    await page.fill('input[type="text"]', 'Phase 1 Complete');
    await page.fill('input[type="date"]', '2026-08-01');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Milestone', { state: 'detached', timeout: 8000 });
    pass('New Milestone modal closed after Save');
    await page.waitForSelector('text=Phase 1 Complete', { timeout: 5000 });
    pass('Milestone "Phase 1 Complete" appears in list');

    // Toggle milestone status
    await page.click('button:has-text("PENDING")');
    await page.waitForSelector('button:has-text("COMPLETED")', { timeout: 5000 });
    pass('Milestone toggled to COMPLETED');

    // Go back to projects list via breadcrumb
    await page.click('text=Projects');
    await page.waitForURL(`${BASE}/projects`, { timeout: 5000 });
    pass('Back navigation to projects list works');

    // Edit project
    await page.click('tr:has-text("Alpha Launch") button:has-text("Edit")');
    await page.waitForSelector('text=Edit Project', { timeout: 3000 });
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('Alpha Launch v2');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Edit Project', { state: 'detached', timeout: 8000 });
    pass('Edit Project modal closed');
    await page.waitForSelector('text=Alpha Launch v2', { timeout: 5000 });
    pass('Project name updated to "Alpha Launch v2"');

  } catch (e) {
    fail(`Unexpected error: ${e.message}`);
    await page.screenshot({ path: 'verify_phase3_error.png' });
    console.log('Screenshot: verify_phase3_error.png');
  } finally {
    await browser.close();
  }

  console.log('\n' + (errors.length === 0
    ? '🎉 Phase 3 PASS — all checks passed'
    : `💥 Phase 3 FAIL — ${errors.length} issue(s): ${errors.join('; ')}`));
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
