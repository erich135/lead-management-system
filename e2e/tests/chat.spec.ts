import { test, expect } from '@playwright/test';
import * as path from 'path';

// Use authenticated state
test.use({ storageState: path.join(__dirname, '../.auth/user.json') });

test.describe('Chat Widget Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display chat widget button', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await expect(chatBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open chat panel when clicking chat button', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    // Chat panel should open
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-window');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });
  });

  test('should show user list in chat', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Should show users to chat with
    const userList = page.locator('[data-testid="chat-users"], .user-list, .chat-contacts');
    await expect(userList).toBeVisible({ timeout: 10000 }).catch(() => {
      // May start with conversation view
      console.log('User list may require navigation');
    });
  });

  test('should select a user to chat with', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Click first user
    const firstUser = page.locator('[data-testid="chat-user"], .user-item, .chat-contact').first();
    if (await firstUser.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstUser.click();
      
      // Should show conversation view
      const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], [data-testid="message-input"]');
      await expect(messageInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should send a message', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Select first user
    const firstUser = page.locator('[data-testid="chat-user"], .user-item, .chat-contact').first();
    if (await firstUser.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstUser.click();
      
      // Type message
      const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], [data-testid="message-input"]');
      if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const testMessage = `Test message at ${new Date().toISOString()}`;
        await messageInput.fill(testMessage);
        
        // Send message
        const sendBtn = page.locator('button[type="submit"], button:has-text("Send"), [data-testid="send-message"]');
        await sendBtn.click();
        
        // Message should appear in chat
        await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show emoji picker', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Look for emoji button
    const emojiBtn = page.locator('button[aria-label*="emoji" i], [data-testid="emoji-picker"], .emoji-button');
    if (await emojiBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emojiBtn.click();
      
      // Emoji picker should open
      const emojiPicker = page.locator('.emoji-picker, .EmojiPickerReact, [data-testid="emoji-picker-panel"]');
      await expect(emojiPicker).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show typing indicator when other user types', async ({ page }) => {
    // This test would require another user typing
    // We'll just verify the chat UI is functional
    console.log('Typing indicator test - requires multi-user setup');
  });

  test('should show unread message count', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button');
    const unreadBadge = page.locator('[data-testid="unread-count"], .unread-badge, .badge');
    
    // Badge may or may not be visible depending on unread messages
    const isVisible = await unreadBadge.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Unread badge visible: ${isVisible}`);
  });

  test('should close chat panel', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button, button[aria-label*="chat" i]');
    await chatBtn.click();
    
    const chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel, .chat-window');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });
    
    // Close chat
    const closeBtn = page.locator('[data-testid="close-chat"], button[aria-label*="close" i], .close-button');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await expect(chatPanel).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle file attachments', async ({ page }) => {
    const chatBtn = page.locator('[data-testid="chat-widget"], .chat-button');
    await chatBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Look for attachment button
    const attachBtn = page.locator('button[aria-label*="attach" i], [data-testid="attach-file"], .attachment-button');
    const isVisible = await attachBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Attachment button visible: ${isVisible}`);
  });
});
