# ARS office agent instructions

Air Rotary Services. Read `C:\Dev\ARS-Workspace\AGENTS.md` first. This file adds rules for `apps/ars-app-frontend`.

`knowledge-base/AI-CONTEXT.md` is not in the workspace yet. Do not describe it as read. Branch choice comes from the workspace file, not from `docs/DAILY-START-CHECKLIST.md` or `docs/WORKSPACE-README.md`.

## Change limits

Inspect the screen and the API it calls before editing. Keep the change small. Do not install packages, commit, or push unless the task says so.

Do not change authentication, permissions, or the job-status workflow unless the task names that change. The job screen must leave status history on the server. A status conflict stays a visible error and does not pretend the save succeeded.

Preserve allocation, approvals, and technician access unless the task changes them.

## Reporting for management

Leana’s Staff Work presentation stays clear and short. Put the date and filters once above the table. Do not pack explanations into column headings.

- Show the figures the API returns. Do not recalculate Staff Work in the browser.
- A zero is a real zero. A failed request is an error, not zero activity.
- Screen filters must match the filters sent to the API. Staff Work does not inherit the Activities row limit or the overdue-job filters.
- Supporting actions stay available from the summary.
- The job’s current status is not a substitute for the historical action.
- Excel download uses the API workbook.
- Check the affected screen after a UI change, including an empty or error state when the change can produce one.

## Reference

When the knowledge base exists, use its office-module and Staff Work references instead of copying them into this file.

## Terminal completion status

Finish the final task response with the mandatory workspace handover summary followed immediately by exactly one terminal status on its own final line: `COMPLETED`, `BLOCKED`, or `AWAITING APPROVAL`. Do not append text after it or substitute vague words like "Done" or "Stopped".

## Deployment precedent and evidence-based blockers

Before introducing a deployment restriction, requesting additional permissions, or proposing a different release procedure, agents MUST review the affected application's last successful deployments; inspect existing scripts, release records, Git history, server logs and rollback procedures; identify the established deployment mechanism; compare today's environment with the last successful release; and identify any genuine new risk supported by evidence. Prefer the established verified procedure unless a specific technical or safety reason requires a change. Do not repeat completed investigations without a documented reason.

ARS backend and Office releases normally use the established manual SSH procedure. GitHub is the source repository; a Git push is not proof of deployment. Verify the actual running server revision and Nginx-served frontend assets. Never infer repository ownership from a historic remote URL or propose a transfer on that basis.

A missing permission is not proof of a deployment fault. Do not repeatedly request webhook administrator access or retry denied administrative endpoints. Use available deployment evidence; inaccessible webhook settings alone do not block an explicitly authorised SSH release when there is no concrete conflicting automation. Absence of Actions does not prove absence of all automation. Never bypass a genuine safety issue because an earlier release succeeded.

Every BLOCKED handover must identify the precise blocker, supporting evidence, why the established procedure cannot safely handle it, and the smallest practical action needed from Erich. Do not manufacture blockers from unsupported assumptions.

All existing protections remain mandatory: explicit release approval, verified backups and rollback, branch integrity, protected stashes/worktrees, original database/submission integrity, template immutability/versioning, APK/OTA release controls, and the mandatory handover. The only permitted final statuses remain COMPLETED, BLOCKED and AWAITING APPROVAL.
