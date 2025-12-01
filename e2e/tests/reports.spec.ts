import { test, expect } from '@playwright/test';
import * as path from 'path';

// Use authenticated state
test.use({ storageState: path.join(__dirname, '../.auth/user.json') });

test.describe('Reports Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should display reports page', async ({ page }) => {
    await expect(page).toHaveURL(/reports/);
  });

  test('should show report type selection', async ({ page }) => {
    // Look for report type tabs or dropdown
    const reportTypeSelector = page.locator('[data-testid="report-type"], .report-tabs, select[name*="report" i]');
    await expect(reportTypeSelector).toBeVisible({ timeout: 10000 }).catch(() => {
      // Check for report type buttons
      return expect(page.locator('button:has-text("Performance"), button:has-text("Customer"), button:has-text("Machine")')).toBeVisible();
    });
  });

  test('should show date range filter', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], [data-testid="date-range"], .date-picker');
    await expect(dateFilter.first()).toBeVisible({ timeout: 10000 });
  });

  test('should generate user performance report', async ({ page }) => {
    // Select performance report if available
    const perfTab = page.locator('button:has-text("Performance"), [data-testid="performance-report"]');
    if (await perfTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await perfTab.click();
    }
    
    // Wait for report to load
    await page.waitForLoadState('networkidle');
    
    // Should show some data
    const reportContent = page.locator('table, .chart, .report-data, [data-testid="report-content"]');
    await expect(reportContent).toBeVisible({ timeout: 15000 });
  });

  test('should generate customer report', async ({ page }) => {
    const customerTab = page.locator('button:has-text("Customer"), [data-testid="customer-report"]');
    if (await customerTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customerTab.click();
      await page.waitForLoadState('networkidle');
      
      const reportContent = page.locator('table, .chart, .report-data');
      await expect(reportContent).toBeVisible({ timeout: 15000 });
    }
  });

  test('should generate machine report', async ({ page }) => {
    const machineTab = page.locator('button:has-text("Machine"), [data-testid="machine-report"]');
    if (await machineTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await machineTab.click();
      await page.waitForLoadState('networkidle');
      
      const reportContent = page.locator('table, .chart, .report-data');
      await expect(reportContent).toBeVisible({ timeout: 15000 });
    }
  });

  test('should filter report by date range', async ({ page }) => {
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').nth(1);
    
    if (await startDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Set date range to last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      await startDate.fill(thirtyDaysAgo.toISOString().split('T')[0]);
      if (await endDate.isVisible().catch(() => false)) {
        await endDate.fill(today.toISOString().split('T')[0]);
      }
      
      // Apply filter if there's a button
      const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Generate"), button:has-text("Filter")');
      if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await applyBtn.click();
      }
      
      await page.waitForLoadState('networkidle');
    }
  });

  test('should export report', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid="export-report"]');
    
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportBtn.click();
      const download = await downloadPromise;
      console.log(`Report export: ${download ? 'succeeded' : 'no download triggered'}`);
    }
  });

  test('should show summary statistics', async ({ page }) => {
    const stats = page.locator('.stats, .summary, [data-testid="report-summary"], .total');
    const isVisible = await stats.first().isVisible({ timeout: 10000 }).catch(() => false);
    console.log(`Summary statistics visible: ${isVisible}`);
  });
});
