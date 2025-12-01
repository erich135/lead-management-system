import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.fill('input[type="password"]', 'somepassword');
    await page.click('button[type="submit"]');
    
    // Check for validation message
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show validation error for empty password', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should have forgot password link', async ({ page }) => {
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });

  test('should open forgot password modal', async ({ page }) => {
    await page.click('text=Forgot Password');
    
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Alternative: check for modal content
      return expect(page.getByText(/reset password|enter your email/i)).toBeVisible();
    });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Find and click logout button
    await page.click('[data-testid="logout-button"]').catch(async () => {
      // Try alternative selectors
      const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
      } else {
        // Try user menu
        await page.click('[data-testid="user-menu"]').catch(() => {});
        await page.click('text=Logout').catch(() => page.click('text=Sign out'));
      }
    });
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/$|\/login/);
  });

  test('should persist session on page reload', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});
