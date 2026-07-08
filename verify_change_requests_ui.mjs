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
    await page.waitForURL(`${BASE}/`, { timeout: 8000 });
    pass('Logged in as AM');

    await page.goto(`${BASE}/projects/25`);
    await page.waitForSelector('text=Change Requests', { timeout: 8000 });
    pass('Change Requests panel visible');

    const bodyText = await page.locator('body').innerText();
    for (const needle of [
      'Add reporting dashboard (reduced scope)', 'APPROVED',
      'Add reporting dashboard', 'DECLINED',
      'Too expensive, please reduce scope',
      '+$1200.00', '+$2500.00',
    ]) {
      if (bodyText.includes(needle)) pass(`Panel contains "${needle}"`);
      else fail(`Panel missing "${needle}"`);
    }

    const newCrButton = page.locator('button:has-text("+ New Change Request")');
    if (await newCrButton.isVisible().catch(() => false)) pass('New Change Request button visible for AM');
    else fail('New Change Request button not visible for AM');

    await newCrButton.click();
    await page.waitForSelector('text=New Change Request', { timeout: 5000 });
    pass('Create modal opened');
    await page.screenshot({ path: 'C:/Users/lianx/claude_testing/PM_Tool/screenshots/change-request-panel.png', fullPage: true });
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
