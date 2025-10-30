// Excel to Database Import Script
// This script helps convert your Excel data to the Lead Management System format

import { supabase } from './src/lib/supabase';

// Excel column mapping - adjust these to match your Excel file structure
const EXCEL_COLUMN_MAPPING = {
  // Map your Excel column names to our database fields
  'Lead Number': 'lead_number',
  'Client Name': 'client_name', 
  'Contact Person': 'contact_person',
  'Contact Email': 'contact_email',
  'Contact Phone': 'contact_phone',
  'Description': 'description',
  'Status': 'status_name', // We'll convert this to status_id
  'Branch': 'branch_name', // We'll convert this to branch_id
  'Assigned To': 'assigned_user_name', // We'll convert this to user_id
  'Quote Number': 'quote_number',
  'Order Number': 'order_number',
  'Invoice Number': 'invoice_number',
  'Estimated Value': 'estimated_value',
  'Created Date': 'created_at'
};

// Status mapping from your Excel to our system statuses
const STATUS_MAPPING = {
  'New': 'New Lead',
  'Quoted': 'Quoted',
  'Order': 'Order Received',
  'Scheduled': 'Job Scheduled',
  'In Progress': 'In Progress',
  'Materials': 'Awaiting Materials',
  'Ready': 'Ready for Installation',
  'Installed': 'Installed',
  'Invoiced': 'Invoiced',
  'Paid': 'Paid',
  'Hold': 'On Hold',
  'Lost': 'Lost'
};

// Sample function to process Excel data
async function importExcelData(excelData) {
  console.log('Starting Excel data import...');
  
  try {
    // 1. Load reference data
    const { data: statuses } = await supabase
      .from('lead_statuses')
      .select('id, name');
    
    const { data: branches } = await supabase
      .from('branches') 
      .select('id, name');
    
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name');

    // Create lookup maps
    const statusMap = Object.fromEntries(statuses.map(s => [s.name, s.id]));
    const branchMap = Object.fromEntries(branches.map(b => [b.name, b.id]));
    const userMap = Object.fromEntries(users.map(u => [u.full_name, u.id]));

    // 2. Process each row from Excel
    const processedLeads = [];
    
    for (const row of excelData) {
      // Map Excel columns to database fields
      const lead = {};
      
      for (const [excelCol, dbField] of Object.entries(EXCEL_COLUMN_MAPPING)) {
        if (row[excelCol] !== undefined && row[excelCol] !== '') {
          lead[dbField] = row[excelCol];
        }
      }

      // Convert status name to ID
      if (lead.status_name) {
        const mappedStatus = STATUS_MAPPING[lead.status_name] || lead.status_name;
        lead.current_status_id = statusMap[mappedStatus];
        delete lead.status_name;
      }

      // Convert branch name to ID
      if (lead.branch_name) {
        lead.branch_id = branchMap[lead.branch_name];
        delete lead.branch_name;
      }

      // Convert user name to ID
      if (lead.assigned_user_name) {
        lead.assigned_to = userMap[lead.assigned_user_name];
        delete lead.assigned_user_name;
      }

      // Parse estimated value if it's a string
      if (lead.estimated_value && typeof lead.estimated_value === 'string') {
        lead.estimated_value = parseFloat(lead.estimated_value.replace(/[,$]/g, ''));
      }

      // Format date if needed
      if (lead.created_at && typeof lead.created_at === 'string') {
        lead.created_at = new Date(lead.created_at).toISOString();
      }

      // Generate lead number if not provided
      if (!lead.lead_number) {
        const date = new Date(lead.created_at || new Date());
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const sequence = String(processedLeads.length + 1).padStart(4, '0');
        lead.lead_number = `LEAD-${dateStr}-${sequence}`;
      }

      // Set created_by to first admin user if not specified
      if (!lead.created_by) {
        const adminUser = users.find(u => u.role === 'admin');
        lead.created_by = adminUser?.id;
      }

      processedLeads.push(lead);
    }

    // 3. Insert leads into database
    console.log(`Inserting ${processedLeads.length} leads...`);
    
    const { data: insertedLeads, error } = await supabase
      .from('leads')
      .insert(processedLeads)
      .select();

    if (error) {
      throw error;
    }

    console.log(`Successfully imported ${insertedLeads.length} leads!`);
    return insertedLeads;

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Function to export current data to Excel format
async function exportToExcel() {
  try {
    const { data: leads } = await supabase
      .from('leads')
      .select(`
        *,
        branch:branches(name),
        current_status:lead_statuses(name),
        assigned_user:profiles!leads_assigned_to_fkey(full_name),
        created_by_user:profiles!leads_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    // Convert to Excel-friendly format
    const excelData = leads.map(lead => ({
      'Lead Number': lead.lead_number,
      'Client Name': lead.client_name,
      'Contact Person': lead.contact_person || '',
      'Contact Email': lead.contact_email || '',
      'Contact Phone': lead.contact_phone || '',
      'Description': lead.description || '',
      'Status': lead.current_status?.name || '',
      'Branch': lead.branch?.name || '',
      'Assigned To': lead.assigned_user?.full_name || '',
      'Quote Number': lead.quote_number || '',
      'Order Number': lead.order_number || '',
      'Invoice Number': lead.invoice_number || '',
      'Estimated Value': lead.estimated_value || 0,
      'Created Date': new Date(lead.created_at).toLocaleDateString(),
      'Updated Date': new Date(lead.updated_at).toLocaleDateString(),
      'Created By': lead.created_by_user?.full_name || ''
    }));

    return excelData;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// Example usage with CSV parsing (you can adapt this for Excel files)
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ''));
}

// Export functions for use
export {
  importExcelData,
  exportToExcel,
  parseCSV,
  EXCEL_COLUMN_MAPPING,
  STATUS_MAPPING
};