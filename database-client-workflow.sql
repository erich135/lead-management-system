-- Updated Status Workflow Based on Client's Excel System
-- This replaces the default statuses with the client's actual workflow

-- First, remove default statuses (keep the table structure)
DELETE FROM lead_statuses;

-- Insert client's actual status workflow
INSERT INTO lead_statuses (name, sort_order, requires_attachment, requires_reference_number, days_until_alert, created_at) VALUES
  ('In Progress', 1, false, false, 2, now()),
  ('Quoted', 2, true, true, 7, now()),
  ('Sent to Client', 3, true, false, 3, now()),
  ('Await PO', 4, false, false, 5, now()),
  ('Register', 5, false, true, null, now()),
  ('Parts Ready', 6, false, false, null, now()),
  ('Job Done', 7, false, true, null, now()),
  ('RSR Needed', 8, false, false, 2, now()),
  ('Sent to Inv', 9, true, false, null, now()),
  ('Query', 10, false, false, 1, now()),
  ('Ready to Inv', 11, false, false, null, now()),
  ('Invoiced', 12, true, true, 14, now()),
  ('Warranty', 13, false, false, 30, now()),
  ('Assessment', 14, false, false, 2, now()),
  ('Asses Done', 15, false, false, null, now()),
  ('Paid', 16, false, false, null, now()),
  ('Cancel', 17, false, false, null, now())
ON CONFLICT (name) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  requires_attachment = EXCLUDED.requires_attachment,
  requires_reference_number = EXCLUDED.requires_reference_number,
  days_until_alert = EXCLUDED.days_until_alert;

-- Add additional fields to leads table to match client's workflow
DO $$ 
BEGIN
  -- Add rep_code field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'rep_code') THEN
    ALTER TABLE leads ADD COLUMN rep_code text;
  END IF;

  -- Add technician assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'technician_id') THEN
    ALTER TABLE leads ADD COLUMN technician_id uuid REFERENCES profiles(id);
  END IF;

  -- Add follow_up_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'follow_up_status') THEN
    ALTER TABLE leads ADD COLUMN follow_up_status text;
  END IF;

  -- Add start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'start_date') THEN
    ALTER TABLE leads ADD COLUMN start_date timestamptz;
  END IF;

  -- Add date_quoted
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'date_quoted') THEN
    ALTER TABLE leads ADD COLUMN date_quoted timestamptz;
  END IF;

  -- Add value_ex_vat (they track excluding VAT)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'value_ex_vat') THEN
    ALTER TABLE leads ADD COLUMN value_ex_vat decimal(12,2);
  END IF;

  -- Add cash_customer flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'cash_customer') THEN
    ALTER TABLE leads ADD COLUMN cash_customer boolean DEFAULT false;
  END IF;

  -- Add warranty_info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'warranty_info') THEN
    ALTER TABLE leads ADD COLUMN warranty_info text;
  END IF;

  -- Add non_conformance flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'has_non_conformance') THEN
    ALTER TABLE leads ADD COLUMN has_non_conformance boolean DEFAULT false;
  END IF;
END $$;

-- Create non-conformance tracking table
CREATE TABLE IF NOT EXISTS non_conformances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  job_number text,
  customer text,
  value decimal(12,2),
  admin_id uuid REFERENCES profiles(id),
  rep_code text,
  recuperated decimal(12,2),
  outstanding decimal(12,2),
  resolution_notes text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for non-conformances
CREATE INDEX IF NOT EXISTS idx_non_conformances_lead ON non_conformances(lead_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_resolved ON non_conformances(resolved);

-- Enable RLS for non_conformances
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for non_conformances
CREATE POLICY "Users can view non-conformances for accessible leads"
  ON non_conformances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      JOIN profiles ON profiles.id = auth.uid()
      WHERE leads.id = non_conformances.lead_id
      AND (
        profiles.role = 'admin'
        OR profiles.branch_id = leads.branch_id
        OR leads.assigned_to = profiles.id
        OR leads.technician_id = profiles.id
      )
    )
  );

CREATE POLICY "Admins can create non-conformances"
  ON non_conformances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update non-conformances"
  ON non_conformances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add index for technician assignment
CREATE INDEX IF NOT EXISTS idx_leads_technician ON leads(technician_id);

-- Update the lead number generation to match client's format
-- They use job numbers in format like "AP001", "BB001", "ER001"
CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  date_part TEXT;
  sequence_part INTEGER;
BEGIN
  -- Use format: JOB-YYYYMMDD-XXXX
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 14) AS INTEGER)), 0) + 1
  INTO sequence_part
  FROM leads
  WHERE lead_number LIKE 'JOB-' || date_part || '-%';

  new_number := 'JOB-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create a view for dashboard statistics matching their needs
CREATE OR REPLACE VIEW lead_statistics AS
SELECT
  COUNT(*) FILTER (WHERE current_status_id IN (SELECT id FROM lead_statuses WHERE name IN ('In Progress', 'Quoted', 'Sent to Client'))) as active_leads,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Await PO')) as awaiting_po,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Parts Ready')) as parts_ready,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Job Done')) as completed_jobs,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Query')) as queries,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Invoiced')) as invoiced,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Paid')) as paid,
  COUNT(*) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Warranty')) as warranty_jobs,
  COUNT(*) FILTER (WHERE has_non_conformance = true) as non_conformances,
  COALESCE(SUM(value_ex_vat) FILTER (WHERE current_status_id NOT IN (SELECT id FROM lead_statuses WHERE name IN ('Cancel', 'Paid'))), 0) as pipeline_value,
  COALESCE(SUM(value_ex_vat) FILTER (WHERE current_status_id = (SELECT id FROM lead_statuses WHERE name = 'Paid')), 0) as revenue_ytd
FROM leads;

-- Success message
SELECT 'Database updated to match client workflow!' as message,
       'Status count: ' || (SELECT COUNT(*) FROM lead_statuses) as statuses,
       'New columns added to leads table for technicians, rep codes, and follow-ups' as features;