import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Lead Management System
 * This configuration is optimized for comprehensive overnight testing
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry failed tests once
  workers: 1, // Single worker for sequential testing
  reporter: [
    ['html', { outputFolder: '../test-results/html-report' }],
    ['json', { outputFile: '../test-results/results.json' }],
    ['list'], // Console output
  ],
  
  // Global timeout settings for overnight testing
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  use: {
    // Base URL - change this to match your environment
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    
    // Collect trace on failure for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    
    // Browser settings
    headless: true,
    viewport: { width: 1280, height: 720 },
    
    // Action timeout
    actionTimeout: 15000,
  },

  // Test projects for different scenarios
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration - start the dev server before running tests
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
