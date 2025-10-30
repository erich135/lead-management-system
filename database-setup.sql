/*
  # Lead Management System - Database Setup

  This SQL script sets up the complete database schema for the lead management system.
  Run this script in your Supabase SQL Editor to create all necessary tables, policies, and functions.

  ## Tables Created:
  - branches: Company branch locations
  - profiles: User profiles extending auth.users
  - lead_statuses: Status workflow definitions
  - leads: Main lead tracking table
  - lead_status_history: Status change audit trail
  - attachments: File attachment metadata
  - notifications: User notifications

  ## Features:
  - Row Level Security (RLS) enabled on all tables
  - Automatic lead number generation
  - Alert tracking system
  - File storage integration
  - Comprehensive audit trail
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  branch_id uuid REFERENCES branches(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_statuses table
CREATE TABLE IF NOT EXISTS lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL,
  requires_attachment boolean DEFAULT false,
  requires_reference_number boolean DEFAULT false,
  days_until_alert integer,
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  contact_person text,
  contact_email text,
  contact_phone text,
  description text,
  branch_id uuid REFERENCES branches(id),
  current_status_id uuid REFERENCES lead_statuses(id),
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  quote_number text,
  order_number text,
  invoice_number text,
  estimated_value decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_status_history table
CREATE TABLE IF NOT EXISTS lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status_id uuid REFERENCES lead_statuses(id),
  changed_by uuid REFERENCES profiles(id),
  notes text,
  reference_number text,
  alert_date timestamptz,
  alert_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status_id uuid REFERENCES lead_statuses(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('alert', 'assignment', 'status_change')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(current_status_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_branch ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_alert ON lead_status_history(alert_date) WHERE alert_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_attachments_lead ON attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id) WHERE is_read = false;

-- Insert default statuses
INSERT INTO lead_statuses (name, sort_order, requires_attachment, requires_reference_number, days_until_alert) VALUES
  ('New Lead', 1, false, false, 2),
  ('Quoted', 2, true, true, 7),
  ('Order Received', 3, true, true, null),
  ('Job Scheduled', 4, false, false, null),
  ('In Progress', 5, false, false, null),
  ('Awaiting Materials', 6, false, false, 3),
  ('Ready for Installation', 7, false, false, null),
  ('Installed', 8, false, true, null),
  ('Invoiced', 9, true, true, 14),
  ('Paid', 10, false, false, null),
  ('On Hold', 11, false, false, null),
  ('Lost', 12, false, false, null)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
CREATE POLICY "All authenticated users can view branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for lead_statuses
CREATE POLICY "All authenticated users can view statuses"
  ON lead_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage statuses"
  ON lead_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for leads
CREATE POLICY "Users can view leads in their branch or assigned to them"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR profiles.branch_id = leads.branch_id
        OR leads.assigned_to = profiles.id
      )
    )
  );

CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and assigned users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR leads.assigned_to = profiles.id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR leads.assigned_to = profiles.id
      )
    )
  );

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for lead_status_history
CREATE POLICY "Users can view history for accessible leads"
  ON lead_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN profiles ON profiles.id = auth.uid()
      WHERE leads.id = lead_status_history.lead_id
      AND (
        profiles.role = 'admin'
        OR profiles.branch_id = leads.branch_id
        OR leads.assigned_to = profiles.id
      )
    )
  );

CREATE POLICY "Users can create history entries"
  ON lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Users can update their own history entries"
  ON lead_status_history FOR UPDATE
  TO authenticated
  USING (changed_by = auth.uid())
  WITH CHECK (changed_by = auth.uid());

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments for accessible leads"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN profiles ON profiles.id = auth.uid()
      WHERE leads.id = attachments.lead_id
      AND (
        profiles.role = 'admin'
        OR profiles.branch_id = leads.branch_id
        OR leads.assigned_to = profiles.id
      )
    )
  );

CREATE POLICY "Users can upload attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-attachments', 'lead-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "Users can view attachments for accessible leads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-attachments');

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate lead numbers
CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  date_part TEXT;
  sequence_part INTEGER;
BEGIN
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 15) AS INTEGER)), 0) + 1
  INTO sequence_part
  FROM leads
  WHERE lead_number LIKE 'LEAD-' || date_part || '-%';

  new_number := 'LEAD-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate lead number
CREATE OR REPLACE FUNCTION set_lead_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_number IS NULL OR NEW.lead_number = '' THEN
    NEW.lead_number := generate_lead_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lead_number_trigger ON leads;
CREATE TRIGGER set_lead_number_trigger BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_number();

-- Function to create status change notifications
CREATE OR REPLACE FUNCTION create_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for assigned user
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, lead_id, type, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'assignment',
      'You have been assigned to lead ' || NEW.lead_number || ' - ' || NEW.client_name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lead assignment notifications
DROP TRIGGER IF EXISTS lead_assignment_notification ON leads;
CREATE TRIGGER lead_assignment_notification AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION create_status_change_notification();

-- Function to create status history and alerts
CREATE OR REPLACE FUNCTION create_status_history_entry()
RETURNS TRIGGER AS $$
DECLARE
  status_info RECORD;
  alert_date TIMESTAMPTZ;
BEGIN
  -- Get status information
  SELECT * INTO status_info
  FROM lead_statuses
  WHERE id = NEW.current_status_id;

  -- Calculate alert date if status has alert period
  IF status_info.days_until_alert IS NOT NULL THEN
    alert_date := NOW() + (status_info.days_until_alert || ' days')::INTERVAL;
  END IF;

  -- Create status history entry
  INSERT INTO lead_status_history (
    lead_id,
    status_id,
    changed_by,
    notes,
    alert_date
  ) VALUES (
    NEW.id,
    NEW.current_status_id,
    auth.uid(),
    'Status changed to ' || status_info.name,
    alert_date
  );

  -- Create notification for status change
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, lead_id, type, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'status_change',
      'Lead ' || NEW.lead_number || ' status changed to ' || status_info.name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status changes
DROP TRIGGER IF EXISTS status_change_trigger ON leads;
CREATE TRIGGER status_change_trigger AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.current_status_id IS DISTINCT FROM NEW.current_status_id)
  EXECUTE FUNCTION create_status_history_entry();

-- Function to check for overdue alerts
CREATE OR REPLACE FUNCTION check_overdue_alerts()
RETURNS void AS $$
DECLARE
  overdue_record RECORD;
BEGIN
  -- Find all overdue alerts that haven't been dismissed
  FOR overdue_record IN
    SELECT
      lsh.id as history_id,
      lsh.lead_id,
      l.lead_number,
      l.client_name,
      l.assigned_to,
      ls.name as status_name,
      lsh.alert_date
    FROM lead_status_history lsh
    JOIN leads l ON l.id = lsh.lead_id
    JOIN lead_statuses ls ON ls.id = lsh.status_id
    WHERE lsh.alert_date <= NOW()
      AND lsh.alert_dismissed = false
      AND l.current_status_id = lsh.status_id -- Still in the same status
  LOOP
    -- Create alert notification
    IF overdue_record.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, lead_id, type, message)
      VALUES (
        overdue_record.assigned_to,
        overdue_record.lead_id,
        'alert',
        'OVERDUE: Lead ' || overdue_record.lead_number || ' (' || overdue_record.client_name || 
        ') has been in status "' || overdue_record.status_name || '" for too long'
      );
    END IF;

    -- Mark alert as processed (but not dismissed - that's manual)
    UPDATE lead_status_history
    SET alert_date = NOW() + INTERVAL '1 day' -- Check again tomorrow
    WHERE id = overdue_record.history_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily task summary for a user
CREATE OR REPLACE FUNCTION get_daily_tasks(user_uuid UUID)
RETURNS TABLE (
  lead_id UUID,
  lead_number TEXT,
  client_name TEXT,
  current_status TEXT,
  days_in_status INTEGER,
  is_overdue BOOLEAN,
  requires_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.lead_number,
    l.client_name,
    ls.name,
    EXTRACT(DAY FROM NOW() - lsh.created_at)::INTEGER,
    (lsh.alert_date IS NOT NULL AND lsh.alert_date <= NOW() AND NOT lsh.alert_dismissed),
    CASE
      WHEN ls.requires_attachment AND NOT EXISTS (
        SELECT 1 FROM attachments a WHERE a.lead_id = l.id AND a.status_id = ls.id
      ) THEN 'Attachment required'
      WHEN ls.requires_reference_number AND (
        (ls.name = 'Quoted' AND l.quote_number IS NULL) OR
        (ls.name = 'Order Received' AND l.order_number IS NULL) OR
        (ls.name = 'Invoiced' AND l.invoice_number IS NULL)
      ) THEN 'Reference number required'
      WHEN lsh.alert_date IS NOT NULL AND lsh.alert_date <= NOW() THEN 'Follow up required'
      ELSE 'Review status'
    END
  FROM leads l
  JOIN lead_statuses ls ON ls.id = l.current_status_id
  LEFT JOIN lead_status_history lsh ON lsh.lead_id = l.id AND lsh.status_id = ls.id
  WHERE l.assigned_to = user_uuid
    AND ls.name NOT IN ('Paid', 'Lost')
  ORDER BY
    (lsh.alert_date IS NOT NULL AND lsh.alert_date <= NOW() AND NOT lsh.alert_dismissed) DESC,
    lsh.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate status transition
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  current_status_info RECORD;
  new_status_info RECORD;
BEGIN
  -- Get current status info
  SELECT * INTO current_status_info
  FROM lead_statuses
  WHERE id = OLD.current_status_id;

  -- Get new status info
  SELECT * INTO new_status_info
  FROM lead_statuses
  WHERE id = NEW.current_status_id;

  -- Check if attachment is required for current status
  IF current_status_info.requires_attachment THEN
    IF NOT EXISTS (
      SELECT 1 FROM attachments
      WHERE lead_id = NEW.id AND status_id = OLD.current_status_id
    ) THEN
      RAISE EXCEPTION 'Attachment required for status: %', current_status_info.name;
    END IF;
  END IF;

  -- Check if reference number is required
  IF current_status_info.requires_reference_number THEN
    IF (current_status_info.name = 'Quoted' AND NEW.quote_number IS NULL) OR
       (current_status_info.name = 'Order Received' AND NEW.order_number IS NULL) OR
       (current_status_info.name = 'Invoiced' AND NEW.invoice_number IS NULL) THEN
      RAISE EXCEPTION 'Reference number required for status: %', current_status_info.name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status validation
DROP TRIGGER IF EXISTS validate_status_transition_trigger ON leads;
CREATE TRIGGER validate_status_transition_trigger BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.current_status_id IS DISTINCT FROM NEW.current_status_id)
  EXECUTE FUNCTION validate_status_transition();

-- Sample data (optional - remove if not needed)

-- Insert sample branches
INSERT INTO branches (name, location) VALUES
  ('Main Office', '123 Main Street, City, State'),
  ('North Branch', '456 North Ave, City, State'),
  ('South Branch', '789 South Blvd, City, State')
ON CONFLICT DO NOTHING;

/*
  Setup Complete!

  Next Steps:
  1. Create your first admin user through Supabase Auth
  2. Manually insert a profile record for that user with role='admin'
  3. Log in to the application and start managing leads

  Example: After creating a user in Supabase Auth, run:

  INSERT INTO profiles (id, email, full_name, role, is_active)
  VALUES (
    'user-auth-id-here',
    'admin@company.com',
    'Admin User',
    'admin',
    true
  );
*/
