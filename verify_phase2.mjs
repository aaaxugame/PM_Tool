import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const pass = (msg) => console.log('✅', msg);
  const fail = (msg) => { console.log('❌', msg); errors.push(msg); };

  try {
    // 1. Login
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 8000 });
    pass('Login succeeded, redirected to dashboard');

    // 2. Navigate to Admin
    await page.click('text=Admin');
    await page.waitForURL(`${BASE}/admin`, { timeout: 5000 });
    pass('Admin page loaded');

    // 3. Clients tab - create
    await page.click('button:has-text("Clients")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=New Client', { timeout: 3000 });
    await page.fill('input[type="text"]:near(:text("Name"))', 'Acme Corp');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Client', { state: 'detached', timeout: 8000 });
    pass('New Client modal closed after Save');
    await page.waitForSelector('text=Acme Corp', { timeout: 5000 });
    pass('Client "Acme Corp" appears in the list');

    // 4. Edit client
    await page.click('tr:has-text("Acme Corp") button:has-text("Edit")');
    await page.waitForSelector('text=Edit Client', { timeout: 3000 });
    await page.fill('input[type="text"]:near(:text("Name"))', 'Acme Corporation');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Edit Client', { state: 'detached', timeout: 8000 });
    pass('Edit Client modal closed after Save');
    await page.waitForSelector('text=Acme Corporation', { timeout: 5000 });
    pass('Client name updated to "Acme Corporation"');

    // 5. Vendors tab - create
    await page.click('button:has-text("Vendors")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=New Vendor', { timeout: 3000 });
    // Fill name field
    const vendorInputs = await page.$$('input[type="text"]');
    if (vendorInputs.length > 0) await vendorInputs[0].fill('TechVend Inc');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New Vendor', { state: 'detached', timeout: 8000 });
    pass('New Vendor modal closed after Save');
    await page.waitForSelector('text=TechVend Inc', { timeout: 5000 });
    pass('Vendor "TechVend Inc" appears in the list');

    // 6. Users tab - verify existing
    await page.click('button:has-text("Users")');
    await page.waitForTimeout(500);
    await page.waitForSelector('text=test@example.com', { timeout: 5000 });
    pass('Users tab shows existing test@example.com user');

    // 7. Create new user
    await page.click('button:has-text("Create")');
    await page.waitForSelector('text=New User', { timeout: 3000 });
    // Fill name (first text input in the modal)
    await page.locator('input[type="text"]').first().fill('Jane Smith');
    await page.locator('input[type="email"]').fill('jane@example.com');
    await page.locator('input[type="password"]').fill('password123');
    // Click ACCOUNT_MANAGER role
    await page.click('button:has-text("ACCOUNT MANAGER")');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=New User', { state: 'detached', timeout: 8000 });
    pass('New User modal closed after Save');
    await page.waitForSelector('text=jane@example.com', { timeout: 5000 });
    pass('New user "jane@example.com" appears in the list');

  } catch (e) {
    fail(`Unexpected error: ${e.message}`);
    await page.screenshot({ path: 'verify_phase2_error.png' });
    console.log('Screenshot saved: verify_phase2_error.png');
  } finally {
    await browser.close();
  }

  console.log('\n' + (errors.length === 0 ? '🎉 Phase 2 PASS — all checks passed' : `💥 Phase 2 FAIL — ${errors.length} issue(s)`));
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
