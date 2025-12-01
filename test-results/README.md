# Test Results Directory

This directory contains test results after running the automated test suite.

## Contents

After running tests, you'll find:

- `html-report/` - Interactive HTML report from Playwright
- `results-{timestamp}.json` - JSON formatted test results
- `test-run.log` - Detailed log of the test run
- Screenshots and videos of failed tests

## Viewing Reports

Run this command to open the HTML report:

```powershell
npm run test:report
```

Or open `html-report/index.html` in your browser.
