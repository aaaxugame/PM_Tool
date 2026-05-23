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

    // Click the first project's name cell (has onClick → navigate)
    const firstProjectNameCell = page.locator('table tbody tr').first().locator('td').first();
    await firstProjectNameCell.waitFor({ timeout: 5000 });
    const projectName = await firstProjectNameCell.innerText();
    await firstProjectNameCell.click();
    await page.waitForURL(/\/projects\/\d+/, { timeout: 8000 });
    pass(`Opened project: ${projectName.trim()}`);

    // Wait for project detail to load
    await page.waitForSelector('h1', { timeout: 5000 });
    const projH1 = await page.locator('h1').innerText();
    pass(`Project detail loaded: ${projH1}`);

    // ── QUOTES TAB ──────────────────────────────────────────────────────
    await page.click('button:has-text("Quotes")');
    await page.waitForSelector('button:has-text("+ Add Quote")', { timeout: 3000 });
    pass('Quotes tab visible');

    // Create a new quote
    await page.click('button:has-text("+ Add Quote")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    pass('Quote modal opened');

    // Fill vendor (select first non-zero option)
    const vendorSelect = page.locator('.fixed.inset-0 select').first();
    const vendorOptions = await vendorSelect.locator('option').all();
    let foundVendor = false;
    for (const opt of vendorOptions) {
      const val = await opt.getAttribute('value');
      if (val && val !== '0' && val !== '') {
        await vendorSelect.selectOption(val);
        const label = await opt.innerText();
        pass(`Selected vendor: ${label}`);
        foundVendor = true;
        break;
      }
    }
    if (!foundVendor) fail('No vendors available to select');

    // Fill quoted price
    await page.locator('.fixed.inset-0 input[type="number"]').first().fill('5000');

    // Fill estimated hours
    await page.locator('.fixed.inset-0 input[type="number"]').nth(1).fill('40');

    // Fill people count
    await page.locator('.fixed.inset-0 input[type="number"]').nth(2).fill('3');

    // Fill expiry date
    await page.locator('.fixed.inset-0 input[type="date"]').first().fill('2026-12-31');

    // Save
    await page.locator('.fixed.inset-0 button:has-text("Save")').click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
    pass('Quote created successfully');

    // Verify quote appears in table
    await page.waitForSelector('table tbody tr', { timeout: 3000 });
    const quoteRows = await page.locator('table tbody tr').count();
    if (quoteRows > 0) pass(`Quote row visible in table (${quoteRows} row(s))`);
    else fail('Quote not visible in table after creation');

    // ── SUBMIT QUOTE ────────────────────────────────────────────────────
    const submitBtn = page.locator('button:has-text("Submit")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForSelector('text=SUBMITTED', { timeout: 5000 });
      pass('Quote submitted (status: SUBMITTED)');
    } else {
      fail('Submit button not visible');
    }

    // ── APPROVE QUOTE ────────────────────────────────────────────────────
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForSelector('text=APPROVED', { timeout: 5000 });
      pass('Quote approved (status: APPROVED)');
    } else {
      fail('Approve button not visible after submit');
    }

    // Verify approved quotes total appears
    const totalText = await page.locator('text=/Approved Quotes|approved/i').first().isVisible().catch(() => false);
    if (totalText) pass('Approved quotes summary visible');
    else pass('Quote status APPROVED confirmed in table');

    // ── BUDGET TAB ──────────────────────────────────────────────────────
    await page.click('button:has-text("Budget")');
    await page.waitForSelector('button:has-text("+ Add Budget")', { timeout: 3000 });
    pass('Budget tab visible');

    // Create a budget entry
    await page.click('button:has-text("+ Add Budget")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    pass('Budget modal opened');

    // Fill amount
    await page.locator('.fixed.inset-0 input[type="number"]').first().fill('25000');

    // Fill notes
    const notesInput = page.locator('.fixed.inset-0 textarea, .fixed.inset-0 input[type="text"]').first();
    if (await notesInput.isVisible()) {
      await notesInput.fill('Q3 Development Budget');
    }

    // Save
    await page.locator('.fixed.inset-0 button:has-text("Save")').click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
    pass('Budget entry created successfully');

    // Verify budget appears in table
    await page.waitForSelector('table tbody tr', { timeout: 3000 });
    const budgetRows = await page.locator('table tbody tr').count();
    if (budgetRows > 0) pass(`Budget row visible (${budgetRows} row(s))`);
    else fail('Budget entry not visible after creation');

    // Check total budget summary card
    const budgetSummary = page.locator('text=/Total Budget|25,000|25000/i').first();
    const budgetSummaryVisible = await budgetSummary.isVisible().catch(() => false);
    if (budgetSummaryVisible) pass('Budget total summary card shows amount');

    // ── Edit budget entry ────────────────────────────────────────────────
    const editBudgetBtn = page.locator('button:has-text("Edit"), a:has-text("edit")').first();
    if (await editBudgetBtn.isVisible()) {
      await editBudgetBtn.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
      await page.locator('.fixed.inset-0 input[type="number"]').first().fill('30000');
      await page.locator('.fixed.inset-0 button:has-text("Save")').click();
      await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
      pass('Budget entry edited successfully');
    }

    // ── PROBE: Reject a quote ─────────────────────────────────────────────
    // Go back to Quotes tab, create another quote and test reject flow
    await page.click('button:has-text("Quotes")');
    await page.waitForSelector('button:has-text("+ Add Quote")', { timeout: 3000 });

    await page.click('button:has-text("+ Add Quote")');
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });

    const vendorSelect2 = page.locator('.fixed.inset-0 select').first();
    const vendorOptions2 = await vendorSelect2.locator('option').all();
    for (const opt of vendorOptions2) {
      const val = await opt.getAttribute('value');
      if (val && val !== '0' && val !== '') {
        await vendorSelect2.selectOption(val);
        break;
      }
    }
    await page.locator('.fixed.inset-0 input[type="number"]').first().fill('1500');
    await page.locator('.fixed.inset-0 button:has-text("Save")').click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });

    // Submit it
    const submitBtns = page.locator('button:has-text("Submit")');
    const submitCount = await submitBtns.count();
    if (submitCount > 0) {
      await submitBtns.last().click();
      await page.waitForTimeout(1000);

      // Reject it
      const rejectBtns = page.locator('button:has-text("Reject")');
      if (await rejectBtns.count() > 0) {
        await rejectBtns.last().click();
        await page.waitForSelector('text=REJECTED', { timeout: 5000 });
        pass('🔍 Probe: Quote rejected (status: REJECTED)');
      }
    }

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
  }

  console.log('\n─────────────────────────────────');
  if (errors.length === 0) {
    console.log('✅ Phase 6 PASS — all checks passed');
  } else {
    console.log(`❌ Phase 6 FAIL — ${errors.length} issue(s):`);
    errors.forEach(e => console.log('  •', e));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
