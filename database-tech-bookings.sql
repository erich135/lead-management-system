-- Creates a tech_bookings table for technician scheduling
CREATE TABLE IF NOT EXISTS tech_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_tech_bookings_date ON tech_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_tech_bookings_tech ON tech_bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_bookings_lead ON tech_bookings(lead_id);

-- Enable RLS
ALTER TABLE tech_bookings ENABLE ROW LEVEL SECURITY;

-- Policies: admins can do anything, users can read all and create their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_bookings' AND policyname = 'tech_bookings_admin_all'
  ) THEN
    CREATE POLICY tech_bookings_admin_all ON tech_bookings FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_bookings' AND policyname = 'tech_bookings_read'
  ) THEN
    CREATE POLICY tech_bookings_read ON tech_bookings FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_bookings' AND policyname = 'tech_bookings_insert'
  ) THEN
    CREATE POLICY tech_bookings_insert ON tech_bookings FOR INSERT
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;
