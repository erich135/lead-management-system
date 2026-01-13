import { useState } from 'react';
import { 
  Save, 
  X, 
  Plus,
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
  Edit2
} from 'lucide-react';
import { JobCardPreview } from './JobCardPreview';
import type { JobCardTemplate } from '../lib/api';
import { getGlobalHeaderConfig, saveGlobalHeaderConfig, getGlobalFooterConfig, saveGlobalFooterConfig } from '../utils/jobCardConfig';

/**
 * Column type for table columns.
 */
export type ColumnType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';

/**
 * Table column definition.
 */
export interface TableColumn {
  id: string;
  label: string;
  type: ColumnType;
  isPreFilled: boolean; // Admin fills this
  isRequired: boolean; // Technician must fill this (if not pre-filled)
  defaultValue?: string;
  options?: string[]; // For select type
  width?: number; // Column width percentage
  allowMultipleRows?: boolean; // If true and isPreFilled, admin can add multiple rows
}

/**
 * Table row data (for pre-filled columns with multiple rows).
 */
export interface TableRow {
  id: string;
  columnId: string; // Which column this row belongs to
  values: Record<string, string | number | boolean>; // columnId -> value
}

/**
 * Table definition within a group.
 */
export interface TableDefinition {
  id: string;
  name: string;
  columns: TableColumn[];
  rows?: TableRow[]; // Pre-filled rows when columns have allowMultipleRows
}

/**
 * Group definition (e.g., "Checklist", "Inspect").
 */
export interface TemplateGroup {
  id: string;
  name: string;
  tables: TableDefinition[];
}

/**
 * Header configuration.
 */
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
}

/**
 * Footer configuration.
 */
export interface FooterConfig {
  technicianSignatureLabel?: string;
  customerSignatureLabel?: string;
  dateLabel?: string;
  notesLabel?: string;
}

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
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [groups, setGroups] = useState<TemplateGroup[]>(template?.groups || []);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
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

  /**
   * Adds a new group.
   */
  const handleAddGroup = () => {
    const newGroup: TemplateGroup = {
      id: generateId(),
      name: 'New Group',
      tables: [],
    };
    setGroups([...groups, newGroup]);
    setSelectedGroup(newGroup.id);
  };

  /**
   * Deletes a group.
   */
  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    if (selectedGroup === groupId) {
      setSelectedGroup(null);
    }
  };

  /**
   * Updates a group name.
   */
  const handleUpdateGroupName = (groupId: string, name: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, name } : g));
  };

  /**
   * Adds a table to a group.
   */
  const handleAddTable = (groupId: string) => {
    const newTable: TableDefinition = {
      id: generateId(),
      name: 'New Table',
      columns: [],
    };
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, tables: [...g.tables, newTable] }
        : g
    ));
    setSelectedTable(newTable.id);
  };

  /**
   * Deletes a table.
   */
  const handleDeleteTable = (groupId: string, tableId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, tables: g.tables.filter(t => t.id !== tableId) }
        : g
    ));
    if (selectedTable === tableId) {
      setSelectedTable(null);
    }
  };

  /**
   * Updates a table name.
   */
  const handleUpdateTableName = (groupId: string, tableId: string, name: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            tables: g.tables.map(t => t.id === tableId ? { ...t, name } : t)
          }
        : g
    ));
  };

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
                ? { ...t, columns: [...t.columns, newColumn] }
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
                ? { ...t, columns: t.columns.filter(c => c.id !== columnId) }
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
                    columns: t.columns.map(c => 
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
    table.columns.forEach(col => {
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
    table.columns.forEach(col => {
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
      // Don't save header/footer in template - they're global
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

  const currentGroup = groups.find(g => g.id === selectedGroup);
  const currentTable = currentGroup?.tables.find(t => t.id === selectedTable);

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
        {/* Left Sidebar - Groups */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Groups</h3>
              <button
                onClick={handleAddGroup}
                className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                title="Add Group"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Add groups like "Checklist" or "Inspect"</p>
          </div>

          <div className="p-2 space-y-2">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No groups yet</p>
                <p className="text-xs mt-1">Click + to add a group</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedGroup === group.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedTable(null);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => handleUpdateGroupName(group.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-gray-800 bg-transparent border-none outline-none flex-1"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-600">
                    {group.tables.length} table{group.tables.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle - Tables */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          {currentGroup ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{currentGroup.name}</h3>
                  <button
                    onClick={() => handleAddTable(currentGroup.id)}
                    className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                    title="Add Table"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Add tables to this group</p>
              </div>

              <div className="p-2 space-y-2">
                {currentGroup.tables.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No tables yet</p>
                    <p className="text-xs mt-1">Click + to add a table</p>
                  </div>
                ) : (
                  currentGroup.tables.map((table) => (
                    <div
                      key={table.id}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedTable === table.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTable(table.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={table.name}
                          onChange={(e) => handleUpdateTableName(currentGroup.id, table.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gray-800 bg-transparent border-none outline-none flex-1"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(currentGroup.id, table.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-600">
                        {table.columns.length} column{table.columns.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a group to manage tables</p>
            </div>
          )}
        </div>

        {/* Right - Column Configuration */}
        <div className="flex-1 bg-white overflow-y-auto">
          {currentTable ? (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Table: {currentTable.name}</h3>
                <p className="text-sm text-gray-600">Configure columns for this table</p>
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
                {currentTable.columns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No columns yet</p>
                    <p className="text-xs mt-2">Click "Add Column" to get started</p>
                  </div>
                ) : (
                  currentTable.columns.map((column) => (
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
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={column.isPreFilled}
                            onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { 
                              isPreFilled: e.target.checked,
                              isRequired: e.target.checked ? false : column.isRequired,
                              allowMultipleRows: e.target.checked ? column.allowMultipleRows : false
                            })}
                            className="w-4 h-4"
                          />
                          <label className="text-sm text-gray-700">Admin Pre-fills</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={column.isRequired}
                            onChange={(e) => handleUpdateColumn(currentGroup!.id, currentTable.id, column.id, { isRequired: e.target.checked })}
                            disabled={column.isPreFilled}
                            className="w-4 h-4"
                          />
                          <label className={`text-sm ${column.isPreFilled ? 'text-gray-400' : 'text-gray-700'}`}>
                            Technician Required
                          </label>
                        </div>
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
                            <label className="text-sm font-medium text-gray-700">Allow Multiple Rows</label>
                            <span className="text-xs text-gray-500">(Add multiple checklist items)</span>
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
                          
                          {/* Row Management for this specific column */}
                          {column.allowMultipleRows && (
                            <div className="mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-sm text-gray-800">Rows for "{column.label}"</h5>
                                <button
                                  onClick={() => handleAddRowForColumn(currentGroup!.id, currentTable.id, column.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-xs"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Row
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
                                <p className="text-sm text-gray-600">No rows added yet. Click "Add Row" to create checklist items for this column.</p>
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
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a table to configure columns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
