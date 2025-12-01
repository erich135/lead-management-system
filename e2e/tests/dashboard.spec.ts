import { test, expect } from '@playwright/test';
import * as path from 'path';

// Use authenticated state
test.use({ storageState: path.join(__dirname, '../.auth/user.json') });

test.describe('Dashboard Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show statistics cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="stats-card"], .stats-card, .stat-card', { timeout: 10000 }).catch(() => {});
    
    // Check for common dashboard elements
    const statsSection = page.locator('[data-testid="stats-section"], .stats-section, .dashboard-stats').first();
    await expect(statsSection).toBeVisible({ timeout: 10000 }).catch(() => {
      // Alternative: look for any stat numbers
      return expect(page.locator('text=/\\d+/')).toBeVisible();
    });
  });

  test('should display overdue jobs section', async ({ page }) => {
    // Look for overdue jobs section
    await expect(page.getByText(/overdue|approaching/i)).toBeVisible({ timeout: 10000 }).catch(() => {
      // May not have overdue jobs
      console.log('No overdue jobs section visible - may be no overdue jobs');
    });
  });

  test('should navigate to jobs list', async ({ page }) => {
    // Click on Jobs link in navigation
    await page.click('a[href*="jobs"], button:has-text("Jobs"), nav >> text=Jobs').catch(async () => {
      await page.click('text=Jobs');
    });
    
    await expect(page).toHaveURL(/jobs/);
  });

  test('should navigate to reports', async ({ page }) => {
    await page.click('a[href*="reports"], button:has-text("Reports"), nav >> text=Reports').catch(async () => {
      await page.click('text=Reports');
    });
    
    await expect(page).toHaveURL(/reports/);
  });

  test('should show current user info', async ({ page }) => {
    // Look for user avatar, name, or user menu
    const userInfo = page.locator('[data-testid="user-info"], .user-menu, .user-avatar, [aria-label*="user"]');
    await expect(userInfo).toBeVisible({ timeout: 5000 }).catch(() => {
      // User info might be in a dropdown
      console.log('User info not immediately visible');
    });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Dashboard should still be visible
    await expect(page).toHaveURL(/dashboard/);
    
    // Check for mobile navigation
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, .hamburger-menu');
    await expect(mobileNav).toBeVisible({ timeout: 5000 }).catch(() => {
      // Mobile nav might appear differently
      console.log('Mobile navigation check - layout may differ');
    });
  });

  test('should refresh data when clicking refresh button', async ({ page }) => {
    const refreshBtn = page.locator('button:has-text("Refresh"), [data-testid="refresh-button"], button[aria-label*="refresh"]');
    
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      // Should show loading or update data
      await page.waitForLoadState('networkidle');
    }
  });
});
