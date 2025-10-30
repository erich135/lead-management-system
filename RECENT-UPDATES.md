### 8. PO Received/Go-Ahead status placement
- New script `database-status-po-received.sql` places the status between "Await PO" and "Register" and ensures it requires a PO number and attachment.

### 9. Technician diary and bookings
- New table `tech_bookings` via `database-tech-bookings.sql` for scheduling technicians on jobs
- LeadDetails: When selecting "PO Received/Go-Ahead", you can immediately book a technician (tech, date, start/end, location). A booking record is created.
- New `Diary` view:
  - Lists all bookings with filters by technician and date range
  - Export to CSV and quick PDF (print-based)
  - Accessible from the top navigation (Diary tab)
# Recent Updates - Auto-Numbering & Dual Assignments

## Overview
Implemented major architectural enhancements to the lead management system:
1. **Auto-generated lead numbers** (format: LEAD-YYYYMMDD-XXXX)
2. **Auto-generated job numbers** when lead is quoted (format: AreaCodeYYYYXXX)
3. **Dual assignment system** - Split "Assigned To" into "Assigned Rep" and "Assigned Admin"

## Database Changes

### New SQL Migration File: `database-updates-assignments.sql`
This file contains all the database schema updates needed. **Run this on your Supabase instance when ready for production.**

Key changes:
- Added `job_number` column to `leads` table
- Split `assigned_to` into `assigned_rep` and `assigned_admin`
- Added `area_code` column to `branches` table
- Created `generate_lead_number()` trigger function - auto-generates LEAD-YYYYMMDD-XXXX on insert
- Created `generate_job_number()` trigger function - auto-generates AreaCodeYYYYXXX when status changes to "Quoted"
- Updated RLS policies for new assignment fields
- Set area codes for 7 branches:
  - J = Johannesburg
  - L = Lydenburg
  - D = Durban
  - P = Port Elizabeth
  - M = Middelburg
  - U = Rustenburg
  - C = Cape Town

### Lead Number Format
- **LEAD-20251030-0001** (Date-based with sequence counter)
- Auto-generated when a new lead is created
- Unique per day

### Job Number Format
- **J2025001** (Johannesburg branch, 2025, sequence 001)
- **D2025003** (Durban branch, 2025, sequence 003)
- Auto-generated when lead status changes to "Quoted"
- Uses branch area code + year + sequence counter

## Code Changes

### 1. Type Definitions (`src/types/index.ts`)
Updated `Lead` interface:
```typescript
export interface Lead {
  // ... existing fields
  job_number: string | null;           // NEW
  cash_customer_name?: string | null;  // NEW (for 'Cash Sales')
  assigned_rep: string | null;         // CHANGED from assigned_to
  assigned_admin: string | null;       // NEW
  assigned_rep_user?: Profile;         // NEW
  assigned_admin_user?: Profile;       // NEW
  // assigned_to and assigned_user REMOVED
}
```

### 2. Lead Form (`src/components/LeadForm.tsx`)
- Split "Assign To" into two separate dropdowns:
  - **Assigned Rep**: All active users
  - **Assigned Admin**: Admin users only
- Updated form state to use `assigned_rep` and `assigned_admin`
- Added "Customer" selector with options:
  - Other (enter name)
  - Cash Sales → shows required "Cash Customer Name" field
- When "Cash Sales" is selected, `client_name` is saved as "Cash Sales" and `cash_customer_name` stores the person's name

### 3. Leads List (`src/components/LeadsList.tsx`)
- Updated all 5 demo leads with:
  - `lead_number` field (e.g., "LEAD-20251030-0001")
  - `job_number` field (e.g., "J2025001" or null if not quoted)
  - `assigned_rep` and `assigned_admin` fields
- Updated Supabase query to fetch both rep and admin user profiles
- Updated filtering logic to filter by rep OR admin
- Updated display to show both Rep and Admin assignments in table

### 4. Lead Details (`src/components/LeadDetails.tsx`)
- Added separate display sections for:
  - **Assigned Rep**: Shows rep's full name
  - **Assigned Admin**: Shows admin's full name
- Updated `canEdit` permission check to allow both rep and admin to edit
- If `client_name` is "Cash Sales", shows the `cash_customer_name` prominently
- Status update form now dynamically labels the reference number:
  - PO Number for Purchase Order statuses
  - Quote Number for quote statuses
  - Invoice Number for invoice statuses

### 5. Reports (`src/components/Reports.tsx`)
- Updated Supabase query to fetch both rep and admin user profiles
- Updated filtering logic to filter by rep OR admin
- Updated user breakdown to show separate counts for reps and admins:
  - "John Doe (Rep): 5 leads"
  - "Jane Smith (Admin): 3 leads"
- Updated CSV export to include both Rep and Admin columns

### 6. Purchase Order Received Status
- Added SQL script `database-add-po-status.sql` to insert a new status: "Purchase Order Received"
  - requires_reference_number = true (prompts for PO Number)
  - requires_attachment = true (prompts to upload the Purchase Order)
- Lead updates now set `order_number` automatically when this status is selected

### 7. Cash Customer Database Column
- Added SQL script `database-add-cash-customer.sql` to add `cash_customer_name` column to `leads`

## Demo Data
All 5 demo leads have been updated with realistic data:

1. **Lead #1**: LEAD-20251030-0001 → Job #J2025001 (Quoted)
2. **Lead #2**: LEAD-20251029-0012 (Not quoted yet)
3. **Lead #3**: LEAD-20251020-0005 → Job #D2025003 (Quoted)
4. **Lead #4**: LEAD-20251015-0018 → Job #C2025005 (Quoted)
5. **Lead #5**: LEAD-20251028-0021 (Not quoted yet)

Each lead has both an assigned rep and an assigned admin.

## Testing Checklist

### Local Testing (Demo Mode)
- [x] Dev server starts without errors
- [x] All TypeScript errors resolved
- [x] Leads list displays both rep and admin
- [x] Lead form has two assignment dropdowns
- [x] Lead details shows both assignments
- [x] Reports filtering works with dual assignments
- [x] Demo data shows correct lead/job numbers

### Production Testing (After Running SQL)
- [ ] Run `database-updates-assignments.sql` on Supabase
- [ ] Run `database-add-cash-customer.sql` on Supabase
- [ ] Run `database-add-po-status.sql` on Supabase
- [ ] Update branch area codes in database
- [ ] Create a new lead and verify lead number auto-generates
- [ ] Change lead status to "Quoted" and verify job number auto-generates
- [ ] Create a Cash Sales lead and verify `cash_customer_name` is saved
- [ ] Change status to "Purchase Order Received"; enter PO Number and upload the PO; verify `order_number` and attachment
- [ ] Test assigning both rep and admin to a lead
- [ ] Test filtering by rep and admin
- [ ] Test editing permissions (both rep and admin can edit)
- [ ] Export CSV and verify rep/admin columns

## Deployment Steps

### 1. Update Database Schema
```sql
-- Connect to your Supabase instance and run:
-- database-updates-assignments.sql
```

### 2. Verify Branch Area Codes
Make sure all 7 branches have correct area codes:
- Johannesburg: J
- Lydenburg: L
- Durban: D
- Port Elizabeth: P
- Middelburg: M
- Rustenburg: U
- Cape Town: C

### 3. Deploy to Vercel
```bash
# Commit changes
git add .
git commit -m "Add auto-numbering and dual assignment system"

# Push to repository (Vercel will auto-deploy)
git push origin main
```

### 4. Test on Production
- Create a new lead and verify lead number
- Change status to "Quoted" and verify job number
- Test dual assignments

## Notes

### Why Dual Assignments?
- **Assigned Rep**: The sales representative handling the client relationship
- **Assigned Admin**: The admin staff member handling documentation and follow-up
- Both can view and edit the lead
- Filtering shows leads where user is either rep or admin

### Lead Number vs Job Number
- **Lead Number**: Generated immediately when lead is created
- **Job Number**: Only generated when lead status changes to "Quoted"
- Job numbers are permanent and tied to the branch area code
- Lead numbers are for tracking, job numbers are for official quoting/invoicing

### Area-Based Job Numbers
Job numbers include the branch area code to quickly identify which branch is handling the job:
- J2025001 → Johannesburg branch, first job of 2025
- D2025003 → Durban branch, third job of 2025
- C2025005 → Cape Town branch, fifth job of 2025

This makes it easy to track workload distribution across branches and identify jobs by location.

## Next Steps
1. Run database migration on production Supabase
2. Test all functionality with real database
3. Deploy to Vercel
4. Train users on new dual assignment system
5. Consider adding email notifications for both rep and admin on lead updates
