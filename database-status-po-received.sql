-- Upsert status 'PO Received/Go-Ahead' and place it between 'Await PO' and 'Register'
DO $$
DECLARE
  await_po_order int := (SELECT sort_order FROM lead_statuses WHERE lower(name) = lower('Await PO'));
  register_order int := (SELECT sort_order FROM lead_statuses WHERE lower(name) = lower('Register'));
  new_order int;
  existing_id uuid := (SELECT id FROM lead_statuses WHERE lower(name) IN (lower('PO Received/Go-Ahead'), lower('Purchase Order Received')) LIMIT 1);
BEGIN
  IF await_po_order IS NULL THEN
    await_po_order := 10; -- fallback
  END IF;
  IF register_order IS NULL THEN
    register_order := await_po_order + 2;
  END IF;
  new_order := await_po_order + 1;

  -- Make room if there's a collision
  UPDATE lead_statuses
  SET sort_order = sort_order + 1
  WHERE sort_order >= new_order;

  IF existing_id IS NULL THEN
    INSERT INTO lead_statuses (id, name, sort_order, requires_attachment, requires_reference_number, days_until_alert, created_at)
    VALUES (gen_random_uuid(), 'PO Received/Go-Ahead', new_order, TRUE, TRUE, 0, now());
  ELSE
    UPDATE lead_statuses
    SET name = 'PO Received/Go-Ahead', sort_order = new_order, requires_attachment = TRUE, requires_reference_number = TRUE
    WHERE id = existing_id;
  END IF;
END $$;
