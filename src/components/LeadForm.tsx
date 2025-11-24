import { useState, FormEvent, useEffect, useRef } from 'react';
import { createJob, getJobs, getStatuses, getBranches, getCustomers, createCustomer, getTechnicians, getServiceDescriptions, getRepCodes, getAdminCodes, getMachinesByCustomer, createMachine, type Status, type Branch, type Customer, type Technician, type ServiceDescription, type RepCode, type AdminCode, type Machine, type Job } from '../lib/api';
import { X, Search, Plus, Wrench } from 'lucide-react';

interface LeadFormProps {
  statuses: Status[];
  branches: Branch[];
  customers?: Customer[]; // Optional, will load dynamically
  onClose: () => void;
  onSaved: () => void;
  onJobCreated?: (job: Job) => void; // Optional callback with the created job
}

/**
 * Form component for creating a new job.
 * Uses the new API structure with proper types and error handling.
 */
export function LeadForm({ statuses, branches, onClose, onSaved, onJobCreated }: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<ServiceDescription[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showNewMachineForm, setShowNewMachineForm] = useState(false);
  const [newMachine, setNewMachine] = useState({
    make: '',
    model: '',
    serialNumber: '',
    machineHours: '',
    nextServiceHours: '',
    machineType: '',
  });
  const [creatingMachine, setCreatingMachine] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const machinesSectionRef = useRef<HTMLDivElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingCustomerRef = useRef(false); // Flag to prevent search when selecting
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [formData, setFormData] = useState<{
    jobNumber: string,
    customer: string,
    cashCustomer: string,
    branch: string,
    status: string,
    description: string,
    valueExVat: string,
    adm: string,
    repCode: string,
    machines: string[],
    registerDate: string,
    bookings: Array<{ technician: string, date: string }>,
    rsrNumber: string,
    feedback: string,
    poDate: string,
    poNumber: string,
    oilSampleNumber: string,
    storePack: string,
    invoiceDate: string,
    invNumber: string,
    startDate: string,
    dateQuoted: string,
  }>(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      jobNumber: '',
      customer: '',
      cashCustomer: '',
      branch: '',
      status: '',
      description: '',
      valueExVat: '',
      adm: '',
      repCode: '',
      machines: [],
      registerDate: '',
      bookings: [{ technician: '', date: '' }],
      rsrNumber: '',
      feedback: '',
      poDate: '',
      poNumber: '',
      oilSampleNumber: '',
      storePack: '',
      invoiceDate: '',
      invNumber: '',
      startDate: today,
      dateQuoted: '',
    };
  });
  const [customerSelection, setCustomerSelection] = useState<'customer' | 'cash'>('customer');



  // Load technicians, service descriptions, rep codes, and admin codes on mount
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [techsData, descsData, repCodesData, adminCodesData] = await Promise.all([
          getTechnicians().catch(err => { console.error('getTechnicians failed:', err); return { technicians: [] }; }),
          getServiceDescriptions().catch(err => { console.error('getServiceDescriptions failed:', err); return { descriptions: [] }; }),
          getRepCodes().catch(err => { console.error('getRepCodes failed:', err); return { repCodes: [] }; }),
          getAdminCodes().catch(err => { console.error('getAdminCodes failed:', err); return { adminCodes: [] }; }),
        ]);
        setTechnicians(techsData.technicians || []);
        setServiceDescriptions(descsData.descriptions || []);
        setRepCodes(repCodesData.repCodes || []);
        setAdminCodes(adminCodesData.adminCodes || []);
        console.log('Reference data loaded:', { 
          technicians: techsData.technicians?.length, 
          descriptions: descsData.descriptions?.length,
          repCodes: repCodesData.repCodes?.length,
          adminCodes: adminCodesData.adminCodes?.length 
        });
        console.log('Admin codes data:', adminCodesData);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    }
    loadReferenceData();
  }, []);

  // Get today's date in YYYY-MM-DD format for default dates
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Search customers when search term changes (with debounce)
  useEffect(() => {
    // Don't search if we're in the process of selecting a customer
    if (isSelectingCustomerRef.current) {
      isSelectingCustomerRef.current = false; // Reset flag
      return;
    }

    if (!customerSearchTerm || customerSearchTerm.length < 2) {
      setSearchedCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const data = await getCustomers({ search: customerSearchTerm, limit: 5 });
        setSearchedCustomers(data.customers || []);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error('Error searching customers:', err);
        setSearchedCustomers([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleCustomerSelect(customer: Customer) {
    isSelectingCustomerRef.current = true; // Set flag to prevent search
    setFormData({ ...formData, customer: customer._id, machines: [] }); // Reset machines when customer changes
    setSelectedCustomer(customer);
    setSelectedCustomerName(customer.name);
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    setSearchedCustomers([]); // Clear search results since we've selected
    setShowNewMachineForm(false); // Reset new machine form
    
    // Load machines for this customer
    try {
      const machinesData = await getMachinesByCustomer(customer._id);
      setMachines(machinesData.machines || []);
    } catch (err) {
      console.error('Error loading machines:', err);
      setMachines([]);
    }
    
    // Scroll to machines section after a short delay to ensure it's rendered
    setTimeout(() => {
      if (machinesSectionRef.current) {
        machinesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  // Load machines when cash customer changes
  useEffect(() => {
    async function loadCashCustomerMachines() {
      if (customerSelection === 'cash' && formData.cashCustomer && formData.cashCustomer.trim()) {
        try {
          const machinesData = await getMachinesByCustomer(undefined, formData.cashCustomer.trim());
          setMachines(machinesData.machines || []);
        } catch (err) {
          console.error('Error loading machines for cash customer:', err);
          setMachines([]);
        }
      } else if (customerSelection === 'cash') {
        setMachines([]);
      }
    }
    
    loadCashCustomerMachines();
  }, [formData.cashCustomer, customerSelection]);

  async function handleCreateMachine() {
    if (!formData.customer && !formData.cashCustomer) {
      setError('Please select a customer or enter a cash customer name first');
      return;
    }

    if (!newMachine.make.trim() || !newMachine.model.trim() || !newMachine.serialNumber.trim()) {
      setError('Make, Model, and Serial Number are required');
      return;
    }

    setCreatingMachine(true);
    setError('');
    try {
      const machineData: any = {
        make: newMachine.make.trim(),
        model: newMachine.model.trim(),
        serialNumber: newMachine.serialNumber.trim(),
        machineHours: parseFloat(newMachine.machineHours) || 0,
        nextServiceHours: parseFloat(newMachine.nextServiceHours) || 0,
      };
      
      if (formData.customer) {
        machineData.customer = formData.customer;
      } else if (formData.cashCustomer) {
        machineData.cashCustomer = formData.cashCustomer.trim();
      }
      
      const response = await createMachine(machineData);

      // Add new machine to list and add it to machines array
      setMachines([...machines, response.machine]);
      const currentMachines = Array.isArray(formData.machines) ? formData.machines : [];
      setFormData({ ...formData, machines: [...currentMachines, response.machine._id] });
      setNewMachine({
        make: '',
        model: '',
        serialNumber: '',
        machineHours: '',
        nextServiceHours: '',
        machineType: '',
      });
      setShowNewMachineForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create machine');
    } finally {
      setCreatingMachine(false);
    }
  }

  /**
   * Handles creating a new customer on the fly.
   */
  async function handleCreateCustomer() {
    if (!customerSearchTerm || customerSearchTerm.length < 2) {
      setError('Please enter a customer name (at least 2 characters)');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      setError('');
      const response = await createCustomer(customerSearchTerm);
      const newCustomer = response.customer;
      
      // Select the newly created customer
      handleCustomerSelect(newCustomer);
      setIsCreatingCustomer(false);
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setError(err.message || 'Failed to create customer');
      setIsCreatingCustomer(false);
    }
  }

  /**
   * Validates if a job number already exists.
   */
  async function checkJobNumberExists(jobNumber: string): Promise<boolean> {
    if (!jobNumber || !jobNumber.trim()) {
      return false;
    }

    try {
      const response = await getJobs({ search: jobNumber.trim().toUpperCase(), limit: 1 });
      // Check if any job has an exact match (case-insensitive)
      const exists = response.jobs.some(job => 
        job.jobNumber.toUpperCase() === jobNumber.trim().toUpperCase()
      );
      return exists;
    } catch (err) {
      console.error('Error checking job number:', err);
      // If there's an error, assume it doesn't exist to allow submission
      // The backend will catch duplicates anyway
      return false;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Collect all missing required fields
      const missingFields: string[] = [];

      if (!formData.branch) {
        missingFields.push('Branch');
      }

      if (customerSelection === 'customer' && !formData.customer) {
        missingFields.push('Customer');
      } else if (customerSelection === 'cash' && (!formData.cashCustomer || !formData.cashCustomer.trim())) {
        missingFields.push('Cash Customer Name');
      }

      if (!formData.adm) {
        missingFields.push('Admin (ADM)');
      }

      if (!formData.repCode) {
        missingFields.push('Rep Code');
      }

      if (!formData.description) {
        missingFields.push('Service Description');
      }

      // If there are missing fields, show error with list
      if (missingFields.length > 0) {
        const fieldsList = missingFields.map(field => `• ${field}`).join('\n');
        setError(`Please select the following fields before saving:\n\n${fieldsList}`);
        setLoading(false);
        return;
      }

      // Validate job number if provided (super admin only)
      if (formData.jobNumber && formData.jobNumber.trim()) {
        const jobNumberExists = await checkJobNumberExists(formData.jobNumber.trim());
        if (jobNumberExists) {
          setError(`Job number "${formData.jobNumber.trim().toUpperCase()}" already exists. Please use a different job number.`);
          setLoading(false);
          return;
        }
      }

      // const today = getTodayDate(); // Removed unused variable
      const payload: any = {
        branch: formData.branch,
        status: formData.status,
        valueExVat: formData.valueExVat ? parseFloat(formData.valueExVat) : undefined,
        adm: formData.adm || undefined,
        repCode: formData.repCode || undefined,
        machines: Array.isArray(formData.machines) && formData.machines.length > 0 ? formData.machines : undefined,
        registerDate: formData.registerDate || undefined,
        rsrNumber: formData.rsrNumber || undefined,
        feedback: formData.feedback || undefined,
        poDate: formData.poDate || undefined,
        poNumber: formData.poNumber || undefined,
        oilSampleNumber: formData.oilSampleNumber || undefined,
        storePack: formData.storePack || undefined,
        invoiceDate: formData.invoiceDate || undefined,
        invNumber: formData.invNumber || undefined,
        description: formData.description || undefined,
        startDate: formData.startDate || undefined,
        dateQuoted: formData.dateQuoted || undefined,
      };

      // Add job number if provided (super admin only)
      if (formData.jobNumber && formData.jobNumber.trim()) {
        payload.jobNumber = formData.jobNumber.trim().toUpperCase();
      }

      // Handle customer selection
      if (customerSelection === 'customer') {
        if (formData.customer) {
          payload.customer = formData.customer;
        }
      } else {
        if (formData.cashCustomer) {
          payload.cashCustomer = formData.cashCustomer;
        }
      }

      const response = await createJob(payload);
      onSaved();
      
      // If onJobCreated callback is provided, call it with the created job
      if (onJobCreated && response.job) {
        onJobCreated(response.job);
      } else {
        // Otherwise, just close the form
        onClose();
      }
    } catch (err: any) {
      // Check if it's a duplicate job number error from backend
      if (err.message && err.message.includes('duplicate') && err.message.includes('jobNumber')) {
        setError(`Job number "${formData.jobNumber?.trim().toUpperCase() || ''}" already exists. Please use a different job number.`);
      } else {
        setError(err.message || 'Failed to create job');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] pointer-events-none">
          <div className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto relative">
            <button
              onClick={() => setError('')}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-center mb-4 pr-8">
              Please make sure the following fields are completed before saving.
            </h3>
            <div className="text-center space-y-1">
              {error.split('\n').filter(line => line.startsWith('•')).map((field, index) => (
                <div key={index} className="text-sm">
                  {field.replace('• ', '')}
                </div>
              ))}
            </div>
            <button
              onClick={() => setError('')}
              className="w-full mt-6 px-4 py-2.5 bg-white text-[#0969a9] rounded-lg font-medium hover:bg-gray-100 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
            <h2 className="text-xl font-bold">Create New Job</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">{/* Removed inline error display */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {true && (
              <div>
                <label className="block text-sm font-semibold text-ars-body mb-2">
                  Job Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px] uppercase"
                  placeholder="Leave empty for auto-generation"
                />
                <p className="mt-1 text-xs text-ars-body">
                  If left empty, a job number will be automatically generated
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">Customer Type</label>
              <select
                value={customerSelection}
                onChange={(e) => setCustomerSelection(e.target.value as 'customer' | 'cash')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                <option value="customer">Customer (from list)</option>
                <option value="cash">Cash Customer</option>
              </select>
            </div>

            {customerSelection === 'customer' && (
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-sm font-semibold text-ars-body mb-2">
                  Customer *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setCustomerSearchTerm(newValue);
                      // If user is typing and it's different from selected customer, clear selection
                      if (selectedCustomer && newValue !== selectedCustomer.name) {
                        setFormData({ ...formData, customer: '' });
                        setSelectedCustomer(null);
                        setSelectedCustomerName('');
                      }
                      if (!newValue) {
                        setFormData({ ...formData, customer: '' });
                        setSelectedCustomer(null);
                        setSelectedCustomerName('');
                      }
                    }}
                    onFocus={() => {
                      if (searchedCustomers.length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    placeholder="Search for customer (min 2 characters)..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                  />
                  {showCustomerDropdown && searchedCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {searchedCustomers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="text-sm font-medium text-ars-heading">{customer.name}</span>
                        </button>
                      ))}
                      {searchedCustomers.length === 5 && (
                        <div className="px-4 py-2 text-xs text-ars-body bg-gray-50 border-t border-gray-200">
                          Showing top 5 results. Type more to refine search.
                        </div>
                      )}
                    </div>
                  )}
                  {customerSearchTerm.length >= 2 && searchedCustomers.length === 0 && showCustomerDropdown && !selectedCustomer && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                      <p className="text-sm text-ars-body mb-3">No customers found matching "{customerSearchTerm}"</p>
                      {true ? (
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          disabled={isCreatingCustomer}
                          className="w-full px-4 py-2 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-lg font-bold text-[14px] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isCreatingCustomer ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              CREATING...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              CREATE "{customerSearchTerm.toUpperCase()}"
                            </>
                          )}
                        </button>
                      ) : (
                        <p className="text-xs text-ars-body text-center py-2">
                          Customer not found. Only super admins can create new customers.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {selectedCustomerName && (
                  <p className="mt-1 text-xs text-ars-body">
                    Selected: <span className="font-medium text-ars-heading">{selectedCustomerName}</span>
                  </p>
                )}
              </div>
            )}

            {customerSelection === 'cash' && (
              <div>
                <label className="block text-sm font-semibold text-ars-body mb-2">
                  Cash Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.cashCustomer}
                  onChange={(e) => setFormData({ ...formData, cashCustomer: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                  placeholder="e.g., John Citizen"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Branch *
              </label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                <option value="">Select Branch</option>
                {branches && branches.length > 0 ? (
                  branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No branches available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Initial Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                {statuses && statuses.length > 0 ? (
                  statuses.map((status) => (
                    <option key={status._id} value={status._id}>
                      {status.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No statuses available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Admin (ADM)
              </label>
              <select
                value={formData.adm}
                onChange={(e) => setFormData({ ...formData, adm: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                <option value="">Select Admin</option>
                {adminCodes && adminCodes.length > 0 ? (
                  adminCodes
                    .filter(ac => ac.isActive)
                    .map((adminCode) => (
                      <option key={adminCode._id} value={adminCode.code}>
                        {adminCode.code} {adminCode.description ? `- ${adminCode.description}` : ''}
                      </option>
                    ))
                ) : (
                  <option value="" disabled>Loading admin codes...</option>
                )}
              </select>
            </div>

            {/* Technicians multi-select removed; replaced by bookings array UI */}

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Service Description
              </label>
              <select
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                <option value="">Select Description</option>
                {serviceDescriptions && serviceDescriptions.length > 0 ? (
                  serviceDescriptions.map((desc) => (
                    <option key={desc._id} value={desc._id}>
                      {desc.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading descriptions...</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Value (ex VAT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valueExVat}
                onChange={(e) => setFormData({ ...formData, valueExVat: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="10000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate || getTodayDate()}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Date Quoted
              </label>
              <input
                type="date"
                value={formData.dateQuoted || ''}
                onChange={(e) => setFormData({ ...formData, dateQuoted: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="yyyy/mm/dd"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Rep Code
              </label>
              <select
                value={formData.repCode}
                onChange={(e) => setFormData({ ...formData, repCode: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              >
                <option value="">Select Rep Code</option>
                {repCodes && repCodes.length > 0 ? (
                  repCodes.map((repCode) => (
                    <option key={repCode._id} value={repCode._id}>
                      {repCode.code}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading rep codes...</option>
                )}
              </select>
            </div>

            {/* Machines Selection - Show if customer or cash customer is selected */}
            {(formData.customer || (customerSelection === 'cash' && formData.cashCustomer)) && (
              <div ref={machinesSectionRef} className="md:col-span-2">
                <label className="text-sm font-semibold text-ars-body mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-ars-primary" />
                  Machines
                </label>
                <div className="space-y-3">
                  {/* Display selected machines */}
                  {Array.isArray(formData.machines) && formData.machines.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.machines.map((machineId, index) => {
                        const machine = machines.find(m => m._id === machineId);
                        if (!machine) return null;
                        return (
                          <div key={machine._id || index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-ars-heading text-sm">
                                {machine.make} {machine.model}
                              </div>
                              <div className="text-xs text-ars-body mt-1">
                                Serial: {machine.serialNumber} • Hours: {machine.machineHours.toLocaleString()} • Next: {machine.nextServiceHours.toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedMachines = formData.machines?.filter(id => id !== machineId) || [];
                                setFormData({ ...formData, machines: updatedMachines });
                              }}
                              className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm flex-shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Add machine dropdown and button - Always visible */}
                  <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const currentMachines = Array.isArray(formData.machines) ? formData.machines : [];
                          if (!currentMachines.includes(e.target.value)) {
                            setFormData({ ...formData, machines: [...currentMachines, e.target.value] });
                          }
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px] bg-white"
                    >
                      <option value="">Select Machine to Add</option>
                      {machines && machines.length > 0 ? (
                        machines
                          .filter(m => {
                            if (!m.isActive) return false;
                            const currentMachines = Array.isArray(formData.machines) ? formData.machines : [];
                            return !currentMachines.includes(m._id);
                          })
                          .map((machine) => (
                            <option key={machine._id} value={machine._id}>
                              {machine.make} {machine.model} - {machine.serialNumber} ({machine.machineHours} hrs)
                            </option>
                          ))
                      ) : (
                        <option value="" disabled>No machines found for this customer</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewMachineForm(!showNewMachineForm)}
                      className="px-4 py-2.5 bg-ars-primary text-white rounded-xl hover:bg-ars-primary/90 transition-colors whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-1 sm:w-auto w-full"
                    >
                      <Plus className="w-4 h-4" />
                      {showNewMachineForm ? 'Cancel' : 'New Machine'}
                    </button>
                  </div>
                  
                  {/* New Machine Form */}
                  {showNewMachineForm && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="font-semibold text-ars-heading text-sm">Add New Machine</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Machine Type *</label>
                          <select
                            value={newMachine.machineType}
                            onChange={e => setNewMachine({ ...newMachine, machineType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                          >
                            <option value="">Select type</option>
                            <option value="Generator">Generator</option>
                            <option value="Genset">Genset</option>
                            <option value="Compressor oil free">Compressor oil free</option>
                            <option value="Compressor oil injection">Compressor oil injection</option>
                            <option value="Diesel reciprocating compressor">Diesel reciprocating compressor</option>
                            <option value="Dryer">Dryer</option>
                            <option value="Blower">Blower</option>
                            <option value="Vacuum pump">Vacuum pump</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Make *</label>
                          <input
                            type="text"
                            value={newMachine.make}
                            onChange={(e) => setNewMachine({ ...newMachine, make: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                            placeholder="e.g., Caterpillar"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Model *</label>
                          <input
                            type="text"
                            value={newMachine.model}
                            onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                            placeholder="e.g., CAT 320"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Serial Number *</label>
                          <input
                            type="text"
                            value={newMachine.serialNumber}
                            onChange={(e) => setNewMachine({ ...newMachine, serialNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                            placeholder="Serial number"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Machine Hours</label>
                          <input
                            type="number"
                            value={newMachine.machineHours}
                            onChange={(e) => setNewMachine({ ...newMachine, machineHours: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Next Service Hours</label>
                          <input
                            type="number"
                            value={newMachine.nextServiceHours}
                            onChange={(e) => setNewMachine({ ...newMachine, nextServiceHours: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent text-sm"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateMachine}
                        disabled={creatingMachine}
                        className="w-full px-4 py-2 bg-ars-primary text-white rounded-lg hover:bg-ars-primary/90 transition-colors disabled:opacity-50 font-bold text-[14px]"
                      >
                        {creatingMachine ? 'CREATING...' : 'CREATE MACHINE'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Register Date
              </label>
              <input
                type="date"
                value={formData.registerDate}
                onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                RSR #
              </label>
              <input
                type="text"
                value={formData.rsrNumber}
                onChange={(e) => setFormData({ ...formData, rsrNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="Enter RSR number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                PO Date
              </label>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                PO Number
              </label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="Enter PO number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Oil Sample #
              </label>
              <input
                type="text"
                value={formData.oilSampleNumber}
                onChange={(e) => setFormData({ ...formData, oilSampleNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="Enter oil sample number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Store Pack
              </label>
              <input
                type="date"
                value={formData.storePack}
                onChange={(e) => setFormData({ ...formData, storePack: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Inv #
              </label>
              <input
                type="text"
                value={formData.invNumber}
                onChange={(e) => setFormData({ ...formData, invNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                placeholder="Enter invoice number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Feedback
              </label>
              <textarea
                rows={4}
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent resize-none text-[15px]"
                placeholder="Enter feedback or notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">Technician Bookings</label>
              <div className="flex flex-col gap-2">
                {formData.bookings.map((booking, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={booking.technician}
                      onChange={e => {
                        const newBookings = [...formData.bookings];
                        newBookings[idx] = { ...newBookings[idx], technician: e.target.value };
                        setFormData({ ...formData, bookings: newBookings });
                      }}
                      className="px-2 py-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map(tech => (
                        <option key={tech._id} value={tech._id}>{tech.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={booking.date}
                      onChange={e => {
                        const newBookings = [...formData.bookings];
                        newBookings[idx] = { ...newBookings[idx], date: e.target.value };
                        setFormData({ ...formData, bookings: newBookings });
                      }}
                      className="px-2 py-2 border border-gray-300 rounded"
                    />
                    <button type="button" onClick={() => {
                      const newBookings = formData.bookings.filter((_, i) => i !== idx);
                      setFormData({ ...formData, bookings: newBookings });
                    }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormData({ ...formData, bookings: [...formData.bookings, { technician: '', date: '' }] })} className="px-3 py-1 bg-ars-primary text-white rounded">Add Technician</button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-[14px] text-ars-body hover:bg-gray-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-xl font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'CREATING...' : 'CREATE JOB'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
