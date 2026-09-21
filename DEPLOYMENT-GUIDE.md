# ARS frontend deployment

Production source: **main**. Frontend uses main; backend uses master.
Development branches must be merged and tested before deploying. Keep the
server on the named production branch, never a detached commit.

## Server

- Region: AWS Cape Town, af-south-1.
- Resolve ars-dev.lmwfinance.app and ars-backend.lmwfinance.app before connecting.
- SSH user: ubuntu. Required key: ARS-CapeTown-2026.pem.
- Key folder: current Windows profile / OneDrive - LMW Financial Solutions / Documents / LMW Finance / keys.
- Never use arsapp.pem or the decommissioned Virginia server.
- Frontend checkout: /home/ubuntu/ars-app/frontend; nginx serves dist.
- Backend checkout: /home/ubuntu/ars-app/backend; PM2 process ars-backend, port 5000.

## Release procedure

1. Check exact repository, branch, working changes, stashes and remote heads.
2. Merge approved development changes into main. Preserve Abel and Erich work.
3. Run relevant tests and builds. Push normally, without force or history rewrites.
4. Back up live source, build, configuration and working diff before updating.
5. Fetch the reviewed production commit. Verify it contains the current live
   commit and all approved changes. Preserve local server changes explicitly.
6. Check out main and fast-forward to the reviewed origin/main commit.
   If fast-forward is impossible, inspect the divergence before changing anything.
7. Build before activation. Restart ars-backend only for a backend release.
8. Check health, authenticated read-only endpoints and served frontend assets.
9. Confirm both server branch names and commits match GitHub. Record verification
   and rollback references in ARS-MASTER-ISSUE-REGISTER.xlsx.

## Rollback and safeguards

Keep the previous build and configuration backup. If verification fails, restore
the prior build and restart only the affected service. Revert the release through
a reviewed commit on the production branch; never force-push or silently reset.
Do not print secrets, apply stashes, alter database records, run migrations or
refresh databases as part of a routine code release. Such actions require their
own explicit scope. Frontend-only deployment does not restart the backend.
