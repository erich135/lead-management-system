# Sales Lead System - Implementation TODO List

**Project**: Add Sales Lead Management to ARS Customer Management System  
**Created**: January 26, 2026  
**Estimated Timeline**: 3-4 days

---

## 📋 Overview

This system adds a complete Sales Lead workflow to the existing job management system. Leads are captured by sales reps, tracked through appointments, and converted to Jobs (RFCs) when customers request quotes.

**Key Features**:
- Unique lead numbering system (LEAD-2026-0001)
- Appointment tracking with reminders
- Lead assignment (manager → rep)
- Weekly planner for reps
- Canvassing plan management
- Seamless conversion to jobs with branch-specific job numbers
- Permission-based access control (reps see only Leads tab)

---

## Phase 1: Backend Foundation (Day 1)

### Database Models & Numbering

- [ ] **Task 1: Design Lead Numbering System**
  - Create auto-incrementing lead number format (e.g., LEAD-2026-0001)
  - Define schema and sequence logic in backend
  - Ensure uniqueness and branch-independence since leads convert to branch-specific job numbers later
  - **Files**: `ars-app-backend/src/models/salesLead.model.ts`

- [ ] **Task 2: Create Backend Lead Model**
  - Create `salesLead.model.ts` in `ars-app-backend/src/models`
  - Fields: leadNumber, clientInfo (company, contact, email, phone), branch, assignedRep, leadSource, serviceDescription, estimatedValue, notes, status, appointments[], convertedJobId, convertedJobNumber, timestamps
  - Include auto-increment lead number generation
  - **Files**: `ars-app-backend/src/models/salesLead.model.ts`

- [ ] **Task 3: Create Backend Appointment Model**
  - Create `appointment.model.ts`
  - Fields: leadId, appointmentDate, appointmentTime, location, attended (boolean), noShowReason, feedback, nextFollowUpDate, reminderSent, createdBy, timestamps
  - Link to salesLead model
  - **Files**: `ars-app-backend/src/models/appointment.model.ts`

- [ ] **Task 4: Create Backend Canvassing Plan Model**
  - Create `canvassingPlan.model.ts`
  - Fields: repCode, area, travelDays, travelTime, accommodationRequired, preferredAccommodation, possibleLeads, appointmentsMade, status, approvedBy, timestamps
  - For tracking rep canvassing activities
  - **Files**: `ars-app-backend/src/models/canvassingPlan.model.ts`

### API Routes & Controllers

- [ ] **Task 5: Create Lead API Routes & Controllers**
  - Create `routes/salesLeads.routes.ts` and `controllers/salesLeads.controller.ts`
  - Implement endpoints:
    - `GET /api/sales-leads` (list/filter)
    - `POST /api/sales-leads` (create)
    - `GET /api/sales-leads/:id` (details)
    - `PUT /api/sales-leads/:id` (update)
    - `DELETE /api/sales-leads/:id`
    - `PUT /api/sales-leads/:id/assign` (manager assigns to rep)
  - **Files**: `ars-app-backend/src/routes/salesLeads.routes.ts`, `ars-app-backend/src/controllers/salesLeads.controller.ts`

- [ ] **Task 6: Create Appointment API Routes**
  - Create appointment endpoints:
    - `POST /api/sales-leads/:id/appointments` (schedule)
    - `PUT /api/sales-leads/:id/appointments/:appointmentId` (update/mark attended)
    - `GET /api/sales-leads/:id/appointments` (list)
  - Include reminder logic
  - **Files**: `ars-app-backend/src/controllers/salesLeads.controller.ts`

- [ ] **Task 7: Create Lead Conversion API Endpoint**
  - Create `POST /api/sales-leads/:id/convert` endpoint
  - Accepts job form data, creates customer if needed
  - Creates job with branch-specific job number
  - Links job to lead, updates lead status to 'converted'
  - Stores convertedJobId and convertedJobNumber in lead record
  - **Files**: `ars-app-backend/src/controllers/salesLeads.controller.ts`

- [ ] **Task 8: Create Canvassing Plan API Routes**
  - Create routes for canvassing plans:
    - `GET /api/canvassing-plans`
    - `POST /api/canvassing-plans`
    - `PUT /api/canvassing-plans/:id/approve` (manager approval)
    - `GET /api/canvassing-plans/rep/:repCode` (rep's plans)
  - **Files**: `ars-app-backend/src/routes/canvassingPlans.routes.ts`, `ars-app-backend/src/controllers/canvassingPlans.controller.ts`

### Permissions

- [ ] **Task 9: Setup Lead Permissions in Backend**
  - Add new permissions to `permission.model.ts`:
    - `sales_leads.create`
    - `sales_leads.read`
    - `sales_leads.update`
    - `sales_leads.delete`
    - `sales_leads.assign`
    - `sales_leads.convert`
  - Create migration script to add permissions to database
  - **Files**: `ars-app-backend/src/models/permission.model.ts`, `ars-app-backend/src/scripts/`

---

## Phase 2: Frontend Core (Day 2)

### Type Definitions & API Services

- [ ] **Task 10: Create Frontend Lead Types**
  - Add to `src/types/index.ts`:
    - SalesLead interface
    - Appointment interface
    - CanvassingPlan interface
    - LeadStatus type
    - LeadSource type
  - Match backend model structure for type safety
  - **Files**: `src/types/index.ts`

- [ ] **Task 11: Create Lead API Service Functions**
  - Add to `src/lib/api.ts`:
    - `getSalesLeads()`
    - `createSalesLead()`
    - `getSalesLeadById()`
    - `updateSalesLead()`
    - `deleteSalesLead()`
    - `assignLead()`
    - `createAppointment()`
    - `updateAppointment()`
    - `convertLeadToJob()`
  - Include proper TypeScript types and error handling
  - **Files**: `src/lib/api.ts`

### Navigation Integration

- [ ] **Task 12: Add Leads Navigation to Dashboard**
  - Update `src/components/Dashboard.tsx`:
    - Add 'salesLeads' to View type
    - Add Leads navigation tab (between Dashboard and Jobs)
    - Add route mapping
    - Add navigation pill with icon
    - Implement permission check for visibility
  - **Files**: `src/components/Dashboard.tsx`

- [ ] **Task 13: Add Leads Route to App.tsx**
  - Update `src/App.tsx`:
    - Add `/leads` route with ProtectedRoute wrapper
    - Render Dashboard with `view='salesLeads'`
  - Ensure routing consistency with existing patterns
  - **Files**: `src/App.tsx`

- [ ] **Task 14: Add Leads to Mobile Navigation**
  - Update `src/components/MobileNavigation.tsx`:
    - Add Leads navigation item with icon
    - Implement permission-based visibility
    - Ensure proper active state styling
  - **Files**: `src/components/MobileNavigation.tsx`

### Core Components

- [ ] **Task 15: Create SalesLeadForm Component**
  - Create `src/components/SalesLeadForm.tsx`
  - Build form with fields:
    - Branch*, Company Name*, Contact Person*, Contact Phone*, Contact Email
    - Rep Code*, Lead Source*, Service Description, Estimated Value, Notes
  - Auto-generate lead number
  - Style matching existing LeadForm
  - Include validation and error handling
  - **Files**: `src/components/SalesLeadForm.tsx`

- [ ] **Task 16: Create SalesLeadsList Component**
  - Create `src/components/SalesLeadsList.tsx`
  - Implement Kanban board view with columns for lead statuses:
    - New, Assigned, Appointment Set, Appointment Attended, RFC Requested, Converted, Lost
  - Include filters (branch, rep, source, date range), search, and Create Lead button
  - Show lead cards with key info
  - **Files**: `src/components/SalesLeadsList.tsx`

- [ ] **Task 17: Create SalesLeadDetails Component**
  - Create `src/components/SalesLeadDetails.tsx`
  - Display full lead information, appointment history, notes timeline, activity log
  - Include Edit Lead, Schedule Appointment, Update Status, and Convert to Job buttons (permission-based)
  - Show converted job link if applicable
  - **Files**: `src/components/SalesLeadDetails.tsx`

- [ ] **Task 18: Create AppointmentScheduler Component**
  - Create `src/components/AppointmentScheduler.tsx`
  - Modal/dialog for scheduling appointments
  - Date picker, time selector, location field, notes
  - After creation, show reminder options and next follow-up date selector
  - **Files**: `src/components/AppointmentScheduler.tsx`

- [ ] **Task 19: Create AppointmentTracker Component**
  - Create `src/components/AppointmentTracker.tsx`
  - Display appointment list for a lead
  - Allow marking as attended/no-show, adding feedback, scheduling follow-up
  - Include reminder status indicators
  - **Files**: `src/components/AppointmentTracker.tsx`

- [ ] **Task 20: Create Lead Conversion Dialog**
  - Create `src/components/LeadConversionDialog.tsx`
  - Button appears when lead status = 'RFC Requested'
  - Opens existing LeadForm pre-filled with lead data (customer, contact, phone, email, branch, rep, notes, service description, value)
  - On job creation, calls API to update lead with convertedJobId and status='converted'
  - **Files**: `src/components/LeadConversionDialog.tsx`

### Rep Tools

- [ ] **Task 21: Create WeeklyPlanner Component**
  - Create `src/components/WeeklyPlanner.tsx`
  - Calendar view showing rep's appointments for the week
  - Display appointments from leads and existing customer visits
  - Allow filtering by rep (managers see all, reps see own)
  - Include daily summary counts
  - **Files**: `src/components/WeeklyPlanner.tsx`

- [ ] **Task 22: Create CanvassingPlanForm Component**
  - Create `src/components/CanvassingPlanForm.tsx`
  - Form for reps to create canvassing plans:
    - Area, Duration (days), Travel time, Accommodation needed, Possible leads, Appointments made
  - Include approval status indicator
  - Managers see Approve/Reject buttons
  - **Files**: `src/components/CanvassingPlanForm.tsx`

- [ ] **Task 23: Create CanvassingPlansList Component**
  - Create `src/components/CanvassingPlansList.tsx`
  - List/grid view of canvassing plans
  - Filters: Status (pending/approved/rejected), Rep, Date range
  - Show approval workflow status
  - Managers can approve/reject
  - **Files**: `src/components/CanvassingPlansList.tsx`

### Integration

- [ ] **Task 24: Integrate Sales Leads View in Dashboard**
  - Update Dashboard.tsx to render SalesLeadsList when `view='salesLeads'`
  - Include stats widget showing:
    - Total leads, Leads by status, Conversion rate, Average days to conversion
  - Add Create Lead button (permission-based)
  - **Files**: `src/components/Dashboard.tsx`

---

## Phase 3: Advanced Features (Day 3)

### Workflow Features

- [ ] **Task 25: Implement Lead Assignment Workflow**
  - Add manager-only feature to assign website leads to reps
  - Bulk select leads with source='website', assign to rep, send notification
  - Update SalesLeadsList to show assignment controls for managers
  - **Files**: `src/components/SalesLeadsList.tsx`, `src/components/LeadAssignment.tsx`

- [ ] **Task 26: Add Lead Reminder System**
  - Implement reminder logic:
    - 1-week reminder if no appointment set
    - Day-before appointment reminder
    - Monthly follow-up after attended appointment
  - Create reminder notification component
  - Store reminder status in appointment records
  - **Files**: `ars-app-backend/src/controllers/salesLeads.controller.ts`, `src/components/LeadReminders.tsx`

- [ ] **Task 27: Create Lead Status Change Validation**
  - Implement status transition rules:
    - Can only move to 'Appointment Set' if appointment scheduled
    - Can only convert if appointment attended
    - Require reason if marking as 'Lost'
  - Add validation in backend and frontend
  - **Files**: `ars-app-backend/src/controllers/salesLeads.controller.ts`, `src/components/SalesLeadDetails.tsx`

### Analytics & Reporting

- [ ] **Task 28: Add Lead Analytics to Reports**
  - Extend Reports component with Lead metrics:
    - Leads by source
    - Conversion rate by rep
    - Average time to conversion
    - Lost leads analysis
    - Appointment show rate
  - Include date range filters and export functionality
  - **Files**: `src/components/Reports.tsx`

- [ ] **Task 29: Create Lead Activity Logging**
  - Log all lead activities:
    - Creation, status changes, appointments, assignments, notes added, conversion
  - Display in lead timeline
  - Use existing activity logging system if available, or create lead-specific activity model
  - **Files**: `ars-app-backend/src/models/activity.model.ts`, `src/components/SalesLeadDetails.tsx`

### Permissions & Access Control

- [ ] **Task 30: Setup Role Permissions for Sales Reps**
  - Create or update 'Sales Rep' role with permissions:
    - `sales_leads.*`
    - `jobs.read` (only their converted jobs)
  - Configure UI to show only Leads tab for reps
  - Test permission isolation
  - **Files**: `ars-app-backend/src/scripts/`, `src/components/Dashboard.tsx`

- [ ] **Task 31: Setup Role Permissions for Sales Managers**
  - Update 'Sales Manager' role with permissions:
    - `sales_leads.*` (all)
    - `sales_leads.assign`
    - `sales_leads.convert`
    - `jobs.*` (all jobs)
    - `reports.read`
  - Ensure full visibility of leads and converted jobs
  - **Files**: `ars-app-backend/src/scripts/`

### Dashboard & UI Enhancements

- [ ] **Task 32: Add Lead Quick Stats to Dashboard**
  - Add lead metrics widget to main Dashboard view:
    - Open leads count
    - Appointments this week
    - Pending conversions
    - Conversion rate %
  - Show for managers, hide for users without lead permissions
  - **Files**: `src/components/Dashboard.tsx`

- [ ] **Task 33: Implement Lead Search & Filtering**
  - Add comprehensive search/filter in SalesLeadsList:
    - Text search (company, contact)
    - Filter by status, branch, rep, source, date range
  - Include saved filter presets
  - Implement on backend and frontend
  - **Files**: `ars-app-backend/src/controllers/salesLeads.controller.ts`, `src/components/SalesLeadsList.tsx`

- [ ] **Task 34: Create Lead Export Functionality**
  - Add export button to SalesLeadsList
  - Export filtered leads to Excel/CSV with columns:
    - Lead Number, Company, Contact, Phone, Email, Branch, Rep, Source, Status, Created Date, Converted Job Number
  - Use existing XLSX library
  - **Files**: `src/components/SalesLeadsList.tsx`

### Notifications & Mobile

- [ ] **Task 35: Add Lead Notifications**
  - Integrate with existing notification system:
    - Notify rep when lead assigned
    - Notify manager when RFC requested
    - Notify admin when lead converted to job
  - Include in-app and bell icon notifications
  - **Files**: `src/components/NotificationSystem.tsx`

- [ ] **Task 36: Create Lead Mobile Responsive Views**
  - Ensure all lead components are mobile-responsive:
    - SalesLeadsList (stack cards on mobile)
    - SalesLeadForm (single column)
    - AppointmentScheduler (touch-friendly)
    - WeeklyPlanner (swipe navigation)
  - Test on mobile viewport
  - **Files**: All lead component files

### Help & Documentation

- [ ] **Task 37: Add Lead Help Content**
  - Add to `src/config/helpContent.ts`:
    - Help tooltips for lead fields (lead source, status meanings, conversion process)
    - Help icons in SalesLeadForm
    - Help documentation for appointment workflow
  - **Files**: `src/config/helpContent.ts`

---

## Phase 4: Testing & Documentation (Day 4)

### Testing

- [ ] **Task 38: Test Lead Creation Workflow**
  - End-to-end test:
    - Create lead → Assign to rep → Schedule appointment → Mark attended → Request RFC → Convert to job
  - Verify lead number generation, data flow
  - Job creation with correct branch-based job number
  - **Testing Checklist**: Document test results

- [ ] **Task 39: Test Lead Permissions & Access Control**
  - Test as different roles:
    - Sales Rep (only see Leads tab, own leads)
    - Sales Manager (see all leads, can assign)
    - Admin (appropriate access)
  - Verify permission boundaries and data isolation
  - **Testing Checklist**: Document test results

### Documentation

- [ ] **Task 40: Create Lead System Documentation**
  - Document in README or separate LEAD_SYSTEM.md:
    - Lead workflow diagram
    - Status definitions
    - Conversion process
    - Permission setup
    - API endpoints
    - Database schema
  - Include user guide for sales team
  - **Files**: `LEAD_SYSTEM.md`

---

## 📊 Progress Tracking

**Completed**: 0/40 tasks  
**In Progress**: 0/40 tasks  
**Not Started**: 40/40 tasks  

**Phase 1**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0/9)  
**Phase 2**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0/15)  
**Phase 3**: ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0/13)  
**Phase 4**: ⬜⬜⬜ (0/3)  

---

## 🔑 Key Decisions Made

1. **Lead Numbering**: LEAD-2026-0001 format (sequential, year-based)
2. **Conversion Method**: Pre-filled job form (Option A - recommended)
3. **Navigation**: Separate "Leads" tab between Dashboard and Jobs
4. **Permissions**: Sales reps locked to Leads tab only
5. **Lead Statuses**: New → Assigned → Appointment Set → Appointment Attended → RFC Requested → Converted/Lost
6. **Data Reuse**: Lead form includes key job fields (Branch, Rep Code, Service Description, Value) for smooth conversion

---

## 📝 Notes & Ideas

- Lead reminder system can be expanded with email/SMS notifications
- Consider adding lead scoring based on estimated value and engagement
- Future: Integration with external CRM systems
- Future: Lead import from website contact forms
- Future: Automated lead distribution based on territory/branch

---

## 🚀 Getting Started Tomorrow

**Start with Phase 1, Task 1**: Design the lead numbering system in the backend model.

Good luck with implementation! 🎯
