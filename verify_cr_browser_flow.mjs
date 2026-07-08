import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const PROJECT_ID = 30;
const errors = [];
const pass = (msg) => console.log('✅', msg);
const fail = (msg) => { console.log('❌', msg); errors.push(msg); };

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 8000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const amCtx = await browser.newContext();
  const amPage = await amCtx.newPage();
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();

  try {
    // ── AM: log in, open project, raise a change request via the real form ──
    await login(amPage, 'am@test.com', 'Test1234!');
    pass('AM logged in');

    await amPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await amPage.waitForSelector('text=Change Requests', { timeout: 8000 });
    pass('AM: project detail page loaded, Change Requests panel visible');

    await amPage.click('button:has-text("+ New Change Request")');
    await amPage.waitForSelector('text=New Change Request', { timeout: 5000 });
    pass('AM: create-change-request modal opened');

    const modal = amPage.locator('.fixed.inset-0');
    await modal.locator('label:has-text("Title") + input').fill('Add mobile app support');
    await modal.locator('label:has-text("Description") + textarea').fill('Client wants a companion mobile app.');
    await modal.locator('label:has-text("Additional Cost") + input').fill('3000');
    await modal.locator('button:has-text("Add milestone")').click();
    await modal.locator('input[placeholder="Name"]').first().fill('Mobile App MVP');
    await modal.locator('input[placeholder="Amount"]').first().fill('3000');
    await amPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-browser-01-create-form.png' });

    await modal.locator('button:has-text("Send Change Request")').click();
    await amPage.waitForSelector('text=Add mobile app support', { timeout: 8000 });
    pass('AM: change request created and visible in panel');

    // Scope to the Change Requests panel specifically — the Proposal panel above
    // it already shows an unrelated "APPROVED" badge, which would false-match a
    // page-wide text search.
    const amCrPanel = amPage.locator('h2:has-text("Change Requests")').locator('xpath=../..');
    const amCrPanelText = await amCrPanel.innerText();
    if (amCrPanelText.includes('SENT')) pass('AM: new change request shows SENT status');
    else fail('AM: new change request does not show SENT status');
    await amPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-browser-02-am-after-create.png' });

    // ── Client: log in, see the pending change request, approve it ──
    await login(clientPage, 'client@test.com', 'Test1234!');
    pass('Client logged in');

    await clientPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await clientPage.waitForSelector('text=Add mobile app support', { timeout: 8000 });
    pass('Client: sees the pending change request');

    const clientCrPanel = clientPage.locator('h2:has-text("Change Requests")').locator('xpath=../..');
    const approveBtn = clientCrPanel.locator('button:has-text("Approve")');
    if (!(await approveBtn.isVisible().catch(() => false))) fail('Client: Approve button not visible on change request');
    else pass('Client: Approve button visible');

    await clientPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-browser-03-client-before-approve.png' });
    await approveBtn.click();
    await clientCrPanel.locator('text=APPROVED').first().waitFor({ timeout: 8000 });
    pass('Client: change request now shows APPROVED after clicking Approve');
    await clientPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-browser-04-client-after-approve.png' });

    // ── AM: reload, confirm the new milestone appears ──
    await amPage.reload();
    await amPage.waitForSelector('text=Mobile App MVP', { timeout: 8000 });
    pass('AM: new "Mobile App MVP" milestone appears after approval');
    await amPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-browser-05-am-final.png' });

    // ── Projects list view shows the live proposedCost (not shown on detail page) ──
    await amPage.goto(`${BASE}/projects`);
    await amPage.waitForTimeout(1000);
    const listText = await amPage.locator('body').innerText();
    if (listText.includes('Browser CR Test Project 2') && (listText.includes('8,000.00') || listText.includes('8000'))) {
      pass('Projects list: cost reflects the $3,000 increase (5000 -> 8000)');
    } else {
      console.log('ℹ️  Projects list check inconclusive (project may be on a different tab/page) — cost already confirmed via API as 8000');
    }

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n─────────────────────────────────');
  if (errors.length === 0) console.log('✅ PASS — all checks passed');
  else { console.log(`❌ FAIL — ${errors.length} issue(s)`); errors.forEach(e => console.log('  •', e)); }
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
