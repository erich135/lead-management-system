# Changelog

All notable changes to the ARS Lead Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-12-01

### Added
- **Comprehensive Automated Test Suite**: Full E2E and API testing infrastructure
  - Playwright E2E tests for all major UI features (auth, dashboard, jobs, reports, chat, admin)
  - Mocha/Chai API tests for backend endpoints (auth, jobs, users, chat, reference data, machines)
  - Test configuration with HTML reports, screenshots, and video capture on failures
  - Overnight test runner scripts (PowerShell and Batch) for scheduled testing
  - Support for multiple test modes: quick, full, and overnight with retries

### Test Coverage
- **Authentication Tests**: Login, logout, forgot password, session persistence
- **Dashboard Tests**: Stats display, navigation, mobile responsiveness
- **Jobs List Tests**: Search, filtering, sorting, pagination, job details
- **Job Form Tests**: Creation, customer selection, validation, machine assignment
- **Reports Tests**: Report generation, date filtering, exports
- **Chat Tests**: Messaging, emoji picker, user selection, file attachments
- **Admin Settings Tests**: User management, reference data, permissions

### Technical
- Added `e2e/` directory with Playwright test structure
- Added backend test files in `src/tests/`
- New npm scripts: `test:quick`, `test:full`, `test:overnight`, `test:e2e`, `test:report`
- Added test dependencies: `@playwright/test`, `mocha`, `chai`

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

## [1.0.2] - 2025-11-26

### Added
- **Machine Type Dropdown in Edit Job Form**: Added Machine Type field to LeadDetails component
  - Matches the create job form functionality
  - Required field with predefined options (Generator, Genset, Compressor types, etc.)
  - Properly initializes when editing existing machines

### Fixed
- **Technician Booking Controls**: Fixed interactive elements in edit job form
  - Remove button now properly deletes technician bookings from the list
  - From/To date pickers now open calendar popup correctly
  - Added proper event handling to prevent modal interference
  - Improved spacing and layout for better usability

## Development Branches

### Branch: `chatbot` - 2025-12-01

#### Added
- **Rep Code to Branch & Admin Linking**: Implemented linking system for representative codes
  - Rep codes can now be linked to both admin codes and branches
  - Multiple rep codes can be linked to the same admin (one-to-many relationship)
  - Each rep code can link to one branch and one admin code
  - Added branch field to RepCode model with ObjectId reference
  - Updated SystemManagement UI with branch dropdown for rep code management
  - Branch displayed as blue badge alongside admin code (purple badge) in rep code list
  - Backend validation ensures linked admin codes and branches exist and are active

- **Auto-Population in Job Form**: Streamlined job creation workflow
  - When selecting a rep code, both branch and admin fields automatically populate
  - Swapped field positions: Rep Code now appears before Branch field for better UX
  - Auto-population logic handles nested branch objects and string admin codes
  - Reduces manual data entry and ensures consistency

#### Changed
- **Job Form Field Order**: Reordered fields for improved workflow
  - Rep Code field now positioned before Branch field
  - Encourages users to select rep first, triggering auto-population
  - Branch and Admin fields auto-fill based on rep selection

### Branch: `chatbot` - 2025-11-25

#### Added
- **Multi-Technician Booking System**: Implemented ability to book multiple technicians for the same job with date ranges
  - Each booking includes start date, end date, start time, end time, location, and notes
  - "Add Booking" button allows adding multiple technician assignments
  - Support for multi-day bookings with clear date range display
- **Migration Script**: Created `migrate-date-booked-to-tech-bookings.ts` to convert old single-date bookings to new structure
  - Successfully migrated 47 jobs from production database
  - Preserves original data while creating new TechBooking records
  - Handles edge cases and provides detailed migration reporting

#### Changed
- **Diary Component Overhaul**: Updated to use new technician bookings structure
  - Changed from single `dateBooked` field to `bookings` array
  - Calendar view now displays all bookings across their full date ranges
  - Table view shows each booking as a separate row with date range
  - CSV export includes booking date ranges (e.g., "Nov 25, 2025 to Nov 27, 2025")
  - PDF export properly formats multi-day bookings
  - Date filtering now checks if booking ranges overlap with filter range
- **System Management Permissions**: Fixed permission checkbox functionality
  - Added separate loading state for permission updates to prevent UI blocking
  - Removed intrusive success alerts that were blocking user interaction
  - Checkboxes now update immediately and save in background
  - All permissions are now properly toggleable

#### Fixed
- **Diary Display Issue**: Resolved issue where jobs with old `dateBooked` structure weren't appearing in diary
  - Updated filtering logic to work with booking date ranges
  - Fixed calendar view to properly iterate through multi-day bookings
  - Corrected sorting to use earliest booking date
- **Permission Checkboxes**: Fixed issue where certain permissions couldn't be unchecked
  - "Create new users", "View users list and details", and "Update user information" are now fully functional
  - Disabled state only applies during actual permission update operations

### Branch: `erichdelete` - 2025-11-20

#### Added
- **Required Field Validation**: Added custom popup for job creation form
  - Rep Code now required field with validation
  - Removed default branch selection to enforce intentional selection
  - Custom validation popup improves user feedback
- **User Performance Report**: Clickable job popup for detailed job information
- **Machine Edit Functionality**: Edit button and form handling for machine records
- **System Admin Management**: Technicians and Service Descriptions management interface
- **Calendar Enhancements**: 
  - Clickable calendar entries with job details modal popup
  - Calendar view added to Diary page
  - Date format standardized to "mmm dd, yyyy"
- **Admin Capabilities**:
  - Allow admins (not just super admins) to edit customer on jobs
  - Delete job button for Super Admin role
  - Admin job number control
  - Editable job descriptions
- **Dashboard Improvements**:
  - New pagination system with multi-select filters
  - Filters and sorting options
  - Redesigned dashboard layout

#### Changed
- **LeadDetails Editing**: Improved admin editing capabilities
  - Allow editing rep code in LeadDetails
  - Allow editing technician in LeadDetails
- **Activity Tracking**: Enhanced tracking for CRUD operations and status changes

#### Fixed
- Register date clearing issue
- Calendar debugging and date format consistency

---

## [2025-11-20] - Production Release

### Added
- Invoice number requirement for jobs with "Invoiced" status
- Display invoice number and machine type on job cards
- Machine type requirement on add/edit forms
- Technicians and Service Descriptions management to System Admin
- Clickable calendar entries with job details modal popup
- Calendar view to Diary page
- Admin job deletion functionality with delete button (Super Admin only)
- Activity tracking system for all CRUD operations
- Status management with custom workflows
- Editable job descriptions for admins

### Changed
- Improved LeadDetails admin editing capabilities
- Enhanced dashboard with filters and sorting options
- Updated pagination with multi-select filters
- Allowed admins (not just super admins) to edit customers on jobs
- Allow editing of rep code and technician in LeadDetails

### Fixed
- Diary date format to mmm dd, yyyy
- Register date clearing issue
- Job number control for admins
- TypeScript build errors related to status change tracking

## [2025-11-16] - Feature Release

### Added
- User Performance Report with clickable job popup
- Machine edit functionality with Edit button and form handling
- Rep Code to required field validation
- Required field validation with custom popup for job creation form
- AdminCode model, controller functions, and routes
- Activity tracking with status change monitoring

### Changed
- Removed default branch selection in job creation form
- Added validation in job creation form
- Relaxed TypeScript build checks for better compatibility
- Added job permissions to admin role

### Fixed
- Removed duplicate code in App.tsx
- Improved notification filtering for admin users
- Fixed delete button functionality

## [2025-11-15] - Chat Feature Release

### Added
- **ChatWidget**: Real-time messaging system with Socket.io
  - File attachment support
  - Real-time message delivery
  - User presence indicators
  - Message history
- Chat access restricted to admin, super_admin, and manager roles
- Backend middleware for chat user filtering
- Frontend role-based chat widget visibility

### Changed
- Hide ChatWidget for non-admin/manager roles
- Added `/api` prefix to chat API endpoints

## [2025-11-14] - Beta v2 Release

### Added
- Forgot password functionality
- Password reset flow with email verification
- Hide status feature for job statuses
- Import/Export functionality for jobs and customers
- CSV import with validation and error reporting
- Example CSV download for proper format

### Changed
- Updated dashboard layout and statistics
- Improved lead page with better filtering
- Enhanced user interface with activity indicators

### Fixed
- Fixed chat API endpoints
- Resolved importer issues with data validation

## [2025-11-13] - Beta Release

### Added
- Initial beta version with core functionality
- Job management system (CRUD operations)
- Customer management
- Status workflow system
- Branch-based filtering
- Role-based access control (Super Admin, Admin, Rep, Technician)
- User invitation system with email notifications
- Dashboard with job statistics and overdue tracking

### Changed
- Updated MongoDB integration
- Improved authentication flow
- Enhanced UI/UX with ARS branding

## [2025-11-12] - Initial Setup

### Added
- Project initialization with Vite + React + TypeScript
- Node.js + TypeScript backend setup
- MongoDB database integration
- Authentication system with JWT
- Role and permission management
- Basic CRUD operations for jobs
- Rep/Admin columns and filters
- Sample data for testing

### Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript, MongoDB/Mongoose
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io for chat
- **Email**: Nodemailer for notifications

---

## Migration Notes

### Technician Booking Migration (2025-11-25)
If upgrading from a version before 2025-11-25, you must run the migration script to convert old booking data:

```bash
cd ars-app-backend
npx ts-node src/scripts/migrate-date-booked-to-tech-bookings.ts
```

This will convert all jobs with the old `dateBooked` and `techBooked` fields to use the new `TechBooking` collection with support for multiple technicians and date ranges.

---

## Contributors
- Erich (erich135) - Lead Developer
- Abel (Abelcor) - Backend Developer
- Mike - Frontend Customizations

---

## Repository Links
- Frontend: https://github.com/erich135/lead-management-system
- Backend: https://github.com/Abelcor/ars-app-backend
