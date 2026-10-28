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
