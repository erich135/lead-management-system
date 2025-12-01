# Lead Management System - Automated Testing

This directory contains comprehensive automated tests for the Lead Management System, designed to run overnight and test every aspect of the application.

## Overview

The test suite includes:

1. **E2E Tests (Playwright)** - UI testing across browsers
2. **API Tests (Mocha/Chai)** - Backend endpoint testing
3. **Master Test Runner** - Orchestrates full test runs

## Test Coverage

### Frontend E2E Tests
| Test Suite | Features Covered |
|------------|-----------------|
| `auth.spec.ts` | Login, logout, forgot password, session persistence |
| `dashboard.spec.ts` | Stats display, navigation, responsiveness |
| `jobs-list.spec.ts` | Job listing, search, filtering, sorting, pagination |
| `job-form.spec.ts` | Job creation, customer selection, validation |
| `reports.spec.ts` | Report generation, date filtering, export |
| `chat.spec.ts` | Chat widget, messaging, emoji picker |
| `admin-settings.spec.ts` | User management, reference data, imports |

### Backend API Tests
| Test Suite | Endpoints Covered |
|------------|-------------------|
| `auth.test.ts` | `/api/auth/*` - Authentication |
| `jobs.test.ts` | `/api/jobs/*` - Jobs CRUD |
| `users.test.ts` | `/api/users/*` - User management |
| `chat.test.ts` | `/api/chat/*` - Chat messaging |
| `reference.test.ts` | `/api/reference/*` - Reference data |
| `other-endpoints.test.ts` | Machines, Activities, Cash Customers, Imports |

## Quick Start

### 1. Install Dependencies

```powershell
# From lead-management-system directory
npm run test:install
```

This will:
- Install E2E test dependencies
- Install Playwright browsers (Chromium, Firefox)

### 2. Configure Test Environment

Copy the example environment file and configure:

```powershell
cd e2e
copy .env.example .env
```

Edit `.env` with your test credentials:
```env
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
TEST_ADMIN_EMAIL=your-admin@example.com
TEST_ADMIN_PASSWORD=your-admin-password
```

### 3. Run Tests

#### Quick Test (Critical path only)
```powershell
npm run test:quick
```

#### Full Test Suite
```powershell
npm run test:full
```

#### Overnight Test (With retries)
```powershell
npm run test:overnight
```

## Running Individual Test Suites

### E2E Tests

```powershell
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Run specific test file
cd e2e
npx playwright test auth.spec.ts
```

### Backend API Tests

```powershell
cd ../ars-app-backend
npm test
```

## Test Reports

After running tests, reports are generated in:

- **HTML Report**: `test-results/html-report/index.html`
- **JSON Results**: `test-results/results-{timestamp}.json`
- **Log File**: `test-results/test-run.log`

View the HTML report:
```powershell
npm run test:report
```

## Scheduling Overnight Tests

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger for desired time (e.g., 11:00 PM)
4. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d "C:\path\to\lead-management-system" && npm run test:overnight`

### PowerShell Scheduled Task

```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-Command "cd C:\path\to\lead-management-system; npm run test:overnight"'
$trigger = New-ScheduledTaskTrigger -Daily -At 11pm
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "LeadMgmt-Nightly-Tests"
```

## Test Environment Requirements

### Prerequisites
- Node.js 18+
- npm 9+
- Backend server accessible (default: http://localhost:3000)
- Frontend server accessible (default: http://localhost:5173)

### Test User Accounts
Create two test accounts before running tests:

1. **Regular User** - for standard user flow tests
2. **Admin User** - for admin functionality tests

## Test Structure

```
e2e/
├── playwright.config.ts    # Playwright configuration
├── package.json            # E2E dependencies
├── run-tests.js            # Master test runner
├── .env.example            # Environment template
├── tests/
│   ├── auth.setup.ts       # Authentication setup
│   ├── auth.spec.ts        # Login/logout tests
│   ├── dashboard.spec.ts   # Dashboard tests
│   ├── jobs-list.spec.ts   # Jobs list tests
│   ├── job-form.spec.ts    # Job form tests
│   ├── reports.spec.ts     # Reports tests
│   ├── chat.spec.ts        # Chat tests
│   └── admin-settings.spec.ts  # Admin tests
└── .auth/                  # Saved authentication states
```

## Troubleshooting

### Tests fail to find elements
- Update element selectors in test files to match your UI
- Add `data-testid` attributes to components for more reliable selection

### Authentication fails
- Verify test credentials in `.env`
- Ensure test users exist and are active

### Servers not starting
- Check if ports 3000 and 5173 are available
- Manually start servers before running tests

### Timeouts
- Increase timeout values in `playwright.config.ts`
- Check network connectivity to servers

## Customization

### Adding New Tests

1. Create a new `.spec.ts` file in `e2e/tests/`
2. Follow the existing test structure
3. Import and use the authenticated state if needed

### Modifying Test Data

- Update `.env` with different test credentials
- Modify test data creation in setup files

### Adding Data-TestIds

For more reliable element selection, add `data-testid` attributes to your React components:

```tsx
<button data-testid="submit-job">Create Job</button>
<input data-testid="customer-search" />
```

Then reference in tests:
```typescript
await page.click('[data-testid="submit-job"]');
```

## Best Practices

1. **Run tests on a dedicated test database** to avoid affecting production data
2. **Create dedicated test users** rather than using real accounts
3. **Review test results regularly** to catch flaky tests
4. **Keep tests independent** - each test should be able to run in isolation
5. **Update tests when UI changes** - maintain tests alongside feature development

## Support

For issues or questions about the test suite, check:
- Test logs in `test-results/test-run.log`
- Playwright traces in `test-results/`
- Screenshots of failures in `test-results/`
