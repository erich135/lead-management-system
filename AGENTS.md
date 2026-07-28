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
- Keep changes small and reviewable.
- Show diffs after changes.
- If unsure, stop and ask.

## Current task

We are updating job card templates that are sent to technicians through the Android mobile app.

## Main objective

Improve the technician job card template without breaking existing jobs, job allocation, job status flow, approvals, or technician access.

## Required workflow

1. Inspect relevant files.
2. Identify where job card data is created.
3. Identify where backend sends job card data.
4. Identify where frontend/mobile app receives job card data.
5. Identify where frontend/mobile app renders the job card.
6. Propose a safe implementation plan.
7. Wait for approval.
8. Implement one small step at a time.
9. Show git diff after each change.

## Proportionate Engineering

- Deliver complete, correct, tested, locally proven and deployable work.
- Moving quickly never permits incomplete or cowboy deployment.
- Protect real data integrity, permissions, backups, rollback and production reliability.
- Keep small features small.
- Do not invent frameworks, collections, approval systems, trust mechanisms or security subsystems without a demonstrated requirement.
- Do not reopen accepted architecture without a reproducible defect or changed requirement.
- Do not run repeated broad audits after accepted findings are closed.

## Finding Classification

1. RELEASE BLOCKER: reproducible correctness failure, data-loss or corruption risk, deployment or startup failure, material permission/security failure, or missing rollback where real data is at risk.
2. REQUIRED SOON: important reliability or usability work that does not block controlled release.
3. LATER IMPROVEMENT: optimisation, polish, speculative hardening or architectural preference.

Only reproducible release blockers may stop release.

## Validation

Use validation proportionate to risk: focused automated tests, typecheck, production build, `git diff --check`, real local end-to-end/UI verification for user-facing features, exact commit and clean-worktree verification, backend-first deployment where required, production health and smoke tests, and backup/rollback verification for data-changing work.

## Model Selection

- GPT-5.4 Mini: Git status, hashes, file inventories, documentation, register updates and routine checks.
- GPT-5.6 Terra: frontend implementation and UI debugging.
- GPT-5.6 Luna: Git, integration, commits, pushes, releases and deployment.
- Claude Sonnet: normal medium-complexity implementation.
- Opus 5: major architecture, bounded audits, difficult cross-system failures and risky migrations.
- Do not use Opus for routine Git commands, file lists, simple documentation or mechanical validation.

## Worktree Rules

- Read applicable `AGENTS.md` before work.
- Use isolated worktrees for implementation.
- One active agent per worktree.
- Never use `git add .`, `git add -A`, or `git commit -a`.
- Do not deploy or modify production without explicit authorisation.
- Do not ask the user to approve routine mechanical decisions already covered by these rules.
