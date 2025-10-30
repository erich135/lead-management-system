-- Update Lead Table Schema
-- Add job_number field and split assigned_to into assigned_rep and assigned_admin

ALTER TABLE leads 
  ADD COLUMN job_number VARCHAR(50),
  ADD COLUMN assigned_rep UUID REFERENCES profiles(id),
  ADD COLUMN assigned_admin UUID REFERENCES profiles(id);

-- Create index for job numbers
CREATE INDEX idx_leads_job_number ON leads(job_number);

-- Update branch table to include area codes
ALTER TABLE branches 
  ADD COLUMN area_code VARCHAR(1);

-- Set area codes for existing branches
UPDATE branches SET area_code = 'J' WHERE name ILIKE '%johannesburg%' OR name ILIKE '%jhb%';
UPDATE branches SET area_code = 'L' WHERE name ILIKE '%lydenburg%';
UPDATE branches SET area_code = 'D' WHERE name ILIKE '%durban%';
UPDATE branches SET area_code = 'P' WHERE name ILIKE '%port elizabeth%' OR name ILIKE '%pe%';
UPDATE branches SET area_code = 'M' WHERE name ILIKE '%middelburg%';
UPDATE branches SET area_code = 'U' WHERE name ILIKE '%rustenburg%';
UPDATE branches SET area_code = 'C' WHERE name ILIKE '%cape town%' OR name ILIKE '%cpt%';

-- Function to generate job number when status changes to "Quoted"
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
DECLARE
  v_area_code VARCHAR(1);
  v_year VARCHAR(4);
  v_sequence INT;
  v_job_number VARCHAR(50);
  v_status_name VARCHAR(100);
BEGIN
  -- Get the status name
  SELECT name INTO v_status_name 
  FROM lead_statuses 
  WHERE id = NEW.current_status_id;
  
  -- Only generate job number when status changes to "Quoted" and job_number is null
  IF v_status_name = 'Quoted' AND NEW.job_number IS NULL THEN
    -- Get area code from branch
    SELECT area_code INTO v_area_code 
    FROM branches 
    WHERE id = NEW.branch_id;
    
    -- If no area code, default to 'X'
    IF v_area_code IS NULL THEN
      v_area_code := 'X';
    END IF;
    
    -- Get current year
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Get next sequence number for this area and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM leads
    WHERE job_number LIKE v_area_code || v_year || '%';
    
    -- Generate job number: AreaCode + Year + Sequence (e.g., J2025001)
    v_job_number := v_area_code || v_year || LPAD(v_sequence::VARCHAR, 3, '0');
    
    NEW.job_number := v_job_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job number generation
DROP TRIGGER IF EXISTS generate_job_number_trigger ON leads;
CREATE TRIGGER generate_job_number_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_number();

-- Update the generate_lead_number function to be more robust
CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TRIGGER AS $$
DECLARE
  v_date VARCHAR(8);
  v_sequence INT;
  v_lead_number VARCHAR(50);
BEGIN
  IF NEW.lead_number IS NULL OR NEW.lead_number = '' THEN
    -- Format: LEAD-YYYYMMDD-XXXX
    v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get next sequence for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM leads
    WHERE lead_number LIKE 'LEAD-' || v_date || '%';
    
    v_lead_number := 'LEAD-' || v_date || '-' || LPAD(v_sequence::VARCHAR, 4, '0');
    NEW.lead_number := v_lead_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists for lead number generation
DROP TRIGGER IF EXISTS generate_lead_number_trigger ON leads;
CREATE TRIGGER generate_lead_number_trigger
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_lead_number();

-- Add foreign key constraints for the new assignment fields
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;

ALTER TABLE leads
  ADD CONSTRAINT leads_assigned_rep_fkey 
    FOREIGN KEY (assigned_rep) REFERENCES profiles(id);

ALTER TABLE leads
  ADD CONSTRAINT leads_assigned_admin_fkey 
    FOREIGN KEY (assigned_admin) REFERENCES profiles(id);

-- Update RLS policies for new fields
DROP POLICY IF EXISTS "Users can view leads" ON leads;
CREATE POLICY "Users can view leads" ON leads
  FOR SELECT USING (
    auth.uid() = created_by OR
    auth.uid() = assigned_rep OR
    auth.uid() = assigned_admin OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update their leads" ON leads;
CREATE POLICY "Users can update their leads" ON leads
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() = assigned_rep OR
    auth.uid() = assigned_admin OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
