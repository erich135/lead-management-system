-- Adds 'Purchase Order Received' status if it doesn't already exist
-- Safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lead_statuses WHERE lower(name) = lower('Purchase Order Received')
  ) THEN
    INSERT INTO lead_statuses (id, name, sort_order, requires_attachment, requires_reference_number, days_until_alert, created_at)
    VALUES (
      gen_random_uuid(),
      'Purchase Order Received',
      9,
      TRUE,
      TRUE,
      0,
      now()
    );
  END IF;
END $$;
