import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const PROJECT_ID = 37;
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

function crPanel(page) {
  return page.locator('h2:has-text("Change Requests")').locator('xpath=../..');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const amCtx = await browser.newContext();
  const amPage = await amCtx.newPage();
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();

  try {
    // ── AM: raise a change request via the real form ──
    await login(amPage, 'am@test.com', 'Test1234!');
    pass('AM logged in');

    await amPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await amPage.waitForSelector('text=Change Requests', { timeout: 8000 });
    await amPage.click('button:has-text("+ New Change Request")');
    await amPage.waitForSelector('text=New Change Request', { timeout: 5000 });

    const modal = amPage.locator('.fixed.inset-0');
    await modal.locator('label:has-text("Title") + input').fill('Add analytics dashboard');
    await modal.locator('label:has-text("Additional Cost") + input').fill('1800');
    await modal.locator('button:has-text("Add milestone")').click();
    await modal.locator('input[placeholder="Name"]').first().fill('Analytics Dashboard');
    await modal.locator('input[placeholder="Amount"]').first().fill('1800');
    await modal.locator('button:has-text("Send Change Request")').click();
    await amPage.waitForSelector('text=Add analytics dashboard', { timeout: 8000 });
    pass('AM: change request created and sent');

    // ── Client: request a revision via the real note modal ──
    await login(clientPage, 'client@test.com', 'Test1234!');
    pass('Client logged in');

    await clientPage.goto(`${BASE}/projects/${PROJECT_ID}`);
    await clientPage.waitForSelector('text=Add analytics dashboard', { timeout: 8000 });
    const clientPanel = crPanel(clientPage);
    await clientPanel.locator('button:has-text("Request Revision")').click();
    await clientPage.waitForSelector('text=Request Revision', { timeout: 5000 });
    pass('Client: Request Revision note modal opened');

    await clientPage.fill('textarea', 'Please break this into two smaller phases with separate pricing.');
    await clientPage.click('button:has-text("Submit")');
    await clientPanel.locator("text=REVISION REQUESTED").first().waitFor({ timeout: 8000 });
    pass('Client: submitted revision request, status shows REVISION REQUESTED');

    const clientPanelText = await clientPanel.innerText();
    if (clientPanelText.includes('Please break this into two smaller phases with separate pricing.')) {
      pass('Client: revision note is visible in the panel');
    } else {
      fail('Client: revision note is not visible in the panel');
    }

    // No action buttons should remain once a change request is no longer SENT.
    const actionButtonsGone = !(await clientPanel.locator('button:has-text("Approve")').isVisible().catch(() => false));
    if (actionButtonsGone) pass('Client: Approve/Decline/Request Revision buttons are gone (request is now terminal)');
    else fail('Client: action buttons are still visible on a non-SENT change request');

    await clientPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-revision-01-client-after-request.png' });

    // ── AM: reload, confirm the request and note are visible, nothing disappeared ──
    await amPage.reload();
    await crPanel(amPage).locator('text=REVISION REQUESTED').first().waitFor({ timeout: 8000 });
    pass('AM: sees the change request now marked REVISION REQUESTED');

    const amPanelText = await crPanel(amPage).innerText();
    if (amPanelText.includes('Please break this into two smaller phases with separate pricing.')) {
      pass('AM: sees the client\'s revision note');
    } else {
      fail('AM: does not see the client\'s revision note');
    }
    if (amPanelText.includes('Add analytics dashboard') && amPanelText.includes('+$1800.00')) {
      pass('AM: original request title and cost are still intact, nothing lost');
    } else {
      fail('AM: original request details are missing or altered');
    }
    await amPage.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/cr-revision-02-am-final.png' });

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
