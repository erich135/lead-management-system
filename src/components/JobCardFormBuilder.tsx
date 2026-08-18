import { useState } from 'react';
import { 
  Save, 
  X, 
  Plus,
  Minus,
  Trash2,
  Eye,
  GripVertical,
  Settings,
  FileImage,
  Building2,
  Hash,
  Calendar,
  CheckSquare,
  PenTool,
  List,
  Table,
  Edit2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { JobCardPreview } from './JobCardPreview';
import type { JobCardTemplate } from '../lib/api';
import { getGlobalHeaderConfig, saveGlobalHeaderConfig, getGlobalFooterConfig, saveGlobalFooterConfig } from '../utils/jobCardConfig';
// Re-export shared types from jobCardTypes so existing external imports still work
export type {
  ColumnType, TableColumn, TableRow, GridCellType, GridCell,
  TableDefinition, TemplateGroup, HeaderConfig, FooterConfig,
} from './jobCardTypes';
export { JOB_FIELD_KEYS, MACHINE_FIELD_KEYS } from './jobCardTypes';
import type {
  ColumnType, TableColumn, TableRow, GridCellType, GridCell,
  TableDefinition, TemplateGroup, HeaderConfig, FooterConfig,
} from './jobCardTypes';
import { JOB_FIELD_KEYS, MACHINE_FIELD_KEYS } from './jobCardTypes';

/**
 * Template field interface (kept for backward compatibility, but new structure uses groups).
 */
export interface TemplateField {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  logoUrl?: string;
}

interface JobCardFormBuilderProps {
  template?: {
    _id?: string;
    name: string;
    description?: string;
    fields?: TemplateField[];
    groups?: TemplateGroup[];
    header?: HeaderConfig;
    footer?: FooterConfig;
    showHeader?: boolean;
    pageWidth?: number;
    pageHeight?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  };
  onSave: (template: any) => void;
  onCancel: () => void;
}

/**
 * Job Card Form Builder component.
 * Structured builder for creating job card templates with groups and tables.
 */
export function JobCardFormBuilder({ template, onSave, onCancel }: JobCardFormBuilderProps) {
  /**
   * Normalizes template groups to a single group (for UI: checklist tables only). Merges multiple groups into one.
   */
  const normalizeToSingleGroup = (templateGroups: TemplateGroup[] | undefined): TemplateGroup[] => {
    if (!templateGroups || templateGroups.length === 0) return [];
    if (templateGroups.length === 1) return templateGroups;
    const first = templateGroups[0];
    return [{ ...first, name: 'Job Card', tables: templateGroups.flatMap((g) => g.tables) }];
  };

  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [groups, setGroups] = useState<TemplateGroup[]>(() => normalizeToSingleGroup(template?.groups));
  const [showHeader, setShowHeader] = useState(template?.showHeader !== false);
  const [showTableTitles, setShowTableTitles] = useState((template as any)?.showTableTitles !== false);
  const [showGroupTitle, setShowGroupTitle] = useState((template as any)?.showGroupTitle === true);
  const [showReportTitle, setShowReportTitle] = useState((template as any)?.showReportTitle === true); // default: hide
  const [spaceBetweenBlocks, setSpaceBetweenBlocks] = useState((template as any)?.spaceBetweenBlocks !== false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(getGlobalHeaderConfig());
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(getGlobalFooterConfig());
  const [showPreview, setShowPreview] = useState(false);
  const [showHeaderFooterConfig, setShowHeaderFooterConfig] = useState(false);

  /**
   * Generates a unique ID.
   */
  const generateId = () => {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /** Single group used internally (checklist tables only; sections removed for now). */
  const singleGroup = groups[0] ?? null;

  /**
   * Adds a new checklist table with grid layout (Word-style blocks). Starts as 2×2 empty grid.
   */
  const handleAddChecklistTable = () => {
    const tableId = generateId();
    const newTable: TableDefinition = {
      id: tableId,
      name: 'Checklist',
      gridRows: 2,
      gridCols: 2,
      cells: [],
    };
    if (singleGroup) {
      setGroups([{ ...singleGroup, tables: [...singleGroup.tables, newTable] }]);
    } else {
      setGroups([{ id: generateId(), name: 'Job Card', tables: [newTable] }]);
    }
    setSelectedTable(tableId);
    setSelectedCellId(null);
  };

  /**
   * Adds a new field row: a single row of label + value pairs (e.g. Client: ___, Contact Person: ___, Job no: ___).
   * Values are replaced with job data or static text when the report is generated (no printed fill-in lines).
   */
  const handleAddFieldRow = () => {
    const tableId = generateId();
    const defaultPairs: Array<{ label: string; valueType: 'jobField' | 'staticText'; jobFieldKey: string; staticValue: string }> = [
      { label: 'Client', valueType: 'jobField', jobFieldKey: 'customer', staticValue: '' },
      { label: 'Contact Person', valueType: 'jobField', jobFieldKey: 'notes', staticValue: '' },
      { label: 'Job no', valueType: 'jobField', jobFieldKey: 'jobNumber', staticValue: '' },
    ];
    const cells: GridCell[] = [];
    defaultPairs.forEach((pair, i) => {
      cells.push({
        id: generateId(),
        row: 0,
        col: i * 2,
        type: 'label',
        label: pair.label,
        value: '',
      });
      cells.push({
        id: generateId(),
        row: 0,
        col: i * 2 + 1,
        type: pair.valueType === 'jobField' ? 'jobField' : 'staticText',
        jobFieldKey: pair.valueType === 'jobField' ? pair.jobFieldKey : undefined,
        value: pair.valueType === 'staticText' ? pair.staticValue : undefined,
      });
    });
    const newTable: TableDefinition = {
      id: tableId,
      name: 'Info row',
      gridRows: 1,
      gridCols: defaultPairs.length * 2,
      cells,
      isFieldRow: true,
    };
    if (singleGroup) {
      setGroups([{ ...singleGroup, tables: [...singleGroup.tables, newTable] }]);
    } else {
      setGroups([{ id: generateId(), name: 'Job Card', tables: [newTable] }]);
    }
    setSelectedTable(tableId);
    setSelectedCellId(null);
  };

  /**
   * Moves a checklist table up in the display order.
   */
  const handleMoveTableUp = (index: number) => {
    if (!singleGroup || index <= 0) return;
    const tables = [...singleGroup.tables];
    [tables[index - 1], tables[index]] = [tables[index], tables[index - 1]];
    setGroups([{ ...singleGroup, tables }]);
  };

  /**
   * Moves a checklist table down in the display order.
   */
  const handleMoveTableDown = (index: number) => {
    if (!singleGroup || index >= singleGroup.tables.length - 1) return;
    const tables = [...singleGroup.tables];
    [tables[index], tables[index + 1]] = [tables[index + 1], tables[index]];
    setGroups([{ ...singleGroup, tables }]);
  };

  /**
   * Deletes a table from the single group.
   */
  const handleDeleteTable = (tableId: string) => {
    if (!singleGroup) return;
    setGroups([{ ...singleGroup, tables: singleGroup.tables.filter((t) => t.id !== tableId) }]);
    if (selectedTable === tableId) {
      setSelectedTable(null);
      setSelectedCellId(null);
    }
  };

  /**
   * Updates a table name.
   */
  const handleUpdateTableName = (tableId: string, name: string) => {
    if (!singleGroup) return;
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) => (t.id === tableId ? { ...t, name } : t)),
    }]);
  };

  /**
   * Updates table-level options (e.g. textAlign).
   */
  const handleUpdateTable = (tableId: string, updates: Partial<TableDefinition>) => {
    if (!singleGroup) return;
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) => (t.id === tableId ? { ...t, ...updates } : t)),
    }]);
  };

  /** Whether the table uses grid layout (Word-style blocks). */
  const isGridTable = (t: TableDefinition) => t.gridRows != null && t.gridCols != null;

  /**
   * Gets field row pairs from a table (label cell at even col, value cell at odd col).
   */
  const getFieldRowPairs = (table: TableDefinition): { labelCell: GridCell; valueCell: GridCell }[] => {
    if (!table.isFieldRow || !table.cells) return [];
    const cols = table.gridCols ?? 0;
    const pairs: { labelCell: GridCell; valueCell: GridCell }[] = [];
    for (let i = 0; i < cols / 2; i++) {
      const labelCell = table.cells.find((c) => c.row === 0 && c.col === i * 2);
      const valueCell = table.cells.find((c) => c.row === 0 && c.col === i * 2 + 1);
      if (labelCell && valueCell) pairs.push({ labelCell, valueCell });
    }
    return pairs;
  };

  /**
   * Adds a pair to a field row (label + value cell).
   */
  const handleFieldRowAddPair = (tableId: string) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table || !table.isFieldRow) return;
    const pairs = getFieldRowPairs(table);
    const newCol = pairs.length * 2;
    const newCells = [...(table.cells ?? [])];
    newCells.push({
      id: generateId(),
      row: 0,
      col: newCol,
      type: 'label',
      label: 'Label',
      value: '',
    });
    newCells.push({
      id: generateId(),
      row: 0,
      col: newCol + 1,
      type: 'jobField',
      jobFieldKey: 'jobNumber',
    });
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId ? { ...t, gridCols: newCol + 2, cells: newCells } : t
      ),
    }]);
  };

  /**
   * Removes a pair from a field row at index pairIndex.
   */
  const handleFieldRowRemovePair = (tableId: string, pairIndex: number) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table || !table.isFieldRow || !table.cells) return;
    const pairs = getFieldRowPairs(table);
    if (pairIndex < 0 || pairIndex >= pairs.length) return;
    const { labelCell, valueCell } = pairs[pairIndex];
    const newCells = table.cells
      .filter((c) => c.id !== labelCell.id && c.id !== valueCell.id)
      .map((c) => {
        const col = c.col;
        if (col > pairIndex * 2 + 1) return { ...c, col: col - 2 };
        return c;
      });
    const newCols = Math.max(2, (table.gridCols ?? 2) - 2);
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId ? { ...t, gridCols: newCols, cells: newCells } : t
      ),
    }]);
  };

  /**
   * Updates the label of a field row pair.
   */
  const handleFieldRowUpdateLabel = (tableId: string, pairIndex: number, label: string) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table || !table.isFieldRow) return;
    const pairs = getFieldRowPairs(table);
    if (pairIndex < 0 || pairIndex >= pairs.length) return;
    const labelCellId = pairs[pairIndex].labelCell.id;
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId
          ? { ...t, cells: (t.cells ?? []).map((c) => (c.id === labelCellId ? { ...c, label } : c)) }
          : t
      ),
    }]);
  };

  /**
   * Updates the value part of a field row pair (jobField, machineField, or staticText).
   */
  const handleFieldRowUpdateValue = (
    tableId: string,
    pairIndex: number,
    valueType: 'jobField' | 'machineField' | 'staticText',
    jobFieldKey?: string,
    staticValue?: string,
    machineFieldKey?: string
  ) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table || !table.isFieldRow) return;
    const pairs = getFieldRowPairs(table);
    if (pairIndex < 0 || pairIndex >= pairs.length) return;
    const valueCellId = pairs[pairIndex].valueCell.id;
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              cells: (t.cells ?? []).map((c) =>
                c.id === valueCellId
                  ? {
                      ...c,
                      type: valueType === 'jobField' ? 'jobField' : valueType === 'machineField' ? 'machineField' : 'staticText',
                      jobFieldKey: valueType === 'jobField' ? jobFieldKey : undefined,
                      machineFieldKey: valueType === 'machineField' ? machineFieldKey : undefined,
                      value: valueType === 'staticText' ? staticValue : c.value,
                    }
                  : c
              ),
            }
          : t
      ),
    }]);
  };

  /**
   * Changes grid rows or columns and keeps cells within bounds.
   */
  const handleSetGridSize = (tableId: string, kind: 'rows' | 'cols', delta: number) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table || !isGridTable(table)) return;
    const rows = Math.max(1, (table.gridRows ?? 2) + (kind === 'rows' ? delta : 0));
    const cols = Math.max(1, (table.gridCols ?? 2) + (kind === 'cols' ? delta : 0));
    const cells = (table.cells ?? []).filter((c) => c.row < rows && c.col < cols);
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId ? { ...t, gridRows: rows, gridCols: cols, cells } : t
      ),
    }]);
  };

  /**
   * Sets or updates a cell at (row, col). Creates cell if none exists. Pass id in updates when creating so caller can set selectedCellId.
   */
  const handleSetCell = (tableId: string, row: number, col: number, updates: Partial<GridCell>) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table) return;
    const cells = [...(table.cells ?? [])];
    const idx = cells.findIndex((c) => c.row === row && c.col === col);
    const base: GridCell = {
      id: updates.id ?? generateId(),
      row,
      col,
      type: 'label',
      label: '',
      value: '',
      required: false,
    };
    if (idx >= 0) {
      cells[idx] = { ...cells[idx], ...updates };
    } else {
      cells.push({ ...base, ...updates });
    }
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId ? { ...t, cells } : t
      ),
    }]);
  };

  /**
   * Updates an existing cell by id.
   */
  const handleUpdateCell = (tableId: string, cellId: string, updates: Partial<GridCell>) => {
    if (!singleGroup) return;
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              cells: (t.cells ?? []).map((c) => (c.id === cellId ? { ...c, ...updates } : c)),
            }
          : t
      ),
    }]);
  };

  /**
   * Clears the cell at (row, col) so the block is empty again.
   */
  const handleClearCell = (tableId: string, row: number, col: number) => {
    if (!singleGroup) return;
    const table = singleGroup.tables.find((t) => t.id === tableId);
    if (!table) return;
    const cells = (table.cells ?? []).filter((c) => !(c.row === row && c.col === col));
    setGroups([{
      ...singleGroup,
      tables: singleGroup.tables.map((t) =>
        t.id === tableId ? { ...t, cells } : t
      ),
    }]);
    if (selectedCellId && cells.every((c) => c.id !== selectedCellId)) setSelectedCellId(null);
  };

  /** Gets the cell that owns (row, col), considering colSpan/rowSpan. Returns the cell and whether (row,col) is its top-left. */
  const getCellAt = (table: TableDefinition, row: number, col: number): GridCell | null => {
    const cells = table.cells ?? [];
    const owner = cells.find(
      (c) =>
        row >= c.row &&
        row < c.row + (c.rowSpan ?? 1) &&
        col >= c.col &&
        col < c.col + (c.colSpan ?? 1)
    );
    return owner ?? null;
  };

  /** True if (row, col) is the top-left of the cell that owns it (used to render one block per cell with span). */
  const isCellTopLeft = (table: TableDefinition, row: number, col: number): boolean => {
    const cell = getCellAt(table, row, col);
    return cell != null && cell.row === row && cell.col === col;
  }

  /**
   * Adds a column to a table.
   */
  const handleAddColumn = (groupId: string, tableId: string) => {
    const newColumn: TableColumn = {
      id: generateId(),
      label: 'New Column',
      type: 'text',
      isPreFilled: false,
      isRequired: false,
      width: 100,
    };
    setGroups(groups.map(g => 
      g.id === groupId 
                ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { ...t, columns: [...(t.columns ?? []), newColumn] }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Deletes a column.
   */
  const handleDeleteColumn = (groupId: string, tableId: string, columnId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { ...t, columns: (t.columns ?? []).filter(c => c.id !== columnId) }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Updates a column.
   */
  const handleUpdateColumn = (groupId: string, tableId: string, columnId: string, updates: Partial<TableColumn>) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { 
                    ...t, 
                    columns: (t.columns ?? []).map(c => 
                      c.id === columnId ? { ...c, ...updates } : c
                    )
                  }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Adds a row to a table for a specific column.
   */
  const handleAddRowForColumn = (groupId: string, tableId: string, columnId: string) => {
    const table = groups.find(g => g.id === groupId)?.tables.find(t => t.id === tableId);
    if (!table) return;

    // Initialize values for all columns (empty for others, empty string for the target column)
    const initialValues: Record<string, string | number | boolean> = {};
    (table.columns ?? []).forEach(col => {
      if (col.id === columnId) {
        initialValues[col.id] = '';
      } else if (col.isPreFilled && col.defaultValue) {
        initialValues[col.id] = col.defaultValue;
      } else if (col.type === 'checkbox') {
        initialValues[col.id] = false;
      } else {
        initialValues[col.id] = '';
      }
    });

    const newRow: TableRow = {
      id: generateId(),
      columnId: columnId, // Track which column this row belongs to (for management purposes)
      values: initialValues, // Store values for all columns
    };
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { ...t, rows: [...(t.rows || []), newRow] }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Adds a row to a table (legacy support).
   */
  const handleAddRow = (groupId: string, tableId: string) => {
    const table = groups.find(g => g.id === groupId)?.tables.find(t => t.id === tableId);
    if (!table) return;

    const initialValues: Record<string, string | number | boolean> = {};
    (table.columns ?? []).forEach(col => {
      if (col.isPreFilled && col.defaultValue) {
        initialValues[col.id] = col.defaultValue;
      } else if (col.type === 'checkbox') {
        initialValues[col.id] = false;
      } else {
        initialValues[col.id] = '';
      }
    });

    const newRow: TableRow = {
      id: generateId(),
      columnId: '', // Legacy rows don't belong to a specific column
      values: initialValues,
    };
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { ...t, rows: [...(t.rows || []), newRow] }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Deletes a row from a table.
   */
  const handleDeleteRow = (groupId: string, tableId: string, rowId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { ...t, rows: (t.rows || []).filter(r => r.id !== rowId) }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Updates a row value.
   */
  const handleUpdateRowValue = (groupId: string, tableId: string, rowId: string, columnId: string, value: string | number | boolean) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => 
              t.id === tableId 
                ? { 
                    ...t, 
                    rows: (t.rows || []).map(r => 
                      r.id === rowId 
                        ? { ...r, values: { ...r.values, [columnId]: value } }
                        : r
                    )
                  }
                : t
            )
          }
        : g
    ));
  };

  /**
   * Gets the current template data for preview.
   */
  const getPreviewTemplate = (): JobCardTemplate => {
    return {
      _id: template?._id,
      name: templateName || 'Untitled Template',
      description: templateDescription,
      fields: [], // Legacy support
      groups,
      showHeader,
      showTableTitles,
      showGroupTitle,
      showReportTitle,
      spaceBetweenBlocks,
      header: getGlobalHeaderConfig(), // Use global config
      footer: getGlobalFooterConfig(), // Use global config
      pageWidth: template?.pageWidth || 8.5,
      pageHeight: template?.pageHeight || 11,
      marginTop: template?.marginTop || 0.5,
      marginBottom: template?.marginBottom || 0.5,
      marginLeft: template?.marginLeft || 0.5,
      marginRight: template?.marginRight || 0.5,
    } as JobCardTemplate;
  };

  /**
   * Handles save.
   */
  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    // Save header/footer config globally
    saveGlobalHeaderConfig(headerConfig);
    saveGlobalFooterConfig(footerConfig);

    const templateData = {
      _id: template?._id,
      name: templateName,
      description: templateDescription,
      groups,
      showHeader,
      showTableTitles,
      showGroupTitle,
      showReportTitle,
      spaceBetweenBlocks,
      pageWidth: template?.pageWidth || 8.5,
      pageHeight: template?.pageHeight || 11,
      marginTop: template?.marginTop || 0.5,
      marginBottom: template?.marginBottom || 0.5,
      marginLeft: template?.marginLeft || 0.5,
      marginRight: template?.marginRight || 0.5,
    };

    onSave(templateData);
  };

  // Show preview if active
  if (showPreview) {
    return (
      <JobCardPreview
        template={getPreviewTemplate()}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  const currentGroup = singleGroup;
  const currentTable = singleGroup?.tables.find((t) => t.id === selectedTable) ?? null;

  // Header/Footer Configuration Modal
  if (showHeaderFooterConfig) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Configure Header & Footer</h2>
            <button
              onClick={() => setShowHeaderFooterConfig(false)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Header Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={headerConfig.logoUrl || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={headerConfig.companyName || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    value={headerConfig.vatNumber || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={headerConfig.registrationNumber || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={headerConfig.address || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={headerConfig.city || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={headerConfig.postalCode || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={headerConfig.phone || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={headerConfig.email || ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.showReportNumberInHeader ?? false}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showReportNumberInHeader: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    Show report/RSR number in header
                  </label>
                  <input
                    type="text"
                    value={headerConfig.reportNumberHeaderLabel ?? ''}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, reportNumberHeaderLabel: e.target.value })}
                    placeholder="Report # or RSR #"
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Label shown next to the report number (e.g. &quot;Report #&quot; or &quot;RSR #&quot;). Each report gets a unique number when submitted.</p>
                </div>
              </div>
            </div>

            {/* Footer Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Footer Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician Signature Label</label>
                  <input
                    type="text"
                    value={footerConfig.technicianSignatureLabel || ''}
                    onChange={(e) => setFooterConfig({ ...footerConfig, technicianSignatureLabel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Signature Label</label>
                  <input
                    type="text"
                    value={footerConfig.customerSignatureLabel || ''}
                    onChange={(e) => setFooterConfig({ ...footerConfig, customerSignatureLabel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Label</label>
                  <input
                    type="text"
                    value={footerConfig.dateLabel || ''}
                    onChange={(e) => setFooterConfig({ ...footerConfig, dateLabel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes Label</label>
                  <input
                    type="text"
                    value={footerConfig.notesLabel || ''}
                    onChange={(e) => setFooterConfig({ ...footerConfig, notesLabel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  saveGlobalHeaderConfig(headerConfig);
                  saveGlobalFooterConfig(footerConfig);
                  setShowHeaderFooterConfig(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save & Close
              </button>
              <button
                onClick={() => setShowHeaderFooterConfig(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template Name"
            className="text-xl font-bold border-none outline-none bg-transparent w-full"
          />
          <input
            type="text"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Template Description (optional)"
            className="text-sm text-gray-600 border-none outline-none bg-transparent w-full mt-1"
          />
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeader}
              onChange={(e) => setShowHeader(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Show header on report
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showTableTitles}
              onChange={(e) => setShowTableTitles(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Show checklist table titles on report
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showGroupTitle}
              onChange={(e) => setShowGroupTitle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Show section title (e.g. &quot;Job Card&quot;) on report
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showReportTitle}
              onChange={(e) => setShowReportTitle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Show report title (centered below header)
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={spaceBetweenBlocks}
              onChange={(e) => setSpaceBetweenBlocks(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Spacing between blocks (tables)
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHeaderFooterConfig(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-[6px] hover:bg-gray-700 transition-colors flex items-center gap-2"
            title="Configure Header & Footer"
          >
            <Settings className="w-4 h-4" />
            Header/Footer
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-[6px] hover:bg-green-700 transition-colors flex items-center gap-2"
            title="Preview Template"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-[6px] transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[6px] hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Checklist tables only */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200 shrink-0">
            <h3 className="font-semibold text-gray-800 mb-2">Checklist tables</h3>
            <p className="text-xs text-gray-500 mb-3">Each table has Item, OK, and Remarks. Add rows for checklist items.</p>
            <button
              onClick={handleAddChecklistTable}
              className="w-full px-3 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              title="Add a checklist table (Item, OK, Remarks)"
            >
              <CheckSquare className="w-4 h-4" />
              Add checklist table
            </button>
            <button
              onClick={handleAddFieldRow}
              className="w-full mt-2 px-3 py-2.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              title="Add a row of label + value fields (e.g. Client: ___, Contact Person: ___, Job no: ___)"
            >
              <PenTool className="w-4 h-4" />
              Add field row
            </button>
          </div>

          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {!singleGroup || singleGroup.tables.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No checklist tables yet</p>
                <p className="text-xs mt-1">Click &quot;Add checklist table&quot; above</p>
              </div>
            ) : (
              singleGroup.tables.map((table, index) => (
                <div
                  key={table.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedTable === table.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTable(table.id)}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <input
                      type="text"
                      value={table.name}
                      onChange={(e) => handleUpdateTableName(table.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-gray-800 bg-transparent border-none outline-none flex-1 min-w-0"
                      placeholder="Table name"
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveTableUp(index); }}
                        disabled={index === 0}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveTableDown(index); }}
                        disabled={index === singleGroup.tables.length - 1}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {table.isFieldRow
                      ? `Field row · ${Math.floor((table.gridCols ?? 0) / 2)} field(s)`
                      : isGridTable(table)
                        ? `${table.gridRows ?? 0}×${table.gridCols ?? 0} grid · ${(table.cells ?? []).length} block(s)`
                        : `${(table.columns ?? []).length} column(s) · ${(table.rows?.length ?? 0)} row(s)`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right - Field row editor, grid blocks, or legacy column configuration */}
        <div className="flex-1 bg-white overflow-y-auto">
          {currentTable ? (
            currentTable.isFieldRow ? (
              /* Field row editor: label + value pairs (e.g. Client: ___, Contact Person: ___, Job no: ___) */
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Field row: {currentTable.name}</h3>
                  <p className="text-sm text-gray-600">Each pair shows as &quot;Label: value&quot; on the report. The value is replaced with job data or static text when the report is generated (no printed fill-in lines).</p>
                </div>
                <div className="space-y-4">
                  {getFieldRowPairs(currentTable).map((pair, idx) => (
                    <div key={pair.labelCell.id} className="flex flex-wrap items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <span className="text-xs font-medium text-gray-500 w-8">#{idx + 1}</span>
                      <input
                        type="text"
                        value={pair.labelCell.label ?? ''}
                        onChange={(e) => handleFieldRowUpdateLabel(currentTable.id, idx, e.target.value)}
                        placeholder="Label (e.g. Client)"
                        className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="text-gray-400">→</span>
                      <select
                        value={pair.valueCell.type === 'jobField' ? 'jobField' : pair.valueCell.type === 'machineField' ? 'machineField' : 'staticText'}
                        onChange={(e) => {
                          const v = e.target.value as 'jobField' | 'machineField' | 'staticText';
                          handleFieldRowUpdateValue(
                            currentTable.id,
                            idx,
                            v,
                            v === 'jobField' ? pair.valueCell.jobFieldKey ?? 'jobNumber' : undefined,
                            v === 'staticText' ? pair.valueCell.value ?? '' : undefined,
                            v === 'machineField' ? (pair.valueCell.machineFieldKey ?? 'serialNumber') : undefined
                          );
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="jobField">Job field (from job)</option>
                        <option value="machineField">Machine field (from assigned machine)</option>
                        <option value="staticText">Static text</option>
                      </select>
                      {pair.valueCell.type === 'jobField' ? (
                        <select
                          value={pair.valueCell.jobFieldKey ?? 'jobNumber'}
                          onChange={(e) => handleFieldRowUpdateValue(currentTable.id, idx, 'jobField', e.target.value, undefined, undefined)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[180px]"
                        >
                          {JOB_FIELD_KEYS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : pair.valueCell.type === 'machineField' ? (
                        <select
                          value={pair.valueCell.machineFieldKey ?? 'serialNumber'}
                          onChange={(e) => handleFieldRowUpdateValue(currentTable.id, idx, 'machineField', undefined, undefined, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[180px]"
                        >
                          {MACHINE_FIELD_KEYS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={pair.valueCell.value ?? ''}
                          onChange={(e) => handleFieldRowUpdateValue(currentTable.id, idx, 'staticText', undefined, e.target.value, undefined)}
                          placeholder="Static text"
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[120px]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleFieldRowRemovePair(currentTable.id, idx)}
                        disabled={getFieldRowPairs(currentTable).length <= 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Remove field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldRowAddPair(currentTable.id)}
                  className="mt-4 px-4 py-2 bg-sky-100 text-sky-800 border border-sky-200 rounded-lg hover:bg-sky-200 text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add field
                </button>
                <div className="mt-6 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Table width</span>
                  <select
                    value={currentTable.layout ?? 'full'}
                    onChange={(e) => handleUpdateTable(currentTable.id, { layout: e.target.value as 'full' | 'half' | 'third' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="full">Full width</option>
                    <option value="half">Half</option>
                    <option value="third">Third</option>
                  </select>
                </div>
              </div>
            ) : isGridTable(currentTable) ? (
              /* Grid builder (Word-style blocks) */
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Checklist: {currentTable.name}</h3>
                  <p className="text-sm text-gray-600">Set how many blocks left–right and up–down, then click a block to add a label, static text, checkbox, or answer field. Mark required if the technician must fill it.</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Rows (up/down)</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleSetGridSize(currentTable.id, 'rows', -1)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 bg-white text-sm font-mono min-w-[2.5rem] text-center">{currentTable.gridRows ?? 2}</span>
                      <button
                        type="button"
                        onClick={() => handleSetGridSize(currentTable.id, 'rows', 1)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Columns (left/right)</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleSetGridSize(currentTable.id, 'cols', -1)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 bg-white text-sm font-mono min-w-[2.5rem] text-center">{currentTable.gridCols ?? 2}</span>
                      <button
                        type="button"
                        onClick={() => handleSetGridSize(currentTable.id, 'cols', 1)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Table text alignment</span>
                    <select
                      value={currentTable.textAlign ?? 'left'}
                      onChange={(e) => handleUpdateTable(currentTable.id, { textAlign: e.target.value as 'left' | 'center' | 'right' })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Table width</span>
                    <select
                      value={currentTable.layout ?? 'full'}
                      onChange={(e) => handleUpdateTable(currentTable.id, { layout: e.target.value as 'full' | 'half' | 'third' })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="full">Full width (one per row)</option>
                      <option value="half">Half (2 tables side-by-side)</option>
                      <option value="third">Third (3 tables side-by-side)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Click a block to configure it. Use Column/Row span to merge cells (e.g. title across top).</p>
                  <div
                    className="inline-grid gap-0 border border-gray-300 p-2 bg-gray-50"
                    style={{
                      gridTemplateColumns: `repeat(${currentTable.gridCols ?? 2}, minmax(80px, 1fr))`,
                      gridTemplateRows: `repeat(${currentTable.gridRows ?? 2}, 72px)`,
                    }}
                  >
                    {Array.from({ length: (currentTable.gridRows ?? 2) * (currentTable.gridCols ?? 2) }, (_, i) => {
                      const r = Math.floor(i / (currentTable.gridCols ?? 2));
                      const c = i % (currentTable.gridCols ?? 2);
                      const cell = getCellAt(currentTable, r, c);
                      const topLeft = isCellTopLeft(currentTable, r, c);
                      const isSelected = selectedCellId === cell?.id;
                      const colSpan = Math.min((cell?.colSpan ?? 1), (currentTable.gridCols ?? 2) - c);
                      const rowSpan = Math.min((cell?.rowSpan ?? 1), (currentTable.gridRows ?? 2) - r);
                      if (!topLeft && cell) {
                        return (
                          <div
                            key={`${r}-${c}`}
                            className="min-h-[72px]"
                            style={{ gridColumn: `${c + 1} / span 1`, gridRow: `${r + 1} / span 1` }}
                            aria-hidden
                          />
                        );
                      }
                      return (
                        <button
                          key={`${r}-${c}`}
                          type="button"
                          style={{
                            gridColumn: `${c + 1} / span ${topLeft && cell ? colSpan : 1}`,
                            gridRow: `${r + 1} / span ${topLeft && cell ? rowSpan : 1}`,
                          }}
                          onClick={() => {
                            if (cell) {
                              setSelectedCellId(cell.id);
                            } else {
                              const newId = generateId();
                              handleSetCell(currentTable.id, r, c, { id: newId, type: 'label', label: '', value: '', required: false });
                              setSelectedCellId(newId);
                            }
                          }}
                          className={`rounded-lg flex flex-col items-center justify-center p-2 text-left min-h-[72px] transition-colors ${
                            cell?.boldBorder ? 'border-2 border-gray-800' : 'border-2 border-gray-300'
                          } ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'bg-white hover:border-gray-400 hover:bg-gray-50'}`}
                        >
                          {cell ? (
                            <>
                              <span className="text-[10px] uppercase text-gray-500 font-medium">
                                {cell.type === 'jobField' ? 'Job' : cell.type === 'machineField' ? 'Machine' : cell.type === 'reportNumber' ? 'Report #' : cell.type}
                              </span>
                              <span className="text-xs font-medium text-gray-800 truncate w-full text-center">
                                {cell.type === 'jobField'
                                  ? (cell.label || JOB_FIELD_KEYS.find((k) => k.value === (cell.jobFieldKey ?? 'jobNumber'))?.label || '—')
                                  : cell.type === 'machineField'
                                    ? (cell.label || MACHINE_FIELD_KEYS.find((k) => k.value === (cell.machineFieldKey ?? 'serialNumber'))?.label || '—')
                                    : cell.type === 'reportNumber'
                                      ? (cell.label || 'Report #')
                                      : (cell.label || cell.value || '—')}
                              </span>
                              {(cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1 ? (
                                <span className="text-[10px] text-gray-500">{(cell.colSpan ?? 1)}×{cell.rowSpan ?? 1}</span>
                              ) : null}
                              {cell.required && <span className="text-red-500 text-xs">*</span>}
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">Empty</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCellId && (() => {
                  const cell = (currentTable.cells ?? []).find((c) => c.id === selectedCellId);
                  if (!cell) return null;
                  return (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-800 mb-3">Block settings</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={cell.type}
                            onChange={(e) => {
                              const newType = e.target.value as GridCellType;
                              const updates: Partial<GridCell> = { type: newType };
                              if (newType === 'machineField' && !cell.machineFieldKey) updates.machineFieldKey = 'serialNumber';
                              if (newType === 'jobField' && !cell.jobFieldKey) updates.jobFieldKey = 'jobNumber';
                              handleUpdateCell(currentTable.id, cell.id, updates);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="label">Label</option>
                            <option value="staticText">Static text (in box)</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="text">Text (answer)</option>
                            <option value="textarea">Text area / Comments (expands with content)</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Dropdown (select)</option>
                            <option value="jobField">Job field (from job)</option>
                            <option value="machineField">Machine field (from assigned machine)</option>
                            <option value="reportNumber">Report/RSR number</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Label (above/beside)</label>
                          <input
                            type="text"
                            value={cell.label ?? ''}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="e.g. Item"
                          />
                        </div>
                      </div>
                      {cell.type === 'jobField' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Job field to display</label>
                          <select
                            value={cell.jobFieldKey ?? 'jobNumber'}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { jobFieldKey: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {JOB_FIELD_KEYS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">When a job is assigned, this value will be pulled from the job.</p>
                        </div>
                      )}
                      {cell.type === 'machineField' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Machine field to display</label>
                          <select
                            value={cell.machineFieldKey ?? 'serialNumber'}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { machineFieldKey: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {MACHINE_FIELD_KEYS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">When the technician selects a machine for this job card, this value will be pulled from that machine.</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {(cell.type !== 'jobField' && cell.type !== 'machineField' && cell.type !== 'reportNumber') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Text / default value</label>
                            <input
                              type="text"
                              value={cell.value ?? ''}
                              onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { value: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Static text or default"
                            />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 pt-6 ${(cell.type === 'jobField' || cell.type === 'machineField' || cell.type === 'reportNumber') ? 'col-span-2' : ''}`}>
                          <input
                            type="checkbox"
                            checked={cell.required ?? false}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { required: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label className="text-sm text-gray-700">Required</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Column span (merge right)</label>
                          <select
                            value={cell.colSpan ?? 1}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { colSpan: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {Array.from({ length: currentTable.gridCols ?? 2 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Row span (merge down)</label>
                          <select
                            value={cell.rowSpan ?? 1}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { rowSpan: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {Array.from({ length: currentTable.gridRows ?? 2 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cell.boldBorder ?? false}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { boldBorder: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Bold border</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cell.boldText ?? false}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { boldText: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Bold text</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer" title="Header for this column so fill-in rows are clear (e.g. Item, OK, Status)">
                          <input
                            type="checkbox"
                            checked={cell.isColumnHeader ?? false}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { isColumnHeader: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Column header</span>
                        </label>
                      </div>
                      {cell.isColumnHeader && (
                        <p className="text-xs text-gray-500 mb-4">This block will show as the column header so users know what to fill in for each column below.</p>
                      )}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Text alignment (overrides table)</label>
                        <select
                          value={cell.textAlign ?? ''}
                          onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { textAlign: e.target.value === '' ? undefined : e.target.value as 'left' | 'center' | 'right' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Default (use table alignment)</option>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      {cell.type === 'select' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                          <textarea
                            value={cell.options?.join('\n') ?? ''}
                            onChange={(e) => handleUpdateCell(currentTable.id, cell.id, { options: e.target.value.split('\n').filter(Boolean) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={3}
                            placeholder="Option 1&#10;Option 2"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { handleClearCell(currentTable.id, cell.row, cell.col); setSelectedCellId(null); }}
                        className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded"
                      >
                        Clear block
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : (
            /* Legacy column-based editor */
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Table: {currentTable.name}</h3>
                <p className="text-sm text-gray-600">Add columns (headers). Choose who fills each: <strong>Admin</strong> (pre-filled for technician) or <strong>Technician</strong> (filled on site). For checklists, use &quot;Admin&quot; and enable multiple rows.</p>
              </div>

              <div className="mb-4">
                <button
                  onClick={() => handleAddColumn(currentGroup!.id, currentTable.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              </div>

              <div className="space-y-4">
                {(currentTable.columns ?? []).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No columns yet</p>
                    <p className="text-xs mt-2">Click "Add Column" to get started</p>
                  </div>
                ) : (
                  (currentTable.columns ?? []).map((column) => (
                    <div key={column.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Column Label</label>
                          <input
                            type="text"
                            value={column.label}
                            onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="e.g., Machine Check"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
                          <select
                            value={column.type}
                            onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { type: e.target.value as ColumnType })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="select">Select (Dropdown)</option>
                            <option value="textarea">Text Area</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="block text-sm font-medium text-gray-700 mb-2">Filled by</span>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`filled-by-${column.id}`}
                                checked={column.isPreFilled}
                                onChange={() => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { 
                                  isPreFilled: true,
                                  isRequired: false,
                                  allowMultipleRows: column.allowMultipleRows ?? false
                                })}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700">Admin</span>
                              <span className="text-xs text-gray-500">(pre-filled)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`filled-by-${column.id}`}
                                checked={!column.isPreFilled}
                                onChange={() => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { 
                                  isPreFilled: false,
                                  allowMultipleRows: false
                                })}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700">Technician</span>
                              <span className="text-xs text-gray-500">(on site)</span>
                            </label>
                          </div>
                        </div>
                        {!column.isPreFilled && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={column.isRequired}
                              onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { isRequired: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <label className="text-sm text-gray-700">Required (technician must fill)</label>
                          </div>
                        )}
                      </div>

                      {column.isPreFilled && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={column.allowMultipleRows || false}
                              onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { 
                                allowMultipleRows: e.target.checked 
                              })}
                              className="w-4 h-4"
                            />
                            <label className="text-sm font-medium text-gray-700">Checklist: allow multiple rows</label>
                            <span className="text-xs text-gray-500">(one row per item)</span>
                          </div>
                          {!column.allowMultipleRows && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
                              <input
                                type="text"
                                value={column.defaultValue || ''}
                                onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { defaultValue: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Default value for this column"
                              />
                            </div>
                          )}
                          
                          {/* Checklist rows: one row per item */}
                          {column.allowMultipleRows && (
                            <div className="mt-4 border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-sm text-gray-800">Checklist items (one per row)</h5>
                                <button
                                  onClick={() => handleAddRowForColumn(currentGroup!.id, currentTable.id, column.id)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-xs"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add row
                                </button>
                              </div>
                              {currentTable.rows && currentTable.rows.filter(row => row.columnId === column.id).length > 0 ? (
                                <div className="space-y-2">
                                  {currentTable.rows
                                    .filter(row => row.columnId === column.id)
                                    .map((row) => (
                                      <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{column.label}</label>
                                            {column.type === 'checkbox' ? (
                                              <input
                                                type="checkbox"
                                                checked={row.values[column.id] as boolean || false}
                                                onChange={(e) => handleUpdateRowValue(currentGroup!.id, currentTable.id, row.id, column.id, e.target.checked)}
                                                className="w-4 h-4"
                                              />
                                            ) : column.type === 'select' ? (
                                              <select
                                                value={row.values[column.id] as string || ''}
                                                onChange={(e) => handleUpdateRowValue(currentGroup!.id, currentTable.id, row.id, column.id, e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                              >
                                                <option value="">Select...</option>
                                                {column.options?.map((opt, idx) => (
                                                  <option key={idx} value={opt}>{opt}</option>
                                                ))}
                                              </select>
                                            ) : (
                                              <input
                                                type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                                                value={row.values[column.id] as string || ''}
                                                onChange={(e) => {
                                                  const value = column.type === 'number' 
                                                    ? parseFloat(e.target.value) || 0
                                                    : e.target.value;
                                                  handleUpdateRowValue(currentGroup!.id, currentTable.id, row.id, column.id, value);
                                                }}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                placeholder={`Enter ${column.label.toLowerCase()}`}
                                              />
                                            )}
                                          </div>
                                          <button
                                            onClick={() => handleDeleteRow(currentGroup!.id, currentTable.id, row.id)}
                                            className="px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center gap-1 text-xs self-end"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">No checklist items yet. Click &quot;Add row&quot; to add rows (e.g. &quot;Check oil&quot;, &quot;Check water&quot;).</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {column.type === 'select' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                          <textarea
                            value={column.options?.join('\n') || ''}
                            onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { 
                              options: e.target.value.split('\n').filter(o => o.trim())
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={4}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteColumn(currentGroup!.id, currentTable.id, column.id)}
                          className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Column
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            )
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a checklist table to configure blocks or columns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
