# ARS App AI Instructions

This is a production application used by Air Rotory Services staff and technicians.

## Critical rules

- Do not edit files unless explicitly instructed.
- First inspect and explain the plan.
- Do not delete files.
- Do not rename files without approval.
- Do not change authentication logic.
- Do not change job status workflow.
- Do not change branch, rep, admin, approval, or technician permissions.
- Do not change database schema unless specifically approved.
- Do not install packages without approval.
- Do not commit.
- Do not push.
- Do not deploy unless explicitly instructed.
- Do not SSH to production unless explicitly instructed.
- Do not connect to production MongoDB.
- Do not run database backup, restore, import, or refresh scripts.
- Do not run `local:refresh`.
- Do not print or expose secrets.
- Keep changes small and reviewable.
- Show diffs after changes.
- If unsure, stop and ask.

## Workspace layout

- Backend: `C:\Dev\ARS-Integration-Workspace\ars-app-backend`
- Frontend: `C:\Dev\ARS-Integration-Workspace\lead-management-system`
- Standalone reference app: `C:\Dev\ARS-Integration-Workspace\ARS-Bouwa-Proposal-App`
- Source data outside git: `C:\Dev\ARS-Integration-Workspace\bouwa-source-data`
- Excel proposal workbooks: `C:\Dev\ARS-Integration-Workspace\bouwa-source-data\excel-proposals`

## Current active work

- Current project: ARS/Bouwa Air Audit Proposal Builder.
- Bouwa 4D-20 is live.
- Element Six validation scenario has been added locally.
- Next work is validation against more Excel workbooks and safe proposal, customer, and machine linking design.

## Important branches

- Frontend release branch: `release/bouwa-frontend-4d20`
- Frontend validation branch: `validation/bouwa-excel-proposals`
- Backend Bouwa branch: `feature/bouwa-spec-import-staging`

## Production safety

- Do not SSH to production unless explicitly instructed.
- Do not deploy unless explicitly instructed.
- Do not touch production MongoDB.
- Do not print or expose secrets.
- Do not run DB backup, restore, import, or refresh scripts.
- Do not run `local:refresh`.
- Treat production-looking `.env` files and backup folders as sensitive.

## Build commands

- Frontend build: `npm run build`
- Frontend typecheck if needed: `npm run typecheck`
- Backend build: `npm run build`
- Backend tests only if requested: `npm test`

## Bouwa-specific rules

- Do not redesign the approved Proposal Builder UI.
- Do not change Bouwa calculation formulas unless explicitly asked.
- Do not hide validation mismatches.
- Keep source labels, workbook values, app values, differences, and review statuses visible.
- Keep Ingrain and Element Six validation scenarios separate.
- New proposal flow must eventually support:
  - existing customer + existing machine
  - existing customer + new/manual machine
  - new customer + new/manual machine
  - machine-first lookup

## Main objective

Support the ARS/Bouwa Air Audit Proposal Builder safely without breaking existing jobs, job allocation, job status flow, approvals, authentication, permissions, customer records, machine records, or production data.

## Required workflow

1. Inspect relevant files.
2. Produce a safe implementation plan.
3. Wait for approval before editing.
4. Make one small, reviewable change at a time.
5. Do not change app code, backend logic, auth, job workflow, permissions, database schema, package dependencies, deployment settings, or production configuration without explicit approval.
6. Run build only when code changes and only when requested or appropriate for the change.
7. Show git diff after changes.
8. Report files changed and git status.
9. Do not commit or push unless specifically instructed.
10. If unsure, stop and ask.
