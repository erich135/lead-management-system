# Changelog

## [1.0.1] - 2025-11-26

### New Features
- RSR document uploads for jobs
- Notes and file attachments for jobs
- Multiple technician bookings per job
- Notes section can be minimized
- Standardized yellow gradient buttons across all pages
- Branded email templates for invitations and password resets


### Fixes
- RSR document required before sending to invoice
- Job number generation for different branches
- Currency import formatting
- Diary display for old booking data
- Permission checkboxes functionality
- Consistent input field styling across all forms
- Standardized container widths and spacing

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
- CORS configuration for cross-subdomain API access. Improve RSR Uploads
- Removed RSR document requirement for "Sent to Inv" status
- Page navigation now preserves current page when editing and saving a job (no longer jumps back to page 1)