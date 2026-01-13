import { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, FileImage } from 'lucide-react';
import jsPDF from 'jspdf';
import type { JobCardTemplate } from '../lib/api';
import type { TemplateGroup, TableColumn, TableDefinition, TableRow, HeaderConfig, FooterConfig } from './JobCardFormBuilder';
import { getGlobalHeaderConfig, getGlobalFooterConfig } from '../utils/jobCardConfig';

/**
 * Example data structure for preview.
 */
interface ExampleData {
  [tableId: string]: {
    [columnId: string]: string | number | boolean | null;
  };
}

/**
 * Props for JobCardPreview component.
 */
interface JobCardPreviewProps {
  template: JobCardTemplate;
  onClose: () => void;
}

/**
 * Job Card Preview component.
 * Allows previewing a job card template with example data and generating PDF.
 */
export function JobCardPreview({ template, onClose }: JobCardPreviewProps) {
  const [exampleData, setExampleData] = useState<ExampleData>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const groups = (template as any).groups || [];
  // Use global header/footer config instead of template-specific
  const headerConfig: HeaderConfig = getGlobalHeaderConfig();
  const footerConfig: FooterConfig = getGlobalFooterConfig();

  /**
   * Initializes example data with default values.
   */
  useEffect(() => {
    const defaults: ExampleData = {};
    
    groups.forEach((group: TemplateGroup) => {
      group.tables.forEach((table) => {
        defaults[table.id] = {};
        table.columns.forEach((column: TableColumn) => {
          if (column.isPreFilled && column.defaultValue) {
            defaults[table.id][column.id] = column.defaultValue;
          } else if (!column.isPreFilled) {
            switch (column.type) {
              case 'checkbox':
                defaults[table.id][column.id] = false;
                break;
              case 'number':
                defaults[table.id][column.id] = '0';
                break;
              case 'date':
                defaults[table.id][column.id] = new Date().toLocaleDateString();
                break;
              default:
                defaults[table.id][column.id] = '';
            }
          }
        });
      });
    });
    
    setExampleData(defaults);
    
    // Set logo if configured
    if (headerConfig.logoUrl) {
      setLogoUrl(headerConfig.logoUrl);
    }
  }, [template, groups, headerConfig]);

  /**
   * Handles logo file upload.
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Updates example data for a column.
   */
  const updateExampleData = (tableId: string, columnId: string, value: string | number | boolean) => {
    setExampleData({
      ...exampleData,
      [tableId]: {
        ...exampleData[tableId],
        [columnId]: value,
      },
    });
  };

  /**
   * Gets the value for a column.
   */
  const getColumnValue = (tableId: string, columnId: string): string => {
    const value = exampleData[tableId]?.[columnId];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? '✓' : '';
    return String(value);
  };

  /**
   * Renders the header.
   */
  const renderHeader = () => {
    return (
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left side - Logo and Company Details */}
          <div>
            {logoUrl && (
              <div className="mb-3">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            {headerConfig.companyName && (
              <div className="font-semibold text-lg mb-1">{headerConfig.companyName}</div>
            )}
            {headerConfig.vatNumber && (
              <div className="text-sm text-gray-600">VAT: {headerConfig.vatNumber}</div>
            )}
            {headerConfig.registrationNumber && (
              <div className="text-sm text-gray-600">Reg: {headerConfig.registrationNumber}</div>
            )}
          </div>

          {/* Right side - Address and Template Name */}
          <div className="text-right">
            {headerConfig.address && (
              <div className="text-sm mb-1">{headerConfig.address}</div>
            )}
            {(headerConfig.city || headerConfig.postalCode) && (
              <div className="text-sm mb-1">
                {headerConfig.city}{headerConfig.city && headerConfig.postalCode ? ', ' : ''}{headerConfig.postalCode}
              </div>
            )}
            {headerConfig.phone && (
              <div className="text-sm mb-1">Tel: {headerConfig.phone}</div>
            )}
            {headerConfig.email && (
              <div className="text-sm mb-3">Email: {headerConfig.email}</div>
            )}
            <div className="font-bold text-xl border-t-2 border-gray-300 pt-2 mt-2">
              {template.name}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a table.
   */
  const renderTable = (group: TemplateGroup, table: TableDefinition) => {
    if (table.columns.length === 0) return null;

    // Check if table has multiple rows enabled
    const hasMultipleRows = table.columns.some(col => col.isPreFilled && col.allowMultipleRows);
    const rows = table.rows || [];

    return (
      <div key={table.id} className="mb-6">
        <h3 className="font-semibold text-lg mb-3">{table.name}</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {table.columns.map((column: TableColumn) => (
                <th
                  key={column.id}
                  className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm"
                  style={{ width: column.width ? `${column.width}%` : 'auto' }}
                >
                  {column.label}
                  {column.isRequired && !column.isPreFilled && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasMultipleRows && rows.length > 0 ? (
              // Render multiple rows
              rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column: TableColumn) => (
                    <td
                      key={column.id}
                      className="border border-gray-300 px-3 py-2 text-sm"
                    >
                      {column.isPreFilled && column.allowMultipleRows ? (
                        // Show pre-filled value from row
                        <span className="text-gray-700">
                          {String(row.values[column.id] || column.defaultValue || '-')}
                        </span>
                      ) : column.isPreFilled ? (
                        // Single pre-filled value
                        <span className="text-gray-700">
                          {getColumnValue(table.id, column.id) || column.defaultValue || '-'}
                        </span>
                      ) : (
                        // Technician fills this
                        <span className="text-gray-500 italic">
                          {getColumnValue(table.id, column.id) || '[To be filled]'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Single row (legacy or no multiple rows)
              <tr>
                {table.columns.map((column: TableColumn) => (
                  <td
                    key={column.id}
                    className="border border-gray-300 px-3 py-2 text-sm"
                  >
                    {column.isPreFilled ? (
                      <span className="text-gray-700">{getColumnValue(table.id, column.id) || column.defaultValue || '-'}</span>
                    ) : (
                      <span className="text-gray-500 italic">
                        {getColumnValue(table.id, column.id) || '[To be filled]'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * Renders the footer.
   */
  const renderFooter = () => {
    return (
      <div className="border-t-2 border-gray-300 pt-6 mt-6">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="border-b-2 border-gray-400 mb-2" style={{ height: '60px' }}></div>
            <div className="text-sm font-medium">{footerConfig.technicianSignatureLabel || 'Technician Signature'}</div>
          </div>
          <div>
            <div className="border-b-2 border-gray-400 mb-2" style={{ height: '60px' }}></div>
            <div className="text-sm font-medium">{footerConfig.customerSignatureLabel || 'Customer Signature'}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-gray-300 mb-2" style={{ height: '30px' }}></div>
            <div className="text-sm font-medium">{footerConfig.dateLabel || 'Date'}</div>
          </div>
          {footerConfig.notesLabel && (
            <div>
              <div className="border border-gray-300 mb-2 p-2" style={{ minHeight: '60px' }}></div>
              <div className="text-sm font-medium">{footerConfig.notesLabel}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Generates a PDF from the preview.
   */
  const generatePDF = () => {
    const pageWidth = template.pageWidth || 8.5;
    const pageHeight = template.pageHeight || 11;
    const marginTop = template.marginTop || 0.5;
    const marginBottom = template.marginBottom || 0.5;
    const marginLeft = template.marginLeft || 0.5;
    const marginRight = template.marginRight || 0.5;

    const pdf = new jsPDF({
      orientation: pageHeight > pageWidth ? 'portrait' : 'landscape',
      unit: 'in',
      format: [pageWidth, pageHeight],
    });

    let y = marginTop;

    // Header
    if (logoUrl) {
      try {
        pdf.addImage(logoUrl, 'PNG', marginLeft, y, 1.5, 0.5);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }

    y += 0.6;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    if (headerConfig.companyName) {
      pdf.text(headerConfig.companyName, marginLeft, y);
    }

    y += 0.15;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    if (headerConfig.vatNumber) {
      pdf.text(`VAT: ${headerConfig.vatNumber}`, marginLeft, y);
      y += 0.15;
    }
    if (headerConfig.registrationNumber) {
      pdf.text(`Reg: ${headerConfig.registrationNumber}`, marginLeft, y);
      y += 0.2;
    }

    // Address on right
    let addressY = marginTop + 0.6;
    pdf.setFontSize(10);
    if (headerConfig.address) {
      pdf.text(headerConfig.address, pageWidth - marginRight, addressY, { align: 'right' });
      addressY += 0.15;
    }
    if (headerConfig.city || headerConfig.postalCode) {
      pdf.text(`${headerConfig.city || ''}${headerConfig.city && headerConfig.postalCode ? ', ' : ''}${headerConfig.postalCode || ''}`, 
        pageWidth - marginRight, addressY, { align: 'right' });
      addressY += 0.15;
    }
    if (headerConfig.phone) {
      pdf.text(`Tel: ${headerConfig.phone}`, pageWidth - marginRight, addressY, { align: 'right' });
      addressY += 0.15;
    }
    if (headerConfig.email) {
      pdf.text(`Email: ${headerConfig.email}`, pageWidth - marginRight, addressY, { align: 'right' });
    }

    // Template name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(template.name, pageWidth - marginRight, addressY + 0.3, { align: 'right' });

    y = Math.max(y, addressY + 0.5) + 0.3;

    // Groups and Tables
    groups.forEach((group: TemplateGroup) => {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(group.name, marginLeft, y);
      y += 0.2;

      group.tables.forEach((table) => {
        if (table.columns.length === 0) return;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(table.name, marginLeft + 0.1, y);
        y += 0.15;

        // Table header
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setDrawColor(0, 0, 0); // Black border
        pdf.setFillColor(240, 240, 240); // Light gray background for header
        let x = marginLeft + 0.1;
        const colWidth = (pageWidth - marginLeft - marginRight - 0.2) / table.columns.length;
        
        table.columns.forEach((column: TableColumn) => {
          pdf.rect(x, y - 0.12, colWidth, 0.15, 'FD'); // F = fill, D = draw
          pdf.setTextColor(0, 0, 0);
          pdf.text(column.label, x + 0.05, y, { maxWidth: colWidth - 0.1 });
          x += colWidth;
        });
        y += 0.2;

        // Check if table has multiple rows
        const hasMultipleRows = table.columns.some(col => col.isPreFilled && col.allowMultipleRows);
        const rows = table.rows || [];

        // Set colors for table cells - white fill, black border and text
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);

        if (hasMultipleRows && rows.length > 0) {
          // Render multiple rows
          rows.forEach((row) => {
            pdf.setFont('helvetica', 'normal');
            x = marginLeft + 0.1;
            table.columns.forEach((column: TableColumn) => {
              let value: string;
              if (column.isPreFilled && column.allowMultipleRows) {
                value = String(row.values[column.id] || column.defaultValue || '-');
              } else if (column.isPreFilled) {
                value = getColumnValue(table.id, column.id) || column.defaultValue || '-';
              } else {
                value = getColumnValue(table.id, column.id) || '[To be filled]';
              }
              // Draw rectangle with white fill and black border in one call
              pdf.setFillColor(255, 255, 255);
              pdf.setDrawColor(0, 0, 0);
              pdf.rect(x, y - 0.12, colWidth, 0.15, 'FD'); // Fill and Draw
              pdf.setTextColor(0, 0, 0);
              pdf.text(String(value).substring(0, 30), x + 0.05, y, { maxWidth: colWidth - 0.1 });
              x += colWidth;
            });
            y += 0.2;
            
            if (y > pageHeight - marginBottom - 1) {
              pdf.addPage();
              y = marginTop;
            }
          });
        } else {
          // Single row (legacy)
          pdf.setFont('helvetica', 'normal');
          x = marginLeft + 0.1;
          table.columns.forEach((column: TableColumn) => {
            const value = column.isPreFilled 
              ? (getColumnValue(table.id, column.id) || column.defaultValue || '-')
              : (getColumnValue(table.id, column.id) || '[To be filled]');
            // Draw rectangle with white fill and black border in one call
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(x, y - 0.12, colWidth, 0.15, 'FD'); // Fill and Draw
            pdf.setTextColor(0, 0, 0);
            pdf.text(String(value).substring(0, 30), x + 0.05, y, { maxWidth: colWidth - 0.1 });
            x += colWidth;
          });
          y += 0.3;
        }

        if (y > pageHeight - marginBottom - 1) {
          pdf.addPage();
          y = marginTop;
        }
      });

      y += 0.2;
    });

    // Footer
    if (y > pageHeight - marginBottom - 1.5) {
      pdf.addPage();
      y = marginTop;
    }

    y = pageHeight - marginBottom - 1;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Signatures
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);
    pdf.setLineWidth(0.01);
    pdf.line(marginLeft, y, marginLeft + 3, y);
    pdf.text(footerConfig.technicianSignatureLabel || 'Technician Signature', marginLeft, y + 0.15);
    
    pdf.line(pageWidth - marginRight - 3, y, pageWidth - marginRight, y);
    pdf.text(footerConfig.customerSignatureLabel || 'Customer Signature', pageWidth - marginRight - 3, y + 0.15);

    y += 0.4;
    pdf.line(marginLeft, y, marginLeft + 2, y);
    pdf.text(footerConfig.dateLabel || 'Date', marginLeft, y + 0.15);

    // Generate filename
    const filename = `${template.name.replace(/\s+/g, '_')}_preview.pdf`;

    pdf.save(filename);
  };

  /**
   * Prints the preview.
   */
  const handlePrint = () => {
    if (!previewRef.current) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col" style={{ zIndex: 10000, position: 'relative' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Preview: {template.name}</h2>
            <p className="text-sm text-gray-600">Enter example data and preview the job card</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Example Data Input */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Example Data</h3>
            
            {/* Logo Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {logoUrl && (
                <div className="mt-2">
                  <img src={logoUrl} alt="Logo preview" className="max-w-full h-20 object-contain border border-gray-300 rounded" />
                </div>
              )}
            </div>

            {/* Header Config */}
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Header Details</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div>Company: {headerConfig.companyName || 'Not set'}</div>
                <div>VAT: {headerConfig.vatNumber || 'Not set'}</div>
                <div>Reg: {headerConfig.registrationNumber || 'Not set'}</div>
              </div>
            </div>

            {/* Field Inputs */}
            <div className="space-y-4">
              {groups.map((group: TemplateGroup) => (
                <div key={group.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <h4 className="font-semibold text-sm text-gray-800 mb-3">{group.name}</h4>
                  {group.tables.map((table) => (
                    <div key={table.id} className="mb-4 last:mb-0">
                      <h5 className="font-medium text-xs text-gray-700 mb-2">{table.name}</h5>
                      <div className="space-y-2">
                        {table.columns
                          .filter((col: TableColumn) => !col.isPreFilled)
                          .map((column: TableColumn) => (
                            <div key={column.id}>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {column.label}
                                {column.isRequired && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {column.type === 'textarea' ? (
                                <textarea
                                  value={getColumnValue(table.id, column.id)}
                                  onChange={(e) => updateExampleData(table.id, column.id, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  rows={2}
                                />
                              ) : column.type === 'checkbox' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={exampleData[table.id]?.[column.id] as boolean || false}
                                    onChange={(e) => updateExampleData(table.id, column.id, e.target.checked)}
                                    className="w-3 h-3"
                                  />
                                  <span className="text-xs text-gray-600">Checked</span>
                                </div>
                              ) : column.type === 'select' ? (
                                <select
                                  value={getColumnValue(table.id, column.id)}
                                  onChange={(e) => updateExampleData(table.id, column.id, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                >
                                  <option value="">Select...</option>
                                  {column.options?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                                  value={getColumnValue(table.id, column.id)}
                                  onChange={(e) => {
                                    const value = column.type === 'number' 
                                      ? parseFloat(e.target.value) || 0
                                      : e.target.value;
                                    updateExampleData(table.id, column.id, value);
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-8" style={{ position: 'relative', zIndex: 1 }}>
            <div
              ref={previewRef}
              className="bg-white shadow-lg p-8 max-w-4xl mx-auto"
              style={{ minHeight: '100%', position: 'relative', zIndex: 1 }}
            >
              {renderHeader()}
              
              {groups.map((group: TemplateGroup) => (
                <div key={group.id} className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">{group.name}</h2>
                  {group.tables.map((table) => renderTable(group, table))}
                </div>
              ))}
              
              {renderFooter()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
