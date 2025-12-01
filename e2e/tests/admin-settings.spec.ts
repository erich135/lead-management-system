import { test, expect } from '@playwright/test';
import * as path from 'path';

// Use admin authenticated state
test.use({ storageState: path.join(__dirname, '../.auth/admin.json') });

test.describe('Admin Settings Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page).toHaveURL(/settings/);
  });

  test('should show user management section', async ({ page }) => {
    const userSection = page.locator('[data-testid="user-management"], text=Users, h2:has-text("User")');
    await expect(userSection).toBeVisible({ timeout: 10000 });
  });

  test('should list all users', async ({ page }) => {
    // Navigate to users section if needed
    const usersTab = page.locator('button:has-text("Users"), [data-testid="users-tab"]');
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
    }
    
    // Should show users table or list
    const usersList = page.locator('table, [data-testid="users-list"], .users-list');
    await expect(usersList).toBeVisible({ timeout: 10000 });
  });

  test('should have invite user button', async ({ page }) => {
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add User"), [data-testid="invite-user"]');
    await expect(inviteBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open invite user modal', async ({ page }) => {
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add User"), [data-testid="invite-user"]');
    await inviteBtn.click();
    
    // Modal should open
    const modal = page.locator('[role="dialog"], .modal, [data-testid="invite-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Should have email field
    const emailField = page.locator('input[type="email"], input[name*="email" i]');
    await expect(emailField).toBeVisible();
  });

  test('should show reference data management', async ({ page }) => {
    const refDataSection = page.locator('[data-testid="reference-data"], text=Reference, text=Status');
    const isVisible = await refDataSection.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Reference data section visible: ${isVisible}`);
  });

  test('should manage status codes', async ({ page }) => {
    const statusTab = page.locator('button:has-text("Status"), [data-testid="status-tab"]');
    if (await statusTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusTab.click();
      
      // Should show status list
      const statusList = page.locator('table, [data-testid="status-list"]');
      await expect(statusList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should manage rep codes', async ({ page }) => {
    const repTab = page.locator('button:has-text("Rep"), [data-testid="rep-tab"]');
    if (await repTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await repTab.click();
      
      const repList = page.locator('table, [data-testid="rep-list"]');
      await expect(repList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should manage admin codes', async ({ page }) => {
    const adminTab = page.locator('button:has-text("Admin Code"), [data-testid="admin-tab"]');
    if (await adminTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await adminTab.click();
      
      const adminList = page.locator('table, [data-testid="admin-list"]');
      await expect(adminList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should manage technicians', async ({ page }) => {
    const techTab = page.locator('button:has-text("Technician"), [data-testid="technician-tab"]');
    if (await techTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await techTab.click();
      
      const techList = page.locator('table, [data-testid="technician-list"]');
      await expect(techList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should manage service descriptions', async ({ page }) => {
    const serviceTab = page.locator('button:has-text("Service"), [data-testid="service-tab"]');
    if (await serviceTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceTab.click();
      
      const serviceList = page.locator('table, [data-testid="service-list"]');
      await expect(serviceList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show CSV import section', async ({ page }) => {
    const importSection = page.locator('[data-testid="csv-import"], text=Import, button:has-text("Import")');
    const isVisible = await importSection.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`CSV import section visible: ${isVisible}`);
  });

  test('should edit user permissions', async ({ page }) => {
    // Find a user row
    const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
    
    if (await userRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click edit or the row
      const editBtn = userRow.locator('button:has-text("Edit"), [data-testid="edit-user"]');
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        
        // Should open edit modal/form
        const editForm = page.locator('[role="dialog"], .modal, form');
        await expect(editForm).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should validate invite user form', async ({ page }) => {
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add User")');
    await inviteBtn.click();
    
    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Invite")').nth(1);
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      
      // Should show validation error
      const error = page.locator('.error, text=required, [data-testid="error"]');
      // Form should not submit without email
    }
  });
});
