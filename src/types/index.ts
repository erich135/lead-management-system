export type UserRole = 'admin' | 'user';

export type NotificationType = 'alert' | 'assignment' | 'status_change' | 'overdue';

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface LeadStatus {
  id: string;
  name: string;
  sort_order: number;
  requires_attachment: boolean;
  requires_reference_number: boolean;
  days_until_alert: number | null;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  job_number: string | null;
  client_name: string;
  cash_customer_name?: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  branch_id: string | null;
  current_status_id: string | null;
  assigned_rep: string | null;
  assigned_admin: string | null;
  created_by: string | null;
  quote_number: string | null;
  order_number: string | null;
  invoice_number: string | null;
  estimated_value: number | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
  current_status?: LeadStatus;
  assigned_rep_user?: Profile;
  assigned_admin_user?: Profile;
  created_by_user?: Profile;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  status_id: string;
  changed_by: string;
  notes: string | null;
  reference_number: string | null;
  alert_date: string | null;
  alert_dismissed: boolean;
  created_at: string;
  status?: LeadStatus;
  changed_by_user?: Profile;
}

export interface Attachment {
  id: string;
  lead_id: string;
  status_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  status?: LeadStatus;
  uploaded_by_user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  lead_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  priority?: 'low' | 'medium' | 'high';
  lead?: Lead;
}

export interface LeadWithDetails extends Lead {
  status_history: LeadStatusHistory[];
  attachments: Attachment[];
  days_in_current_status: number;
  is_overdue: boolean;
}

export interface TechBooking {
  id: string;
  lead_id: string;
  technician_id: string;
  booking_date: string; // ISO date
  start_time: string;   // HH:MM:SS
  end_time: string;     // HH:MM:SS
  location: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  technician?: Profile;
  lead?: Lead;
}

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  overdue_quotes: number;
  pending_installation: number;
  total_value: number;
  leads_by_status: Record<string, number>;
  leads_by_branch: Record<string, number>;
}
