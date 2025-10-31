-- Sample Data Setup Script for Lead Management System
-- Run this script in Supabase SQL Editor after running the main database-setup.sql

-- Clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM notifications;
-- DELETE FROM attachments;
-- DELETE FROM lead_status_history;
-- DELETE FROM leads;
-- DELETE FROM profiles WHERE role != 'admin'; -- Keep admin users
-- DELETE FROM branches;

-- Insert sample branches
INSERT INTO branches (id, name, location) VALUES 
  ('b1e7d123-4567-8901-2345-678901234567', 'Main Office', '123 Business Park Dr, City Center, State 12345'),
  ('b2e7d123-4567-8901-2345-678901234568', 'North Branch', '456 Industrial Ave, North Town, State 12346'),
  ('b3e7d123-4567-8901-2345-678901234569', 'South Branch', '789 Commerce Blvd, South City, State 12347')
ON CONFLICT (id) DO NOTHING;

-- Insert sample user profiles (you'll need to create actual auth users first, then update these IDs)
-- For demo purposes, we'll create placeholder profiles that you can link to real auth users later
INSERT INTO profiles (id, email, full_name, role, branch_id, is_active) VALUES 
  ('u1e7d123-4567-8901-2345-678901234567', 'john.manager@company.com', 'John Manager', 'admin', 'b1e7d123-4567-8901-2345-678901234567', true),
  ('u2e7d123-4567-8901-2345-678901234567', 'sarah.sales@company.com', 'Sarah Sales', 'user', 'b1e7d123-4567-8901-2345-678901234567', true),
  ('u3e7d123-4567-8901-2345-678901234567', 'mike.north@company.com', 'Mike North', 'user', 'b2e7d123-4567-8901-2345-678901234568', true),
  ('u4e7d123-4567-8901-2345-678901234567', 'lisa.south@company.com', 'Lisa South', 'user', 'b3e7d123-4567-8901-2345-678901234569', true),
  ('u5e7d123-4567-8901-2345-678901234567', 'tom.tech@company.com', 'Tom Technician', 'user', 'b1e7d123-4567-8901-2345-678901234567', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample leads with various statuses and realistic scenarios
INSERT INTO leads (id, lead_number, client_name, contact_person, contact_email, contact_phone, description, branch_id, current_status_id, assigned_to, created_by, quote_number, order_number, invoice_number, estimated_value, created_at, updated_at) VALUES 

-- Recent leads (New Lead status) - should trigger alerts soon
('l1e7d123-4567-8901-2345-678901234567', 'LEAD-20251028-0001', 'Cust One', 'Robert Johnson', 'robert.johnson@custone.com', '(555) 123-4567', 'Industrial compressor upgrade - 50,000 sq ft warehouse', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u2e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', NULL, NULL, NULL, 85000.00, '2025-10-28 09:30:00', '2025-10-28 09:30:00'),

('l2e7d123-4567-8901-2345-678901234567', 'LEAD-20251029-0001', 'Cust Two', 'Maria Rodriguez', 'maria@custtwo.com', '(555) 234-5678', 'Kitchen ventilation system installation', 'b2e7d123-4567-8901-2345-678901234568', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u3e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', NULL, NULL, NULL, 25000.00, '2025-10-29 14:15:00', '2025-10-29 14:15:00'),

-- Overdue quotes (should show as alerts)
('l3e7d123-4567-8901-2345-678901234567', 'LEAD-20251020-0001', 'Cust Three', 'Dr. James Wilson', 'jwilson@custthree.com', '(555) 345-6789', 'Emergency generator system for new wing', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u2e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', NULL, NULL, NULL, 65000.00, '2025-10-20 11:00:00', '2025-10-20 11:00:00'),

-- Quoted leads
('l4e7d123-4567-8901-2345-678901234567', 'LEAD-20251025-0001', 'Cust Four', 'Jennifer Chen', 'jchen@custfour.com', '(555) 456-7890', 'Compressed air system upgrade', 'b3e7d123-4567-8901-2345-678901234569', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u4e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0142', NULL, NULL, 42000.00, '2025-10-25 10:20:00', '2025-10-27 16:30:00'),

('l5e7d123-4567-8901-2345-678901234567', 'LEAD-20251018-0001', 'Cust Five', 'David Thompson', 'dthompson@custfive.com', '(555) 567-8901', 'Office building HVAC upgrade', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u2e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0138', NULL, NULL, 125000.00, '2025-10-18 13:45:00', '2025-10-22 09:15:00'),

-- Order received
('l6e7d123-4567-8901-2345-678901234567', 'LEAD-20251015-0001', 'Cust Six', 'Amanda Foster', 'afoster@custsix.com', '(555) 678-9012', 'Industrial dryer installation', 'b2e7d123-4567-8901-2345-678901234568', (SELECT id FROM lead_statuses WHERE name = 'Order Received'), 'u3e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0135', 'PO-78459', NULL, 78000.00, '2025-10-15 08:30:00', '2025-10-24 11:20:00'),

-- Job scheduled
('l7e7d123-4567-8901-2345-678901234567', 'LEAD-20251012-0001', 'Cust Seven', 'Carlos Martinez', 'cmartinez@custseven.com', '(555) 789-0123', 'Factory floor compressor modernization', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Job Scheduled'), 'u5e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0131', 'PO-67834', NULL, 95000.00, '2025-10-12 15:10:00', '2025-10-26 14:45:00'),

-- In progress
('l8e7d123-4567-8901-2345-678901234567', 'LEAD-20251008-0001', 'Cust Eight', 'Patricia Williams', 'pwilliams@custeight.com', '(555) 890-1234', 'Shopping center air handling equipment', 'b3e7d123-4567-8901-2345-678901234569', (SELECT id FROM lead_statuses WHERE name = 'In Progress'), 'u4e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0128', 'PO-56723', NULL, 55000.00, '2025-10-08 12:00:00', '2025-10-28 08:30:00'),

-- Awaiting materials (should trigger alert)
('l9e7d123-4567-8901-2345-678901234567', 'LEAD-20251005-0001', 'Cust Nine', 'Michael Chang', 'mchang@custnine.com', '(555) 901-2345', 'Modern office climate control system', 'b2e7d123-4567-8901-2345-678901234568', (SELECT id FROM lead_statuses WHERE name = 'Awaiting Materials'), 'u3e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0125', 'PO-45612', NULL, 32000.00, '2025-10-05 09:45:00', '2025-10-25 10:15:00'),

-- Ready for installation
('l10e7d123-4567-8901-2345-678901234567', 'LEAD-20251001-0001', 'Cust Ten', 'Dr. Susan Taylor', 'staylor@custten.com', '(555) 012-3456', 'Medical facility HVAC compliance upgrade', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Ready for Installation'), 'u5e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0120', 'PO-34501', NULL, 38000.00, '2025-10-01 11:20:00', '2025-10-29 13:40:00'),

-- Installed
('l11e7d123-4567-8901-2345-678901234567', 'LEAD-20250925-0001', 'Cust Eleven', 'Brian Cooper', 'bcooper@custeleven.com', '(555) 123-4567', 'Gym ventilation optimization project', 'b3e7d123-4567-8901-2345-678901234569', (SELECT id FROM lead_statuses WHERE name = 'Installed'), 'u4e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0115', 'PO-23490', 'INST-2025-089', 28000.00, '2025-09-25 14:30:00', '2025-10-15 16:20:00'),

-- Invoiced (some overdue)
('l12e7d123-4567-8901-2345-678901234567', 'LEAD-20250920-0001', 'Cust Twelve', 'Nancy Robinson', 'nrobinson@custtwelve.com', '(555) 234-5678', 'Showroom and service bay climate control', 'b2e7d123-4567-8901-2345-678901234568', (SELECT id FROM lead_statuses WHERE name = 'Invoiced'), 'u3e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0108', 'PO-12389', 'INV-2025-234', 72000.00, '2025-09-20 10:15:00', '2025-10-10 09:30:00'),

('l13e7d123-4567-8901-2345-678901234567', 'LEAD-20250905-0001', 'Cust Thirteen', 'Helen Davis', 'hdavis@custthirteen.com', '(555) 345-6789', 'Senior living facility HVAC safety upgrade', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Invoiced'), 'u2e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0095', 'PO-01278', 'INV-2025-198', 45000.00, '2025-09-05 16:45:00', '2025-09-28 11:10:00'),

-- Paid (completed successfully)
('l14e7d123-4567-8901-2345-678901234567', 'LEAD-20250815-0001', 'Cust Fourteen', 'Richard Adams', 'radams@custfourteen.com', '(555) 456-7890', 'Resort common areas climate control', 'b3e7d123-4567-8901-2345-678901234569', (SELECT id FROM lead_statuses WHERE name = 'Paid'), 'u4e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0082', 'PO-98765', 'INV-2025-145', 89000.00, '2025-08-15 12:00:00', '2025-09-25 14:30:00'),

('l15e7d123-4567-8901-2345-678901234567', 'LEAD-20250801-0001', 'Cust Fifteen', 'Lisa Wang', 'lwang@custfifteen.com', '(555) 567-8901', 'Campus-wide compressed air infrastructure', 'b1e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Paid'), 'u2e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0075', 'PO-87654', 'INV-2025-132', 156000.00, '2025-08-01 09:20:00', '2025-09-18 10:45:00'),

-- On hold
('l16e7d123-4567-8901-2345-678901234567', 'LEAD-20251010-0001', 'Cust Sixteen', 'Principal Johnson', 'pjohnson@custsixteen.com', '(555) 678-9012', 'School classroom HVAC upgrade', 'b2e7d123-4567-8901-2345-678901234568', (SELECT id FROM lead_statuses WHERE name = 'On Hold'), 'u3e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0129', NULL, NULL, 68000.00, '2025-10-10 13:30:00', '2025-10-20 15:45:00'),

-- Lost
('l17e7d123-4567-8901-2345-678901234567', 'LEAD-20251003-0001', 'Cust Seventeen', 'Kevin Brown', 'kbrown@custseventeen.com', '(555) 789-0123', 'Store compressed air cost reduction', 'b3e7d123-4567-8901-2345-678901234569', (SELECT id FROM lead_statuses WHERE name = 'Lost'), 'u4e7d123-4567-8901-2345-678901234567', 'u1e7d123-4567-8901-2345-678901234567', 'QT-2025-0126', NULL, NULL, 35000.00, '2025-10-03 11:10:00', '2025-10-18 09:20:00');

-- Insert status history for leads to show progression
INSERT INTO lead_status_history (lead_id, status_id, changed_by, notes, reference_number, alert_date, created_at) VALUES 

-- History for completed lead (Innovation Tech Park)
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u1e7d123-4567-8901-2345-678901234567', 'Initial inquiry received via website form', NULL, '2025-08-03 09:20:00', '2025-08-01 09:20:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u2e7d123-4567-8901-2345-678901234567', 'Comprehensive proposal submitted including smart controls', 'QT-2025-0075', '2025-08-12 14:30:00', '2025-08-05 14:30:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Order Received'), 'u2e7d123-4567-8901-2345-678901234567', 'Purchase order received, project approved by board', 'PO-87654', NULL, '2025-08-12 16:15:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Job Scheduled'), 'u5e7d123-4567-8901-2345-678901234567', 'Installation scheduled for September, permits obtained', NULL, NULL, '2025-08-20 10:00:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'In Progress'), 'u5e7d123-4567-8901-2345-678901234567', 'Phase 1 installation started - main buildings', NULL, NULL, '2025-09-02 08:00:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Installed'), 'u5e7d123-4567-8901-2345-678901234567', 'Installation completed, system tested and commissioned', 'INST-2025-075', NULL, '2025-09-15 17:30:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Invoiced'), 'u2e7d123-4567-8901-2345-678901234567', 'Final invoice sent with warranty documentation', 'INV-2025-132', '2025-10-02 10:00:00', '2025-09-18 10:00:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Paid'), 'u2e7d123-4567-8901-2345-678901234567', 'Payment received, project completed successfully', NULL, NULL, '2025-09-25 14:30:00'),

-- History for current quoted lead (Metro Office Complex)
('l5e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u1e7d123-4567-8901-2345-678901234567', 'Referral from existing customer, site visit completed', NULL, '2025-10-20 13:45:00', '2025-10-18 13:45:00'),
('l5e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u2e7d123-4567-8901-2345-678901234567', 'Detailed proposal with ROI analysis submitted', 'QT-2025-0138', '2025-10-29 09:15:00', '2025-10-22 09:15:00'),

-- History for in-progress lead (Downtown Shopping Center)  
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u1e7d123-4567-8901-2345-678901234567', 'Initial consultation, multiple storefronts involved', NULL, '2025-10-10 12:00:00', '2025-10-08 12:00:00'),
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u4e7d123-4567-8901-2345-678901234567', 'Phased approach proposal for minimal business disruption', 'QT-2025-0128', '2025-10-22 14:20:00', '2025-10-15 14:20:00'),
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Order Received'), 'u4e7d123-4567-8901-2345-678901234567', 'Contract signed, work to begin after hours', 'PO-56723', NULL, '2025-10-22 16:30:00'),
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Job Scheduled'), 'u5e7d123-4567-8901-2345-678901234567', 'Night work schedule coordinated with mall management', NULL, NULL, '2025-10-25 11:00:00'),
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'In Progress'), 'u5e7d123-4567-8901-2345-678901234567', 'Phase 1 complete - common areas done, moving to storefronts', NULL, NULL, '2025-10-28 08:30:00'),

-- History for lost lead (Budget Store Chain)
('l17e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'New Lead'), 'u1e7d123-4567-8901-2345-678901234567', 'Price-sensitive customer, multiple locations', NULL, '2025-10-05 11:10:00', '2025-10-03 11:10:00'),
('l17e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'u4e7d123-4567-8901-2345-678901234567', 'Competitive pricing submitted, emphasized long-term savings', 'QT-2025-0126', '2025-10-17 15:30:00', '2025-10-10 15:30:00'),
('l17e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Lost'), 'u4e7d123-4567-8901-2345-678901234567', 'Lost to competitor on price, customer chose lower quality option', NULL, NULL, '2025-10-18 09:20:00');

-- Create some sample notifications
INSERT INTO notifications (user_id, lead_id, type, message, is_read, created_at) VALUES 

-- Overdue alerts
('u2e7d123-4567-8901-2345-678901234567', 'l3e7d123-4567-8901-2345-678901234567', 'alert', 'OVERDUE: Lead LEAD-20251020-0001 (Cust Three) has been in status "New Lead" for too long', false, '2025-10-30 08:00:00'),
('u3e7d123-4567-8901-2345-678901234567', 'l9e7d123-4567-8901-2345-678901234567', 'alert', 'OVERDUE: Lead LEAD-20251005-0001 (Cust Nine) has been in status "Awaiting Materials" for too long', false, '2025-10-29 08:00:00'),
('u3e7d123-4567-8901-2345-678901234567', 'l12e7d123-4567-8901-2345-678901234567', 'alert', 'OVERDUE: Lead LEAD-20250920-0001 (Cust Twelve) has been in status "Invoiced" for too long', false, '2025-10-28 08:00:00'),

-- Assignment notifications
('u2e7d123-4567-8901-2345-678901234567', 'l1e7d123-4567-8901-2345-678901234567', 'assignment', 'You have been assigned to lead LEAD-20251028-0001 - Cust One', false, '2025-10-28 09:30:00'),
('u3e7d123-4567-8901-2345-678901234567', 'l2e7d123-4567-8901-2345-678901234567', 'assignment', 'You have been assigned to lead LEAD-20251029-0001 - Cust Two', false, '2025-10-29 14:15:00'),

-- Status change notifications
('u5e7d123-4567-8901-2345-678901234567', 'l10e7d123-4567-8901-2345-678901234567', 'status_change', 'Lead LEAD-20251001-0001 status changed to Ready for Installation', false, '2025-10-29 13:40:00'),
('u4e7d123-4567-8901-2345-678901234567', 'l8e7d123-4567-8901-2345-678901234567', 'status_change', 'Lead LEAD-20251008-0001 status changed to In Progress', false, '2025-10-28 08:30:00'),

-- Some read notifications for variety
('u2e7d123-4567-8901-2345-678901234567', 'l15e7d123-4567-8901-2345-678901234567', 'status_change', 'Lead LEAD-20250801-0001 status changed to Paid', true, '2025-09-25 14:30:00'),
('u4e7d123-4567-8901-2345-678901234567', 'l17e7d123-4567-8901-2345-678901234567', 'status_change', 'Lead LEAD-20251003-0001 status changed to Lost', true, '2025-10-18 09:20:00');

-- Sample attachment records (files would need to be uploaded separately)
INSERT INTO attachments (lead_id, status_id, file_name, file_path, file_size, file_type, uploaded_by, created_at) VALUES 

-- Quotes
('l4e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'Sunshine_Retail_Plaza_Quote_QT-2025-0142.pdf', 'l4e7d123-4567-8901-2345-678901234567/quoted/quote_142.pdf', 245760, 'application/pdf', 'u4e7d123-4567-8901-2345-678901234567', '2025-10-27 16:30:00'),
('l5e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Quoted'), 'Metro_Office_Complex_Proposal_QT-2025-0138.pdf', 'l5e7d123-4567-8901-2345-678901234567/quoted/quote_138.pdf', 412890, 'application/pdf', 'u2e7d123-4567-8901-2345-678901234567', '2025-10-22 09:15:00'),

-- Purchase Orders
('l6e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Order Received'), 'Coastal_Warehouse_PO_78459.pdf', 'l6e7d123-4567-8901-2345-678901234567/order_received/po_78459.pdf', 156780, 'application/pdf', 'u3e7d123-4567-8901-2345-678901234567', '2025-10-24 11:20:00'),
('l8e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Order Received'), 'Downtown_Shopping_PO_56723.pdf', 'l8e7d123-4567-8901-2345-678901234567/order_received/po_56723.pdf', 198560, 'application/pdf', 'u4e7d123-4567-8901-2345-678901234567', '2025-10-22 16:30:00'),

-- Invoices
('l12e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Invoiced'), 'Premier_Auto_Invoice_INV-2025-234.pdf', 'l12e7d123-4567-8901-2345-678901234567/invoiced/invoice_234.pdf', 123450, 'application/pdf', 'u3e7d123-4567-8901-2345-678901234567', '2025-10-10 09:30:00'),
('l13e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Invoiced'), 'Golden_Years_Invoice_INV-2025-198.pdf', 'l13e7d123-4567-8901-2345-678901234567/invoiced/invoice_198.pdf', 167890, 'application/pdf', 'u2e7d123-4567-8901-2345-678901234567', '2025-09-28 11:10:00'),

-- Installation photos/documents
('l11e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Installed'), 'Elite_Fitness_Installation_Photos.zip', 'l11e7d123-4567-8901-2345-678901234567/installed/photos.zip', 2456780, 'application/zip', 'u5e7d123-4567-8901-2345-678901234567', '2025-10-15 16:20:00'),
('l15e7d123-4567-8901-2345-678901234567', (SELECT id FROM lead_statuses WHERE name = 'Installed'), 'Innovation_Park_Completion_Report.pdf', 'l15e7d123-4567-8901-2345-678901234567/installed/completion.pdf', 567890, 'application/pdf', 'u5e7d123-4567-8901-2345-678901234567', '2025-09-15 17:30:00');

-- Sample tech bookings for diary/calendar view
INSERT INTO tech_bookings (id, lead_id, technician_id, booking_date, start_time, end_time, location, notes, status, created_at, updated_at) VALUES

-- Upcoming bookings (this week)
('tb1e7d123-4567-8901-2345-678901234567', 'l7e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-01', '08:00:00', '12:00:00', '123 Factory Road, Industrial Park', 'Initial site assessment and equipment measurements', 'scheduled', '2025-10-26 14:45:00', '2025-10-26 14:45:00'),

('tb2e7d123-4567-8901-2345-678901234567', 'l10e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-01', '13:00:00', '17:00:00', '456 Medical Plaza, Suite 200', 'HVAC installation - Phase 1', 'scheduled', '2025-10-29 13:40:00', '2025-10-29 13:40:00'),

('tb3e7d123-4567-8901-2345-678901234567', 'l8e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-02', '09:00:00', '15:00:00', '789 Shopping Lane', 'Continue Phase 2 - Storefront installations', 'scheduled', '2025-10-28 08:30:00', '2025-10-28 08:30:00'),

('tb4e7d123-4567-8901-2345-678901234567', 'l7e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-04', '08:00:00', '16:00:00', '123 Factory Road, Industrial Park', 'Main compressor installation', 'scheduled', '2025-10-26 14:45:00', '2025-10-26 14:45:00'),

('tb5e7d123-4567-8901-2345-678901234567', 'l6e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-05', '07:00:00', '11:00:00', '321 Warehouse Dr', 'Industrial dryer setup and testing', 'scheduled', '2025-10-24 11:20:00', '2025-10-24 11:20:00'),

-- Next week bookings
('tb6e7d123-4567-8901-2345-678901234567', 'l10e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-06', '08:00:00', '12:00:00', '456 Medical Plaza, Suite 200', 'HVAC installation - Phase 2, final testing', 'scheduled', '2025-10-29 13:40:00', '2025-10-29 13:40:00'),

('tb7e7d123-4567-8901-2345-678901234567', 'l8e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-08', '18:00:00', '23:00:00', '789 Shopping Lane', 'Night shift - Final installations and commissioning', 'scheduled', '2025-10-28 08:30:00', '2025-10-28 08:30:00'),

('tb8e7d123-4567-8901-2345-678901234567', 'l7e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-11-11', '08:00:00', '12:00:00', '123 Factory Road, Industrial Park', 'Final testing and commissioning', 'scheduled', '2025-10-26 14:45:00', '2025-10-26 14:45:00'),

-- Completed bookings (for history)
('tb9e7d123-4567-8901-2345-678901234567', 'l11e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-10-10', '09:00:00', '17:00:00', '555 Fitness Ave', 'Gym ventilation system installation', 'completed', '2025-09-25 14:30:00', '2025-10-15 17:00:00'),

('tb10e7d123-4567-8901-2345-678901234567', 'l15e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-09-10', '08:00:00', '16:00:00', '999 Innovation Way', 'Compressed air infrastructure - Phase 1', 'completed', '2025-08-20 10:00:00', '2025-09-10 16:30:00'),

('tb11e7d123-4567-8901-2345-678901234567', 'l15e7d123-4567-8901-2345-678901234567', 'u5e7d123-4567-8901-2345-678901234567', '2025-09-12', '08:00:00', '16:00:00', '999 Innovation Way', 'Compressed air infrastructure - Phase 2', 'completed', '2025-08-20 10:00:00', '2025-09-12 16:45:00');

-- Success message
SELECT 'Sample data has been successfully inserted!' as message,
       'Branches: ' || (SELECT COUNT(*) FROM branches) || ', ' ||
       'Users: ' || (SELECT COUNT(*) FROM profiles) || ', ' ||
       'Leads: ' || (SELECT COUNT(*) FROM leads) || ', ' ||
       'Status History: ' || (SELECT COUNT(*) FROM lead_status_history) || ', ' ||
       'Notifications: ' || (SELECT COUNT(*) FROM notifications WHERE is_read = false) || ' unread, ' ||
       'Attachments: ' || (SELECT COUNT(*) FROM attachments) as summary;