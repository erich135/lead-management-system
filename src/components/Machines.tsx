import { useState, useEffect, useRef } from 'react';
import {
  getCustomers,
  getCashCustomers,
  getMachinesByCustomer,
  getMachineRSRs,
  uploadMachineRSR,
  getMachineRSRUrl,
  deleteMachineRSR,
  getAuthToken,
  type Machine,
  type MachineRSR,
  type Customer,
  type CashCustomer,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Building2,
  User,
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
  Plus,
  Eye,
  Image,
} from 'lucide-react';

export function Machines() {
  const { isSuperAdmin } = useAuth();
  
  // Customer search state
  const [customerType, setCustomerType] = useState<'regular' | 'cash'>('regular');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashCustomers, setCashCustomers] = useState<CashCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCashCustomer, setSelectedCashCustomer] = useState<CashCustomer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Machine state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // RSR state
  const [machineRSRs, setMachineRSRs] = useState<MachineRSR[]>([]);
  const [loadingRSRs, setLoadingRSRs] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Preview state
  const [previewRSR, setPreviewRSR] = useState<MachineRSR | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load customers on search
  useEffect(() => {
    const loadCustomers = async () => {
      if (searchQuery.length < 2) {
        setCustomers([]);
        setCashCustomers([]);
        return;
      }
      
      setLoadingCustomers(true);
      try {
        if (customerType === 'regular') {
          const response = await getCustomers({ search: searchQuery, limit: 20 });
          setCustomers(response.customers || []);
        } else {
          const response = await getCashCustomers({ search: searchQuery, limit: 20 });
          setCashCustomers(response.cashCustomers || []);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const debounce = setTimeout(loadCustomers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, customerType]);

  // Load machines when customer is selected
  useEffect(() => {
    const loadMachines = async () => {
      setMachines([]);
      setSelectedMachine(null);
      setMachineRSRs([]);
      
      if (!selectedCustomer && !selectedCashCustomer) return;
      
      setLoadingMachines(true);
      try {
        const response = await getMachinesByCustomer(
          selectedCustomer?._id,
          selectedCashCustomer?.name
        );
        setMachines(response.machines || []);
      } catch (error) {
        console.error('Error loading machines:', error);
      } finally {
        setLoadingMachines(false);
      }
    };

    loadMachines();
  }, [selectedCustomer, selectedCashCustomer]);

  // Load RSRs when machine is selected
  useEffect(() => {
    const loadRSRs = async () => {
      if (!selectedMachine) {
        setMachineRSRs([]);
        return;
      }
      
      setLoadingRSRs(true);
      try {
        const rsrs = await getMachineRSRs(selectedMachine._id);
        setMachineRSRs(rsrs);
      } catch (error) {
        console.error('Error loading RSRs:', error);
      } finally {
        setLoadingRSRs(false);
      }
    };

    loadRSRs();
  }, [selectedMachine]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCashCustomer(null);
    setSearchQuery('');
    setShowCustomerDropdown(false);
  };

  const handleCashCustomerSelect = (cashCustomer: CashCustomer) => {
    setSelectedCashCustomer(cashCustomer);
    setSelectedCustomer(null);
    setSearchQuery('');
    setShowCustomerDropdown(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only PDF, JPEG, and PNG files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      setUploadFile(file);
      setUploadError(null);
    }
  };

  const handleUploadRSR = async () => {
    if (!selectedMachine || !uploadFile || !uploadTitle.trim()) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await uploadMachineRSR(
        selectedMachine._id,
        uploadFile,
        uploadTitle.trim(),
        uploadDescription.trim() || undefined
      );

      // Refresh RSRs
      const rsrs = await getMachineRSRs(selectedMachine._id);
      setMachineRSRs(rsrs);

      // Reset form
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload RSR');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadRSR = (rsr: MachineRSR) => {
    if (!selectedMachine) return;
    const token = getAuthToken();
    const url = getMachineRSRUrl(selectedMachine._id, rsr._id);
    
    // Create a temporary link to download with auth
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
    if (!selectedMachine) return '';
    const token = getAuthToken();
    return `${getMachineRSRUrl(selectedMachine._id, rsr._id)}?token=${token}`;
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const handleDeleteRSR = async (rsr: MachineRSR) => {
    if (!selectedMachine) return;
    if (!confirm(`Are you sure you want to delete "${rsr.title}"?`)) return;

    try {
      await deleteMachineRSR(selectedMachine._id, rsr._id);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const customerDisplayName = selectedCustomer?.name || selectedCashCustomer?.name || '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Machine RSR Documents</h1>
        <p className="text-slate-600 mt-1">
          Upload and manage RSR documents for machines directly (warranty, breakdowns, etc.)
        </p>
      </div>

      {/* Customer Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Select Customer
        </h2>

        {/* Customer Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setCustomerType('regular');
              setSelectedCustomer(null);
              setSelectedCashCustomer(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              customerType === 'regular'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Regular Customer
          </button>
          <button
            onClick={() => {
              setCustomerType('cash');
              setSelectedCustomer(null);
              setSelectedCashCustomer(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              customerType === 'cash'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Cash Customer
          </button>
        </div>

        {/* Search Input */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder={`Search ${customerType === 'regular' ? 'customers' : 'cash customers'}...`}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {loadingCustomers && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Customer Dropdown */}
          {showCustomerDropdown && searchQuery.length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {customerType === 'regular' ? (
                customers.length > 0 ? (
                  customers.map((customer) => (
                    <button
                      key={customer._id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-800">{customer.name}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-center">
                    No customers found
                  </div>
                )
              ) : (
                cashCustomers.length > 0 ? (
                  cashCustomers.map((customer) => (
                    <button
                      key={customer._id}
                      onClick={() => handleCashCustomerSelect(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-800">{customer.name}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-center">
                    No cash customers found
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Selected Customer Display */}
        {customerDisplayName && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            {selectedCustomer ? (
              <Building2 className="w-5 h-5 text-blue-600" />
            ) : (
              <User className="w-5 h-5 text-green-600" />
            )}
            <div className="flex-1">
              <div className="font-medium text-slate-800">{customerDisplayName}</div>
              <div className="text-sm text-slate-500">
                {selectedCustomer ? 'Regular Customer' : 'Cash Customer'}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setSelectedCashCustomer(null);
                setMachines([]);
                setSelectedMachine(null);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Machines Section */}
      {(selectedCustomer || selectedCashCustomer) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Cog className="w-5 h-5 text-amber-600" />
            Machines
            {machines.length > 0 && (
              <span className="text-sm font-normal text-slate-500">
                ({machines.length} found)
              </span>
            )}
          </h2>

          {loadingMachines ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : machines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => (
                <button
                  key={machine._id}
                  onClick={() => setSelectedMachine(machine)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMachine?._id === machine._id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Cog className={`w-5 h-5 mt-0.5 ${
                      selectedMachine?._id === machine._id ? 'text-amber-600' : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {machine.make} {machine.model}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        S/N: {machine.serialNumber}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {(() => {
                          const makeLC = (machine.make || '').toLowerCase();
                          const typeLC = (machine.machineType || '').toLowerCase();
                          const isDateBased = machine.serviceType === 'date' || 
                            (!machine.serviceType && (typeLC.includes('dryer') || typeLC.includes('blower') || typeLC.includes('vacuum') || makeLC.includes('dryer') || makeLC.includes('blower') || makeLC.includes('vacuum')));
                          if (isDateBased) {
                            return `Last Service: ${machine.lastServiceDate ? new Date(machine.lastServiceDate).toLocaleDateString() : 'N/A'} | Next Service: ${machine.nextServiceDate ? new Date(machine.nextServiceDate).toLocaleDateString() : 'N/A'}`;
                          }
                          return `Hours: ${machine.machineHours || 0} | Next Service: ${machine.nextServiceHours || 0}`;
                        })()}
                      </div>
                    </div>
                    {selectedMachine?._id === machine._id && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Cog className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No machines found for this customer</p>
            </div>
          )}
        </div>
      )}

      {/* RSR Documents Section */}
      {selectedMachine && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              RSR Documents
              <span className="text-sm font-normal text-slate-500">
                for {selectedMachine.make} {selectedMachine.model}
              </span>
            </h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload RSR
            </button>
          </div>

          {loadingRSRs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : machineRSRs.length > 0 ? (
            <div className="space-y-3">
              {machineRSRs.map((rsr) => (
                <div
                  key={rsr._id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className={`p-2 rounded-lg ${isImageFile(rsr.mimeType) ? 'bg-purple-100' : 'bg-red-100'}`}>
                    {isImageFile(rsr.mimeType) ? (
                      <Image className="w-6 h-6 text-purple-600" />
                    ) : (
                      <FileText className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{rsr.title || rsr.fileName}</div>
                    <div className="text-sm text-slate-500 truncate">{rsr.fileName}</div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(rsr.uploadedAt)}
                      </span>
                      <span>{formatFileSize(rsr.fileSize)}</span>
                    </div>
                    {rsr.description && (
                      <div className="text-sm text-slate-600 mt-1">{rsr.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewRSR(rsr)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadRSR(rsr)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteRSR(rsr)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No RSR documents uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-3 text-red-600 hover:text-red-700 font-medium flex items-center gap-1 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Upload the first RSR
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Upload RSR Document</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadFile(null);
                  setUploadTitle('');
                  setUploadDescription('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Machine Info */}
              <div className="p-3 bg-amber-50 rounded-lg flex items-center gap-3">
                <Cog className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-medium text-slate-800">
                    {selectedMachine?.make} {selectedMachine?.model}
                  </div>
                  <div className="text-sm text-slate-500">
                    S/N: {selectedMachine?.serialNumber}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Warranty RSR - Engine Repair"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional notes about this RSR..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    uploadFile
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{uploadFile.name}</span>
                      <span className="text-sm text-green-600">
                        ({formatFileSize(uploadFile.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p>Click to select file</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPEG, PNG • Max 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error */}
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{uploadError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  setUploadFile(null);
                  setUploadTitle('');
                  setUploadDescription('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadRSR}
                disabled={uploading || !uploadFile || !uploadTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
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
                <button
                  onClick={() => handleDownloadRSR(previewRSR)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewRSR(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {isImageFile(previewRSR.mimeType) ? (
                <img
                  src={getPreviewUrl(previewRSR)}
                  alt={previewRSR.title || previewRSR.fileName}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                />
              ) : (
                <iframe
                  src={getPreviewUrl(previewRSR)}
                  className="w-full h-full min-h-[70vh] rounded-lg bg-white"
                  title={previewRSR.title || previewRSR.fileName}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
