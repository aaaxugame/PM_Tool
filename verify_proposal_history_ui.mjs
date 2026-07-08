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
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'am@test.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('URL after login:', page.url());
    await page.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/debug-after-login.png' });
    pass('Logged in as AM');

    await page.goto(`${BASE}/projects/24`);
    await page.waitForSelector('text=Proposal', { timeout: 8000 });
    pass('Project detail page loaded, Proposal panel visible');

    const versionBadge = await page.locator('text=v3').isVisible().catch(() => false);
    if (versionBadge) pass('Current version badge shows v3');
    else fail('Current version badge does not show v3');

    const historyLink = page.locator('button:has-text("View History")');
    if (await historyLink.isVisible().catch(() => false)) pass('View History button visible');
    else fail('View History button not visible');

    await historyLink.click();
    await page.waitForSelector('text=Proposal History', { timeout: 5000 });
    pass('History modal opened');

    const bodyText = await page.locator('.fixed.inset-0').innerText();
    for (const needle of ['v3', 'v2', 'v1', 'APPROVED', 'DECLINED', 'Please add a Phase 2 milestone before we approve', 'Phase 1', 'Phase 2']) {
      if (bodyText.includes(needle)) pass(`History modal contains "${needle}"`);
      else fail(`History modal missing "${needle}"`);
    }

    await page.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/proposal-history-modal.png', fullPage: true });
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
