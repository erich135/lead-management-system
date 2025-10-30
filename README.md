# Lead Management System

A comprehensive lead tracking and scheduling application built with React, TypeScript, Tailwind CSS, and Supabase. Designed for teams to manage leads from initial contact through installation and invoicing with role-based access control, automated alerts, and detailed reporting.

## Features

### Core Functionality
- **Lead Tracking**: Complete lifecycle management from new lead to paid invoice
- **Status Workflow**: 12 predefined statuses with customizable alerts and requirements
- **File Attachments**: Upload and manage quotes, orders, invoices, and other documents
- **Automated Alerts**: System flags leads that need attention based on time in status
- **User Assignment**: Assign leads to team members with notifications
- **Branch Management**: Multi-location support with branch-specific filtering
- **Role-Based Access**: Admin and user roles with appropriate permissions

### Dashboard Features
- Real-time statistics and KPIs
- Lead status distribution charts
- Branch and user performance metrics
- Recent activity feed
- Overdue quote tracking
- Total pipeline value tracking

### Lead Management
- Quick lead creation with detailed contact information
- Status updates with required documentation
- Reference number tracking (quotes, orders, invoices)
- File attachment system with download capability
- Complete status history and audit trail
- Advanced filtering and search

### Reporting & Analytics
- Customizable date range filtering
- Filter by status, branch, and assigned user
- Export to CSV for external analysis
- Visual breakdowns by status, branch, and user
- Total and average value calculations

### User Management (Admin Only)
- Create and manage user accounts
- Assign users to branches
- Set user roles (admin/user)
- Activate/deactivate accounts
- Create and manage branch locations

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## Database Schema

### Tables
- `branches` - Company branch locations
- `profiles` - User profiles (extends auth.users)
- `lead_statuses` - Workflow status definitions
- `leads` - Main lead records
- `lead_status_history` - Status change audit trail
- `attachments` - File attachment metadata
- `notifications` - User notification system

### Default Statuses
1. **New Lead** (2-day alert) - Initial lead entry
2. **Quoted** (7-day alert) - Quote provided, requires quote document
3. **Order Received** - Customer confirmed, requires order document
4. **Job Scheduled** - Installation scheduled
5. **In Progress** - Work underway
6. **Awaiting Materials** (3-day alert) - Waiting on supplies
7. **Ready for Installation** - Materials ready
8. **Installed** - Work complete, requires reference number
9. **Invoiced** (14-day alert) - Invoice sent, requires invoice document
10. **Paid** - Payment received (completed)
11. **On Hold** - Temporarily paused
12. **Lost** - Opportunity lost

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### 1. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `database-setup.sql`
4. Execute the script
5. Verify all tables were created successfully

### 2. Create First Admin User

After running the database setup:

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add User" and create your admin account
3. Copy the user's UUID from the users table
4. Run this SQL in the SQL Editor:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'paste-user-uuid-here',
  'admin@yourcompany.com',
  'Admin Name',
  'admin',
  true
);
```

### 3. Environment Setup

The `.env` file should already contain your Supabase credentials. Verify they are correct:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 5. First Login

1. Open the application in your browser
2. Sign in with the admin credentials you created
3. Go to the Users section to create additional team members
4. Create branches for your organization
5. Start adding leads!

## Usage Guide

### For Administrators

**Managing Users:**
1. Navigate to Users tab
2. Click "New User" to create accounts
3. Set user role (admin/user) and assign to branch
4. Toggle user status to activate/deactivate accounts

**Managing Branches:**
1. In Users tab, click "New Branch"
2. Enter branch name and location
3. Users can then be assigned to branches

**Creating Leads:**
1. Click "New Lead" from any view
2. Fill in client information
3. Set initial status (usually "New Lead")
4. Assign to a team member
5. Add estimated value and branch

### For All Users

**Updating Lead Status:**
1. Click on a lead to view details
2. Click "Update Status"
3. Select new status from dropdown
4. Add notes about the change
5. Upload required documents if needed
6. Enter reference numbers when required
7. Click "Update Status"

**Viewing Reports:**
1. Navigate to Reports tab
2. Use filters to narrow down data
3. View statistics and breakdowns
4. Click "Export CSV" for external analysis

**Managing Attachments:**
1. Open lead details
2. Status updates requiring files will prompt for upload
3. View all attachments in the Attachments section
4. Download files by clicking the download icon
5. Delete your own attachments if needed

## Alert System

The system automatically tracks time in each status and flags leads that need attention:

- **New Lead**: Alert after 2 days (needs quote)
- **Quoted**: Alert after 7 days (follow up on quote)
- **Awaiting Materials**: Alert after 3 days (check on materials)
- **Invoiced**: Alert after 14 days (follow up on payment)

Overdue leads are highlighted in the leads list with an alert icon.

## Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only view leads in their branch or assigned to them
- Admins have full access to all data
- File uploads are authenticated and access-controlled
- Passwords are handled by Supabase Auth with industry-standard security

## Customization

### Adding Custom Statuses

```sql
INSERT INTO lead_statuses (name, sort_order, requires_attachment, requires_reference_number, days_until_alert)
VALUES ('Your Status', 13, false, false, null);
```

### Modifying Alert Thresholds

```sql
UPDATE lead_statuses
SET days_until_alert = 5
WHERE name = 'Quoted';
```

## Support & Maintenance

### Common Issues

**Can't log in:**
- Verify user exists in Authentication > Users
- Check profile was created in profiles table
- Ensure user is_active = true

**RLS errors:**
- Verify all RLS policies were created
- Check user has correct role in profiles table
- Ensure user is authenticated

**File upload issues:**
- Verify storage bucket 'lead-attachments' exists
- Check storage policies are in place
- Ensure user has permission to upload

### Database Maintenance

Run these queries periodically:

```sql
-- Clean up old notifications (older than 30 days)
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '30 days'
AND is_read = true;

-- View leads without updates in 30+ days
SELECT * FROM leads
WHERE updated_at < NOW() - INTERVAL '30 days'
AND current_status_id NOT IN (
  SELECT id FROM lead_statuses WHERE name IN ('Paid', 'Lost')
);
```

## Future Enhancements

Potential features to add:
- Email notifications for alerts and assignments
- Daily task summary emails
- Automated quote follow-up reminders
- Mobile app version
- Calendar view for scheduled installations
- Customer portal for status updates
- Integration with accounting software
- Custom fields per lead type
- Advanced analytics and forecasting

## License

This project is proprietary software for internal company use.

## Version

Version 1.0.0 - Initial Release
