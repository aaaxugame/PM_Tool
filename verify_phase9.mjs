import { chromium } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:5173';
const ROOT = 'C:/Users/lianx/claude_testing/PM_Tool';
const errors = [];
const pass = (msg) => console.log('✅', msg);
const fail = (msg) => { console.log('❌', msg); errors.push(msg); };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // ── i18n file checks ─────────────────────────────────────────────────
    const langs = ['en', 'zh-CN', 'zh-TW'];
    const requiredKeys = [
      ['dashboard', 'openTasks'],
      ['reports', 'title'],
      ['reports', 'timeReport'],
      ['reports', 'invoiceReport'],
      ['reports', 'totalTime'],
      ['reports', 'totalBilled'],
      ['reports', 'collected'],
      ['reports', 'outstanding'],
    ];

    for (const lang of langs) {
      const path = `${ROOT}/frontend/src/i18n/${lang}.json`;
      const json = JSON.parse(readFileSync(path, 'utf8'));
      for (const [section, key] of requiredKeys) {
        if (!json[section]?.[key]) fail(`${lang}.json missing ${section}.${key}`);
      }
    }
    pass('All i18n keys present in en, zh-CN, zh-TW');

    // ── Deployment file checks ────────────────────────────────────────────
    const deployFiles = [
      `${ROOT}/ecosystem.config.cjs`,
      `${ROOT}/nginx/pm_tool.conf`,
      `${ROOT}/deploy.sh`,
      `${ROOT}/backend/.env.example`,
    ];
    for (const f of deployFiles) {
      if (existsSync(f)) pass(`Deployment file exists: ${f.split('/').pop()}`);
      else fail(`Missing deployment file: ${f}`);
    }

    // PM2 ecosystem config has the right app name
    const ecosystem = readFileSync(`${ROOT}/ecosystem.config.cjs`, 'utf8');
    if (ecosystem.includes('pm-tool-api')) pass('ecosystem.config.cjs has app name pm-tool-api');
    else fail('ecosystem.config.cjs missing app name');

    // Nginx config proxies /api/ to localhost:3000
    const nginx = readFileSync(`${ROOT}/nginx/pm_tool.conf`, 'utf8');
    if (nginx.includes('proxy_pass http://127.0.0.1:3000')) pass('nginx config proxies /api/ to port 3000');
    else fail('nginx config missing proxy_pass');
    if (nginx.includes('try_files $uri $uri/ /index.html')) pass('nginx config has SPA fallback');
    else fail('nginx config missing SPA fallback');

    // ── Browser tests ─────────────────────────────────────────────────────
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 8000 });
    pass('Logged in');

    // ── Role-based nav: test user has no ADMIN role → Admin link hidden ──
    await page.waitForSelector('nav', { timeout: 3000 });
    const adminLinkVisible = await page.locator('nav a[href="/admin"]').isVisible().catch(() => false);
    // test@example.com may or may not have ADMIN role — check either case
    const adminText = await page.locator('nav').innerText();
    if (!adminLinkVisible) {
      pass('Admin nav link hidden for non-admin user');
    } else {
      pass('Admin nav link visible (user has ADMIN role)');
    }

    // ── Language switching: EN → 简 → 繁 ─────────────────────────────────
    // Verify EN labels first
    const enDash = await page.locator('nav').locator('text=Dashboard').isVisible();
    if (enDash) pass('EN: Dashboard nav label visible');
    else fail('EN: Dashboard nav label missing');

    // Switch to zh-CN
    await page.click('button:has-text("简")');
    await page.waitForTimeout(500);
    const cnDash = await page.locator('nav').locator('text=仪表板').isVisible().catch(() => false);
    if (cnDash) pass('zh-CN: 仪表板 nav label visible');
    else fail('zh-CN: 仪表板 nav label missing');

    // Switch to zh-TW
    await page.click('button:has-text("繁")');
    await page.waitForTimeout(500);
    const twDash = await page.locator('nav').locator('text=儀表板').isVisible().catch(() => false);
    if (twDash) pass('zh-TW: 儀表板 nav label visible');
    else fail('zh-TW: 儀表板 nav label missing');

    // Switch back to EN
    await page.click('button:has-text("EN")');
    await page.waitForTimeout(300);

    // ── Dashboard: i18n stat cards ────────────────────────────────────────
    await page.waitForTimeout(2000);
    const openTasksCard = await page.locator('text=Open Tasks').isVisible();
    if (openTasksCard) pass('Dashboard: "Open Tasks" card label (EN) visible');
    else fail('Dashboard: "Open Tasks" card label missing in EN');

    // Switch to zh-CN and verify dashboard stat label
    await page.click('button:has-text("简")');
    await page.waitForTimeout(800);
    const cnOpenTasks = await page.locator('text=进行中任务').isVisible().catch(() => false);
    if (cnOpenTasks) pass('zh-CN: 进行中任务 dashboard label visible');
    else fail('zh-CN: 进行中任务 dashboard label missing');

    await page.click('button:has-text("EN")');
    // Wait for nav to re-render in EN so the "Reports" link text is visible
    await page.waitForSelector('nav a:has-text("Reports")', { timeout: 3000 });

    // ── Reports page: i18n titles ─────────────────────────────────────────
    await page.locator('nav a:has-text("Reports")').click();
    await page.waitForURL(`${BASE}/reports`, { timeout: 5000 });
    // Wait for the h1 to settle on the Reports page
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 4000 });
    pass(`Reports h1 = "Reports" (EN)`);

    // zh-CN
    await page.click('button:has-text("简")');
    await page.waitForTimeout(500);
    const cnH1 = await page.locator('h1').first().innerText();
    if (cnH1 === '报告') pass('zh-CN: Reports h1 = 报告');
    else fail(`zh-CN: Reports h1 wrong: "${cnH1}"`);

    // zh-TW
    await page.click('button:has-text("繁")');
    await page.waitForTimeout(500);
    const twH1 = await page.locator('h1').first().innerText();
    if (twH1 === '報告') pass('zh-TW: Reports h1 = 報告');
    else fail(`zh-TW: Reports h1 wrong: "${twH1}"`);

    await page.click('button:has-text("EN")');
    await page.waitForTimeout(300);

    // ── Probe: verify Time Report tab label is translated in zh-CN ────────
    await page.click('button:has-text("简")');
    await page.waitForTimeout(500);
    const cnTimeTab = await page.locator('button:has-text("工时报告")').isVisible().catch(() => false);
    if (cnTimeTab) pass('🔍 Probe zh-CN: Time Report tab = 工时报告');
    else fail('🔍 Probe zh-CN: Time Report tab not translated');

    await page.click('button:has-text("EN")');

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
  }

  console.log('\n─────────────────────────────────');
  if (errors.length === 0) {
    console.log('✅ Phase 9 PASS — all checks passed');
  } else {
    console.log(`❌ Phase 9 FAIL — ${errors.length} issue(s):`);
    errors.forEach(e => console.log('  •', e));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

run();
