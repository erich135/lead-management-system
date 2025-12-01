import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Global setup - authenticates a test user and saves the session
 * This runs before all other tests
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/');
  
  // Wait for login page to load
  await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 10000 });
  
  // Fill in login credentials (use test account)
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Verify we're logged in
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 }).catch(() => {
    // Fallback: check for any dashboard indicator
    return expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
  
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

/**
 * Setup for admin user tests
 */
setup('authenticate-admin', async ({ page }) => {
  const adminAuthFile = path.join(__dirname, '../.auth/admin.json');
  
  await page.goto('/');
  
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
  
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  const authDir = path.dirname(adminAuthFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  await page.context().storageState({ path: adminAuthFile });
});
