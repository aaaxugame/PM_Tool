import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const PROJECT_ID = 32;
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

// Proposal panel is a sibling-content block right after the "Proposal" <h2>;
// scope to it so text checks don't collide with the Change Requests panel etc.
function proposalPanel(page) {
  return page.locator('h2:has-text("Proposal")').locator('xpath=../..');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const amCtx = await browser.newContext();
  const amPage = await amCtx.newPage();
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();

  try {
    // ── AM: send proposal v1 ──
    await login(amPage, 'am@test.com', 'Test1234!');
    pass('AM logged in');

    await amPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await amPage.waitForSelector('text=Send Proposal', { timeout: 8000 });
    await amPage.click('button:has-text("Send Proposal")');
    await proposalPanel(amPage).locator('text=SENT').waitFor({ timeout: 8000 });
    pass('AM: sent proposal v1, status is SENT');

    // ── Client: decline v1 with a reason via the real modal ──
    await login(clientPage, 'client@test.com', 'Test1234!');
    pass('Client logged in');

    await clientPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await proposalPanel(clientPage).locator('text=SENT').waitFor({ timeout: 8000 });
    await clientPage.click('button:has-text("Decline")');
    await clientPage.waitForSelector('text=Decline Proposal', { timeout: 5000 });
    await clientPage.fill('textarea', 'Please add a Phase 2 milestone before we approve.');
    await clientPage.click('button:has-text("Submit")');
    await proposalPanel(clientPage).locator('text=DECLINED').waitFor({ timeout: 8000 });
    pass('Client: declined v1 with a reason, status is DECLINED');

    // ── AM: start a new revision, bump the milestone amount, send v2 ──
    await amPage.reload();
    await proposalPanel(amPage).locator('text=DECLINED').waitFor({ timeout: 8000 });
    await amPage.click('button:has-text("Start New Revision")');
    await proposalPanel(amPage).locator('text=DRAFT').waitFor({ timeout: 8000 });
    pass('AM: started new revision, status back to DRAFT (v2)');

    // The sidebar has an unrelated "Edit profile" link, which `:has-text("Edit")`
    // would also match — use an exact-text match to hit only the milestone's Edit button.
    await amPage.click('button:text-is("Edit")');
    await amPage.waitForSelector('text=Edit Milestone', { timeout: 5000 });
    const amountInput = amPage.locator('label:has-text("Contracted Amount") + input');
    await amountInput.fill('6500');
    await amPage.click('button:has-text("Save")');
    await amPage.waitForSelector('text=Edit Milestone', { state: 'hidden', timeout: 5000 });
    pass('AM: bumped Phase 1 contracted amount to 6500 for v2');

    await amPage.click('button:has-text("Send Proposal")');
    await proposalPanel(amPage).locator('text=SENT').waitFor({ timeout: 8000 });
    const v2Badge = await proposalPanel(amPage).innerText();
    if (v2Badge.includes('v2')) pass('AM: sent proposal v2, version badge shows v2');
    else fail('AM: version badge does not show v2 after resending');

    // ── Client: approve v2 ──
    await clientPage.reload();
    await proposalPanel(clientPage).locator('text=SENT').waitFor({ timeout: 8000 });
    await clientPage.click('button:has-text("Approve")');
    await proposalPanel(clientPage).locator('text=APPROVED').first().waitFor({ timeout: 8000 });
    pass('Client: approved v2, status is APPROVED');

    // ── AM: open Proposal History, confirm both versions are preserved ──
    await amPage.reload();
    await proposalPanel(amPage).locator('text=APPROVED').first().waitFor({ timeout: 8000 });
    await amPage.click('button:has-text("View History")');
    await amPage.waitForSelector('text=Proposal History', { timeout: 5000 });
    pass('AM: opened Proposal History modal');

    const historyText = await amPage.locator('.fixed.inset-0').innerText();
    const checks = [
      ['v2', 'version 2 entry present'],
      ['v1', 'version 1 entry present'],
      ['APPROVED', 'v2 shows APPROVED'],
      ['DECLINED', 'v1 shows DECLINED'],
      ['Please add a Phase 2 milestone before we approve.', "v1's decline reason preserved"],
      ['Client Carol', 'responder name shown'],
    ];
    for (const [needle, desc] of checks) {
      if (historyText.includes(needle)) pass(`History modal: ${desc}`);
      else fail(`History modal missing: ${desc} ("${needle}")`);
    }
    await amPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/proposal-history-browser-final.png', fullPage: true });
    pass('Screenshot saved');

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
