/**
 * Shared types and constants for JobCard components.
 * Extracted here to break the circular dependency between
 * JobCardFormBuilder.tsx <-> JobCardPreview.tsx <-> jobCardConfig.ts
 */

export type ColumnType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';

export interface TableColumn {
  id: string;
  label: string;
  type: ColumnType;
  isPreFilled: boolean;
  isRequired: boolean;
  defaultValue?: string;
  options?: string[];
  width?: number;
  allowMultipleRows?: boolean;
}

export interface TableRow {
  id: string;
  columnId: string;
  values: Record<string, string | number | boolean>;
}

export type GridCellType = 'label' | 'staticText' | 'checkbox' | 'text' | 'textarea' | 'number' | 'date' | 'select' | 'jobField' | 'machineField' | 'reportNumber';

export const JOB_FIELD_KEYS: { value: string; label: string }[] = [
  { value: 'jobNumber', label: 'Job number' },
  { value: 'customer', label: 'Customer name' },
  { value: 'cashCustomer', label: 'Cash customer' },
  { value: 'serialNumber', label: 'Serial number (first machine)' },
  { value: 'branch', label: 'Branch' },
  { value: 'status', label: 'Status' },
  { value: 'adm', label: 'Admin' },
  { value: 'assistingAdm', label: 'Assisting admin' },
  { value: 'repCode', label: 'Rep code' },
  { value: 'notes', label: 'Notes' },
  { value: 'startDate', label: 'Start date' },
  { value: 'dateQuoted', label: 'Date quoted' },
  { value: 'valueExVat', label: 'Value ex VAT' },
  { value: 'poNumber', label: 'PO number' },
  { value: 'rsrNumber', label: 'RSR number (job)' },
  { value: 'description', label: 'Service description' },
  { value: 'techBooked', label: 'Technician booked' },
  { value: 'dateBooked', label: 'Date booked' },
  { value: 'storePack', label: 'Store pack' },
  { value: 'storePackDate', label: 'Store pack date' },
  { value: 'invNumber', label: 'Inv number' },
  { value: 'invoiceDate', label: 'Invoice date' },
  { value: 'oilSampleNumber', label: 'Oil sample number' },
];

export const MACHINE_FIELD_KEYS: { value: string; label: string }[] = [
  { value: 'make', label: 'Make' },
  { value: 'model', label: 'Model' },
  { value: 'serialNumber', label: 'Serial number' },
  { value: 'assetNumber', label: 'Asset number' },
  { value: 'machineHours', label: 'Machine hours' },
  { value: 'nextServiceHours', label: 'Next service hours' },
  { value: 'lastServiceDate', label: 'Last service date' },
  { value: 'nextServiceDate', label: 'Next service date' },
  { value: 'serviceType', label: 'Service type (hours/date)' },
  { value: 'isRental', label: 'Is rental' },
  { value: 'dbStatus', label: 'DB status' },
];

export interface GridCell {
  id: string;
  row: number;
  col: number;
  type: GridCellType;
  label?: string;
  value?: string;
  required?: boolean;
  options?: string[];
  jobFieldKey?: string;
  machineFieldKey?: string;
  colSpan?: number;
  rowSpan?: number;
  boldBorder?: boolean;
  boldText?: boolean;
  isColumnHeader?: boolean;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TableDefinition {
  id: string;
  name: string;
  columns?: TableColumn[];
  rows?: TableRow[];
  gridRows?: number;
  gridCols?: number;
  cells?: GridCell[];
  textAlign?: 'left' | 'center' | 'right';
  layout?: 'full' | 'half' | 'third';
  isFieldRow?: boolean;
}

export interface TemplateGroup {
  id: string;
  name: string;
  tables: TableDefinition[];
}

export interface HeaderConfig {
  logoUrl?: string;
  companyName?: string;
  vatNumber?: string;
  registrationNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  showReportNumberInHeader?: boolean;
  reportNumberHeaderLabel?: string;
}

export interface FooterConfig {
  technicianSignatureLabel?: string;
  customerSignatureLabel?: string;
  dateLabel?: string;
  notesLabel?: string;
}
