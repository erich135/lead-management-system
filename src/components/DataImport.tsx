// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface DataImportProps {
  onImportComplete: () => void;
}

interface ImportResults {
  successful: number;
  failed: number;
  errors: string[];
}

export function DataImport({ onImportComplete }: DataImportProps) {
  const { isAdmin } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only admins can import data
  if (!isAdmin) {
    return null;
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setImportResults(null);

    try {
      const text = await file.text();
      
      // Simple CSV parser (you can extend this for Excel files)
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      // Load reference data
      const [statusRes, branchRes, userRes] = await Promise.all([
        supabase.from('lead_statuses').select('id, name'),
        supabase.from('branches').select('id, name'),
        supabase.from('profiles').select('id, full_name, role')
      ]);

      const statusMap = Object.fromEntries(statusRes.data.map(s => [s.name, s.id]));
      const branchMap = Object.fromEntries(branchRes.data.map(b => [b.name, b.id]));
      const userMap = Object.fromEntries(userRes.data.map(u => [u.full_name, u.id]));
      const adminUser = userRes.data.find(u => u.role === 'admin');

      // Process the data
      const processedLeads = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const lead = {
            client_name: row['Client Name'] || row['Company Name'] || '',
            contact_person: row['Contact Person'] || row['Contact'] || '',
            contact_email: row['Contact Email'] || row['Email'] || '',
            contact_phone: row['Contact Phone'] || row['Phone'] || '',
            description: row['Description'] || row['Notes'] || '',
            created_by: adminUser?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Handle status
          const statusName = row['Status'] || 'New Lead';
          lead.current_status_id = statusMap[statusName] || statusMap['New Lead'];

          // Handle branch
          if (row['Branch'] && branchMap[row['Branch']]) {
            lead.branch_id = branchMap[row['Branch']];
          }

          // Handle assigned user
          if (row['Assigned To'] && userMap[row['Assigned To']]) {
            lead.assigned_to = userMap[row['Assigned To']];
          }

          // Handle estimated value
          if (row['Estimated Value'] || row['Value']) {
            const value = (row['Estimated Value'] || row['Value']).toString();
            lead.estimated_value = parseFloat(value.replace(/[,$]/g, '')) || 0;
          }

          // Handle reference numbers
          if (row['Quote Number']) lead.quote_number = row['Quote Number'];
          if (row['Order Number']) lead.order_number = row['Order Number'];
          if (row['Invoice Number']) lead.invoice_number = row['Invoice Number'];

          // Generate lead number if not provided
          if (!row['Lead Number']) {
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const sequence = String(i + 1).padStart(4, '0');
            lead.lead_number = `LEAD-${date}-${sequence}`;
          } else {
            lead.lead_number = row['Lead Number'];
          }

          if (!lead.client_name) {
            errors.push(`Row ${i + 2}: Client Name is required`);
            continue;
          }

          processedLeads.push(lead);
        } catch (err) {
          errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }

      if (errors.length > 0 && processedLeads.length === 0) {
        throw new Error(`Import failed:\n${errors.join('\n')}`);
      }

      // Insert the leads
      const { data: insertedLeads, error: insertError } = await supabase
        .from('leads')
        .insert(processedLeads)
        .select();

      if (insertError) {
        throw insertError;
      }

      setImportResults({
        success: insertedLeads.length,
        errors: errors.length,
        errorDetails: errors
      });

      if (onImportComplete) {
        onImportComplete(insertedLeads);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function loadSampleData() {
    setImporting(true);
    setError(null);

    try {
      // This would run the sample data SQL script
      // For now, we'll create a few sample leads programmatically
      const sampleLeads = [
        {
          client_name: 'Demo Company A',
          contact_person: 'John Smith',
          contact_email: 'john@democompany-a.com',
          contact_phone: '(555) 123-4567',
          description: 'Office lighting upgrade project',
          estimated_value: 25000,
          current_status_id: (await supabase.from('lead_statuses').select('id').eq('name', 'New Lead').single()).data.id,
          created_by: (await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()).data.id
        },
        {
          client_name: 'Demo Company B',
          contact_person: 'Sarah Johnson',
          contact_email: 'sarah@democompany-b.com',
          contact_phone: '(555) 234-5678',
          description: 'Warehouse LED conversion',
          estimated_value: 45000,
          current_status_id: (await supabase.from('lead_statuses').select('id').eq('name', 'Quoted').single()).data.id,
          quote_number: 'QT-2025-0001',
          created_by: (await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()).data.id
        }
      ];

      const { data: insertedLeads, error } = await supabase
        .from('leads')
        .insert(sampleLeads)
        .select();

      if (error) throw error;

      setImportResults({
        success: insertedLeads.length,
        errors: 0,
        errorDetails: []
      });

      if (onImportComplete) {
        onImportComplete(insertedLeads);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const template = [
      'Client Name,Contact Person,Contact Email,Contact Phone,Description,Status,Branch,Assigned To,Estimated Value,Quote Number,Order Number,Invoice Number',
      'ABC Manufacturing,John Smith,john@abc.com,(555) 123-4567,LED lighting upgrade,New Lead,Main Office,Sarah Sales,25000,,,',
      'XYZ Restaurant,Jane Doe,jane@xyz.com,(555) 234-5678,Kitchen ventilation,Quoted,North Branch,Mike North,15000,QT-2025-0001,,',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Data</h3>
        <p className="text-gray-600">
          Import leads from your existing Excel/CSV file or load sample data for demonstration.
        </p>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="flex text-sm text-gray-600 justify-center">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    disabled={importing}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV files up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Template Download */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-900">Need a template?</span>
          </div>
          <button
            onClick={downloadTemplate}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Download className="w-4 h-4 inline mr-1" />
            Download Template
          </button>
        </div>

        {/* Sample Data */}
        <div className="border-t pt-4">
          <button
            onClick={loadSampleData}
            disabled={importing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Load Sample Data
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            This will create sample leads to demonstrate the system
          </p>
        </div>

        {/* Results */}
        {importResults && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-800">Import Complete</h4>
            </div>
            <p className="text-green-700">
              Successfully imported {importResults.success} leads.
              {importResults.errors > 0 && ` ${importResults.errors} rows had errors.`}
            </p>
            {importResults.errorDetails.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-green-600">View errors</summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                  {importResults.errorDetails.join('\n')}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-red-800">Import Failed</h4>
            </div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">CSV Format Instructions</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Required:</strong> Client Name</li>
          <li>• <strong>Optional:</strong> Contact Person, Contact Email, Contact Phone, Description</li>
          <li>• <strong>Status:</strong> Use: New Lead, Quoted, Order Received, etc.</li>
          <li>• <strong>Branch:</strong> Must match existing branch names</li>
          <li>• <strong>Assigned To:</strong> Must match existing user names</li>
          <li>• <strong>Estimated Value:</strong> Numbers only (currency symbols will be removed)</li>
        </ul>
      </div>
    </div>
  );
}