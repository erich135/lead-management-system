# Lead Management & Scheduling System - Setup Guide

## Overview

This is a comprehensive lead management and scheduling system built with React, TypeScript, Supabase, and Tailwind CSS. The system provides:

- **User Management**: Role-based access control (Admin/User) with branch assignments
- **Lead Tracking**: Complete lead lifecycle from inquiry to completion
- **Status Workflow**: Automated status transitions with required fields and attachments
- **Notifications**: Real-time alerts and daily task summaries
- **Reporting**: Advanced analytics with filtering and export capabilities
- **File Management**: Secure document uploads for quotes, orders, and invoices

## System Features

### Core Functionality
- 🔐 **Authentication & Authorization**: Role-based access control
- 📋 **Lead Management**: Complete lifecycle tracking with automated lead numbering
- 🔄 **Status Workflow**: Structured status transitions with validations
- 📎 **File Attachments**: Secure upload/download for documents
- 🔔 **Notifications**: Real-time alerts and overdue task tracking
- 📊 **Advanced Reporting**: Comprehensive analytics and filtering
- 🏢 **Multi-Branch Support**: Branch-based organization and access control
- ⏰ **Time-Based Alerts**: Automated reminders for overdue tasks

### Status Workflow
The system includes predefined statuses with automatic alert triggers:

1. **New Lead** (2-day alert) - Initial lead entry
2. **Quoted** (7-day alert) - Quote provided (requires quote attachment & number)
3. **Order Received** - Customer placed order (requires order attachment & number)
4. **Job Scheduled** - Installation scheduled
5. **In Progress** - Work in progress
6. **Awaiting Materials** (3-day alert) - Waiting for supplies
7. **Ready for Installation** - Ready to install
8. **Installed** - Installation complete (requires reference number)
9. **Invoiced** (14-day alert) - Invoice sent (requires invoice attachment & number)
10. **Paid** - Payment received (final status)
11. **On Hold** - Temporarily paused
12. **Lost** - Lead lost (final status)

## Quick Demo Setup (Using Dummy Data)

### For Customer Demonstrations

If you want to quickly showcase the system with realistic data:

1. **Follow steps 1-4 of the full installation** (Environment, Dependencies, Database Setup, Admin User)

2. **Load Sample Data**:
   ```bash
   # In Supabase SQL Editor, run the sample data script:
   ```
   Copy and execute the contents of `sample-data.sql` in your Supabase SQL Editor.

3. **Start the application**:
   ```bash
   npm run dev
   ```

The sample data includes:
- 17 realistic leads across different statuses
- 5 users across 3 branches  
- Complete status history and notifications
- File attachment records
- Overdue alerts for demonstration

### Import Your Existing Excel Data

To import data from your current Excel spreadsheet:

1. **Prepare your Excel file**:
   - Convert to CSV format (Save As → CSV)
   - Ensure column headers match the expected format (see template below)

2. **Use the built-in import tool**:
   - Log in as an admin user
   - Go to the Leads section
   - Click "Import Data" (available for admin users only)
   - Upload your CSV file or download the template

3. **CSV Column Format**:
   ```csv
   Client Name,Contact Person,Contact Email,Contact Phone,Description,Status,Branch,Assigned To,Estimated Value,Quote Number,Order Number,Invoice Number
   ```

4. **Status Mapping**: Your Excel statuses will be automatically mapped:
   - "New" → "New Lead"
   - "Quoted" → "Quoted" 
   - "Order" → "Order Received"
   - "Scheduled" → "Job Scheduled"
   - "In Progress" → "In Progress"
   - "Materials" → "Awaiting Materials"
   - "Ready" → "Ready for Installation"
   - "Installed" → "Installed"
   - "Invoiced" → "Invoiced"
   - "Paid" → "Paid"
   - "Hold" → "On Hold"
   - "Lost" → "Lost"

## Full Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### 1. Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

1. **Create a new Supabase project** at https://supabase.com

2. **Run the database setup script** in your Supabase SQL Editor:
   - Copy the entire contents of `database-setup.sql`
   - Paste and execute in Supabase SQL Editor

3. **Configure Authentication**:
   - In Supabase Dashboard > Authentication > Settings
   - Enable email authentication
   - Configure any additional providers if needed

4. **Setup Storage**:
   - The script automatically creates the `lead-attachments` storage bucket
   - Verify it exists in Storage section of Supabase Dashboard

### 4. Create Initial Admin User

1. **Register first user** through the application signup
2. **Get the user ID** from Supabase Dashboard > Authentication > Users
3. **Insert admin profile** in Supabase SQL Editor:

```sql
-- Replace 'user-id-from-supabase' with actual user ID
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'user-id-from-supabase',
  'admin@yourcompany.com',
  'Admin User',
  'admin',
  true
);
```

### 5. Add Sample Branches (Optional)

```sql
INSERT INTO branches (name, location) VALUES
  ('Main Office', '123 Main Street, City, State'),
  ('North Branch', '456 North Ave, City, State'),
  ('South Branch', '789 South Blvd, City, State');
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to access the application.

## User Guide

### For Administrators

#### Dashboard Overview
- View key metrics and lead statistics
- Access all leads across all branches
- Manage users and assign roles
- Generate comprehensive reports

#### Lead Management
- Create new leads with complete information
- Assign leads to team members
- Update lead status with required attachments
- Monitor overdue tasks and alerts

#### User Management
- Create new user accounts
- Assign users to branches
- Set user roles (Admin/User)
- Deactivate users as needed

#### Reports & Analytics
- Filter leads by status, branch, assignee, date range
- Export data for external analysis
- View performance metrics by branch and user
- Track conversion rates and lead values

### For Regular Users

#### Daily Workflow
- Check notifications for new assignments
- Review daily task list for overdue items
- Update lead statuses with required information
- Upload necessary documents (quotes, orders, invoices)

#### Lead Status Updates
- Each status change requires specific information:
  - **Quoted**: Upload quote document + quote number
  - **Order Received**: Upload order document + order number
  - **Invoiced**: Upload invoice document + invoice number

#### Notifications
- Receive real-time alerts for new assignments
- Get notified of status changes on your leads
- View overdue task alerts
- Request daily email summaries

## Advanced Features

### Automated Alerts
The system automatically tracks time spent in each status and creates alerts when:
- New leads aren't quoted within 2 days
- Quotes aren't followed up within 7 days
- Materials haven't arrived within 3 days (Awaiting Materials status)
- Invoices aren't paid within 14 days

### File Management
- All attachments are securely stored in Supabase Storage
- Files are organized by lead and status
- Download/delete permissions based on user role
- Automatic file validation and metadata storage

### Real-Time Updates
- Lead changes are instantly reflected across all users
- Notifications appear in real-time
- Status updates trigger automatic workflow processes

### Security Features
- Row Level Security (RLS) on all database tables
- Branch-based data access restrictions
- Role-based feature access
- Secure file storage with access controls

## Database Schema

### Key Tables
- `profiles` - User information and roles
- `branches` - Company branch locations
- `leads` - Main lead information
- `lead_statuses` - Status definitions and rules
- `lead_status_history` - Complete audit trail
- `attachments` - File metadata
- `notifications` - User notifications

### Important Functions
- `generate_lead_number()` - Auto-generates unique lead numbers
- `get_daily_tasks(user_id)` - Returns user's daily task list
- `check_overdue_alerts()` - Creates overdue notifications
- `validate_status_transition()` - Enforces workflow rules

## Customization

### Adding New Statuses
1. Insert into `lead_statuses` table:
```sql
INSERT INTO lead_statuses (name, sort_order, requires_attachment, requires_reference_number, days_until_alert)
VALUES ('Your Status', 15, true, false, 5);
```

### Modifying Alert Periods
```sql
UPDATE lead_statuses 
SET days_until_alert = 3 
WHERE name = 'New Lead';
```

### Adding New Branches
```sql
INSERT INTO branches (name, location)
VALUES ('New Branch', 'Address');
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and API key in `.env`
   - Check Supabase project status

2. **Authentication Issues**
   - Ensure email authentication is enabled
   - Verify user profile exists in `profiles` table

3. **File Upload Errors**
   - Check Storage bucket exists and has correct policies
   - Verify file size limits

4. **Permission Errors**
   - Confirm RLS policies are properly set
   - Check user role assignments

### Logs and Monitoring
- Check browser console for frontend errors
- Monitor Supabase logs for database issues
- Use Supabase Dashboard for real-time monitoring

## Production Deployment

### Environment Variables
Set the following in your production environment:
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_key
```

### Build for Production
```bash
npm run build
npm run preview  # Test production build locally
```

### Deployment Options
- **Vercel**: Connect GitHub repo for automatic deployments
- **Netlify**: Drag-and-drop `dist` folder or connect Git
- **AWS S3 + CloudFront**: Upload `dist` folder contents

### Post-Deployment Checklist
- [ ] Database is properly configured
- [ ] Environment variables are set
- [ ] Admin user is created
- [ ] Branches are configured
- [ ] Email notifications are working (if configured)
- [ ] File uploads are functional
- [ ] All users can access appropriate features

## Support & Maintenance

### Regular Tasks
- Monitor overdue alerts and ensure they're being addressed
- Review user activity and permissions
- Backup important data regularly
- Update lead statuses as business processes evolve

### Performance Monitoring
- Monitor database query performance
- Track file storage usage
- Review user feedback and feature requests

### Security Updates
- Regularly update dependencies
- Monitor Supabase security bulletins
- Review and update access policies as needed

## API Extensions

The system can be extended with additional APIs for:
- Email integration (SendGrid, Mailgun)
- Calendar integration (Google Calendar, Outlook)
- CRM integration (Salesforce, HubSpot)
- Accounting software integration (QuickBooks)

For custom integrations, utilize Supabase Edge Functions or create webhook endpoints.