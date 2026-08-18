# Bouwa — Data Structure and Linking Audit

Purpose: inspect ARS backend models, routes, and frontend usage to recommend a safe Bouwa proposal linking strategy. Inspection only — no code, DB, or production changes were made.

**Files inspected**
- Backend models/controllers/routes (paths below):
  - [ars-app-backend/src/models/customer.model.ts](ars-app-backend/src/models/customer.model.ts)
  - [ars-app-backend/src/models/machine.model.ts](ars-app-backend/src/models/machine.model.ts)
  - [ars-app-backend/src/models/job.model.ts](ars-app-backend/src/models/job.model.ts)
  - [ars-app-backend/src/models/jobRSRDocument.model.ts](ars-app-backend/src/models/jobRSRDocument.model.ts)
  - [ars-app-backend/src/models/salesLead.model.ts](ars-app-backend/src/models/salesLead.model.ts)
  - [ars-app-backend/src/models/machineReadingSubmission.model.ts](ars-app-backend/src/models/machineReadingSubmission.model.ts)
  - [ars-app-backend/src/models/user.model.ts](ars-app-backend/src/models/user.model.ts)
  - [ars-app-backend/src/models/branch.model.ts](ars-app-backend/src/models/branch.model.ts)
  - [ars-app-backend/src/controllers/machine.controller.ts](ars-app-backend/src/controllers/machine.controller.ts)
  - [ars-app-backend/src/controllers/reference.controller.ts](ars-app-backend/src/controllers/reference.controller.ts)
  - [ars-app-backend/src/controllers/job.controller.ts](ars-app-backend/src/controllers/job.controller.ts)
  - [ars-app-backend/src/controllers/jobRSRDocument.model.ts](ars-app-backend/src/models/jobRSRDocument.model.ts)
  - [ars-app-backend/src/routes/machine.routes.ts](ars-app-backend/src/routes/machine.routes.ts)
  - [ars-app-backend/src/routes/reference.routes.ts](ars-app-backend/src/routes/reference.routes.ts)
  - [ars-app-backend/.env](ars-app-backend/.env) (read only for safety — contains production URI; see note)
- Frontend files:
  - [lead-management-system/src/lib/api.ts](lead-management-system/src/lib/api.ts)
  - [lead-management-system/src/components/LeadForm.tsx](lead-management-system/src/components/LeadForm.tsx)
  - [lead-management-system/src/components/LeadDetails.tsx](lead-management-system/src/components/LeadDetails.tsx)
  - [lead-management-system/src/components/Machines.tsx](lead-management-system/src/components/Machines.tsx)

---

## 1) Customer model / collection
- File: [ars-app-backend/src/models/customer.model.ts](ars-app-backend/src/models/customer.model.ts)
- Mongoose model name / collection: `Customer` (collection name: `customers`)
- Fields (visible):
  - `name` (String, required, indexed)
  - `defaultContactPerson` (String, optional)
  - `defaultWhatsAppNumber` (String, optional)
  - `address`, `phone`, `email` (String, optional)
  - `isActive` (Boolean, default true)
  - `dbStatus` (String enum: `active` | `deleted`, default `active`, indexed)
  - `createdAt`, `updatedAt` (timestamps)
- Indexes/uniqueness: name index, dbStatus index
- Relationships: referenced by `Machine.customer`, `Job.customer`, `SalesLead` fields; used to populate name in machine/job endpoints.
- Notes: Email lowercased; name uniqueness enforced on active customers at controller-level when creating.

## 2) Machine model / collection
- File: [ars-app-backend/src/models/machine.model.ts](ars-app-backend/src/models/machine.model.ts)
- Model: `Machine` (collection `machines`)
- Fields (visible, condensed):
  - Identification: `make` (String, req), `model` (String, req), `serialNumber` (String, req, indexed), `assetNumber` (String)
  - Ownership/linking: `customer` (ObjectId ref `Customer`, optional), `cashCustomer` (String), `isRental` (Boolean), `ownershipType` (`customer` | `ars_rental`)
  - Service tracking: `serviceType` (`hours` | `date`), `machineHours`, `nextServiceHours`, `lastServiceDate`, `nextServiceDate`
  - Contact: `contactPerson`, `whatsAppNumber`, `readingFrequencyDays`, `whatsAppRemindersEnabled`
  - RSRs: `rsrDocuments` (embedded array of RSR subdocs — `IMachineRSR`)
  - Soft-delete/status: `isActive`, `dbStatus`
  - Timestamps
- Indexes/unique constraints: indexes on `customer`, `cashCustomer`, `isActive`, `dbStatus`, `serialNumber`, compound index `{ serialNumber, customer, cashCustomer }` to help uniqueness per owner
- Relationships: `machines` referenced from `Job.machines`; RSRs stored both embedded in machine (`rsrDocuments`) and in `JobRSRDocument` for job-linked archives; machine reading submissions reference Machine by id.
- Validation: pre-validate enforces at least one of `customer`, `cashCustomer`, or `isRental`.
- Notes: Machine RSRs contain `fileUrl` referencing GridFS file id; `rsrGroupId` used when same upload fans out to multiple machines.

## 3) Job / Job RSR / documents
- Files: [ars-app-backend/src/models/job.model.ts](ars-app-backend/src/models/job.model.ts), [ars-app-backend/src/models/jobRSRDocument.model.ts](ars-app-backend/src/models/jobRSRDocument.model.ts)
- Model: `Job` (collection `jobs`) — fields include `jobNumber` (unique), `customer` (ObjectId -> Customer), `machines` (array of Machine ids), `branch` (required), `status`, `valueExVat`, `rsrNumber`, bookkeeping fields, `statusHistory`, many date fields, `dbStatus`.
- JobRSRDocument: separate GridFS-backed job-level RSR archive model (`JobRSRDocument`) with `jobId` ref, file metadata, `storageKey` pointing to GridFS file id in `jobrsrdocuments` bucket; visibility flag `all|private` and `uploadedBy` reference to `User`.
- Relationships: job.machines links to Machine; jobRSR documents link to job._id and are also considered when compiling machine RSR lists (machine.controller merges job RSRs for machine view).

## 4) Sales Leads
- File: [ars-app-backend/src/models/salesLead.model.ts](ars-app-backend/src/models/salesLead.model.ts)
- Model: `SalesLead` (collection `salesleads`)
- Fields: `leadNumber` (unique), `companyName`, `contactPerson`, `contactPhone`, `contactEmail`, `branch` (ref), `assignedRep` (ref RepCode), `serviceDescription`, `jobSource`, `priority`, `status`, `convertedJobId` (ref Job), `createdBy`, `dbStatus`, timestamps
- Relationship: can convert to a Job; not tightly coupled to Machine directly (but conversion may copy serviceDescription/machines when creating a job)

## 5) Readings / QR readings
- File: [ars-app-backend/src/models/machineReadingSubmission.model.ts](ars-app-backend/src/models/machineReadingSubmission.model.ts)
- Model: `MachineReadingSubmission` (collection `machinereadingsubmissions`)
- Fields: `machine` (ref Machine), `submittedHours`, `faultReported`, submitter contact info, photo metadata (`photoFileName`, `photoS3Key`), `previousHours`, `status` (`pending|approved|rejected`), `submittedAt`, `verifiedBy`, `approvedHours`, timestamps
- Relationship: references Machine; on approval the machine record may be updated (controller comments indicate approved submissions can update machine.machineHours using a highest-wins rule).

## 6) Users, Branches, Admins/Reps
- `User` model: [ars-app-backend/src/models/user.model.ts](ars-app-backend/src/models/user.model.ts) — fields for `email`, `firstName`, `lastName`, `role` (ref), `permissions` array, `branches` (array of Branch refs), `repCodes`/`adminCodes`, `technician` ref, `isActive`, timestamps.
- `Branch` model: [ars-app-backend/src/models/branch.model.ts](ars-app-backend/src/models/branch.model.ts) — branch name, `jobNumberCode`, geolocation, `isDefault`, `isActive`.
- Permissions: routes use `authenticate` and `requirePermission(...)` middleware; typical permissions: `customers.create`, `machines.manage`, `jobs.create`, `jobs.update`, `reference.manage`, etc.

---

## Part B — Backend routes / controllers (selected, relevant to Bouwa)
Summary of endpoints relevant for Bouwa linking (method, path, controller, auth, notes):

- GET /api/reference/customers — `reference.controller.ts:getCustomers`
  - Query: `search`, `page`, `limit`, `includeArchived`
  - Returns `{ customers, pagination }` — customers list for dropdowns
  - Auth: `authenticate` required
  - Suitable: yes (search/select existing customer)

- POST /api/reference/customers — `reference.controller.ts:createCustomer`
  - Body: `{ name }` (controller supports address/phone/email in update API but create currently requires `name`)
  - Permissions: `customers.create` required
  - Response: `{ customer }`
  - Suitable for Bouwa: yes (create customer on-the-fly) but permission `customers.create` is required.

- PUT /api/reference/customers/:id — `reference.controller.ts:updateCustomer`
  - Body: `name`, `defaultContactPerson`, `defaultWhatsAppNumber`, `address`, `phone`, `email`, `isActive`
  - Permissions: `customers.create` required (odd naming — same permission used for update)
  - Suitable: yes

- GET /api/machines — `machine.controller.ts:getMachines`
  - Query: `customerId`, `search`, `page`, `limit`, `sortField`, `sortDir`, `ownershipType`
  - Returns paginated machines and `pagination` meta
  - Auth: authenticate
  - Suitable: yes (list/search machines; used to show linked machines)

- GET /api/machines/:id — `machine.controller.ts:getMachine`
  - Params: `id`; populates `customer` name
  - Auth: authenticate
  - Suitable: yes

- GET /api/machines/customer/:customerId — `machine.controller.ts:getMachinesByCustomer`
  - Params: `customerId` or cash-customer via `/cash-customer/:cashCustomer`
  - Auth: authenticate
  - Suitable: yes (machines-by-customer primary endpoint for Bouwa)

- POST /api/machines — `machine.controller.ts:createMachine`
  - Body: machine fields; requires either `customer` or `cashCustomer` except for `isRental`
  - Permission: `machines.manage` required
  - Suitable: yes for creating new machine records (but permissions required)

- PUT /api/machines/:id — `machine.controller.ts:updateMachine`
  - Permissions: `machines.manage`
  - Suitable: yes

- GET /api/jobs — `job.controller.ts:getJobs` / GET /api/jobs/:id — `job.controller.ts:getJob`
  - Jobs include `customer`, `machines` population; create job endpoint (`POST /api/jobs`) accepts `machines` array
  - Permissions: `jobs.create` for creation
  - Suitable: job creation can link machines and customers — Bouwa could either create job or create proposal entity in new table (recommended below)

- Machine RSR endpoints (upload/list/download/delete) exist under `/api/machines/rsr` and `/:machineId/rsr` — see `machine.controller.ts`.
  - RSRs stored in GridFS; machine-level RSRs embedded in `machine.rsrDocuments` and job-level RSRs in `JobRSRDocument` collection.
  - Suitable: RSRs and files are already supported and can be referenced by proposals if needed.

- Machine QR reading endpoints: `/api/machines/:id/qr-token` and `/api/machines/:id/reading-submissions` via `machineReadingSubmission.controller` — used for customer-submitted readings. Read-only for Bouwa (relevant if we import runtime readings into proposals).

Auth/permissions notes:
- All endpoints require `authenticate` middleware.
- Mutating endpoints typically require `requirePermission('...')` e.g., `machines.manage`, `customers.create`, `jobs.create`.
- Frontend components call these endpoints via `src/lib/api.ts` and will need the current user's token/permissions to create customer/machine/job.

---

## Part C — Frontend API usage & components (relevant)
Key frontend helpers/components:

- `lead-management-system/src/lib/api.ts` — central API wrapper and functions:
  - `getCustomers()`, `createCustomer()`, `updateCustomer()` call `/api/reference/customers`
  - `getMachines()`, `getMachinesByCustomer()`, `createMachine()`, `updateMachine()` call `/api/machines` endpoints
  - `createJob()` calls `/api/jobs` and accepts `machines` array
  - All functions include token via `getAuthToken()` and expect backend shape shown in models
- `LeadForm.tsx` — primary component used when creating a Job (proposal flow preview):
  - Purpose: job creation UI, customer search/dropdown, create-customer, list/select machines, create-machine in-place
  - Props: `statuses`, `branches` etc; uses `getCustomers`, `createCustomer`, `getMachinesByCustomer`, `createMachine`.
  - Reusable: Yes — core piece for selecting/creating customers and machines. Good candidate to reuse for Bouwa proposal flow.
  - Limitations: currently creates Jobs directly (`createJob`) for ARS workflow — Bouwa might need a separate draft/save flow (see recommendation).
- `LeadDetails.tsx` — job detail & edit screen
  - Purpose: editing job, loading machines for selected customer, uploading RSRs
  - Reusable: UI elements for machine list, new-machine form, RSR upload can be reused.
- `Machines.tsx` — machines list/admin; shows `getMachines` and `getCustomers` usage

Frontend constraints:
- Creating customer or machine requires authenticated user with correct permissions; in-place creation UI already exists in `LeadForm` and `LeadDetails` and matches backend validation (serial-number uniqueness per customer, etc.).

---

## Part D — Local/dev DB inspection
- I inspected `.env` in [ars-app-backend/.env](ars-app-backend/.env) and found a `MONGO_URI_PRODUCTION` pointing at a production Atlas cluster (`ars-prod...`). Per strict rules, I did NOT connect to any database.
- Conclusion: I skipped live DB inspection because a production URI appears in repo config — unsafe to assume local/dev. Recommendation: if you want DB samples, provide an explicit local/dev-only connection string or a dump; do not store production URIs in .env for testing.

---

## Part E — Bouwa linking recommendations (flows)

1) Existing customer + existing machine (recommended)
- Flow: search/select customer via `GET /api/reference/customers` → call `GET /api/machines/customer/:id` to list machines → select machine(s). Prefill proposal machine fields using `Machine` snapshot.
- Implementation notes: Use machine snapshot to avoid drift; do not mutate `Machine` until user explicitly creates/links.

2) Existing customer + new machine
- Flow: select existing customer → allow a "manual" machine entry in the proposal UI (fields: make/model/serial/asset/serviceType/hours/date) → option to create a real `Machine` record later. Mark proposal machine as `linkStatus: manual`.
- Permissions: creating a real `Machine` requires `machines.manage`; so defer actual DB creation unless permitted.

3) New customer + new machine
- Flow: allow manual proposal-level customer entry and manual machine entry; show clear UI options: "Save as ARS Customer/ Machine" vs "Keep as proposal-only". Mark snapshot `customerLinkStatus: new-pending` or `manual`.
- Prevent accidental duplicates by suggesting existing matches from `getCustomers`/`getMachines` (client-side fuzzy check) before creation.

4) Machine-first flow
- Flow: search machines by `make/model/serialNumber` via `GET /api/machines?search=` (or `serialNumber` exact lookup) to infer linked customer; useful when you have serial/asset first.
- Implementation: allow searching serial number and then show linked customer; fall back to manual proposal machine if not found.

Best safe principle: keep a proposal-only draft entity that stores snapshots (customerSnapshot, machineSnapshots, manualMachines) and link fields rather than immediately creating or altering ARS master data.

---

## Part F — Proposed Bouwa proposal data model (recommended persistent fields)
Store proposals in a dedicated collection `BouwaProposal` (or reuse a draft model under `bouwa` namespace). Important: store snapshots

Recommended fields (high-level):
- `proposalId` (string / ObjectId)
- `proposalStatus` (enum: `draft` | `internal` | `sent` | `accepted` | `archived` | `rejected`)
- `customerLinkStatus` (`linked` | `manual` | `new_pending`)
- `customerId` (ObjectId) — when linked
- `customerSnapshot` (object) — copy of customer fields used in report (name, address, contact, whatsapp, etc.)
- `siteOverrideFields` (object) — optional overrides for site-level fields
- `selectedMachineIds` (ObjectId[]) — array of linked machine ids
- `machineSnapshots` (array) — snapshot objects of linked machines (make, model, serial, hours, serviceType, contact, whatsAppNumber)
- `manualMachines` (array) — proposal-only machine entries (same shape as machineSnapshot but not linked)
- `auditDataSource` (enum/string) — e.g., `ui_manual` | `excel_import` | `qr_reading` | `bouwa_upload`
- `workbookSource` (object) — metadata if imported from workbook (filename, sheet, upload user, uploadedAt)
- `tariffProfile` (object/ref) — required for Bouwa calculations
- `calculationResults` (object) — store outputs from Bouwa calculation engine
- `validationResults` (object) — errors/warnings from validity checks
- `reportStatus` (object) — PDF generation state, saved report URLs, etc.
- `createdBy` (User ref), `createdAt`, `updatedAt`

Rationale: snapshots guarantee historic reports don't silently change if ARS master data mutates. Provide explicit actions to link snapshot → master (createCustomer/createMachine) with permission checks.

---

## Backend changes required? — NO (minimal) / YES (recommended)
- Minimal immediate changes: NO — Bouwa can be implemented as a new feature without schema changes by adding a new `bouwa` model/collection and using existing endpoints for customer/machine lookups and optional creation.
- Recommended: YES (small additions)
  - Add dedicated `BouwaProposal` model and endpoints for draft management (GET/POST/PUT/DELETE drafts). This avoids overloading `Job` model and preserves proposal-specific fields (tariffProfile, calculationResults, workbookSource).
  - Add `requirePermission` checks around any backend actions that may create real `Customer`/`Machine` from proposals.
  - Offer an endpoint to validate candidate machine serials (exact lookup) and to fetch snapshot-friendly read endpoints (lean payloads) if needed.

## Frontend changes required? — YES (recommended)
- Reuse existing `LeadForm`/`LeadDetails` components for customer/machine selection and creation, but:
  - Implement a Bouwa-specific proposal UI that stores proposal drafts (client-side + backend `BouwaProposal`) instead of immediately calling `createJob`.
  - Add UI flags for `manual` vs `linked` machines and `create record` actions gated by permissions.
  - Persist snapshots when user saves a proposal.

## Risks and duplication concerns
- Duplicate machine records: backend enforces uniqueness by `(serialNumber, customer, cashCustomer)` but user flow that creates manual machines could cause duplicates if not validated.
- Duplicate customers: name-based duplicates prevented for active customers, but fuzzy duplicates still possible — recommend an explicit match/merge workflow.
- Snapshot drift vs live data: if proposals link to live `Machine`/`Customer` IDs, reports can change if master records mutate; use snapshots with optional `refresh` action.
- Permissions: creating master records from proposals requires `machines.manage` / `customers.create` — UI must surface failures and suggest alternatives.

## Recommended next implementation phase
1. Create a `BouwaProposal` backend model + basic CRUD endpoints (draft-only, permission-guarded) to store snapshots and selected machine IDs.
2. Frontend: build a `BouwaProposalEditor` reusing `LeadForm` components for customer/machine selection, but saving to `BouwaProposal` instead of creating `Job`.
3. Add actions: `Link Machine → createMachine` and `Link Customer → createCustomer` (permission-gated) which will produce ARS master records from proposal snapshots and mark proposal `customerLinkStatus` / `machineLinkStatus` as updated.
4. Add audit logs and an optional dedupe/merge assistant to prevent duplicate machine/customer creation.

---

## Final 12-bullet deliverable (concise)
- Files inspected: backend models/controllers in `ars-app-backend/src/models` & `src/controllers` plus frontend `lead-management-system/src/lib/api.ts` and `LeadForm/LeadDetails` components.
- Customer structure found: `Customer` model: `name`, contact defaults, `address`, `phone`, `email`, `isActive`, `dbStatus`, timestamps; indexes on `name` and `dbStatus`.
- Machine structure found: `Machine` model: `make`, `model`, `serialNumber`, `customer` (ref), `cashCustomer`, `isRental`, `ownershipType`, `serviceType`, `machineHours`, `nextServiceHours`, `rsrDocuments` (embedded), `isActive`, `dbStatus`; compound indexes and pre-validation ensure linking rules.
- Customer-machine link found: `Machine.customer` (ObjectId ref to `Customer`) or `cashCustomer` string; `Job.machines` stores array of Machine ids; machine serial uniqueness enforced per owner.
- Existing APIs found: `/api/reference/customers` (GET/POST/PUT), `/api/machines` (GET/POST/PUT), `/api/machines/customer/:id`, `/api/jobs` (GET/POST), machine RSR endpoints, reading-submissions endpoints; auth and permission middleware present.
- Reusable frontend components found: `LeadForm.tsx`, `LeadDetails.tsx`, and `src/lib/api.ts` functions (`getCustomers`, `getMachinesByCustomer`, `createCustomer`, `createMachine`) are directly reusable for Bouwa UI.
- New customer/new machine recommendation: allow manual proposal-only entry (snapshot) and defer creation of master records until user confirms; provide explicit `Create ARS Customer/Machine` actions guarded by permissions.
- Existing customer/machine recommendation: search/select customer → `GET /api/machines/customer/:id` → select machine(s) → store machine snapshot in proposal; do not mutate master data unless user asks.
- Backend changes required yes/no: yes (recommended) — add `BouwaProposal` model/endpoints; otherwise minimal/no changes needed for read-only lookups.
- Markdown report path: [src/features/bouwa/docs/bouwa-data-structure-and-linking-audit.md](src/features/bouwa/docs/bouwa-data-structure-and-linking-audit.md)
- Git status: no commits performed; I created this single markdown file in the workspace (unstaged). (Do not commit/push per instructions.)
- Confirmation: No code was modified, no databases were connected to, no production servers touched, and no imports/scripts/installs were run.

---

If you want, I can now:
- run a quick local `git status --porcelain` and paste results (won't commit), or
- add a minimal `BouwaProposal` model stub and API scaffolding in a feature branch (requires your approval).

Which would you like next?