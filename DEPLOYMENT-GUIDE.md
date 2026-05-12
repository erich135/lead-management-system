# ARS Frontend — Deployment Guide

This guide covers how to deploy code changes from your local machine to the EC2 production server.

---

## Prerequisites

- You have the .pem key file at:
  `C:\Users\erich\OneDrive - Dreamions\Documents\LMW Finance\keys\arsapp.pem`
- You have Git installed and the repo cloned to:
  `C:\LATEST\Temp\Offline code\lead-management-system`

---

## Step 1 — Fix SSH Key Permissions (first time only, or after a Windows update)

If you get a *"bad permissions"* error when trying to SSH, run this once in PowerShell:

```powershell
icacls "C:\Users\erich\OneDrive - Dreamions\Documents\LMW Finance\keys\arsapp.pem" /inheritance:r /grant:r "erich:(R)"
```

You only need to do this once per machine. If it breaks again after a Windows update, just run it again.

---

## Step 2 — Make Your Code Changes Locally

Edit the files in VS Code as normal.

---

## Step 3 — Push Changes to GitHub (chatbot branch)

Open a PowerShell terminal in the project folder and run:

```powershell
cd "C:\LATEST\Temp\Offline code\lead-management-system"
git add .
git commit -m "describe what you changed"
git push origin chatbot
```

> *Important:* Always push to `chatbot` first — this is your staging/review branch. Only merge to `main` when you are ready to go live (see Step 3b below).

---

## Step 3b — Merge to Main When Ready to Go Live

Once you are happy with the changes on `chatbot`, merge them into `main`:

```powershell
cd "C:\LATEST\Temp\Offline code\lead-management-system"
git checkout main
git merge chatbot
git push origin main
git checkout chatbot
```

This promotes your changes to the production branch. Then continue with Step 4.

---

## Step 4 — Connect to the Production Server via SSH

```powershell
$pem = "C:\Users\erich\OneDrive - Dreamions\Documents\LMW Finance\keys\arsapp.pem"
ssh -i $pem -o StrictHostKeyChecking=no ubuntu@ec2-44-200-244-205.compute-1.amazonaws.com
```

You will see a prompt like: `ubuntu@ip-172-31-1-135:~$`

---

## Step 5 — Pull Changes and Rebuild on the Server

Once connected via SSH, run these commands one by one:

```bash
cd ~/ars-app/frontend
git pull origin main
npm run build
```

Nginx serves directly from `~/ars-app/frontend/dist` — no copy needed after the build.

### What each command does:

| Command | Purpose |
|---|---|
| `cd ~/ars-app/frontend` | Navigate to the frontend folder |
| `git pull origin main` | Download your latest code from GitHub |
| `npm run build` | Compile and bundle React app into `dist/` |

---

## Notes

- The EC2 server is at: `ec2-44-200-244-205.compute-1.amazonaws.com`
- Production URL: `https://ars-dev.lmwfinance.app`
- Backend URL: `https://ars-backend.lmwfinance.app`
- After deploying, users should hard-refresh their browser (Ctrl+Shift+R) to bypass the service worker cache and pick up new JS bundles.
