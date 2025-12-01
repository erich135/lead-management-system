# Overnight Test Runner for Lead Management System
# Schedule this script with Windows Task Scheduler
# PowerShell version for more control

param(
    [string]$Mode = "overnight"  # Options: quick, full, overnight
)

$ErrorActionPreference = "Continue"

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptPath

Set-Location $projectRoot

# Create timestamp for log file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logDir = Join-Path $projectRoot "test-results"
$logFile = Join-Path $logDir "overnight-$timestamp.log"

# Ensure log directory exists
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Start logging
Start-Transcript -Path $logFile -Force

Write-Host "================================================"
Write-Host "Lead Management System - Overnight Test Runner"
Write-Host "================================================"
Write-Host "Start Time: $(Get-Date)"
Write-Host "Mode: $Mode"
Write-Host "Log File: $logFile"
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Start Backend if not running
Write-Host "Checking backend server..."
if (-not (Test-Port 3000)) {
    Write-Host "Starting backend server..."
    $backendPath = Join-Path (Split-Path $projectRoot -Parent) "ars-app-backend"
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $backendPath -WindowStyle Hidden
    Start-Sleep -Seconds 10
}

# Start Frontend if not running
Write-Host "Checking frontend server..."
if (-not (Test-Port 5173)) {
    Write-Host "Starting frontend server..."
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $projectRoot -WindowStyle Hidden
    Start-Sleep -Seconds 10
}

# Wait for servers to be ready
Write-Host "Waiting for servers to be ready..."
$maxWait = 60
$waited = 0
while ((-not (Test-Port 3000) -or -not (Test-Port 5173)) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    Write-Host "  Waited $waited seconds..."
}

if (-not (Test-Port 3000)) {
    Write-Host "WARNING: Backend server not responding on port 3000"
}

if (-not (Test-Port 5173)) {
    Write-Host "WARNING: Frontend server not responding on port 5173"
}

# Run tests
Write-Host ""
Write-Host "Running tests..."
Write-Host "================================================"

try {
    node "$scriptPath\run-tests.js" $Mode
    $exitCode = $LASTEXITCODE
} catch {
    Write-Host "Error running tests: $_"
    $exitCode = 1
}

Write-Host ""
Write-Host "================================================"
Write-Host "Test Run Complete"
Write-Host "Exit Code: $exitCode"
Write-Host "End Time: $(Get-Date)"
Write-Host "================================================"

Stop-Transcript

# Send email notification (optional - configure SMTP settings)
# $smtpServer = "smtp.yourserver.com"
# $from = "tests@yourcompany.com"
# $to = "dev-team@yourcompany.com"
# $subject = "Overnight Test Results - $(if ($exitCode -eq 0) {'PASSED'} else {'FAILED'})"
# $body = Get-Content $logFile -Raw
# Send-MailMessage -SmtpServer $smtpServer -From $from -To $to -Subject $subject -Body $body

exit $exitCode
