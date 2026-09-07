import { test, expect } from '@playwright/test';

test.describe('Building Real Wealth Companion E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should load the app and display the header and home tab', async ({ page }) => {
    await expect(page.locator('header h1')).toHaveText('Your Companion');
    await expect(page.locator('#hdrNetWorth')).toHaveText('$0');
    await expect(page.locator('nav.tabbar button.active')).toContainText('Home');
  });

  test('should navigate across all tabs smoothly', async ({ page }) => {
    // Net Worth Tab
    await page.click('nav.tabbar button[data-tab="networth"]');
    await expect(page.locator('h2:has-text("Net worth history")')).toBeVisible();

    // Cash Flow Tab
    await page.click('nav.tabbar button[data-tab="cashflow"]');
    await expect(page.locator('h2:has-text("Available to invest")')).toBeVisible();

    // Invest Tab
    await page.click('nav.tabbar button[data-tab="invest"]');
    await expect(page.locator('h2:has-text("Risk self-assessment")')).toBeVisible();

    // Plan Tab
    await page.click('nav.tabbar button[data-tab="plan"]');
    await expect(page.locator('button[data-sub="contrib"]')).toBeVisible();

    // Back to Home
    await page.click('nav.tabbar button[data-tab="home"]');
    await expect(page.locator('h2:has-text("This month")')).toBeVisible();
  });

  test('should log a new net worth snapshot and update header', async ({ page }) => {
    await page.click('nav.tabbar button[data-tab="networth"]');
    
    // Fill in assets
    await page.fill('#asset_checking', '15000');
    await page.fill('#asset_emergency', '25000');
    await page.fill('#asset_retirement', '80000');
    
    // Fill in liabilities
    await page.fill('#liab_auto', '10000');
    
    // Save snapshot
    await page.click('#saveSnapshotBtn');
    
    // Verify toast and header update
    await expect(page.locator('#hdrNetWorth')).toHaveText('$110,000');
    await expect(page.locator('.list-row:has-text("$110k")')).toBeVisible();
  });

  test('should log cash flow and calculate savings rate correctly', async ({ page }) => {
    await page.click('nav.tabbar button[data-tab="cashflow"]');
    
    await page.fill('#cfIncome', '10000');
    await page.fill('#cfFixed', '4000');
    await page.fill('#cfVariable', '2000');
    await page.fill('#cfDiscretionary', '1000');
    
    await page.click('#saveCashflowBtn');
    
    // Available to invest is 10000 - 7000 = 3000 (30%)
    await expect(page.locator('.list-row:has-text("$3k")')).toBeVisible();
    await expect(page.locator('.list-row:has-text("(30%)")')).toBeVisible();
  });

  test('should complete the risk assessment and set target allocation', async ({ page }) => {
    await page.click('nav.tabbar button[data-tab="invest"]');
    
    // Select score 5 on all 5 questions
    const scaleButtons = page.locator('.scale button[data-val="5"]');
    const count = await scaleButtons.count();
    for (let i = 0; i < count; i++) {
      await scaleButtons.nth(i).click();
    }
    
    // Expect Aggressive capacity badge
    await expect(page.locator('.tag.green:has-text("Aggressive capacity")')).toBeVisible();
    
    // Apply preset
    await page.click('#applyPresetBtn');
    await expect(page.locator('#target_us')).toHaveValue('54');
    await expect(page.locator('#target_intl')).toHaveValue('24');
  });

  test('should track contributions, goals, and action plan', async ({ page }) => {
    await page.click('nav.tabbar button[data-tab="plan"]');
    
    // 1. Contributions subtab
    const k401Input = page.locator('input[data-acc="k401"][data-mi="0"]');
    await k401Input.fill('2000');
    await k401Input.dispatchEvent('change');
    
    // 2. Goals subtab
    await page.click('button[data-sub="goals"]');
    await page.fill('#newGoalTitle', 'Down Payment');
    await page.fill('#newGoalAmount', '50000');
    await page.fill('#newGoalSaved', '15000');
    await page.fill('#newGoalMonthly', '1000');
    await page.click('#addGoalBtn');
    await expect(page.locator('h3:has-text("Down Payment")')).toBeVisible();
    
    // 3. Action Plan subtab
    await page.click('button[data-sub="action"]');
    const firstCheck = page.locator('.check-box').first();
    await firstCheck.click();
    await expect(page.locator('.check-item').first()).toHaveClass(/done/);
  });
});
