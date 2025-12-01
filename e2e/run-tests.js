#!/usr/bin/env node

/**
 * Master Test Runner - Overnight Automated Testing
 * 
 * This script runs comprehensive tests for both frontend and backend
 * It's designed to run overnight and produce detailed reports.
 * 
 * Usage:
 *   npm run test:full        - Run all tests
 *   npm run test:overnight   - Run full test suite with retries
 *   npm run test:quick       - Run critical path tests only
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  frontendDir: path.resolve(__dirname, '..'),
  backendDir: path.resolve(__dirname, '../../ars-app-backend'),
  e2eDir: path.resolve(__dirname),
  resultsDir: path.resolve(__dirname, '../test-results'),
  logFile: path.resolve(__dirname, '../test-results/test-run.log'),
};

// Ensure results directory exists
if (!fs.existsSync(CONFIG.resultsDir)) {
  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
}

// Logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
};

// Run a command and return a promise
const runCommand = (command, args, cwd, options = {}) => {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);
    log(`Working directory: ${cwd}`);

    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options.spawnOptions,
    });

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        log(`Command failed with code ${code}`);
        if (options.ignoreError) {
          resolve({ code, stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}\n${stderr}`));
        }
      }
    });

    proc.on('error', (err) => {
      log(`Command error: ${err.message}`);
      if (options.ignoreError) {
        resolve({ code: 1, stdout, stderr: err.message });
      } else {
        reject(err);
      }
    });
  });
};

// Check if a port is in use
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
};

// Start a server in background
const startServer = async (name, command, args, cwd, port) => {
  log(`Checking if ${name} is already running on port ${port}...`);
  
  if (await isPortInUse(port)) {
    log(`${name} already running on port ${port}`);
    return null;
  }

  log(`Starting ${name}...`);
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();

  // Wait for server to be ready
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    if (await isPortInUse(port)) {
      log(`${name} is ready on port ${port}`);
      return proc;
    }
  }
  
  throw new Error(`${name} failed to start within timeout`);
};

// Main test runner
async function runTests(mode = 'full') {
  const startTime = new Date();
  log('='.repeat(60));
  log(`Test Run Started - Mode: ${mode}`);
  log(`Start Time: ${startTime.toISOString()}`);
  log('='.repeat(60));

  const results = {
    startTime: startTime.toISOString(),
    mode,
    backend: { tests: 0, passed: 0, failed: 0 },
    frontend: { tests: 0, passed: 0, failed: 0 },
    e2e: { tests: 0, passed: 0, failed: 0 },
    errors: [],
  };

  let backendProc = null;
  let frontendProc = null;

  try {
    // Step 1: Start Backend Server
    log('\n--- Step 1: Starting Backend Server ---');
    try {
      backendProc = await startServer(
        'Backend',
        'npm',
        ['run', 'dev'],
        CONFIG.backendDir,
        3000
      );
    } catch (err) {
      log(`Warning: Could not start backend: ${err.message}`);
      results.errors.push(`Backend start: ${err.message}`);
    }

    // Step 2: Start Frontend Dev Server
    log('\n--- Step 2: Starting Frontend Server ---');
    try {
      frontendProc = await startServer(
        'Frontend',
        'npm',
        ['run', 'dev'],
        CONFIG.frontendDir,
        5173
      );
    } catch (err) {
      log(`Warning: Could not start frontend: ${err.message}`);
      results.errors.push(`Frontend start: ${err.message}`);
    }

    // Step 3: Run Backend API Tests
    log('\n--- Step 3: Running Backend API Tests ---');
    try {
      const apiTestResult = await runCommand(
        'npm',
        ['test'],
        CONFIG.backendDir,
        { ignoreError: true }
      );
      
      // Parse mocha output for results
      if (apiTestResult.code === 0) {
        results.backend.passed = 1;
        log('Backend tests passed');
      } else {
        results.backend.failed = 1;
        results.errors.push('Some backend tests failed');
      }
    } catch (err) {
      log(`Backend tests error: ${err.message}`);
      results.errors.push(`Backend tests: ${err.message}`);
      results.backend.failed = 1;
    }

    // Step 4: Run E2E Tests with Playwright
    log('\n--- Step 4: Running E2E Tests ---');
    try {
      // Install browsers if needed
      await runCommand('npx', ['playwright', 'install'], CONFIG.e2eDir, { ignoreError: true });

      // Run different test suites based on mode
      let testArgs = ['playwright', 'test'];
      
      if (mode === 'quick') {
        testArgs.push('auth.spec.ts', 'dashboard.spec.ts');
      } else if (mode === 'overnight') {
        testArgs.push('--retries=2');
      }

      const e2eResult = await runCommand(
        'npx',
        testArgs,
        CONFIG.e2eDir,
        { ignoreError: true }
      );

      if (e2eResult.code === 0) {
        results.e2e.passed = 1;
        log('E2E tests passed');
      } else {
        results.e2e.failed = 1;
        results.errors.push('Some E2E tests failed');
      }
    } catch (err) {
      log(`E2E tests error: ${err.message}`);
      results.errors.push(`E2E tests: ${err.message}`);
      results.e2e.failed = 1;
    }

  } catch (err) {
    log(`Test run error: ${err.message}`);
    results.errors.push(`Test run: ${err.message}`);
  }

  // Generate final report
  const endTime = new Date();
  results.endTime = endTime.toISOString();
  results.duration = (endTime - startTime) / 1000 / 60; // minutes

  log('\n' + '='.repeat(60));
  log('TEST RUN COMPLETED');
  log('='.repeat(60));
  log(`Duration: ${results.duration.toFixed(2)} minutes`);
  log(`Backend Tests - Passed: ${results.backend.passed}, Failed: ${results.backend.failed}`);
  log(`E2E Tests - Passed: ${results.e2e.passed}, Failed: ${results.e2e.failed}`);
  
  if (results.errors.length > 0) {
    log('\nErrors:');
    results.errors.forEach(err => log(`  - ${err}`));
  }

  // Save results to JSON
  const resultsFile = path.join(CONFIG.resultsDir, `results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  log(`\nResults saved to: ${resultsFile}`);

  // Return exit code
  const hasFailures = results.backend.failed + results.e2e.failed + results.errors.length > 0;
  return hasFailures ? 1 : 0;
}

// Parse command line args
const mode = process.argv[2] || 'full';
runTests(mode).then(code => process.exit(code));
