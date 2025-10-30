-- Adds cash_customer_name column to leads if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS cash_customer_name text;
