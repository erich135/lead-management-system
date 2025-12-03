/**
 * Help Content Configuration
 * 
 * Centralized help text for all tooltips and help icons in the app.
 * Organized by feature area for easy maintenance.
 * 
 * Usage:
 *   import { helpContent } from '../config/helpContent';
 *   <HelpIcon content={helpContent.dashboard.overdueJobs} />
 */

export const helpContent = {
  // Dashboard Help
  dashboard: {
    overdueJobs: {
      title: "Priority Jobs Overview",
      description: "Jobs that have exceeded their expected timeline based on their current status. Red (Critical) indicates overdue jobs, Orange (Warning) indicates jobs approaching deadline, Blue (Info) shows jobs on track.",
    },
    stats: {
      totalJobs: "The total number of active jobs in the system, excluding cancelled and deleted jobs.",
      activeJobs: "Jobs currently in progress that haven't been invoiced or cancelled yet.",
      needsAttention: "Jobs that are overdue or approaching their deadline. Click to see the full notification list.",
      totalValue: "The combined value (ex VAT) of all active jobs currently being tracked.",
    },
    totalJobs: "The total number of active jobs in the system, excluding cancelled and deleted jobs.",
    totalValue: "The combined value (ex VAT) of all active jobs currently being tracked.",
    conversionRate: "The percentage of jobs that have successfully progressed from quotation to invoiced status.",
    priorityFilter: {
      critical: "Show only jobs that are past their expected completion date.",
      warning: "Show jobs approaching their deadline (within the alert window).",
      info: "Show jobs that are on track with no immediate concerns.",
    },
  },

  // Job/Lead Fields
  jobs: {
    jobNumber: "Unique identifier for this job. Auto-generated or imported from your existing system.",
    status: "The current stage of the job in the workflow. Click to see available status transitions.",
    customer: "The customer this job is associated with. Can be a registered customer or a cash customer.",
    cashCustomer: "For one-time or unregistered customers. Enter their name directly here.",
    valueExVat: "The total value of the job excluding VAT. Used for reporting and analytics.",
    startDate: "When the job was created or received. Used to calculate workflow duration.",
    dateQuoted: "When the quotation was sent to the customer. Important for follow-up tracking.",
    poDate: "When the Purchase Order was received from the customer. Marks approval to proceed.",
    poNumber: "The customer's Purchase Order reference number for invoicing.",
    invoiceDate: "When the job was invoiced. Marks completion of the job lifecycle.",
    repCode: "The sales representative assigned to this customer/job.",
    adminCode: "The admin staff member responsible for managing this job.",
    branch: "The branch location handling this job.",
    feedback: "Internal notes about the job. Visible to all staff.",
    techBooked: "The technician assigned to perform the work.",
  },

  // Status-specific Help
  statuses: {
    'New': "Job has been created but not yet processed.",
    'Quoted': "A quotation has been prepared and is ready to send.",
    'Sent to Client': "Quotation has been sent to the customer. Follow-up tracking begins.",
    'Await PO': "Waiting for the customer to send a Purchase Order.",
    'Register': "Job is being registered in the system for scheduling.",
    'Parts In Stock': "Required parts are available and ready.",
    'Parts Ordered': "Parts have been ordered and we're waiting for delivery.",
    'In Progress': "Work is currently being performed.",
    'Job Done': "Work has been completed, pending documentation.",
    'RSR Needed': "Return Service Report needs to be completed.",
    'Invoiced': "Job has been invoiced. Complete.",
    'Cancelled': "Job has been cancelled and will not proceed.",
    'Quotation Cancelled': "The quotation was cancelled before becoming a job.",
  },

  // Follow-up System
  followUps: {
    overview: "The follow-up system tracks communication with customers for jobs in 'Sent to Client' status. Each follow-up has specific time intervals to ensure consistent engagement.",
    step1: "First follow-up: Contact customer 1 day after sending quotation.",
    step2: "Second follow-up: 2 days after first follow-up if no response.",
    step3: "Third follow-up: 2 days after second follow-up.",
    step4: "Fourth follow-up: 2 days after third follow-up.",
    step5: "Fifth follow-up: 3 days after fourth follow-up.",
    step6: "Sixth follow-up: 3 days after fifth follow-up.",
    quoteRefresh: "After follow-up 6, you can refresh the quote. This resets the follow-up cycle. Maximum 3 refreshes allowed.",
    statusFollowUp: "For other statuses (Await PO, Register, etc.), you can log follow-up notes to track customer communication.",
  },

  // Reports
  reports: {
    userPerformance: "Analyze individual user productivity, job assignments, and activity metrics.",
    customerReports: "View job history, financials, and status breakdown for specific customers.",
    machineReports: "Track service history and job patterns for specific machines.",
    conversionTracker: {
      title: "Conversion Time Tracker",
      description: "Measures the average time jobs spend in each stage of the workflow. Helps identify bottlenecks and optimize your sales and delivery process.",
      overview: "Measures the average time jobs spend in each stage of the workflow. Helps identify bottlenecks.",
      metrics: {
        startToQuoted: {
          title: "Start → Quoted",
          description: "Average days from job creation to quotation being prepared. Measures your team's quoting speed.",
        },
        quotedToSent: {
          title: "Quoted → Sent",
          description: "Average days from quotation ready to sending to customer. Should be minimal - aim for same-day.",
        },
        sentToPO: {
          title: "Sent → PO (Client Decision)",
          description: "⚠️ Average days waiting for customer decision. Often the longest stage and outside your control. High numbers here indicate need for better follow-up.",
        },
        poToInvoiced: {
          title: "PO → Invoiced",
          description: "Average days from PO received to job completion and invoicing. Measures your execution efficiency.",
        },
        totalTime: {
          title: "Start → Invoiced (Total)",
          description: "Total average time from job creation to invoice. This is your complete conversion cycle.",
        },
      },
      startToQuoted: "Average days from job creation to quotation being prepared.",
      quotedToSent: "Average days from quotation ready to sending to customer.",
      sentToPO: "Average days waiting for customer decision (client decision time). Often the longest stage.",
      poToInvoiced: "Average days from PO received to job completion and invoicing.",
      completeOnly: "When enabled, only shows jobs that have completed the entire workflow (all dates present). This ensures the segment totals add up to the total time.",
    },
    overdueSection: "Jobs that have exceeded the expected time for their current status.",
    dateRange: "Filter data to a specific time period. 'All Time' shows complete historical data.",
  },

  // Filters
  filters: {
    overview: "Use filters to narrow down the jobs list. Combine multiple filters for more specific results.",
    admin: "Filter by the admin staff member assigned to jobs.",
    rep: "Filter by the sales representative associated with the customer.",
    branch: "Filter by the branch location handling the jobs.",
    status: "Filter by the current workflow status of jobs.",
    dateFrom: "Show only jobs with start date on or after this date.",
    dateTo: "Show only jobs with start date on or before this date.",
    clearAll: "Remove all active filters and show all data.",
  },

  // System Management
  admin: {
    users: "Manage user accounts, roles, and permissions. Only super admins can create new users.",
    statuses: "Configure the workflow statuses available in the system.",
    branches: "Manage branch locations.",
    repCodes: "Manage sales representative codes and assignments.",
    adminCodes: "Manage admin staff codes.",
    customers: "View and manage customer records.",
    machines: "View and manage machine records for service tracking.",
    dataImport: "Import data from Excel files (jobs, customers, machines).",
  },

  // Diary
  diary: {
    overview: "Calendar view of technician bookings and scheduled work.",
    createBooking: "Click on a date to create a new technician booking.",
    editBooking: "Click on an existing booking to view or edit details.",
  },

  // Activities
  activities: {
    overview: "Real-time feed of all actions taken in the system. Useful for auditing and tracking changes.",
    filters: "Filter activities by user, action type, or date range.",
  },

  // Chat/Support
  chat: {
    overview: "Built-in chat system for team communication. Messages are organized by conversation threads.",
    startChat: "Click on a user to start a new conversation.",
  },

  // General UI
  ui: {
    refresh: "Reload data from the server.",
    export: "Download data as a CSV file for external analysis.",
    search: "Search across visible columns. Press Enter or wait for auto-search.",
    pagination: "Navigate between pages of results. Adjust items per page in settings.",
    sort: "Click column headers to sort. Click again to reverse order.",
  },
};

// Onboarding tour steps (for Phase 2)
export const onboardingSteps = {
  dashboard: [
    {
      target: '[data-tour="nav-dashboard"]',
      title: 'Dashboard',
      content: 'Your main hub showing overdue jobs and key metrics. Red items need immediate attention.',
    },
    {
      target: '[data-tour="nav-leads"]',
      title: 'Jobs List',
      content: 'View and manage all jobs. Use filters to find specific jobs quickly.',
    },
    {
      target: '[data-tour="nav-reports"]',
      title: 'Reports',
      content: 'Analyze performance by user, customer, or machine. Track conversion times.',
    },
    {
      target: '[data-tour="nav-diary"]',
      title: 'Diary',
      content: 'Calendar view of technician bookings and scheduled work.',
    },
    {
      target: '[data-tour="stats-cards"]',
      title: 'Quick Stats',
      content: 'At-a-glance metrics showing total jobs, value, and conversion rates.',
    },
    {
      target: '[data-tour="priority-filters"]',
      title: 'Priority Filters',
      content: 'Filter overdue jobs by urgency: Critical (overdue), Warning (approaching), or Info (on track).',
    },
  ],
  jobDetails: [
    {
      target: '[data-tour="job-status"]',
      title: 'Job Status',
      content: 'Current stage in the workflow. Click to change status when the job progresses.',
    },
    {
      target: '[data-tour="follow-ups"]',
      title: 'Follow-up Tracking',
      content: 'Track customer communication. System reminds you when follow-ups are due.',
    },
    {
      target: '[data-tour="job-history"]',
      title: 'Activity History',
      content: 'Complete audit trail of all changes made to this job.',
    },
  ],
};

export default helpContent;
