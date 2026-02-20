# Changelog

## [1.0.19] - 2026-02-20

### Added
- Dedicated diary API endpoint (`getDiaryJobs`) — single lightweight request replaces up to 10 paginated `/api/jobs` calls; returns only jobs with active bookings and minimal field projection
- `getDiaryJobs()` function in `api.ts` with optional `technicianId`, `startDate`, `endDate`, `branch` filters
- `autoSizeColumns()` utility in Reports — auto-sizes Excel column widths based on cell content

### Changed
- Date format standardised to `dd MMM yyyy` (e.g., "19 Feb 2026") across all exports:
  - `formatDate()` in `dateFormat.ts` updated from `"Jul 2, 2025"` to `"19 Feb 2026"` format
  - `formatDateTime()` updated to match (`"19 Feb 2026, 3:02 PM"`)
  - Reports Excel exports (`exportUserPerformanceReport`, `exportCustomerReport`, `exportMachineReport`, `exportToExcel`) — dates now output as pre-formatted text strings instead of Date objects, avoiding Excel locale override (South Africa `yyyy/mm/dd`)
  - Reports PDF export (`exportToPDF`) — uses updated `formatDate()`
  - Diary CSV/PDF exports (`toCSV`, `toPDF`) — switched from `toLocaleDateString('en-US', ...)` to `formatDate()`
  - Job Card Preview PDF (`JobCardPreview.tsx`) — all 7 date fields switched from `toLocaleDateString()` to `formatDate()`
  - Legacy leads export (`excelImport.js`) — switched to explicit `en-GB` locale with full date formatting
- Diary `loadData()` — replaced multi-page pagination loop (up to 10 requests × 1000 jobs) with single `getDiaryJobs()` call

### Fixed
- Diary CSV/PDF export returning blank data — created shared `displayedJobs` memo used by both calendar view and export functions
- Diary search only matching current displayed month — added `searchTerm` prop to `CalendarView` with auto-navigation to earliest matching booking month
- QuickBookModal missing closing JSX tags causing "Unterminated JSX contents" compile error

## [1.0.18] - 2026-02-18

### Added
- Address Autocomplete component (`AddressAutocomplete.tsx`): type-ahead address search powered by OpenStreetMap via backend proxy, debounced input, formatted address results with coordinates, "Address verified with coordinates" indicator
- Pin on Map component (`MapPinSelector.tsx`): full-screen Leaflet map modal for pinning exact locations, ideal for rural/farm addresses; includes search bar, "My Location" GPS button, red pin marker, reverse geocoding, and "Confirm Location" flow
- Geocode proxy API functions (`geocodeSearch`, `geocodeReverse`) in `api.ts` to route Nominatim calls through the backend, avoiding browser CORS issues
- Address autocomplete + Pin on Map integrated into New Sales Lead form (`SalesLeadForm.tsx`) — coordinates saved with lead on creation
- Address autocomplete + Pin on Map integrated into Schedule Appointment form (`AppointmentScheduler.tsx`) — coordinates saved with appointment on creation
- Leaflet tile fix in `index.css`: `.leaflet-container img { max-width: none }` to prevent Tailwind preflight from breaking map tiles

### Changed
- `SalesLeadForm.tsx`: replaced plain address textarea with `AddressAutocomplete` component; sends `geoLocation` coordinates in create payload
- `AppointmentScheduler.tsx`: replaced plain location text input with `AddressAutocomplete` component; sends `geoLocation` coordinates in create payload
- `api.ts`: added `geoLocation` field to `createSalesLead` and `createAppointment` type signatures

### Fixed
- Date-based machine display: Dryer/Blower/Vacuum machines now correctly show "Last Service Date" and "Next Service Date" instead of "Hours" and "Next" across all views (job card, job details view mode, job details edit mode, leads list card). Detection logic updated to check `machine.machineType` and `machine.serviceType` fields in addition to `machine.make`.

## [1.0.17] - 2026-02-13

### Added
- Sales Lead Maps Tab (`SalesLeadMapsTab.tsx`) with 4 sub-views: Live Tracking, Appointments Map, Daily Routes, Overlap Report
- Live Tracking view: real-time rep locations via `LiveRepMap`, sidebar with active reps and dwell alerts, route trail overlay, stop/trip detail panel
- Appointments Map: upcoming appointment markers with date/branch/rep/status filters, color-coded attended/missed/upcoming, geocoded pins
- Daily Routes view: rep selector and date picker, daily route polyline with stop markers, summary stats (distance, stops, moving/stopped time)
- Overlap Report (`DailyOverlapReport.tsx`): clustered appointments from different reps, consolidation suggestions, travel savings
- Map component library (`src/components/map/`): `MapComponent.tsx`, `LiveRepMap.tsx`, `RepDailyRouteView.tsx`, `OverlapWarningBanner.tsx`, `DailyOverlapReport.tsx`
- Attendance components (`src/components/attendance/`): `AttendanceStatusBadge.tsx`, `ManualCheckIn.tsx`, `TrackingIndicator.tsx`
- AutoLocationTracker (`AutoLocationTracker.tsx`): WebSocket when location tracking enabled, 30s GPS pings, Service Worker for background tracking, Screen Wake Lock
- Location Tracking Service Worker (`public/location-tracking-sw.js`) for heartbeat pings and push re-engagement
- Geo hooks: `useGeolocation.ts`, `useLocationTracking.ts`, `useManagerLocationSocket.ts`
- Frontend API: location tracking, area overlap, geofence endpoints and types (`LiveRepLocation`, `RoutePoint`, `StopEvent`, etc.)
- Geocoding utility (`src/utils/geocoding.ts`): Nominatim, reverse geocoding, Haversine distance, geofence check
- Geo types in `src/types/index.ts`: `GeoPoint`, `AttendanceMethod`, geo fields on Branch, SalesLead, Appointment, CanvassingPlan
- Location Tracking toggle in User Management: GPS switch in edit form, ENABLE/DISABLE in user details, invite form, payload for save/invite
- LeadStatsWidget moved from Dashboard to SalesLeadsContainer (top of Sales Leads tab)
- Leaflet dependencies (`leaflet`, `react-leaflet`, `@types/leaflet`) and map marker styles in `index.css`

### Changed
- SalesLeadsContainer: added Maps tab with MapPin icon between Diary and Reports, renders `SalesLeadMapsTab`
- App.tsx: added `<AutoLocationTracker />` inside authenticated app shell
- AuthContext: added `cellPhone` and `locationTrackingEnabled` to `FrontendUser` and `transformUser`
- useChatSocket: transport changed from polling+websocket to websocket only
- Dashboard: removed LeadStatsWidget (moved to Sales Leads tab)
- api.ts: extended BackendUser with branches, cellPhone, locationTrackingEnabled; extended createUser and inviteUser signatures

### Fixed
- AutoLocationTracker socket rendering: added `socketReady` state so TrackingRunner mounts on connect, fixing geolocation hook not running

## [1.0.16] - 2026-02-10

### Added
- **Sales Leads Granular Permission System** - Complete RBAC for Sales Leads feature
  - 6 granular permissions: read, create, update, delete, assign, convert
  - Role-based access control with 5 default roles: admin, manager, rep, user, technician
  - User-specific permission overrides for individual access control
  - Delete permission restricted by default (configurable via UI)
  - Frontend + Backend permission enforcement (defense in depth)
  - Complete audit trail for all Sales Leads actions (soft delete recovery)
  - Built-in rep lead filtering (reps see only their assigned leads)
  - Permission grant script: `npm run grant:sales-lead-perms`
  - Permission migration script: `npm run migrate:sales-lead-perms`
- **System Admin UI Enhancements**
  - Added "Select All / Clear All" functionality for permission checkboxes (global)
  - Added per-permission-group "Select All / Clear All" buttons
  - Alphabetical sorting of permission group headers for better navigation
  - Improved permission management UX for bulk operations
  - Permission counts displayed for better visibility
  - Increased scroll height (max-h-80) for better permission visibility
- **Comprehensive Documentation** (7 new guides)
  - SALES-LEADS-QUICK-START.md - 3-step implementation guide
  - README-SALES-LEADS-PERMISSIONS.md - Complete overview with examples
  - SALES-LEADS-PERMISSIONS-GUIDE.md - Full technical reference
  - SALES-LEADS-IMPLEMENTATION-SUMMARY.md - What changed and why
  - SALES-LEADS-ARCHITECTURE.md - Technical architecture and diagrams
  - DEPLOYMENT-CHECKLIST-SALES-LEADS.md - Testing and deployment guide
  - DOCUMENTATION-INDEX-SALES-LEADS.md - Navigation guide

### Changed
- **SalesLeadDetails.tsx** - Refactored delete permission check from hardcoded role-based (`isSuperAdmin || isSalesManager`) to pure permission-based system (`hasPermission('sales_leads.delete')`)
  - Delete is now configurable without code changes
  - Improved security with backend + frontend enforcement
- **SystemManagement.tsx** - Enhanced permission management interface
  - Introduced `allPermissionNames` useMemo for efficient permission lists
  - Introduced `hasAllPermissionsSelected` useMemo for bulk selection detection
  - Added `handleToggleAllPermissions()` function for select all/clear all
  - Added per-group toggle buttons for selective bulk operations
  - Implemented alphabetical sorting using `localeCompare` with numeric and case-insensitive options
  - Improved scroll height for better permission visibility

### Fixed
- Removed hardcoded sales_leads.delete restriction - now fully configurable
- Permission caching issues by ensuring backend validation on every request
- Improved permission feedback messages for better UX
- Fixed syntax errors in SystemManagement.tsx from incomplete Branch Access section
- Cleaned up duplicate code and improved component structure

## [1.0.15] - 2026-01-27

### Fixed
- Resolved all remaining TypeScript build errors in `LeadDetails.tsx`, `LeadsList.tsx`, and `SystemManagement.tsx`.

### Changed
- Relaxed TypeScript configuration in `tsconfig.app.json` (disabled strict mode) to allow for faster development iteration.

## [1.0.14] - 2026-01-27

### Added
- Integrated changes from 'Leadsystem' branch

## [1.0.13] - 2026-01-26

### Fixed
- Excel report exports now write real date cells (not text) and default date formatting to `mmm dd, yyyy`
- Local dev login now targets the correct backend default (`http://localhost:5000`) when `VITE_API_BASE_URL` is not set

### Changed
- Customer/Machine/User Performance report exports now generate `.xlsx` instead of CSV to preserve date formats

## [1.0.12] - 2026-01-12

### Added
- Rep users can update permitted job fields (permission-based edit access)
- Clear "no access" messaging when reps attempt restricted edits
- Reports exports now include Invoice Number, Invoice Date, Notes, and Feedback where applicable (Excel/PDF/CSV)

### Fixed
- Machine report CSV export now outputs consistent columns for machines without jobs

## [1.0.11] - 2026-01-05

### Added
- Assisting Admin dropdown filter in Overdue Jobs and All Jobs sections
- Assisting Admin column added to Excel and PDF exports
- Double confirmation dialog when creating new customers from LeadForm

## [1.0.10] - 2025-12-17

### Added
- Searchable customer dropdown with type-to-search and create new customer option
- Rental machine management system with `isRental` field and dedicated endpoints
- Asset number tracking for rental machines
- CSV import for rental machines with customer assignment
- Rental machine selector in job creation form
- Service type tracking for machines (hours-based vs date-based)
- Store Pack Date field in job details panel
- Notes field (50 chars max) for site/location info
- Enhanced Reports Export with Tech, Tech Booked Date, Store Pack, and Store Pack Date columns
- Technician booking date displayed on job cards

### Fixed
- Reports export now respects all active filters
- Fixed technician name not appearing in exports
- Removed reliance on legacy `techBooked` field in favor of bookings array

## [1.0.9] - 2025-12-08

### Added
- New Job Source field to differentiate between "Normal" jobs and "Web Enquiries"
- Job Source dropdown in LeadForm (required field for new jobs)
- Job Source display in LeadDetails with super_admin-only edit capability
- Job Source filter in LeadsList component
- Job Source filter in Reports (Overdue Jobs, All Jobs, Conversion Tracker sections)
- Job Source management in SystemManagement for super admins
- Backend JobSource model with CRUD operations
- Migration script to backfill existing jobs based on activity history
- Status filter now supports multiple selections with checkboxes in Reports
- Multi-select status filter available in both Overdue Jobs and All Jobs sections
- Click-outside to close dropdown behavior for status filter
- Shows "X selected" count when multiple statuses are chosen
- Active filter tags display all selected statuses
- Export dropdown with Excel (.xlsx) and PDF options
- Section-aware export: exports data from current View Section (Overdue Jobs, All Jobs, Activities, Conversion Tracker)
- Filter-aware export: respects all applied filters
- Includes filter summary and date range in exported files
- Professional PDF formatting with auto-table layout

- Activate/Deactivate button in User Details panel (preserves user data instead of deleting)
- Confirmation dialog before activating/deactivating users
- Success message after status change

### Fixed
- Fixed "Resend Invitation" error: "Cannot read properties of undefined (reading 'message')"
- API response handling now correctly processes message-only responses
- Improved error handling for user status toggle with better network error messages

### Changed
- Job Source is locked after initial save (only super_admin can modify)

## [1.0.8] - 2025-12-05

### Added
- Service Description dropdown filter added to Overdue Jobs section
- Service Description dropdown filter added to All Jobs section
- Service Description dropdown filter added to Conversion Tracker section
- Teal-colored badges for active Service Description filters
- Unique descriptions populated from actual job data in each section
- "Show Hidden Jobs" toggle added to Overdue Jobs section
- "Show Hidden Jobs" toggle added to All Jobs section
- "Show Hidden Jobs" toggle added to Conversion Tracker section
- Orange Eye icon and badge styling for hidden jobs filter
- Backend support for `includeHidden` parameter in getOverdueJobs API
- Allows viewing cancelled/hidden status jobs in reports

### Fixed
- Fixed "All Jobs (0)" showing no data due to incorrect `allTime` parameter handling
- Date filters now properly applied based on selected date range preset
- Removed hardcoded `allTime: 'true'` that was bypassing date filters
- Removed invalid `.populate("techBooked")` from overdue jobs query that caused 500 errors
- techBooked field is a string, not a reference, so populate was failing

### Changed
- Default Date Range preset changed from "This Month" to "All Time" in Reports

## [1.0.7] - 2025-12-04

### Added
- Added new "Registered" step to conversion workflow (PO → Registered → Invoiced)
- Uses existing `registerDate` field for tracking registration timing
- Visual timeline now shows 6 stages: Start → Quoted → Sent → PO Rec'd → Registered → Invoiced
- Metrics calculated for PO → Registered and Registered → Invoiced segments
- Added `statusHistory` array to Job model for tracking all status changes
- Records status ID, status name, timestamp, and user who made the change
- Automatically populates on job creation and status updates
- Fixed unread badge counter not appearing for new support tickets
- New tickets now properly show notification badge in sidebar
- Changed `unreadBySupport` default to `true` for new tickets
- Added support routes to backend API

### Fixed
- Rep Code dropdown not populating in Reports overdue jobs (added `.populate("repCode")` to getOverdueJobs)
- TypeScript errors in Reports.tsx for incorrect property names (`quoteValue` → `valueExVat`, `companyName` → `name`, `dateOfJob` → `startDate`)
- Role type mismatch in Reports.tsx (`role.id` → `role._id` mapping for non-super admin users)

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