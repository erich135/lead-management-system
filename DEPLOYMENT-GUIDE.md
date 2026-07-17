# ARS Frontend Deployment Guide

This is the deployment guide for the active ARS/Bouwa workspace. It covers the
frontend only. The backend has a separate deployment guide and is managed by
PM2; a frontend-only deployment must not restart the backend.

## Workspace and Server

| Item | Value |
|---|---|
| Workspace root | `C:\Dev\ARS-Workspace` |
| Local frontend repo | `C:\Dev\ARS-Workspace\apps\ars-app-frontend` |
| Local backend repo | `C:\Dev\ARS-Workspace\apps\ars-app-backend` |
| Frontend canonical branch | `integration/bouwa-canonical-frontend` |
| Frontend live release branch | `release/bouwa-frontend-4d20` |
| Temporary reconciliation branch | `reconcile/live-production-hotfixes` |
| Live app | `https://ars-dev.lmwfinance.app` |
| SSH target | `ubuntu@ec2-44-200-244-205.compute-1.amazonaws.com` |
| SSH key | `C:\Users\erich\OneDrive - LMW Financial Solutions\Documents\LMW Finance\keys\arsapp.pem` |
| Server frontend repo | `/home/ubuntu/ars-app/frontend` |
| Served frontend build | `/home/ubuntu/ars-app/frontend/dist` |

`C:\Dev\ARS-Workspace` is a workspace directory and must not be treated as an
application Git repository. Run project Git commands only in the exact repo
path above. Do not use `C:\Dev\ARS` or `C:\Dev\ARS-Integration-Workspace` for
new work; they are reference/archive folders only.

## Branch Roles

- `integration/bouwa-canonical-frontend` is the normal frontend development
  and review branch. It preserves the Bouwa work.
- `release/bouwa-frontend-4d20` is the reviewed frontend release branch used
  for production deployment.
- `reconcile/live-production-hotfixes` is a temporary reconciliation branch,
  based at `78202c4234cc75b28df69c8ef9ebde940203df69`. It is not a permanent
  development branch.
- The current deployed frontend commit is
  `2f9fc33c02d27085d900cdc7c5c05fedc4690af9`.
- The pre-reconciliation production commit was
  `6d7645ccd0d432f3973c6bf58777ccaede6fd345`.

Never deploy the canonical branch accidentally. A release branch must be
reviewed and explicitly identified before any production action.

## Local Preflight

Run these commands from the frontend repository. Do not use `git pull` as a
blind synchronization step, and do not continue with a dirty tree without
understanding every change.

```powershell
cd C:\Dev\ARS-Workspace\apps\ars-app-frontend
git fetch origin
git branch --show-current
git status --short --untracked-files=all
git status -sb
git rev-parse HEAD
git log --oneline -5
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Before staging, inspect the diff and stage only reviewed files:

```powershell
git diff --stat
git diff -- <reviewed-file>
git add <reviewed-file> ...
git diff --cached --check
git commit -m "Describe the reviewed frontend change"
git push origin <source-branch>
```

Do not use `git add .` when unrelated or untracked files are present. Do not
commit `.env` files, credentials, generated bundles, or unknown files.

## Production Divergence Procedure

Production history can contain changes that are not yet represented by the
canonical branch. Treat divergence as an investigation, not as permission to
copy or merge an entire production branch.

The reviewed reconciliation that produced the current release followed this
sequence:

1. Inspect production and both remote histories without changing files.
2. Create a fresh reconciliation branch from the tested base commit
   `78202c4234cc75b28df69c8ef9ebde940203df69`.
3. Port only the required production functionality in chronological order.
   The six represented changes were archived-machine visibility and
   `dbStatus` filtering, archived-machine read-only controls, machine deletion
   policy, cash-customer machine relinking, `relinkMachineToCustomer` API use,
   and companion part-number job-card reporting/documentation.
4. Do not replay `0550d8d`; its RSR handling was superseded by `78202c4`.
5. Preserve the Bouwa functionality, the completed Sales/RSR hotfix behavior,
   and newer `Machines.tsx` and `src/lib/api.ts` logic. Resolve conflicts
   manually.
6. Run typecheck, build, and `git diff --check`, then review the exact file
   list and diff.
7. Commit and push the reviewed reconciliation branch. Fast-forward the
   release branch to that tested commit only after review.

The reconciliation branch is temporary. Future normal work should start from
the canonical branch or an explicitly approved release/hotfix branch.

## Production Preflight and Backup

Use the key path above. Do not print the key, `.env`, or any secret values.

```powershell
$pem = "C:\Users\erich\OneDrive - LMW Financial Solutions\Documents\LMW Finance\keys\arsapp.pem"
ssh -i $pem -o StrictHostKeyChecking=no ubuntu@ec2-44-200-244-205.compute-1.amazonaws.com
```

On the server, inspect the target before changing it:

```bash
cd /home/ubuntu/ars-app/frontend
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git fetch origin
git log --oneline -5
git status -sb
```

Before aligning production, create and preserve a named backup branch at the
current production commit. The completed reconciliation used:

```text
backup/production-frontend-6d7645c-20260717-145456
```

The backup points to `6d7645ccd0d432f3973c6bf58777ccaede6fd345`. Verify the
backup hash before any reset or alignment. The preserved untracked
`.env.template` is outside the repository at:

```text
/home/ubuntu/ars-app/predeploy-backups/20260717-150310/.env.template
```

Do not include or display its contents. If an untracked template must be
handled in a future deployment, first confirm it is unused, copy it outside
the repository, compare hashes, and remove the repository copy only after the
hash and usage checks succeed. Never remove `.env` or use a broad `git clean`.

## Align, Build, and Serve

Prefer a fast-forward-only update when the release branch contains the
production commit:

```bash
cd /home/ubuntu/ars-app/frontend
git fetch origin
git merge --ff-only origin/release/bouwa-frontend-4d20
git rev-parse HEAD
npm run build
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager
```

If the fast-forward fails, stop and inspect the divergence. A deliberate reset
is allowed only after a verified backup, exact target commit verification, and
explicit approval. Never reset to a moving branch name without first
recording and checking the intended commit. Do not restart PM2 or alter the
backend for a frontend-only deployment.

## Verification

Confirm the server is serving the intended commit and the basic routes respond:

```bash
cd /home/ubuntu/ars-app/frontend
git rev-parse HEAD
curl -I https://ars-dev.lmwfinance.app/
curl -I https://ars-dev.lmwfinance.app/sales-leads
curl -I https://ars-dev.lmwfinance.app/machines
```

In a browser, hard-refresh the live app and smoke-test the changed areas:

- Sales Leads Reports opens without a white screen.
- Machines can display archived/read-only behavior correctly.
- RSR upload reports failure or attachment clearly and refreshes the target
  machine's RSR Documents list.
- Existing-machine linking and the Jobs workflow still work.
- Bouwa screens and calculation behavior remain unchanged.

## Rollback

Stop first if the build, nginx test, HTTP checks, or functional smoke test
fails. Record the failing commit and use the verified backup branch only after
explicit rollback approval. Rebuild `dist`, test nginx, restart nginx, and
repeat the HTTP and browser checks. Do not touch the backend during a
frontend-only rollback.

## Prohibited Actions

- Do not deploy from the old workspace folders.
- Do not blindly pull `main`, `master`, or `chatbot`.
- Do not pull into a dirty branch.
- Do not run `npm run local:refresh` automatically; it replaces local MongoDB
  data and must never run on production.
- Do not run migrations, import scripts, or database commands as part of a
  frontend deployment.
- Do not expose environment-file contents, secrets, or private keys.
- Do not delete unknown files or unrelated bundles.
- Do not restart backend services for a frontend-only change.
- Do not commit, push, merge, rebase, or deploy without an explicit reviewed
  release decision.
