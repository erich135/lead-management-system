# Changelog

## [1.0.6] - 2025-12-03

### Added
- New Machines tab in Reports page with full machine listing
- Machine cards displaying model, serial number, customer, and document count
- Searchable customer dropdown filter for machines
- Machine RSR document upload with drag-and-drop support
- Expandable RSR section per machine with view/download buttons
- Preview modal for PDF and image RSR documents
- Backend API for machine RSR uploads using GridFS storage
- Full CRUD (add, edit, delete) for branches in Reference Data tab
- Branch fields: name, code, job number code, address, default flag
- LeadForm now uses a proper dropdown for customer selection
- Reports Machine tab has a searchable customer dropdown filter

### Fixed
- RSR upload not working (fixed API response parsing in getMachineRSRs)
- Reports customer filter causing page refresh (changed to client-side filtering with useMemo)

## [1.0.5] - 2025-12-02

### Added
- Contextual help system with tooltips and help icons throughout the application
- Rep Code and Branch filters added to User Performance Reports (Overdue Jobs, All Jobs, Conversion Time Tracker)
- Conversion Time Tracker enhancements: new "Sent → PO" stage, complete workflow toggle, 5-stage visual timeline
- Backend tracking for `dateSentToClient` field with automatic updates

### Fixed
- Dashboard TypeScript compilation errors (missing fields, sort function, unused imports)
- Conversion Tracker filter dropdowns now show all options regardless of current filter

## [1.0.4] - 2025-12-01

### Added
- Comprehensive automated test suite with Playwright E2E tests and Mocha/Chai API tests
- Test coverage for authentication, dashboard, jobs, reports, chat, and admin features
- Test runner scripts for quick, full, and overnight testing modes

## [1.0.3] - 2025-11-28

### Added
- Collapsible sections on Reports page (Overdue Jobs, Recent Activities, Jobs, Conversion Time Tracker)
- Admin users can now view and filter all jobs (not just their own) while defaulting to their own jobs on page load

### Fixed
- Follow-up reminder buttons and overdue warnings no longer show for jobs in final/completed statuses (Sent to Inv, Invoiced, Job Done, etc.)
- Admin filter dropdown now correctly displays selected admin code instead of showing "All Admins" when filtered
- Resolved merge conflicts in ChatWidget, Dashboard, LeadDetails, LeadForm, and LeadsList components while preserving all functionality and applying updated styling standards
- Job cards now display service description names correctly even when filtering overdue jobs (no more ObjectId strings)
- Admin filter no longer auto-selects the signed-in admin's code; it defaults to "All Admins" so admins can see the full list before filtering

### Changed
- Applied consistent styling standards across components (label styling, border radius, input/select padding, brand colors, filter dropdowns, responsive text sizing)

## [1.0.2] - 2025-11-27

### Added
- Machine Type field in edit job form
- Drag and drop file upload for RSR documents
- Reports permission system (super admins can grant reports.read permission to users)
- Admin code assignment for existing users (super admins can assign/change admin codes in user edit form)
- Changelog viewer in System Management (super admins can view version history and current version)
- Multiple status filter on job leads page (select multiple statuses with checkboxes and view selected statuses as removable pills)

### Fixed
- Technician booking controls (remove button and date pickers)
- Job creation with empty status field
- CORS configuration for cross-subdomain API access
- Removed RSR document requirement for "Sent to Inv" status
- Page navigation now preserves current page when editing and saving a job (no longer jumps back to page 1)

## [1.0.1] - 2025-11-26

### Added
- RSR document uploads for jobs
- Notes and file attachments for jobs
- Multiple technician bookings per job
- Notes section can be minimized
- Standardized yellow gradient buttons across all pages
- Branded email templates for invitations and password resets

### Fixed
- RSR document required before sending to invoice
- Job number generation for different branches
- Currency import formatting
- Diary display for old booking data
- Permission checkboxes functionality
- Consistent input field styling across all forms
- Standardized container widths and spacing