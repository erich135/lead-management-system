@echo off
REM =====================================================
REM Overnight Test Runner for Lead Management System
REM Schedule this script with Windows Task Scheduler
REM =====================================================

echo Starting Overnight Tests - %date% %time%
echo ================================================

REM Set working directory
cd /d "%~dp0.."

REM Create log file with timestamp
set LOGFILE=test-results\overnight-%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%.log

echo Log file: %LOGFILE%

REM Run the overnight test suite
call npm run test:overnight > "%LOGFILE%" 2>&1

echo.
echo Tests completed at %time%
echo Results saved to: %LOGFILE%
echo ================================================

REM Keep window open for 30 seconds to see results (optional)
timeout /t 30
