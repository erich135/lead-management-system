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
