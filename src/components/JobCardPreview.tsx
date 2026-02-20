import { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, FileImage } from 'lucide-react';
import jsPDF from 'jspdf';
import type { JobCardTemplate } from '../lib/api';
import type { TemplateGroup, TableColumn, TableDefinition, TableRow, HeaderConfig, FooterConfig, GridCell } from './JobCardFormBuilder';
import { JOB_FIELD_KEYS, MACHINE_FIELD_KEYS } from './JobCardFormBuilder';
import { getGlobalHeaderConfig, getGlobalFooterConfig } from '../utils/jobCardConfig';
import { formatDate } from '../utils/dateFormat';

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
 * When jobData and/or reportNumber are provided (e.g. when viewing a submission), they are shown instead of placeholders.
 */
interface JobCardPreviewProps {
  template: JobCardTemplate;
  onClose: () => void;
  /** Job data when previewing with an assigned job (pulls job field values). */
  jobData?: Record<string, any>;
  /** Assigned machine data when the job card is for a specific machine (pulls machine field values). */
  machineData?: Record<string, any>;
  /** Report/RSR number when previewing a specific report. */
  reportNumber?: string;
}

/**
 * Returns display value for a job field key from job data.
 */
function getJobFieldValue(jobData: Record<string, any> | undefined, key: string): string {
  if (!jobData) return '';
  switch (key) {
    case 'jobNumber': return jobData.jobNumber ?? '';
    case 'customer': return (typeof jobData.customer === 'object' && jobData.customer?.name) ? jobData.customer.name : (jobData.customer ?? '');
    case 'cashCustomer': return jobData.cashCustomer ?? '';
    case 'serialNumber': {
      const machines = jobData.machines;
      if (Array.isArray(machines) && machines.length > 0) {
        const first = machines[0];
        return (typeof first === 'object' && first?.serialNumber) ? first.serialNumber : (first ?? '');
      }
      return '';
    }
    case 'branch': return (typeof jobData.branch === 'object' && jobData.branch?.name) ? jobData.branch.name : (jobData.branch ?? '');
    case 'status': return (typeof jobData.status === 'object' && jobData.status?.name) ? jobData.status.name : (jobData.status ?? '');
    case 'adm': return jobData.adm ?? '';
    case 'assistingAdm': return jobData.assistingAdm ?? '';
    case 'repCode': return (typeof jobData.repCode === 'object' && jobData.repCode?.code) ? jobData.repCode.code : (jobData.repCode ?? '');
    case 'notes': return jobData.notes ?? '';
    case 'startDate': return jobData.startDate ? formatDate(jobData.startDate) : '';
    case 'dateQuoted': return jobData.dateQuoted ? formatDate(jobData.dateQuoted) : '';
    case 'valueExVat': return jobData.valueExVat != null ? String(jobData.valueExVat) : '';
    case 'poNumber': return jobData.poNumber ?? '';
    case 'rsrNumber': return jobData.rsrNumber ?? '';
    case 'description': return (typeof jobData.description === 'object' && jobData.description?.name) ? jobData.description.name : (jobData.description ?? '');
    case 'techBooked': return (typeof jobData.techBooked === 'object' && jobData.techBooked?.name) ? jobData.techBooked.name : (jobData.techBooked ?? '');
    case 'dateBooked': return jobData.dateBooked ? formatDate(jobData.dateBooked) : '';
    case 'storePack': return jobData.storePack ?? '';
    case 'storePackDate': return jobData.storePackDate ? formatDate(jobData.storePackDate) : '';
    case 'invNumber': return jobData.invNumber ?? '';
    case 'invoiceDate': return jobData.invoiceDate ? formatDate(jobData.invoiceDate) : '';
    case 'oilSampleNumber': return jobData.oilSampleNumber ?? '';
    default: return '';
  }
}

/**
 * Returns human-readable label for a job field key (for placeholders).
 */
function getJobFieldLabel(key: string): string {
  const found = JOB_FIELD_KEYS.find((o) => o.value === key);
  return found ? found.label : key;
}

/**
 * Returns display value for a machine field key from machine data.
 */
function getMachineFieldValue(machineData: Record<string, any> | undefined, key: string): string {
  if (!machineData) return '';
  switch (key) {
    case 'make': return machineData.make ?? '';
    case 'model': return machineData.model ?? '';
    case 'serialNumber': return machineData.serialNumber ?? '';
    case 'assetNumber': return machineData.assetNumber ?? '';
    case 'machineHours': return machineData.machineHours != null ? String(machineData.machineHours) : '';
    case 'nextServiceHours': return machineData.nextServiceHours != null ? String(machineData.nextServiceHours) : '';
    case 'lastServiceDate': return machineData.lastServiceDate ? formatDate(machineData.lastServiceDate) : '';
    case 'nextServiceDate': return machineData.nextServiceDate ? formatDate(machineData.nextServiceDate) : '';
    case 'serviceType': return machineData.serviceType ?? '';
    case 'isRental': return machineData.isRental === true ? 'Yes' : 'No';
    case 'dbStatus': return machineData.dbStatus ?? '';
    default: return '';
  }
}

/**
 * Returns human-readable label for a machine field key (for placeholders).
 */
function getMachineFieldLabel(key: string): string {
  const found = MACHINE_FIELD_KEYS.find((o) => o.value === key);
  return found ? found.label : key;
}

/**
 * Returns whether a checkbox cell is considered checked (for preview/PDF when form is filled).
 * Accepts boolean, "true", "yes", "1", "x" (case-insensitive).
 */
function isCheckboxChecked(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === 'x';
  }
  return false;
}

/**
 * Job Card Preview component.
 * Allows previewing a job card template with example data and generating PDF.
 */
export function JobCardPreview({ template, onClose, jobData, machineData, reportNumber }: JobCardPreviewProps) {
  const [exampleData, setExampleData] = useState<ExampleData>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const groups = (template as any).groups || [];
  const showHeader = (template as any).showHeader !== false;
  const showTableTitles = (template as any).showTableTitles !== false;
  const showGroupTitle = (template as any).showGroupTitle === true;
  const showReportTitle = (template as any).showReportTitle === true;
  const spaceBetweenBlocks = (template as any).spaceBetweenBlocks !== false;
  const headerConfig: HeaderConfig = getGlobalHeaderConfig();
  const footerConfig: FooterConfig = getGlobalFooterConfig();

  /**
   * Initializes example data with default values (legacy column-based tables only).
   * Runs when template or its groups change. Does not depend on headerConfig (getGlobalHeaderConfig()
   * returns a new object every render, which would cause an infinite loop).
   */
  useEffect(() => {
    const defaults: ExampleData = {};
    const templateGroups = (template as any).groups || [];

    templateGroups.forEach((group: TemplateGroup) => {
      group.tables.forEach((table) => {
        if (!table.columns?.length) return;
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

    const config = getGlobalHeaderConfig();
    if (config.logoUrl) {
      setLogoUrl(config.logoUrl);
    }
  }, [template]);

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
   * Renders the header (only when showHeader is true).
   */
  const renderHeader = () => {
    if (!showHeader) return null;
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
            {headerConfig.showReportNumberInHeader && (
              <div className="text-sm font-medium text-gray-700 mt-2">
                {headerConfig.reportNumberHeaderLabel || 'Report #'}: {reportNumber != null && reportNumber !== '' ? reportNumber : '[Report #]'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders the report title (template name) centered below the header when showReportTitle is true.
   */
  const renderReportTitle = () => {
    if (!showReportTitle || !template.name) return null;
    return (
      <div className="text-center py-4 mb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">{template.name}</h1>
      </div>
    );
  };

  /**
   * Renders a field row: a single line of "Label: value" pairs with no table borders.
   * Values are replaced with job data or static text (no printed fill-in lines).
   */
  const renderFieldRow = (_group: TemplateGroup, table: TableDefinition) => {
    const cells = table.cells ?? [];
    const numCols = table.gridCols ?? 0;
    const pairs: { label: string; value: string }[] = [];
    for (let i = 0; i < numCols / 2; i++) {
      const labelCell = cells.find((c) => c.row === 0 && c.col === i * 2);
      const valueCell = cells.find((c) => c.row === 0 && c.col === i * 2 + 1);
      if (!labelCell || !valueCell) continue;
      const label = labelCell.label ?? '';
      let value = '';
      if (valueCell.type === 'jobField') {
        value = getJobFieldValue(jobData, valueCell.jobFieldKey ?? 'jobNumber') || `[Job: ${getJobFieldLabel(valueCell.jobFieldKey ?? 'jobNumber')}]`;
      } else if (valueCell.type === 'machineField') {
        value = getMachineFieldValue(machineData, valueCell.machineFieldKey ?? 'serialNumber') || `[Machine: ${getMachineFieldLabel(valueCell.machineFieldKey ?? 'serialNumber')}]`;
      } else if (valueCell.type === 'staticText' && valueCell.value != null) {
        value = valueCell.value;
      }
      pairs.push({ label, value });
    }
    if (pairs.length === 0) return null;
    const layout = table.layout ?? 'full';
    const blockSpacingClass = spaceBetweenBlocks ? 'mb-6' : 'mb-0';
    const numPairs = pairs.length;
    return (
      <div key={table.id} className={`${blockSpacingClass} w-full min-w-0 ${layout === 'full' ? 'max-w-2xl' : ''}`}>
        {showTableTitles && <h3 className="font-semibold text-lg mb-3">{table.name}</h3>}
        {/* Bootstrap-style row: equal-width columns (e.g. 3 cols = each 1/3 of row) */}
        <div
          className={`grid w-full text-sm ${!showTableTitles ? 'mt-0' : ''}`}
          style={{ gridTemplateColumns: `repeat(${numPairs}, minmax(0, 1fr))` }}
        >
          {pairs.map((p, i) => (
            <div
              key={i}
              className="flex items-baseline gap-1.5 px-3 py-1.5 border-r border-gray-200 last:border-r-0 min-w-0"
            >
              <span className="text-gray-700 font-medium shrink-0">{p.label}:</span>
              <span className={`min-w-0 truncate ${p.value ? 'text-gray-900' : 'text-gray-500 italic'}`} title={p.value || '—'}>
                {p.value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Renders a grid-based table (Word-style blocks) with merge (colSpan/rowSpan) and bold borders.
   */
  const renderGridTable = (_group: TemplateGroup, table: TableDefinition) => {
    if (table.isFieldRow) return renderFieldRow(_group, table);
    const numRows = table.gridRows ?? 2;
    const numCols = table.gridCols ?? 2;
    const cells = table.cells ?? [];
    const tableAlign = table.textAlign ?? 'left';
    const getCellAt = (row: number, col: number): GridCell | null =>
      cells.find(
        (c) =>
          row >= c.row &&
          row < c.row + (c.rowSpan ?? 1) &&
          col >= c.col &&
          col < c.col + (c.colSpan ?? 1)
      ) ?? null;
    const isTopLeft = (row: number, col: number): boolean => {
      const cell = getCellAt(row, col);
      return cell != null && cell.row === row && cell.col === col;
    };

    const layout = table.layout ?? 'full';
    const blockSpacingClass = spaceBetweenBlocks ? 'mb-6' : 'mb-0';
    return (
      <div key={table.id} className={`${blockSpacingClass} ${layout === 'full' ? 'max-w-2xl' : 'w-full min-w-0'}`}>
        {showTableTitles && <h3 className="font-semibold text-lg mb-3">{table.name}</h3>}
        <div
          className={`inline-grid gap-0 border border-gray-300 bg-gray-50 w-full ${!showTableTitles ? 'mt-0' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(80px, auto))`,
          }}
        >
          {Array.from({ length: numRows * numCols }, (_, i) => {
            const r = Math.floor(i / numCols);
            const c = i % numCols;
            const cell = getCellAt(r, c);
            const topLeft = isTopLeft(r, c);
            const colSpan = Math.min((cell?.colSpan ?? 1), numCols - c);
            const rowSpan = Math.min((cell?.rowSpan ?? 1), numRows - r);
            if (!topLeft && cell) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="bg-gray-100 border border-dashed border-gray-300 min-h-[80px] border-t-0 border-l-0 -mr-px -mb-px"
                  style={{ gridColumn: `${c + 1} / span 1`, gridRow: `${r + 1} / span 1` }}
                />
              );
            }
            const cellAlign = cell?.textAlign ?? tableAlign;
            const alignClass = cellAlign === 'center' ? 'text-center' : cellAlign === 'right' ? 'text-right' : 'text-left';
            const headerClass = cell?.isColumnHeader ? 'bg-gray-200 font-semibold text-gray-800' : 'bg-white';
            return (
              <div
                key={`${r}-${c}`}
                className={`pt-3 px-2 pb-2 ${headerClass} flex flex-col min-h-[80px] border border-gray-300 -mr-px -mb-px ${alignClass} ${
                  cell?.boldBorder ? 'border-2 border-gray-800' : ''
                } ${cell?.type === 'textarea' ? 'justify-start' : 'justify-center'}`}
                style={{
                  gridColumn: `${c + 1} / span ${topLeft && cell ? colSpan : 1}`,
                  gridRow: `${r + 1} / span ${topLeft && cell ? rowSpan : 1}`,
                }}
              >
                {cell ? (
                  <>
                    {cell.label && (
                      <span className="text-xs text-gray-600 mb-1 block border-none bg-transparent no-underline" style={{ textDecoration: 'none', borderWidth: 0 }}>{cell.label}{cell.required && ' *'}</span>
                    )}
                    {cell.type === 'label' && (cell.value != null && cell.value !== '') && (
                      <div className={`text-sm text-gray-700 border-0 no-underline ${cell.boldText ? 'font-bold' : ''}`} style={{ borderWidth: 0 }}>{cell.value}</div>
                    )}
                    {cell.type === 'staticText' && (cell.value != null && cell.value !== '') && (
                      <div className={`text-sm text-gray-800 border-0 no-underline ${cell.boldText ? 'font-bold' : ''}`} style={{ borderWidth: 0 }}>{cell.value}</div>
                    )}
                    {cell.type === 'checkbox' && (
                      <div className={`text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''} ${isCheckboxChecked(cell.value) ? 'text-gray-800' : 'text-gray-400 italic'}`} style={{ borderWidth: 0 }}>
                        {isCheckboxChecked(cell.value) ? '☑ Checked' : '☐ To be checked'}
                      </div>
                    )}
                    {(cell.type === 'text' || cell.type === 'number' || cell.type === 'date') && (
                      <div className={`text-gray-400 italic text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''}`} style={{ borderWidth: 0 }}>[To be filled]</div>
                    )}
                    {cell.type === 'textarea' && (
                      <div className={`text-sm border-0 no-underline whitespace-pre-wrap break-words ${cell.boldText ? 'font-bold' : ''} ${(cell.value != null && cell.value !== '') ? 'text-gray-800' : 'text-gray-400 italic'}`} style={{ borderWidth: 0, minHeight: '2.5rem' }}>
                        {(cell.value != null && cell.value !== '') ? cell.value : '[Comments…]'}
                      </div>
                    )}
                    {cell.type === 'select' && (
                      <div className={`text-gray-400 italic text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''}`} style={{ borderWidth: 0 }}>[Select]</div>
                    )}
                    {cell.type === 'jobField' && (() => {
                      const val = getJobFieldValue(jobData, cell.jobFieldKey ?? 'jobNumber');
                      const placeholder = `[Job: ${getJobFieldLabel(cell.jobFieldKey ?? 'jobNumber')}]`;
                      return (
                        <div className={`text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''} ${!val ? 'text-gray-500 italic' : 'text-gray-800'}`} style={{ borderWidth: 0 }}>
                          {val || placeholder}
                        </div>
                      );
                    })()}
                    {cell.type === 'machineField' && (() => {
                      const val = getMachineFieldValue(machineData, cell.machineFieldKey ?? 'serialNumber');
                      const placeholder = `[Machine: ${getMachineFieldLabel(cell.machineFieldKey ?? 'serialNumber')}]`;
                      return (
                        <div className={`text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''} ${!val ? 'text-gray-500 italic' : 'text-gray-800'}`} style={{ borderWidth: 0 }}>
                          {val || placeholder}
                        </div>
                      );
                    })()}
                    {cell.type === 'reportNumber' && (
                      <div className={`text-sm border-0 no-underline ${cell.boldText ? 'font-bold' : ''} ${reportNumber ? 'text-gray-800' : 'text-gray-500 italic'}`} style={{ borderWidth: 0 }}>
                        {reportNumber ?? '[Report #]'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-300 text-sm">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * Renders a legacy column-based table.
   */
  const renderTable = (group: TemplateGroup, table: TableDefinition) => {
    const columns = table.columns ?? [];
    if (columns.length === 0) return null;

    const hasMultipleRows = columns.some(col => col.isPreFilled && col.allowMultipleRows);
    const rows = table.rows || [];

    const blockSpacingClass = spaceBetweenBlocks ? 'mb-6' : 'mb-0';
    return (
      <div key={table.id} className={blockSpacingClass}>
        {showTableTitles && <h3 className="font-semibold text-lg mb-3">{table.name}</h3>}
        <table className={`w-full border-collapse border border-gray-300 ${!showTableTitles ? 'mt-0' : ''}`}>
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column: TableColumn) => (
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
                  {columns.map((column: TableColumn) => (
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
                {columns.map((column: TableColumn) => (
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

    if (showHeader) {
      if (logoUrl) {
        try {
          const format = typeof logoUrl === 'string' && (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg'))
            ? 'JPEG'
            : 'PNG';
          pdf.addImage(logoUrl, format, marginLeft, y, 1.5, 0.5);
        } catch (error) {
          console.error('Error adding logo to PDF:', error);
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
      addressY += 0.2;
      if (headerConfig.showReportNumberInHeader) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const reportLabel = headerConfig.reportNumberHeaderLabel || 'Report #';
        const reportVal = reportNumber ?? '[Report #]';
        pdf.text(`${reportLabel}: ${reportVal}`, pageWidth - marginRight, addressY, { align: 'right' });
        addressY += 0.15;
      }
      y = Math.max(y, addressY) + 0.2;
    }

    if (showReportTitle && template.name) {
      y += 0.15;
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(template.name, pageWidth / 2, y, { align: 'center' });
      y += 0.35;
    }

    const availableWidth = pageWidth - marginLeft - marginRight - 0.2;
    const gap = spaceBetweenBlocks ? 0.1 : 0;
    const blockGap = spaceBetweenBlocks ? 0.2 : 0;
    const minBottomSpace = 0.5;

    /** If y would go past the bottom margin, add a new page and reset y. Returns true if a page was added. */
    const checkPageBreak = (requiredHeight: number): boolean => {
      if (y + requiredHeight > pageHeight - marginBottom - minBottomSpace) {
        pdf.addPage();
        y = marginTop;
        return true;
      }
      return false;
    };

    // Groups and Tables
    groups.forEach((group: TemplateGroup) => {
      if (showGroupTitle) {
        checkPageBreak(0.4);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(group.name, marginLeft, y);
        y += 0.2;
      }

      let currentX = marginLeft + 0.1;
      let rowHeight = 0;
      /** Shared top Y for the current row of side-by-side tables; keeps left and right tables aligned. */
      let rowStartYForRow = y;

      for (let i = 0; i < group.tables.length; i++) {
        const table = group.tables[i];
        const layout = table.layout ?? 'full';
        const nextTable = group.tables[i + 1];
        const nextLayout = nextTable?.layout ?? 'full';

        let tableWidth: number;
        let startX: number;
        if (layout === 'full') {
          tableWidth = availableWidth;
          startX = marginLeft + 0.1;
        } else if (layout === 'half') {
          tableWidth = (availableWidth - gap) / 2;
          startX = currentX;
        } else {
          tableWidth = (availableWidth - 2 * gap) / 3;
          startX = currentX;
        }

        if (startX <= marginLeft + 0.15) {
          if (checkPageBreak(0.8)) {
            currentX = marginLeft + 0.1;
            rowHeight = 0;
          }
          rowStartYForRow = y;
        }
        /** Use shared row start for side-by-side tables so left and right align vertically. */
        const rowStartY = layout === 'full' ? y : rowStartYForRow;

        if (showTableTitles) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(table.name, startX, rowStartY);
          if (layout === 'full') y = rowStartY + 0.15;
        }
        const tableTitleY = showTableTitles ? rowStartY + 0.15 : rowStartY;

        if (table.isFieldRow) {
          const cells = table.cells ?? [];
          const numCols = table.gridCols ?? 0;
          const pairs: { label: string; value: string }[] = [];
          for (let i = 0; i < numCols / 2; i++) {
            const labelCell = cells.find((c: GridCell) => c.row === 0 && c.col === i * 2);
            const valueCell = cells.find((c: GridCell) => c.row === 0 && c.col === i * 2 + 1);
            if (!labelCell || !valueCell) continue;
            const label = labelCell.label ?? '';
            let value = '';
            if (valueCell.type === 'jobField') {
              value = getJobFieldValue(jobData, valueCell.jobFieldKey ?? 'jobNumber') || `[Job: ${getJobFieldLabel(valueCell.jobFieldKey ?? 'jobNumber')}]`;
            } else if (valueCell.type === 'machineField') {
              value = getMachineFieldValue(machineData, valueCell.machineFieldKey ?? 'serialNumber') || `[Machine: ${getMachineFieldLabel(valueCell.machineFieldKey ?? 'serialNumber')}]`;
            } else if (valueCell.type === 'staticText' && valueCell.value != null) {
              value = valueCell.value;
            }
            pairs.push({ label, value: value || '—' });
          }
          if (pairs.length > 0) {
            checkPageBreak(0.4);
            const startY = showTableTitles ? tableTitleY - 0.05 : rowStartY;
            const cellW = tableWidth / pairs.length;
            const padding = 0.08;
            const colMaxWidth = Math.max(0.3, cellW - padding * 2);
            const lineHeightIn = 0.05;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            const lineCounts: number[] = [];
            pairs.forEach((p) => {
              const fullText = `${p.label}: ${p.value}`;
              const lines = (pdf as any).splitTextToSize?.(fullText, colMaxWidth) ?? [fullText];
              lineCounts.push(Array.isArray(lines) ? lines.length : 1);
            });
            const maxLines = Math.max(1, ...lineCounts);
            const fieldRowHeight = maxLines * lineHeightIn + 0.25;
            pairs.forEach((p, i) => {
              const colX = startX + i * cellW + padding;
              const fullText = `${p.label}: ${p.value}`;
              const lines = (pdf as any).splitTextToSize?.(fullText, colMaxWidth) ?? [fullText];
              const lineArr = Array.isArray(lines) ? lines : [String(lines)];
              pdf.text(lineArr, colX, startY + 0.2, { maxWidth: colMaxWidth, align: 'left' });
              if (i < pairs.length - 1) {
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.002);
                pdf.line(startX + (i + 1) * cellW, startY, startX + (i + 1) * cellW, startY + fieldRowHeight);
              }
            });
            pdf.setDrawColor(0, 0, 0);
            const fullBlockHeight = (showTableTitles ? tableTitleY - rowStartY : 0) + fieldRowHeight;
            rowHeight = Math.max(rowHeight, fullBlockHeight);
            if (layout === 'full') {
              y = rowStartY + fullBlockHeight + blockGap;
              currentX = marginLeft + 0.1;
              rowHeight = 0;
            } else {
              currentX += tableWidth + gap;
              const nextTableWidth = nextTable ? (nextLayout === 'full' ? availableWidth : nextLayout === 'half' ? (availableWidth - gap) / 2 : (availableWidth - 2 * gap) / 3) : 0;
              const rightEdge = marginLeft + 0.1 + availableWidth + 0.005;
              const nextFitsInRow = nextLayout === layout && currentX + nextTableWidth <= rightEdge;
              if (!nextFitsInRow) {
                y = rowStartY + rowHeight + blockGap;
                currentX = marginLeft + 0.1;
                rowHeight = 0;
              }
            }
          }
          continue;
        }

        if (table.gridRows != null && table.gridCols != null) {
          // Grid table: draw at startX with tableWidth; row heights can expand for textarea/comment cells
          const cells = table.cells ?? [];
          const numRows = Math.max(1, table.gridRows);
          const numCols = Math.max(1, table.gridCols);
          const cellW = tableWidth / numCols;
          const cellH = 0.35;
          const startY = showTableTitles ? tableTitleY - 0.1 : rowStartY;
          const tableAlign = table.textAlign ?? 'left';
          const lineHeightIn = 0.05;
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const rowHeights: number[] = Array.from({ length: numRows }, () => cellH);
          cells.forEach((cell: GridCell) => {
            if (cell.row >= numRows) return;
            const cs = Math.min(cell.colSpan ?? 1, numCols - cell.col);
            const rs = Math.min(cell.rowSpan ?? 1, numRows - cell.row);
            const w = cellW * cs;
            if (cell.type === 'textarea' && (cell.value != null && cell.value !== '')) {
              const labelPrefix = cell.label ? cell.label + (cell.required ? ' *' : '') + '\n' : '';
              const fullText = labelPrefix + cell.value;
              const lines = (pdf as any).splitTextToSize?.(fullText, w - 0.1) ?? fullText.split('\n');
              const neededH = Math.max(cellH * rs, lines.length * lineHeightIn + 0.1);
              rowHeights[cell.row] = Math.max(rowHeights[cell.row], neededH);
            }
          });
          const getCellY = (row: number) => startY + rowHeights.slice(0, row).reduce((a, b) => a + b, 0);
          const getCellH = (row: number, span: number) => rowHeights.slice(row, row + span).reduce((a, b) => a + b, 0);
          pdf.setDrawColor(0, 0, 0);
          pdf.setTextColor(0, 0, 0);
          cells.forEach((cell: GridCell) => {
            const cs = Math.min(cell.colSpan ?? 1, numCols - cell.col);
            const rs = Math.min(cell.rowSpan ?? 1, numRows - cell.row);
            const x = startX + cell.col * cellW;
            const cellY = getCellY(cell.row);
            const w = cellW * cs;
            const h = getCellH(cell.row, rs);
            const cellAlign = cell.textAlign ?? tableAlign;
            pdf.setLineWidth(cell.boldBorder ? 0.02 : 0.005);
            pdf.setDrawColor(0, 0, 0);
            if (cell.type === 'checkbox') {
              const checked = isCheckboxChecked(cell.value);
              if (checked) {
                pdf.setFillColor(230, 230, 230);
                pdf.rect(x, cellY, w, h, 'FD');
              } else {
                pdf.rect(x, cellY, w, h, 'S');
              }
            } else if (cell.isColumnHeader) {
              pdf.setFillColor(220, 220, 220);
              pdf.rect(x, cellY, w, h, 'FD');
            } else {
              pdf.rect(x, cellY, w, h, 'S');
            }
            pdf.setFontSize(9);
            pdf.setFont('helvetica', (cell.boldText || cell.isColumnHeader) ? 'bold' : 'normal');
            let cellContent: string;
            if (cell.type === 'checkbox') {
              cellContent = '';
            } else if (cell.type === 'jobField') {
              const val = getJobFieldValue(jobData, cell.jobFieldKey ?? 'jobNumber');
              cellContent = val || `[Job: ${getJobFieldLabel(cell.jobFieldKey ?? 'jobNumber')}]`;
            } else if (cell.type === 'machineField') {
              const val = getMachineFieldValue(machineData, cell.machineFieldKey ?? 'serialNumber');
              cellContent = val || `[Machine: ${getMachineFieldLabel(cell.machineFieldKey ?? 'serialNumber')}]`;
            } else if (cell.type === 'reportNumber') {
              cellContent = reportNumber ?? '[Report #]';
            } else if (cell.value != null && cell.value !== '') {
              cellContent = cell.value;
            } else if (cell.type === 'text' || cell.type === 'number' || cell.type === 'date') {
              cellContent = '[To be filled]';
            } else if (cell.type === 'textarea') {
              cellContent = '';
            } else {
              cellContent = '';
            }
            const text = (cell.label ? cell.label + (cell.required ? ' *' : '') + '\n' : '') + (cell.type === 'textarea' && (cell.value == null || cell.value === '') ? '[Comments…]' : cellContent);
            if (text.trim()) {
              const textX = cellAlign === 'right' ? x + w - 0.05 : cellAlign === 'center' ? x + w / 2 : x + 0.05;
              pdf.text(text, textX, cellY + 0.2, { maxWidth: w - 0.1, align: cellAlign });
            }
          });
          const tableHeight = rowHeights.reduce((a, b) => a + b, 0) + 0.2;
          const topOffset = startY - rowStartY;
          const fullBlockHeight = topOffset + tableHeight;
          rowHeight = Math.max(rowHeight, fullBlockHeight);
          if (layout === 'full') {
            y = rowStartY + fullBlockHeight + blockGap;
            currentX = marginLeft + 0.1;
            rowHeight = 0;
          } else {
            currentX += tableWidth + gap;
            // Next table fits in same row if it has same layout and fits in remaining width (small epsilon for float)
            const rightEdge = marginLeft + 0.1 + availableWidth + 0.005;
            const nextFitsInRow = nextLayout === layout && currentX + tableWidth <= rightEdge;
            if (!nextFitsInRow) {
              y = rowStartY + rowHeight + blockGap;
              currentX = marginLeft + 0.1;
              rowHeight = 0;
            }
          }
          continue;
        }

        const columns = table.columns ?? [];
        if (columns.length === 0) continue;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setDrawColor(0, 0, 0);
        pdf.setFillColor(240, 240, 240);
        let x = startX;
        const colWidth = tableWidth / columns.length;
        let legacyY = tableTitleY;

        columns.forEach((column: TableColumn) => {
          pdf.rect(x, legacyY - 0.12, colWidth, 0.15, 'FD'); // F = fill, D = draw
          pdf.setTextColor(0, 0, 0);
          pdf.text(column.label, x + 0.05, legacyY, { maxWidth: colWidth - 0.1 });
          x += colWidth;
        });
        legacyY += 0.2;

        const hasMultipleRows = columns.some(col => col.isPreFilled && col.allowMultipleRows);
        const rows = table.rows || [];

        // Set colors for table cells - white fill, black border and text
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0);

        if (hasMultipleRows && rows.length > 0) {
          rows.forEach((row) => {
            pdf.setFont('helvetica', 'normal');
            x = startX;
            columns.forEach((column: TableColumn) => {
              let value: string;
              if (column.isPreFilled && column.allowMultipleRows) {
                value = String(row.values[column.id] || column.defaultValue || '-');
              } else if (column.isPreFilled) {
                value = getColumnValue(table.id, column.id) || column.defaultValue || '-';
              } else {
                value = getColumnValue(table.id, column.id) || '[To be filled]';
              }
              pdf.setFillColor(255, 255, 255);
              pdf.setDrawColor(0, 0, 0);
              pdf.rect(x, legacyY - 0.12, colWidth, 0.15, 'FD');
              pdf.setTextColor(0, 0, 0);
              pdf.text(String(value).substring(0, 30), x + 0.05, legacyY, { maxWidth: colWidth - 0.1 });
              x += colWidth;
            });
            legacyY += 0.2;
            if (legacyY > pageHeight - marginBottom - 1) {
              pdf.addPage();
              legacyY = marginTop;
            }
          });
        } else {
          pdf.setFont('helvetica', 'normal');
          x = startX;
          columns.forEach((column: TableColumn) => {
            const value = column.isPreFilled 
              ? (getColumnValue(table.id, column.id) || column.defaultValue || '-')
              : (getColumnValue(table.id, column.id) || '[To be filled]');
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(x, legacyY - 0.12, colWidth, 0.15, 'FD');
            pdf.setTextColor(0, 0, 0);
            pdf.text(String(value).substring(0, 30), x + 0.05, legacyY, { maxWidth: colWidth - 0.1 });
            x += colWidth;
          });
          legacyY += 0.3;
        }

        const legacyHeight = legacyY - rowStartY;
        rowHeight = Math.max(rowHeight, legacyHeight);
        if (layout === 'full') {
          y = rowStartY + legacyHeight + blockGap;
          currentX = marginLeft + 0.1;
          rowHeight = 0;
        } else {
          currentX += tableWidth + gap;
          const rightEdge = marginLeft + 0.1 + availableWidth + 0.005;
          const nextFitsInRow = nextLayout === layout && currentX + tableWidth <= rightEdge;
          if (!nextFitsInRow) {
            y = rowStartY + rowHeight + blockGap;
            currentX = marginLeft + 0.1;
            rowHeight = 0;
          }
        }

        if (y > pageHeight - marginBottom - 1) {
          pdf.addPage();
          y = marginTop;
        }
      }

      y += blockGap;
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
                        {(table.columns ?? [])
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
              {renderReportTitle()}
              {groups.map((group: TemplateGroup) => (
                <div key={group.id} className={spaceBetweenBlocks ? 'mb-8' : 'mb-0'}>
                  {showGroupTitle && <h2 className="text-2xl font-bold mb-4">{group.name}</h2>}
                  <div className={`flex flex-wrap ${spaceBetweenBlocks ? 'gap-4' : 'gap-0'} ${!spaceBetweenBlocks ? 'content-start' : ''} ${!showGroupTitle ? 'mt-0' : ''}`}>
                    {group.tables.map((table) => {
                      const layout = table.layout ?? 'full';
                      const widthClass = layout === 'full'
                        ? 'w-full'
                        : layout === 'half'
                          ? spaceBetweenBlocks
                            ? 'w-full md:flex-[0_0_calc(50%-0.5rem)] md:min-w-0'
                            : 'w-full md:flex-[0_0_50%] md:min-w-0'
                          : spaceBetweenBlocks
                            ? 'w-full md:flex-[0_0_calc(33.333%-0.34rem)] md:min-w-0'
                            : 'w-full md:flex-[0_0_33.333%] md:min-w-0';
                      return (
                        <div key={table.id} className={`flex-none ${widthClass}`}>
                          {table.isFieldRow
                            ? renderFieldRow(group, table)
                            : table.gridRows != null && table.gridCols != null
                              ? renderGridTable(group, table)
                              : renderTable(group, table)}
                        </div>
                      );
                    })}
                  </div>
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
