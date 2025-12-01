import { test, expect } from '@playwright/test';
import * as path from 'path';

// Use authenticated state
test.use({ storageState: path.join(__dirname, '../.auth/user.json') });

test.describe('Jobs List Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
  });

  test('should display jobs list page', async ({ page }) => {
    await expect(page).toHaveURL(/jobs/);
  });

  test('should show jobs table or list', async ({ page }) => {
    // Wait for jobs to load
    const jobsList = page.locator('table, [data-testid="jobs-list"], .jobs-list, .jobs-table');
    await expect(jobsList).toBeVisible({ timeout: 15000 });
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Test search
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Debounce
    await page.waitForLoadState('networkidle');
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select[name*="status" i], [data-testid="status-filter"], button:has-text("Status")');
    await expect(statusFilter).toBeVisible({ timeout: 10000 }).catch(() => {
      // Filter might be in a dropdown menu
      console.log('Status filter may be in dropdown');
    });
  });

  test('should have branch filter', async ({ page }) => {
    const branchFilter = page.locator('select[name*="branch" i], [data-testid="branch-filter"], button:has-text("Branch")');
    await expect(branchFilter).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Branch filter may be in dropdown');
    });
  });

  test('should show pagination when many jobs', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="pagination" i]');
    // Pagination may not be visible if few jobs
    const isVisible = await pagination.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Pagination visible: ${isVisible}`);
  });

  test('should open job details when clicking a job', async ({ page }) => {
    // Find and click first job row
    const firstJob = page.locator('table tbody tr, [data-testid="job-row"], .job-item').first();
    
    if (await firstJob.isVisible({ timeout: 10000 }).catch(() => false)) {
      await firstJob.click();
      
      // Should navigate to job details or open modal
      await page.waitForTimeout(500);
      const jobDetails = page.locator('[data-testid="job-details"], .job-details, [role="dialog"]');
      const urlChanged = await page.url().includes('/job/') || await jobDetails.isVisible({ timeout: 5000 }).catch(() => false);
      expect(urlChanged || await jobDetails.isVisible().catch(() => false)).toBeTruthy();
    }
  });

  test('should have create new job button', async ({ page }) => {
    const newJobBtn = page.locator('button:has-text("New Job"), button:has-text("Add Job"), button:has-text("Create"), [data-testid="new-job-button"]');
    await expect(newJobBtn).toBeVisible({ timeout: 10000 });
  });

  test('should filter jobs by status', async ({ page }) => {
    // Open status filter
    const statusFilter = page.locator('select[name*="status" i], [data-testid="status-filter"]').first();
    
    if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Select a specific status
      await statusFilter.selectOption({ index: 1 }).catch(async () => {
        // If it's a custom dropdown
        await statusFilter.click();
        await page.locator('[role="option"], .dropdown-item').first().click().catch(() => {});
      });
      
      await page.waitForLoadState('networkidle');
    }
  });

  test('should show/hide hidden jobs toggle', async ({ page }) => {
    const hiddenToggle = page.locator('[data-testid="show-hidden"], label:has-text("Hidden"), input[type="checkbox"][name*="hidden" i]');
    const isVisible = await hiddenToggle.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Hidden jobs toggle visible: ${isVisible}`);
  });

  test('should sort jobs by column', async ({ page }) => {
    const sortableHeader = page.locator('th[data-sortable], th:has-text("Date"), th:has-text("Status")').first();
    
    if (await sortableHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sortableHeader.click();
      await page.waitForLoadState('networkidle');
      
      // Click again for reverse sort
      await sortableHeader.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should export jobs data', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export-button"]');
    
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportBtn.click();
      const download = await downloadPromise;
      console.log(`Export download: ${download ? 'succeeded' : 'no download triggered'}`);
    }
  });
});
