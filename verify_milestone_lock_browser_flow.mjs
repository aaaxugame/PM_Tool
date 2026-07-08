import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const PROJECT_ID = 34;
const errors = [];
const pass = (msg) => console.log('✅', msg);
const fail = (msg) => { console.log('❌', msg); errors.push(msg); };
const info = (msg) => console.log('ℹ️ ', msg);

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 8000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  const failedResponses = [];
  page.on('response', res => {
    if (res.url().includes('/milestones/') && res.request().method() === 'PATCH' && res.status() >= 400) {
      failedResponses.push({ status: res.status(), url: res.url() });
    }
  });

  try {
    await login(page, 'am@test.com', 'Test1234!');
    pass('AM logged in');

    await page.goto(`${BASE}/projects/${PROJECT_ID}`);
    await page.waitForSelector('text=Phase 1', { timeout: 8000 });
    pass('Project detail page loaded, "Phase 1" milestone visible');

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('APPROVED')) pass('Proposal status confirmed APPROVED (milestones should be locked)');
    else fail('Proposal status is not APPROVED — test setup is wrong');

    await page.click('button:text-is("Edit")');
    await page.waitForSelector('text=Edit Milestone', { timeout: 5000 });
    pass('Edit Milestone modal opened');

    // ── Check disabled state of each locked field ──
    const nameInput = page.locator('input[type="text"]').first();
    const dueDateInput = page.locator('input[type="date"]');
    const amountInput = page.locator('label:has-text("Contracted Amount") + input');

    const nameDisabled = await nameInput.isDisabled();
    const dueDateDisabled = await dueDateInput.isDisabled();
    const amountDisabled = await amountInput.isDisabled();

    if (amountDisabled) pass('Amount field is disabled in the UI (as expected)');
    else fail('Amount field is NOT disabled in the UI');

    if (nameDisabled) pass('Name field is disabled in the UI');
    else fail('Name field is NOT disabled in the UI');

    if (dueDateDisabled) pass('Due Date field is disabled in the UI');
    else fail('Due Date field is NOT disabled in the UI');

    const lockNoticeShown = await page.locator('text=Name, Due Date, and Contracted Amount are locked').isVisible().catch(() => false);
    if (lockNoticeShown) pass('Shared lock notice is shown explaining why fields are disabled');
    else fail('No lock notice shown to explain why fields are disabled');

    await page.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/milestone-lock-01-edit-modal.png' });

    // ── If Name isn't disabled, try to actually change it and save, to see what happens ──
    if (!nameDisabled) {
      await nameInput.fill('Phase 1 RENAMED');
      await page.click('button:text-is("Save")');
      await page.waitForTimeout(1500);

      if (failedResponses.length > 0) {
        info(`Backend correctly rejected the save: HTTP ${failedResponses[0].status} on ${failedResponses[0].url}`);
      } else {
        fail('Backend did not reject the name change on an approved proposal — the lock is not enforced server-side either');
      }

      const modalStillOpen = await page.locator('text=Edit Milestone').isVisible().catch(() => false);
      if (modalStillOpen) info('Modal remained open after the failed save (expected, no silent success)');
      else fail('Modal closed as if the save succeeded, despite the backend rejecting it');

      const errorShown = await page.locator('text=/error|cannot|failed/i').isVisible().catch(() => false);
      if (errorShown) pass('An error message is shown to the user in the UI');
      else fail('No error message is shown to the user — the failed save is silent, a real UX gap');

      await page.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/milestone-lock-02-after-failed-save.png' });
    }

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0) {
    info(`Browser console errors captured (${consoleErrors.length}):`);
    consoleErrors.slice(0, 5).forEach(e => console.log('   ', e));
  }

  console.log('\n─────────────────────────────────');
  if (errors.length === 0) console.log('✅ PASS — all hard checks passed (see ℹ️ notes above for findings)');
  else { console.log(`❌ FAIL — ${errors.length} issue(s)`); errors.forEach(e => console.log('  •', e)); }
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
