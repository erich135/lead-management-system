export type UserRole = 'admin' | 'user';

export type NotificationType = 'alert' | 'assignment' | 'status_change' | 'overdue';

// Geolocation types
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export type AttendanceMethod =
  | 'auto_geofence'
  | 'manual_checkin'
  | 'manual_override'
  | 'gps_verification';

/**
 * Live GPS proof captured before a visit can be completed / submitted.
 * Geofencing distance fields are prepared for future admin flagging.
 */
export interface VisitGpsVerification {
  verified: boolean;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  capturedBy?: string;
  appointmentId?: string;
  address?: string;
  expectedLatitude?: number;
  expectedLongitude?: number;
  distanceFromExpectedMeters?: number;
  outsideExpectedLocation?: boolean;
  geofenceRadiusMeters?: number;
}

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  geoLocation?: GeoPoint;
  geofenceRadius?: number;
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

// Sales Lead Management Types
export type SalesLeadStatus = 
  | 'new' 
  | 'assigned' 
  | 'contacted' 
  | 'appointment_set' 
  | 'appointment_attended' 
  | 'rfc_requested' 
  | 'converted' 
  | 'lost';

export type SalesLeadSource = 
  | 'Referral' 
  | 'Cold Call' 
  | 'Website' 
  | 'Trade Show' 
  | 'Email Campaign' 
  | 'Social Media' 
  | 'Walk-in' 
  | 'Partner' 
  | 'Other';

export type SalesLeadPriority = 'low' | 'medium' | 'high';

export interface SalesLead {
  _id: string;
  leadNumber: string;
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone: string;
  contactAddress?: string;
  geoLocation?: GeoPoint;
  branch: string | { _id: string; name: string; code: string };
  assignedRep?: string | { _id: string; code: string; name: string; email: string };
  leadSource: SalesLeadSource;
  serviceDescription?: string;
  estimatedValue?: number;
  priority?: SalesLeadPriority;
  status: SalesLeadStatus;
  lostReason?: string;
  notes?: string;
  convertedJobId?: string;
  convertedJobNumber?: string;
  convertedAt?: string;
  convertedBy?: string | { _id: string; firstName: string; lastName: string };
  createdBy: string | { _id: string; firstName: string; lastName: string; email: string };
  dbStatus: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
  appointmentCount?: number;
  nextAppointmentDate?: string | null;
  nextAppointmentTime?: string | null;
}

export interface Appointment {
  _id: string;
  salesLead: string;
  assignedRep?: string | { _id: string; code?: string; name?: string };
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: string;
  status?: string;
  location: string;
  geoLocation?: GeoPoint;
  geofenceRadius?: number;
  purpose?: string;
  notes?: string;
  internalNotes?: string;
  nextAction?: string;
  attended: boolean;
  attendedAt?: string;
  attendanceMethod?: AttendanceMethod;
  attendanceLocation?: GeoPoint;
  attendanceAccuracy?: number;
  visitGpsVerification?: VisitGpsVerification;
  noShowReason?: string;
  noShowAutoDetected?: boolean;
  outcome?: string;
  feedback?: string;
  nextFollowUpDate?: string;
  nextFollowUpNotes?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  createdBy: string | { _id: string; firstName: string; lastName: string; email: string };
  updatedBy?: string | { _id: string; firstName: string; lastName: string };
  dbStatus: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export type CanvassingPlanStatus = 
  | 'draft' 
  | 'submitted' 
  | 'approved' 
  | 'rejected' 
  | 'in_progress' 
  | 'completed';

export interface CanvassingPlan {
  _id: string;
  repCode: string | { _id: string; code: string; name: string; email: string };
  area: string;
  geoLocation?: GeoPoint;
  geoRadius?: number;
  startDate: string;
  endDate: string;
  travelDays: number;
  travelTime?: string;
  accommodationRequired: boolean;
  preferredAccommodation?: string;
  accommodationCost?: number;
  possibleLeads: number;
  appointmentsMade: number;
  objectives?: string;
  notes?: string;
  status: CanvassingPlanStatus;
  approvedBy?: string | { _id: string; firstName: string; lastName: string };
  approvedAt?: string;
  rejectionReason?: string;
  actualLeadsGenerated?: number;
  actualAppointmentsCompleted?: number;
  actualCost?: number;
  tripFeedback?: string;
  createdBy: string | { _id: string; firstName: string; lastName: string };
  updatedBy?: string | { _id: string; firstName: string; lastName: string };
  dbStatus: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface SalesLeadWithDetails extends SalesLead {
  appointments: Appointment[];
}
