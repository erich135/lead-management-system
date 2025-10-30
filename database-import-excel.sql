-- Import script for client's existing Excel data
-- Run this AFTER the client-workflow.sql script

-- This script helps prepare the database for importing their Excel data
-- You'll need to first export their Excel to CSV format

-- Sample import template matching their Excel structure
-- CSV should have these columns:
-- Customer,Admin,Status,RepCode,Description,Technician,StartDate,DateQuoted,Value,FollowUpStatus

-- Example SQL to import from CSV (after uploading to Supabase):
/*
COPY leads (
  client_name,
  assigned_to,
  current_status_id,
  rep_code,
  description,
  technician_id,
  start_date,
  date_quoted,
  value_ex_vat,
  follow_up_status,
  created_at
)
FROM '/path/to/your/export.csv'
WITH (FORMAT csv, HEADER true);
*/

-- Helper function to find user by name
CREATE OR REPLACE FUNCTION find_user_by_name(user_name text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM profiles
  WHERE full_name ILIKE '%' || user_name || '%'
  LIMIT 1;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to find status by name
CREATE OR REPLACE FUNCTION find_status_by_name(status_name text)
RETURNS uuid AS $$
DECLARE
  status_id uuid;
  clean_status text;
BEGIN
  -- Remove number prefixes like "1. ", "2. " etc.
  clean_status := REGEXP_REPLACE(status_name, '^\d+\.\s*', '');
  
  SELECT id INTO status_id
  FROM lead_statuses
  WHERE name ILIKE clean_status
  LIMIT 1;
  
  -- If not found, try matching without spaces
  IF status_id IS NULL THEN
    SELECT id INTO status_id
    FROM lead_statuses
    WHERE REPLACE(name, ' ', '') ILIKE REPLACE(clean_status, ' ', '')
    LIMIT 1;
  END IF;
  
  -- Default to 'In Progress' if not found
  IF status_id IS NULL THEN
    SELECT id INTO status_id
    FROM lead_statuses
    WHERE name = 'In Progress'
    LIMIT 1;
  END IF;
  
  RETURN status_id;
END;
$$ LANGUAGE plpgsql;

-- Create mapping table for admin codes
CREATE TABLE IF NOT EXISTS admin_codes (
  code text PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  full_name text
);

-- Sample admin codes (update these based on actual team)
INSERT INTO admin_codes (code, full_name) VALUES
  ('AS', 'Admin AS'),
  ('ER', 'Admin ER'),
  ('HT', 'Admin HT'),
  ('AP', 'Admin AP'),
  ('BB', 'Admin BB')
ON CONFLICT (code) DO NOTHING;

-- Create mapping table for technicians
CREATE TABLE IF NOT EXISTS technician_mapping (
  name text PRIMARY KEY,
  user_id uuid REFERENCES profiles(id)
);

-- Sample technicians (update these based on actual team)
INSERT INTO technician_mapping (name) VALUES
  ('Henco'),
  ('Jerry'),
  ('Neville')
ON CONFLICT (name) DO NOTHING;

-- Function to parse their follow-up status format
CREATE OR REPLACE FUNCTION parse_follow_up(follow_up_text text)
RETURNS integer AS $$
BEGIN
  -- Extract number from "Follow up 1", "Follow up 2", etc.
  RETURN COALESCE(
    (REGEXP_MATCH(follow_up_text, '\d+'))[1]::integer,
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Create a staging table for Excel import
CREATE TABLE IF NOT EXISTS excel_import_staging (
  id serial PRIMARY KEY,
  customer_name text,
  admin_code text,
  status_text text,
  rep_code text,
  description text,
  follow_up_status text,
  technician_name text,
  conditional_formatting text,
  imported boolean DEFAULT false,
  lead_id uuid,
  import_notes text,
  created_at timestamptz DEFAULT now()
);

-- Function to process staged Excel data and create leads
CREATE OR REPLACE FUNCTION process_excel_import()
RETURNS TABLE (
  processed integer,
  success integer,
  failed integer,
  errors text[]
) AS $$
DECLARE
  rec RECORD;
  new_lead_id uuid;
  error_list text[] := ARRAY[]::text[];
  success_count integer := 0;
  fail_count integer := 0;
  admin_user_id uuid;
  tech_user_id uuid;
  status_id uuid;
BEGIN
  -- Get first admin user as default
  SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;

  FOR rec IN SELECT * FROM excel_import_staging WHERE NOT imported LOOP
    BEGIN
      -- Find status
      status_id := find_status_by_name(rec.status_text);
      
      -- Find or create admin user
      SELECT user_id INTO admin_user_id
      FROM admin_codes
      WHERE code = rec.admin_code;
      
      -- Find or create technician
      SELECT user_id INTO tech_user_id
      FROM technician_mapping
      WHERE name = rec.technician_name;

      -- Insert the lead
      INSERT INTO leads (
        client_name,
        description,
        current_status_id,
        assigned_to,
        technician_id,
        rep_code,
        follow_up_status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        rec.customer_name,
        rec.description,
        status_id,
        admin_user_id,
        tech_user_id,
        rec.rep_code,
        rec.follow_up_status,
        admin_user_id,
        now(),
        now()
      ) RETURNING id INTO new_lead_id;

      -- Mark as imported
      UPDATE excel_import_staging
      SET imported = true, lead_id = new_lead_id
      WHERE id = rec.id;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      UPDATE excel_import_staging
      SET import_notes = SQLERRM
      WHERE id = rec.id;
      
      error_list := array_append(error_list, 'Row ' || rec.id || ': ' || SQLERRM);
      fail_count := fail_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT 
    success_count + fail_count,
    success_count,
    fail_count,
    error_list;
END;
$$ LANGUAGE plpgsql;

-- Instructions for importing
SELECT 
  'Import Instructions:' as step,
  '1. Export your Excel DATA sheet to CSV' as instruction
UNION ALL SELECT '2', 'Upload CSV data to excel_import_staging table'
UNION ALL SELECT '3', 'Run: SELECT * FROM process_excel_import();'
UNION ALL SELECT '4', 'Check: SELECT * FROM excel_import_staging WHERE NOT imported;'
UNION ALL SELECT '', 'This will import all your existing leads into the new system!';