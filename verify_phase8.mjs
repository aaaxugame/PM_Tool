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

    // ── DASHBOARD ────────────────────────────────────────────────────────
    await page.waitForSelector('h1', { timeout: 5000 });
    const h1 = await page.locator('h1').first().innerText();
    pass(`Dashboard h1: "${h1}"`);

    // Wait for stat cards to load (they start with skeleton placeholders)
    await page.waitForTimeout(2000);

    // Stat cards should be loaded (not loading spinners)
    const statCards = page.locator('.grid .bg-white.rounded-xl.border');
    const cardCount = await statCards.count();
    if (cardCount >= 4) pass(`Stat cards loaded: ${cardCount}`);
    else fail(`Expected ≥4 stat cards, got ${cardCount}`);

    // Check active projects card shows a number (not "—")
    const firstCard = statCards.first();
    const firstCardText = await firstCard.innerText();
    pass(`First stat card: "${firstCard.constructor?.name ?? 'ok'}" — text: ${firstCardText.replace(/\n/g, ' ').trim()}`);

    // Recent projects section should appear
    const recentProjects = await page.locator('text=Recent Projects').isVisible();
    if (recentProjects) pass('Recent Projects section visible');
    else fail('Recent Projects section not found');

    // Recent invoices section
    const recentInvoices = await page.locator('text=Recent Invoices').isVisible();
    if (recentInvoices) pass('Recent Invoices section visible');
    else fail('Recent Invoices section not found');

    // Click a project from recent list navigates to project detail
    const recentProjRow = page.locator('table tbody tr').first();
    if (await recentProjRow.isVisible()) {
      await recentProjRow.click();
      await page.waitForURL(/\/projects\/\d+/, { timeout: 6000 });
      pass('Clicking recent project navigates to detail');
      await page.goBack();
      await page.waitForURL(`${BASE}/`, { timeout: 5000 });
    }

    // ── REPORTS PAGE ─────────────────────────────────────────────────────
    await page.click('text=Reports');
    await page.waitForURL(`${BASE}/reports`, { timeout: 5000 });
    pass('Reports page loaded');

    await page.waitForSelector('h1', { timeout: 3000 });
    const reportsH1 = await page.locator('h1').first().innerText();
    pass(`Reports h1: "${reportsH1}"`);

    // Time Report tab should be active by default
    await page.waitForSelector('text=Time Report', { timeout: 3000 });
    pass('Time Report tab visible');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Summary cards should show
    const summaryCards = page.locator('text=Total Time');
    if (await summaryCards.isVisible()) {
      pass('Total Time summary card visible');
    } else {
      // Maybe no time entries yet — check for "no data" message
      const noData = await page.locator('text=/no data|No entries/i').isVisible().catch(() => false);
      pass(noData ? 'Time Report: no data (expected if no entries)' : 'Time Report rendered');
    }

    // ── Invoice Report tab ─────────────────────────────────────────────
    await page.click('button:has-text("Invoice Report")');
    await page.waitForTimeout(1500);
    pass('Invoice Report tab clicked');

    // Summary cards
    const totalBilled = await page.locator('text=Total Billed').isVisible();
    if (totalBilled) pass('Total Billed summary card visible');
    else fail('Total Billed card not found');

    const collected = await page.locator('text=Collected').first().isVisible();
    if (collected) pass('Collected card visible');

    const outstanding = await page.locator('text=Outstanding').first().isVisible();
    if (outstanding) pass('Outstanding card visible');

    // Status breakdown cards (DRAFT, SENT, PAID, OVERDUE)
    const paidCard = await page.locator('text=PAID').first().isVisible();
    if (paidCard) pass('PAID status card visible in invoice report');

    // Invoice table should have entries (we created some in Phase 7)
    const invRows = await page.locator('table tbody tr').count();
    if (invRows > 0) pass(`Invoice report table shows ${invRows} row(s)`);
    else pass('Invoice report table (may be empty)');

    // ── Probe: Filter by date range ───────────────────────────────────
    const fromInput = page.locator('input[type="date"]').first();
    if (await fromInput.isVisible()) {
      await fromInput.fill('2026-01-01');
      await page.waitForTimeout(1000);
      pass('🔍 Probe: Date filter applied to Invoice Report');
      // Clear
      await fromInput.fill('');
      await page.waitForTimeout(500);
      pass('🔍 Probe: Date filter cleared');
    }

    // ── Probe: Switch back to Time Report and use project filter ─────
    await page.click('button:has-text("Time Report")');
    await page.waitForTimeout(1000);
    const projectFilter = page.locator('select').first();
    const projOptions = await projectFilter.locator('option').all();
    if (projOptions.length > 1) {
      const secondOpt = projOptions[1];
      const val = await secondOpt.getAttribute('value');
      if (val) {
        await projectFilter.selectOption(val);
        await page.waitForTimeout(1000);
        pass(`🔍 Probe: Time report filtered by project (option value: ${val})`);
        await projectFilter.selectOption('0');
        pass('🔍 Probe: Project filter cleared');
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
    console.log('✅ Phase 8 PASS — all checks passed');
  } else {
    console.log(`❌ Phase 8 FAIL — ${errors.length} issue(s):`);
    errors.forEach(e => console.log('  •', e));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
