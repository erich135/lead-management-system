import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineRSRs,
  uploadMachineRSR,
  getMachineRSRUrl,
  deleteMachineRSR,
  getAuthToken,
  getCustomers,
  getCustomersWithMachines,
  downloadMachinePlannerReport,
  getMachineTypes,
  type Machine,
  type MachineRSR,
  type Customer,
  type CustomerWithMachines,
  type MachineType,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { UnifiedMachineImport } from './UnifiedMachineImport';
import {
  Search,
  Building2,
  Cog,
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  Image,
  Edit3,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
  Save,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { SmartDateInput } from './SmartDateInput';

export function Machines() {
  const { isSuperAdmin, hasPermission } = useAuth();

  // Machine list state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Selected / expanded machine
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Edit state
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [deletingMachine, setDeletingMachine] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Machine>>({});
  const [saving, setSaving] = useState(false);

  // RSR state
  const [machineRSRs, setMachineRSRs] = useState<MachineRSR[]>([]);
  const [loadingRSRs, setLoadingRSRs] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview state
  const [previewRSR, setPreviewRSR] = useState<MachineRSR | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCustomers, setReportCustomers] = useState<CustomerWithMachines[]>([]);
  const [reportCustomerId, setReportCustomerId] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadingReportCustomers, setLoadingReportCustomers] = useState(false);

  // Create machine state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    make: '', model: '', serialNumber: '', assetNumber: '', machineType: '',
    ownershipType: 'customer', serviceType: 'hours',
    machineHours: 0, nextServiceHours: 0,
    lastServiceDate: '', nextServiceDate: '',
    currentLocation: '', lastOilSampleDate: '', oilSampleComment: '',
    customerId: '', cashCustomer: '', isRental: false,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadWorkDate, setUploadWorkDate] = useState('');
  const [uploadCurrentHours, setUploadCurrentHours] = useState('');
  const [uploadNextServiceHours, setUploadNextServiceHours] = useState('');
  const [uploadNextServiceDate, setUploadNextServiceDate] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Load all machines on mount and when filters change
  const loadMachines = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (customerFilter) params.customerId = customerFilter;
      if (sortField) {
        params.sortField = sortField;
        params.sortDir = sortDir;
      }
      const response = await getMachines(params);
      setMachines(response.machines || []);
      setPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, customerFilter, sortField, sortDir]);

  useEffect(() => {
    const debounce = setTimeout(() => loadMachines(1), 300);
    return () => clearTimeout(debounce);
  }, [loadMachines]);

  // Load customers for filter dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await getCustomers({ limit: 500 });
        setCustomers(response.customers || []);
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };
    loadCustomers();
  }, []);

  // Load machine types for dropdown
  useEffect(() => {
    const loadMachineTypes = async () => {
      try {
        const response = await getMachineTypes();
        setMachineTypes(response.machineTypes || []);
      } catch (error) {
        console.error('Error loading machine types:', error);
      }
    };
    loadMachineTypes();
  }, []);

  // Load RSRs when a machine is expanded
  useEffect(() => {
    if (!expandedMachineId) {
      setMachineRSRs([]);
      return;
    }
    const loadRSRs = async () => {
      setLoadingRSRs(true);
      try {
        const rsrs = await getMachineRSRs(expandedMachineId);
        setMachineRSRs(rsrs);
      } catch (error) {
        console.error('Error loading RSRs:', error);
      } finally {
        setLoadingRSRs(false);
      }
    };
    loadRSRs();
  }, [expandedMachineId]);

  // Handlers
  const handleRowClick = (machine: Machine) => {
    if (expandedMachineId === machine._id) {
      setExpandedMachineId(null);
      setSelectedMachine(null);
      setEditingMachine(null);
    } else {
      setExpandedMachineId(machine._id);
      setSelectedMachine(machine);
      setEditingMachine(null);
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setEditForm({
      make: machine.make,
      model: machine.model,
      serialNumber: machine.serialNumber,
      assetNumber: machine.assetNumber || '',
      machineType: machine.machineType || '',
      ownershipType: machine.ownershipType || 'customer',
      serviceType: machine.serviceType || 'hours',
      machineHours: machine.machineHours || 0,
      nextServiceHours: machine.nextServiceHours || 0,
      lastServiceDate: machine.lastServiceDate ? machine.lastServiceDate.split('T')[0] : '',
      nextServiceDate: machine.nextServiceDate ? machine.nextServiceDate.split('T')[0] : '',
      lastOilSampleDate: machine.lastOilSampleDate ? machine.lastOilSampleDate.split('T')[0] : '',
      oilSampleComment: machine.oilSampleComment || '',
      cashCustomer: machine.cashCustomer || '',
      currentLocation: machine.currentLocation || '',
      customerId: machine.customer && typeof machine.customer === 'object' ? (machine.customer as any)._id || '' : machine.customer || '',
    } as any);
  };

  const handleSave = async () => {
    if (!editingMachine) return;
    setSaving(true);
    try {
      const payload: any = { ...editForm };
      // Promote customerId → customer field
      if (payload.customerId) {
        payload.customer = payload.customerId;
        delete payload.cashCustomer; // customer takes precedence
      } else {
        delete payload.customer;
      }
      delete payload.customerId;
      // Clean empty strings
      if (!payload.assetNumber) delete payload.assetNumber;
      if (!payload.machineType) delete payload.machineType;
      if (!payload.lastServiceDate) delete payload.lastServiceDate;
      if (!payload.nextServiceDate) delete payload.nextServiceDate;
      if (!payload.lastOilSampleDate) delete payload.lastOilSampleDate;
      if (!payload.oilSampleComment) delete payload.oilSampleComment;
      if (!payload.cashCustomer) delete payload.cashCustomer;
      if (!payload.currentLocation) delete payload.currentLocation;

      const response = await updateMachine(editingMachine._id, payload);
      // Update local state
      setMachines(prev => prev.map(m => m._id === editingMachine._id ? { ...m, ...response.machine } : m));
      setSelectedMachine(response.machine);
      setEditingMachine(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save machine');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMachine(null);
    setEditForm({});
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const payload: any = {
        make: createForm.make.trim(),
        model: createForm.model.trim(),
        serialNumber: createForm.serialNumber.trim(),
        ownershipType: createForm.ownershipType,
        serviceType: createForm.serviceType,
        isRental: createForm.ownershipType === 'ars_rental',
      };
      if (createForm.assetNumber.trim()) payload.assetNumber = createForm.assetNumber.trim();
      if (createForm.machineType) payload.machineType = createForm.machineType;
      if (createForm.currentLocation.trim()) payload.currentLocation = createForm.currentLocation.trim();
      if (createForm.oilSampleComment.trim()) payload.oilSampleComment = createForm.oilSampleComment.trim();
      if (createForm.serviceType === 'hours') {
        payload.machineHours = Number(createForm.machineHours) || 0;
        payload.nextServiceHours = Number(createForm.nextServiceHours) || 0;
      } else {
        if (createForm.lastServiceDate) payload.lastServiceDate = createForm.lastServiceDate;
        if (createForm.nextServiceDate) payload.nextServiceDate = createForm.nextServiceDate;
      }
      if (createForm.lastOilSampleDate) payload.lastOilSampleDate = createForm.lastOilSampleDate;
      // Customer assignment
      if (createForm.customerId) {
        payload.customer = createForm.customerId;
      } else if (createForm.cashCustomer.trim()) {
        payload.cashCustomer = createForm.cashCustomer.trim();
      }
      // For rental machines, customer is not required
      await createMachine(payload);
      setShowCreateModal(false);
      setCreateForm({
        make: '', model: '', serialNumber: '', assetNumber: '', machineType: '',
        ownershipType: 'customer', serviceType: 'hours',
        machineHours: 0, nextServiceHours: 0,
        lastServiceDate: '', nextServiceDate: '',
        currentLocation: '', lastOilSampleDate: '', oilSampleComment: '',
        customerId: '', cashCustomer: '', isRental: false,
      });
      await loadMachines(1);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create machine');
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: any = { page: 1, limit: 99999 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (customerFilter) params.customerId = customerFilter;
      const response = await getMachines(params);
      const rows = response.machines || [];

      const headers = [
        'Make', 'Model', 'Serial Number', 'Asset Number', 'Machine Type',
        'Customer', 'Cash Customer', 'Ownership Type', 'Is Rental', 'Service Type',
        'Machine Hours', 'Next Service Hours',
        'Last Service Date', 'Next Service Date',
        'Current Location', 'Last Oil Sample Date', 'Oil Sample Comment',
      ];

      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const csvLines = [
        headers.join(','),
        ...rows.map((m) => [
          m.make,
          m.model,
          m.serialNumber,
          m.assetNumber ?? '',
          m.machineType ?? '',
          typeof m.customer === 'object' && m.customer !== null ? m.customer.name : (m.customer ?? ''),
          m.cashCustomer ?? '',
          m.ownershipType ?? '',
          m.isRental ? 'Yes' : 'No',
          m.serviceType ?? '',
          m.machineHours ?? '',
          m.nextServiceHours ?? '',
          m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString('en-ZA') : '',
          m.nextServiceDate ? new Date(m.nextServiceDate).toLocaleDateString('en-ZA') : '',
          m.currentLocation ?? '',
          m.lastOilSampleDate ? new Date(m.lastOilSampleDate).toLocaleDateString('en-ZA') : '',
          m.oilSampleComment ?? '',
        ].map(escape).join(',')),
      ];

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `machines_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PDF, JPEG, and PNG files are allowed');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return false;
    }
    setUploadFile(file);
    setUploadError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  }

  const handleUploadRSR = async () => {
    if (!expandedMachineId || !uploadFile || !uploadTitle.trim()) {
      setUploadError('Please fill in all required fields');
      return;
    }
    if (!uploadWorkDate) {
      setUploadError('Date on RSR is required');
      return;
    }
    // Validate based on machine service type
    const machineServiceType = selectedMachine?.serviceType || 'hours';
    if (machineServiceType === 'hours') {
      if (!uploadCurrentHours || !uploadNextServiceHours) {
        setUploadError('Current hours and next service hours are required');
        return;
      }
    } else if (machineServiceType === 'date') {
      if (!uploadNextServiceDate) {
        setUploadError('Next service date is required');
        return;
      }
    }
    setUploading(true);
    setUploadError(null);
    try {
      const extraFields: any = { workDate: uploadWorkDate };
      if (machineServiceType === 'hours') {
        extraFields.currentHours = Number(uploadCurrentHours);
        extraFields.nextServiceHours = Number(uploadNextServiceHours);
      } else {
        extraFields.nextServiceDate = uploadNextServiceDate;
      }
      await uploadMachineRSR(expandedMachineId, uploadFile, uploadTitle.trim(), uploadDescription.trim() || undefined, extraFields);
      const rsrs = await getMachineRSRs(expandedMachineId);
      setMachineRSRs(rsrs);
      // Also refresh the machines list to get updated hours/dates
      await loadMachines(pagination.page);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      setUploadWorkDate('');
      setUploadCurrentHours('');
      setUploadNextServiceHours('');
      setUploadNextServiceDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload RSR');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadRSR = (rsr: MachineRSR) => {
    if (!expandedMachineId) return;
    const token = getAuthToken();
    const url = getMachineRSRUrl(expandedMachineId, rsr._id);
    const link = document.createElement('a');
    link.href = `${url}?token=${token}`;
    link.download = rsr.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewRSR = (rsr: MachineRSR) => {
    setPreviewRSR(rsr);
    setShowPreview(true);
  };

  const getPreviewUrl = (rsr: MachineRSR) => {
    if (!expandedMachineId) return '';
    const token = getAuthToken();
    return `${getMachineRSRUrl(expandedMachineId, rsr._id)}?token=${token}`;
  };

  const isImageFile = (mimeType: string) => mimeType.startsWith('image/');

  const handleDeleteRSR = async (rsr: MachineRSR) => {
    if (!expandedMachineId) return;
    if (!confirm(`Are you sure you want to delete "${rsr.title}"?`)) return;
    try {
      await deleteMachineRSR(expandedMachineId, rsr._id);
      setMachineRSRs(prev => prev.filter(r => r._id !== rsr._id));
    } catch (error: any) {
      alert(error.message || 'Failed to delete RSR');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const getCustomerName = (machine: Machine) => {
    if (machine.customer && typeof machine.customer === 'object') return machine.customer.name;
    if (machine.cashCustomer) return machine.cashCustomer;
    if (machine.isRental) return 'Rental Fleet';
    return '—';
  };

  const getCustomerType = (machine: Machine) => {
    if (machine.customer && typeof machine.customer === 'object') return 'regular';
    if (machine.cashCustomer) return 'cash';
    if (machine.isRental) return 'rental';
    return 'unknown';
  };

  const handleDeleteMachine = async () => {
    if (!machineToDelete) return;
    setDeletingMachine(true);
    try {
      await deleteMachine(machineToDelete._id);
      setMachineToDelete(null);
      setExpandedMachineId(null);
      await loadMachines(pagination.page);
    } catch (err: any) {
      console.error('Failed to delete machine:', err);
    } finally {
      setDeletingMachine(false);
    }
  };

  const handleOpenReportModal = async () => {
    setShowReportModal(true);
    setReportError(null);
    setReportCustomerId('');
    setLoadingReportCustomers(true);
    try {
      const result = await getCustomersWithMachines();
      setReportCustomers(result.customers || []);
    } catch (err: any) {
      setReportError(err.message || 'Failed to load customers');
    } finally {
      setLoadingReportCustomers(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportCustomerId) return;
    const customer = reportCustomers.find(c => c._id === reportCustomerId);
    if (!customer) return;
    setGeneratingReport(true);
    setReportError(null);
    try {
      await downloadMachinePlannerReport(reportCustomerId, customer.name);
      setShowReportModal(false);
    } catch (err: any) {
      setReportError(err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Cog className="w-7 h-7 text-amber-600" />
              Machines
            </h1>
            <p className="text-slate-600 mt-1">
              View, manage, and edit all machines. Click a row to view details and RSR documents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(isSuperAdmin || hasPermission('machines.manage')) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 shadow-sm transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Machine
              </button>
            )}
            {(isSuperAdmin || hasPermission('machines.manage')) && (
              <button
                onClick={() => setShowImportWizard(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Import Machines
              </button>
            )}
            <button
              onClick={handleOpenReportModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-sm transition-all text-sm font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generate Machine Report
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 shadow-sm transition-all text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export Machine List
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by make, model, or serial number..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Customer Filter */}
          <div className="relative sm:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || customerFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setCustomerFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-slate-500">
          {loading ? 'Loading...' : `${pagination.total} machine${pagination.total !== 1 ? 's' : ''} found`}
        </div>
      </div>

      {/* Machines Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Cog className="w-14 h-14 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">No machines found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {(['make', 'serialNumber', 'customer', 'machineHours'] as const).map((field, i) => {
                const labels: Record<string, string> = { make: 'Machine', serialNumber: 'Serial Number', customer: 'Customer', machineHours: 'Service Info' };
                const spans = [3, 2, 3, 2];
                const isActive = sortField === field;
                return (
                  <div
                    key={field}
                    className={`col-span-${spans[i]} flex items-center gap-1 cursor-pointer select-none hover:text-slate-800 transition-colors ${isActive ? 'text-amber-600' : ''}`}
                    onClick={() => handleSort(field)}
                  >
                    {labels[field]}
                    <span className="inline-flex flex-col leading-none">
                      <ChevronUp className={`w-2.5 h-2.5 -mb-0.5 ${isActive && sortDir === 'asc' ? 'text-amber-600' : 'text-slate-300'}`} />
                      <ChevronDown className={`w-2.5 h-2.5 ${isActive && sortDir === 'desc' ? 'text-amber-600' : 'text-slate-300'}`} />
                    </span>
                  </div>
                );
              })}
              <div className="col-span-1">RSRs</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            {machines.map((machine) => {
              const isExpanded = expandedMachineId === machine._id;
              const isEditing = editingMachine?._id === machine._id;
              const custType = getCustomerType(machine);

              return (
                <div key={machine._id} className={`border-b border-slate-100 last:border-0 ${isExpanded ? 'bg-amber-50/40' : ''}`}>
                  {/* Row */}
                  <div
                    onClick={() => handleRowClick(machine)}
                    className={`grid grid-cols-12 gap-2 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors items-center ${
                      isExpanded ? 'bg-amber-50/60 hover:bg-amber-50/80' : ''
                    }`}
                  >
                    {/* Machine Make/Model */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <Cog className={`w-5 h-5 flex-shrink-0 ${isExpanded ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{machine.make} {machine.model}</div>
                        {machine.assetNumber && (
                          <div className="text-xs text-slate-400">Asset: {machine.assetNumber}</div>
                        )}
                        {machine.currentLocation && (
                          <div className="text-xs text-slate-400">Loc: {machine.currentLocation}</div>
                        )}
                      </div>
                    </div>

                    {/* Serial Number */}
                    <div className="col-span-2 text-sm text-slate-600 font-mono truncate">
                      {machine.serialNumber}
                    </div>

                    {/* Customer */}
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium truncate ${
                        custType === 'regular' ? 'bg-blue-100 text-blue-700' :
                        custType === 'cash' ? 'bg-green-100 text-green-700' :
                        custType === 'rental' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {custType === 'regular' ? <Building2 className="w-3 h-3 flex-shrink-0" /> : null}
                        <span className="truncate">{getCustomerName(machine)}</span>
                      </span>
                    </div>

                    {/* Service Info */}
                    <div className="col-span-2 text-sm text-slate-500">
                      {machine.serviceType === 'date' ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {machine.nextServiceDate ? formatDate(machine.nextServiceDate) : 'Not set'}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          {machine.machineHours || 0}h / {machine.nextServiceHours || 0}h
                        </span>
                      )}
                    </div>

                    {/* RSR Count */}
                    <div className="col-span-1">
                      {machine.rsrDocuments && machine.rsrDocuments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <FileText className="w-3 h-3" />
                          {machine.rsrDocuments.length}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Expand Arrow */}
                    <div className="col-span-1 flex justify-end">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-amber-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        {/* Detail Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Cog className="w-4 h-4 text-amber-600" />
                            {machine.make} {machine.model}
                            <span className="text-sm font-normal text-slate-500">— S/N: {machine.serialNumber}</span>
                          </h3>
                          <div className="flex items-center gap-2">
                            {!isEditing ? (
                              <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(machine); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMachineToDelete(machine); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSave(); }}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  Save
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Detail Body */}
                        <div className="p-5">
                          {isEditing ? (
                            /* Edit Form */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Make</label>
                                <input
                                  type="text"
                                  value={editForm.make || ''}
                                  onChange={(e) => setEditForm({ ...editForm, make: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model</label>
                                <input
                                  type="text"
                                  value={editForm.model || ''}
                                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Serial Number</label>
                                <input
                                  type="text"
                                  value={editForm.serialNumber || ''}
                                  onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asset Number</label>
                                <input
                                  type="text"
                                  value={editForm.assetNumber || ''}
                                  onChange={(e) => setEditForm({ ...editForm, assetNumber: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Location</label>
                                <input
                                  type="text"
                                  value={(editForm as any).currentLocation || ''}
                                  onChange={(e) => setEditForm({ ...editForm, currentLocation: e.target.value } as any)}
                                  placeholder="e.g. Site A, Workshop, Client premises"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Machine Type</label>
                                <select
                                  value={(editForm as any).machineType || ''}
                                  onChange={(e) => setEditForm({ ...editForm, machineType: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Select type</option>
                                  {machineTypes.length > 0
                                    ? machineTypes.map(mt => (
                                        <option key={mt._id} value={mt.name}>{mt.name}</option>
                                      ))
                                    : (
                                      <>
                                        <option value="Generator">Generator</option>
                                        <option value="Genset">Genset</option>
                                        <option value="Compressor oil free">Compressor oil free</option>
                                        <option value="Compressor oil injection">Compressor oil injection</option>
                                        <option value="Diesel reciprocating compressor">Diesel reciprocating compressor</option>
                                        <option value="Dryer">Dryer</option>
                                        <option value="Blower">Blower</option>
                                        <option value="Vacuum pump">Vacuum pump</option>
                                        <option value="Air Receiver">Air Receiver</option>
                                      </>
                                    )
                                  }
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Ownership</label>
                                <select
                                  value={(editForm as any).ownershipType || 'customer'}
                                  onChange={(e) => setEditForm({ ...editForm, ownershipType: e.target.value as 'customer' | 'ars_rental' } as any)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="customer">Customer's Own Machine</option>
                                  <option value="ars_rental">ARS Rental Unit</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Linked Customer</label>
                                <select
                                  value={(editForm as any).customerId || ''}
                                  onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value, cashCustomer: '' } as any)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">— No linked customer —</option>
                                  {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-0.5">Selecting a customer clears the Cash Customer field</p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash Customer</label>
                                <input
                                  type="text"
                                  value={editForm.cashCustomer || ''}
                                  onChange={(e) => setEditForm({ ...editForm, cashCustomer: e.target.value, customerId: '' } as any)}
                                  placeholder="Only if not a linked customer"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Service Type</label>
                                <select
                                  value={editForm.serviceType || 'hours'}
                                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value as 'hours' | 'date' })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="hours">Hours Based</option>
                                  <option value="date">Date Based</option>
                                </select>
                              </div>
                              {editForm.serviceType !== 'date' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Machine Hours</label>
                                    <input
                                      type="number"
                                      value={editForm.machineHours || 0}
                                      onChange={(e) => setEditForm({ ...editForm, machineHours: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Next Service Hours</label>
                                    <input
                                      type="number"
                                      value={editForm.nextServiceHours || 0}
                                      onChange={(e) => setEditForm({ ...editForm, nextServiceHours: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                </>
                              )}
                              {editForm.serviceType === 'date' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Service Date</label>
                                    <SmartDateInput
                                      value={editForm.lastServiceDate || ''}
                                      onChange={(e) => setEditForm({ ...editForm, lastServiceDate: e.target.value })}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Next Service Date</label>
                                    <SmartDateInput
                                      value={editForm.nextServiceDate || ''}
                                      onChange={(e) => setEditForm({ ...editForm, nextServiceDate: e.target.value })}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                </>
                              )}
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Oil Sample Date</label>
                                <SmartDateInput
                                  value={editForm.lastOilSampleDate || ''}
                                  onChange={(e) => setEditForm({ ...editForm, lastOilSampleDate: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Oil Sample Comment</label>
                                <input
                                  type="text"
                                  value={editForm.oilSampleComment || ''}
                                  onChange={(e) => setEditForm({ ...editForm, oilSampleComment: e.target.value })}
                                  placeholder="Feedback on oil sample result..."
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          ) : (
                            /* Read-Only Details */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Make</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.make}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Model</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.model}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Serial Number</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5 font-mono">{machine.serialNumber}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Asset Number</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.assetNumber || '—'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Current Location</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.currentLocation || '—'}</div>
                              </div>
                              {machine.machineType && (
                                <div>
                                  <div className="text-xs font-semibold text-slate-400 uppercase">Machine Type</div>
                                  <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.machineType}</div>
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Customer</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{getCustomerName(machine)}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Ownership</div>
                                <div className="text-sm mt-0.5">
                                  {machine.ownershipType === 'ars_rental' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">ARS Rental Unit</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Customer's Own</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Service Type</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5 capitalize">{machine.serviceType || 'Hours'}</div>
                              </div>
                              {machine.serviceType === 'date' ? (
                                <>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase">Last Service</div>
                                    <div className="text-sm font-medium text-slate-800 mt-0.5">{formatDate(machine.lastServiceDate)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase">Next Service</div>
                                    <div className="text-sm font-medium text-slate-800 mt-0.5">{formatDate(machine.nextServiceDate)}</div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase">Machine Hours</div>
                                    <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.machineHours || 0}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase">Next Service Hours</div>
                                    <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.nextServiceHours || 0}</div>
                                  </div>
                                </>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase">Last Oil Sample Date</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.lastOilSampleDate ? formatDate(machine.lastOilSampleDate) : '—'}</div>
                              </div>
                              <div className="md:col-span-3">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Oil Sample Comment</div>
                                <div className="text-sm font-medium text-slate-800 mt-0.5">{machine.oilSampleComment || '—'}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* RSR Documents Section */}
                        <div className="border-t border-slate-200 px-5 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-red-600" />
                              RSR Documents
                              {machineRSRs.length > 0 && (
                                <span className="text-xs font-normal text-slate-400">({machineRSRs.length})</span>
                              )}
                            </h4>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowUploadModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Upload RSR
                            </button>
                          </div>

                          {loadingRSRs ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            </div>
                          ) : machineRSRs.length > 0 ? (
                            <div className="space-y-2">
                              {machineRSRs.map((rsr) => (
                                <div
                                  key={rsr._id}
                                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                                >
                                  <div className={`p-1.5 rounded-lg ${isImageFile(rsr.mimeType) ? 'bg-purple-100' : 'bg-red-100'}`}>
                                    {isImageFile(rsr.mimeType) ? (
                                      <Image className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-red-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-800">{rsr.title || rsr.fileName}</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                      <span>{formatDate(rsr.uploadedAt)}</span>
                                      <span>{formatFileSize(rsr.fileSize)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleViewRSR(rsr); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="View">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadRSR(rsr); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Download">
                                      <Download className="w-4 h-4" />
                                    </button>
                                    {isSuperAdmin && (
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRSR(rsr); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-slate-400 text-sm">
                              No RSR documents uploaded yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMachines(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadMachines(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Upload RSR Document</h3>
              <button
                onClick={() => { setShowUploadModal(false); setUploadError(null); setUploadFile(null); setUploadTitle(''); setUploadDescription(''); setUploadWorkDate(''); setUploadCurrentHours(''); setUploadNextServiceHours(''); setUploadNextServiceDate(''); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Machine Info */}
              {selectedMachine && (
                <div className="p-3 bg-amber-50 rounded-lg flex items-center gap-3">
                  <Cog className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-medium text-slate-800">{selectedMachine.make} {selectedMachine.model}</div>
                    <div className="text-sm text-slate-500">S/N: {selectedMachine.serialNumber}
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600 capitalize">
                        {selectedMachine.serviceType || 'hours'} based
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g., Warranty RSR - Engine Repair"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              {/* Date on RSR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date on RSR <span className="text-red-500">*</span></label>
                <SmartDateInput value={uploadWorkDate} onChange={(e) => setUploadWorkDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                <p className="text-xs text-slate-400 mt-1">The date the work was actually done</p>
              </div>
              {/* Conditional fields based on service type */}
              {(selectedMachine?.serviceType || 'hours') === 'hours' ? (
                /* Hour-based machine: Current Hours + Next Service Hours */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Hours <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={uploadCurrentHours} onChange={(e) => setUploadCurrentHours(e.target.value)}
                      placeholder="e.g., 1250"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Next Service Hours <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={uploadNextServiceHours} onChange={(e) => setUploadNextServiceHours(e.target.value)}
                      placeholder="e.g., 1500"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                  </div>
                </div>
              ) : (
                /* Date-based machine: Next Service Date */
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Next Service Date <span className="text-red-500">*</span></label>
                  <SmartDateInput value={uploadNextServiceDate} onChange={(e) => setUploadNextServiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                </div>
              )}
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Optional notes about this RSR..." rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none" />
              </div>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File <span className="text-red-500">*</span></label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragOver ? 'border-blue-400 bg-blue-50 scale-105' : uploadFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}>
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{uploadFile.name}</span>
                      <span className="text-sm text-green-600">({formatFileSize(uploadFile.size)})</span>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragOver ? 'text-blue-500' : ''}`} />
                      <p>{isDragOver ? 'Drop your file here' : 'Click to select or drag and drop'}</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPEG, PNG • Max 10MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                </div>
              </div>
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{uploadError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button onClick={() => { setShowUploadModal(false); setUploadError(null); setUploadFile(null); setUploadTitle(''); setUploadDescription(''); setUploadWorkDate(''); setUploadCurrentHours(''); setUploadNextServiceHours(''); setUploadNextServiceDate(''); }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={handleUploadRSR} disabled={uploading || !uploadFile || !uploadTitle.trim() || !uploadWorkDate}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {uploading ? (<><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>) : (<><Upload className="w-4 h-4" />Upload</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewRSR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{previewRSR.title || previewRSR.fileName}</h3>
                <p className="text-sm text-slate-500">{previewRSR.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadRSR(previewRSR)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => { setShowPreview(false); setPreviewRSR(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {isImageFile(previewRSR.mimeType) ? (
                <img src={getPreviewUrl(previewRSR)} alt={previewRSR.title || previewRSR.fileName} className="max-w-full h-auto mx-auto rounded-lg shadow-lg" />
              ) : (
                <iframe src={getPreviewUrl(previewRSR)} className="w-full h-full min-h-[70vh] rounded-lg bg-white" title={previewRSR.title || previewRSR.fileName} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Generate Machine Report
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">
                Generate an Excel report with service history for all machines belonging to a customer. 
                The report follows the Planner format with one sheet per machine.
              </p>

              {loadingReportCustomers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">Loading customers...</span>
                </div>
              ) : reportCustomers.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No customers with machines found</p>
                  <p className="text-xs text-slate-400 mt-1">Import machines with a Customer column first</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
                  <select
                    value={reportCustomerId}
                    onChange={(e) => setReportCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="">Choose a customer...</option>
                    {reportCustomers.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.machineCount} machine{c.machineCount !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reportError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{reportError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={!reportCustomerId || generatingReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingReport ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                ) : (
                  <><Download className="w-4 h-4" />Download Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard */}
      {showImportWizard && (
        <UnifiedMachineImport
          onClose={() => setShowImportWizard(false)}
          onImportComplete={() => loadMachines(1)}
        />
      )}

      {/* Delete Machine Confirmation Modal */}
      {machineToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => !deletingMachine && setMachineToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Machine</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              {/* Machine Info */}
              <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800">{machineToDelete.make} {machineToDelete.model}</p>
                <p className="text-sm text-slate-500 font-mono mt-0.5">S/N: {machineToDelete.serialNumber}</p>
                {machineToDelete.assetNumber && <p className="text-sm text-slate-500">Asset: {machineToDelete.assetNumber}</p>}
              </div>

              {/* Big Warning Banner */}
              <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800 text-base mb-1">⚠ PERMANENT DELETION WARNING</p>
                    <p className="text-sm text-red-700 mb-2">
                      You are about to <strong>permanently delete</strong> this machine record. This will:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 list-none">
                      <li>• Remove the machine from the system entirely</li>
                      <li>• Delete all linked RSR documents</li>
                      <li>• Break historical job references to this machine</li>
                    </ul>
                    <p className="text-sm font-bold text-red-800 mt-3">This cannot be reversed. Are you absolutely sure?</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setMachineToDelete(null)}
                  disabled={deletingMachine}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 font-bold text-[14px] uppercase"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteMachine}
                  disabled={deletingMachine}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingMachine ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />DELETING...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" />YES, DELETE MACHINE</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Machine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Add New Machine</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Make <span className="text-red-500">*</span></label>
                  <input type="text" value={createForm.make} onChange={e => setCreateForm({ ...createForm, make: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model <span className="text-red-500">*</span></label>
                  <input type="text" value={createForm.model} onChange={e => setCreateForm({ ...createForm, model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Serial Number <span className="text-red-500">*</span></label>
                  <input type="text" value={createForm.serialNumber} onChange={e => setCreateForm({ ...createForm, serialNumber: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asset Number</label>
                  <input type="text" value={createForm.assetNumber} onChange={e => setCreateForm({ ...createForm, assetNumber: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Machine Type</label>
                  <select value={createForm.machineType} onChange={e => setCreateForm({ ...createForm, machineType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
                    <option value="">Select type</option>
                    {machineTypes.length > 0
                      ? machineTypes.map(mt => <option key={mt._id} value={mt.name}>{mt.name}</option>)
                      : (<>
                          <option value="Generator">Generator</option>
                          <option value="Genset">Genset</option>
                          <option value="Compressor oil free">Compressor oil free</option>
                          <option value="Compressor oil injection">Compressor oil injection</option>
                          <option value="Diesel reciprocating compressor">Diesel reciprocating compressor</option>
                          <option value="Dryer">Dryer</option>
                          <option value="Blower">Blower</option>
                          <option value="Vacuum pump">Vacuum pump</option>
                          <option value="Air Receiver">Air Receiver</option>
                        </>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Ownership</label>
                  <select value={createForm.ownershipType} onChange={e => setCreateForm({ ...createForm, ownershipType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
                    <option value="customer">Customer's Own Machine</option>
                    <option value="ars_rental">ARS Rental Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Linked Customer</label>
                  <select value={createForm.customerId} onChange={e => setCreateForm({ ...createForm, customerId: e.target.value, cashCustomer: '' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
                    <option value="">— No linked customer —</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash Customer</label>
                  <input type="text" value={createForm.cashCustomer} onChange={e => setCreateForm({ ...createForm, cashCustomer: e.target.value, customerId: '' })} placeholder="Only if not a linked customer" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Service Type</label>
                  <select value={createForm.serviceType} onChange={e => setCreateForm({ ...createForm, serviceType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
                    <option value="hours">Hours Based</option>
                    <option value="date">Date Based</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Location</label>
                  <input type="text" value={createForm.currentLocation} onChange={e => setCreateForm({ ...createForm, currentLocation: e.target.value })} placeholder="e.g. Site A, Workshop" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                {createForm.serviceType !== 'date' && (<>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Machine Hours</label>
                    <input type="number" value={createForm.machineHours} onChange={e => setCreateForm({ ...createForm, machineHours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Next Service Hours</label>
                    <input type="number" value={createForm.nextServiceHours} onChange={e => setCreateForm({ ...createForm, nextServiceHours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                  </div>
                </>)}
                {createForm.serviceType === 'date' && (<>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Service Date</label>
                    <SmartDateInput value={createForm.lastServiceDate} onChange={e => setCreateForm({ ...createForm, lastServiceDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Next Service Date</label>
                    <SmartDateInput value={createForm.nextServiceDate} onChange={e => setCreateForm({ ...createForm, nextServiceDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                  </div>
                </>)}
              </div>
              {createError && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.make.trim() || !createForm.model.trim() || !createForm.serialNumber.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Saving…' : 'Add Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
