import { useState, FormEvent, useEffect, useRef } from 'react';
import { createJob, getJobs, getStatuses, getBranches, getCustomers, createCustomer, getTechnicians, getServiceDescriptions, getJobSources, getRepCodes, getAdminCodes, getMachinesByCustomer, getRentalMachines, createMachine, type Status, type Branch, type Customer, type Technician, type ServiceDescription, type JobSource, type RepCode, type AdminCode, type Machine, type Job } from '../lib/api';
import { X, Plus, Wrench } from 'lucide-react';
import { HelpIcon } from './ui';
import { helpContent } from '../config/helpContent';

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
  const [jobSources, setJobSources] = useState<JobSource[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rentalMachines, setRentalMachines] = useState<Machine[]>([]);
  const [isRentalBranch, setIsRentalBranch] = useState(false);
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
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const machinesSectionRef = useRef<HTMLDivElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Customer search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [showCustomerConfirmation, setShowCustomerConfirmation] = useState(false);
  const [pendingCustomerName, setPendingCustomerName] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<{
    jobNumber: string,
    customer: string,
    cashCustomer: string,
    notes: string,
    branch: string,
    status: string,
    description: string,
    jobSource: string,
    valueExVat: string,
    adm: string,
    assistingAdm: string,
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
      notes: '',
      branch: '',
      status: '',
      description: '',
      jobSource: '',
      valueExVat: '',
      adm: '',
      assistingAdm: '',
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



  // Load technicians, service descriptions, rep codes, admin codes, and all customers on mount
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [techsData, descsData, jobSourcesData, repCodesData, adminCodesData, customersData] = await Promise.all([
          getTechnicians().catch(err => { console.error('getTechnicians failed:', err); return { technicians: [] }; }),
          getServiceDescriptions().catch(err => { console.error('getServiceDescriptions failed:', err); return { descriptions: [] }; }),
          getJobSources().catch(err => { console.error('getJobSources failed:', err); return { sources: [] }; }),
          getRepCodes().catch(err => { console.error('getRepCodes failed:', err); return { repCodes: [] }; }),
          getAdminCodes().catch(err => { console.error('getAdminCodes failed:', err); return { adminCodes: [] }; }),
          getCustomers({ limit: 10000 }).catch(err => { console.error('getCustomers failed:', err); return { customers: [] }; }),
        ]);
        setTechnicians(techsData.technicians || []);
        setServiceDescriptions(descsData.descriptions || []);
        setJobSources(jobSourcesData.sources || []);
        setRepCodes(repCodesData.repCodes || []);
        setAdminCodes(adminCodesData.adminCodes || []);
        setAllCustomers(customersData.customers || []);
        console.log('Reference data loaded:', { 
          technicians: techsData.technicians?.length, 
          descriptions: descsData.descriptions?.length,
          jobSources: jobSourcesData.sources?.length,
          repCodes: repCodesData.repCodes?.length,
          adminCodes: adminCodesData.adminCodes?.length,
          customers: customersData.customers?.length
        });
        console.log('Admin codes data:', adminCodesData);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    }
    loadReferenceData();
  }, []);

  // Set default status when statuses are loaded (only once)
  useEffect(() => {
    if (statuses && statuses.length > 0 && !formData.status) {
      // Try to find "In Progress" status first, otherwise use the first status
      const inProgressStatus = statuses.find(s => s.name.toLowerCase().includes('progress'));
      const defaultStatus = inProgressStatus || statuses[0];
      if (defaultStatus) {
        setFormData(prev => ({ ...prev, status: defaultStatus._id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  // Set default job source when job sources are loaded (only once)
  useEffect(() => {
    if (jobSources && jobSources.length > 0 && !formData.jobSource) {
      // Find the default job source, or use the first one
      const defaultJobSource = jobSources.find(s => s.isDefault) || jobSources[0];
      if (defaultJobSource) {
        setFormData(prev => ({ ...prev, jobSource: defaultJobSource._id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSources]);

  // Get today's date in YYYY-MM-DD format for default dates
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if selected branch is "Rental" and load rental machines
  useEffect(() => {
    async function checkRentalBranch() {
      if (formData.branch) {
        const selectedBranch = branches.find(b => b._id === formData.branch);
        const isRental = selectedBranch?.name?.toLowerCase() === 'rental';
        setIsRentalBranch(isRental);
        
        if (isRental) {
          try {
            const rentalData = await getRentalMachines();
            setRentalMachines(rentalData.machines || []);
          } catch (err) {
            console.error('Error loading rental machines:', err);
            setRentalMachines([]);
          }
        }
      } else {
        setIsRentalBranch(false);
      }
    }
    
    checkRentalBranch();
  }, [formData.branch, branches]);

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
      
      console.log('Creating machine with data:', machineData);
      const response = await createMachine(machineData);
      console.log('Machine created successfully:', response);

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
      console.error('Machine creation error:', err);
      console.error('Error message:', err.message);
      const errorMsg = err.message || 'Failed to create machine';
      
      // Check if it's a duplicate machine error
      if (errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('already exists')) {
        const serialNum = newMachine.serialNumber.trim();
        setError(`❌ Duplicate Machine\n\nA machine with serial number "${serialNum}" already exists in the system.\n\nPlease check the serial number and try again, or select the existing machine from the list above.`);
      }
      // Check for validation errors
      else if (errorMsg.toLowerCase().includes('required') || errorMsg.toLowerCase().includes('invalid')) {
        setError(`❌ Invalid Machine Data\n\n${errorMsg}\n\nPlease check all machine fields and try again.`);
      }
      // Generic error
      else {
        setError(`❌ Error Creating Machine\n\n${errorMsg}`);
      }
    } finally {
      setCreatingMachine(false);
    }
  }

  /**
   * Handles selecting a customer from the dropdown.
   */
  async function handleCustomerSelect(customer: Customer) {
    setFormData({ ...formData, customer: customer._id, machines: [] });
    setSelectedCustomer(customer);
    setSelectedCustomerName(customer.name);
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    
    // Add to allCustomers if it's a newly created customer
    if (!allCustomers.find(c => c._id === customer._id)) {
      setAllCustomers(prev => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
    }
    
    // Load machines for this customer
    try {
      const machinesData = await getMachinesByCustomer(customer._id);
      setMachines(machinesData.machines || []);
    } catch (err) {
      console.error('Error loading machines:', err);
      setMachines([]);
    }
    
    // Scroll to machines section
    setTimeout(() => {
      if (machinesSectionRef.current) {
        machinesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  /**
   * Handles creating a new customer on the fly.
   */
  async function handleCreateCustomer() {
    if (!customerSearchTerm || customerSearchTerm.length < 2) {
      setError('Please enter a customer name (at least 2 characters)');
      return;
    }

    // Show confirmation dialog first
    setPendingCustomerName(customerSearchTerm.trim());
    setShowCustomerConfirmation(true);
    setShowCustomerDropdown(false);
  }

  /**
   * Actually creates the customer after confirmation.
   */
  async function confirmCreateCustomer() {
    try {
      setIsCreatingCustomer(true);
      setShowCustomerConfirmation(false);
      setError('');
      const response = await createCustomer(pendingCustomerName);
      const newCustomer = response.customer;
      
      // Select the newly created customer
      handleCustomerSelect(newCustomer);
      setIsCreatingCustomer(false);
      setPendingCustomerName('');
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setError(err.message || 'Failed to create customer');
      setIsCreatingCustomer(false);
    }
  }

  /**
   * Cancels customer creation.
   */
  function cancelCreateCustomer() {
    setShowCustomerConfirmation(false);
    setPendingCustomerName('');
    setShowCustomerDropdown(true);
  }

  // Filter customers based on search term
  const filteredCustomers = customerSearchTerm.length > 0
    ? allCustomers.filter(c => 
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
      ).slice(0, 50) // Limit to 50 results for performance
    : allCustomers.slice(0, 50);

  // Check if exact match exists (for showing "Create" button)
  const exactMatchExists = allCustomers.some(
    c => c.name.toLowerCase() === customerSearchTerm.toLowerCase().trim()
  );

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

      if (!formData.jobSource) {
        missingFields.push('Job Source');
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
        status: formData.status && formData.status.trim() ? formData.status : undefined,
        valueExVat: formData.valueExVat ? parseFloat(formData.valueExVat) : undefined,
        adm: formData.adm || undefined,
        assistingAdm: formData.assistingAdm || undefined,
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
        jobSource: formData.jobSource || undefined,
        startDate: formData.startDate || undefined,
        dateQuoted: formData.dateQuoted || undefined,
        notes: formData.notes || undefined,
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
      // Parse error message for better user feedback
      const errorMsg = err.message || 'Failed to create job';
      
      // Check if it's a duplicate job number error from backend
      if (errorMsg.includes('duplicate') && errorMsg.includes('jobNumber')) {
        const jobNum = formData.jobNumber?.trim().toUpperCase() || '';
        setError(`❌ Duplicate Job Number\n\nJob number "${jobNum}" already exists in the system.\n\nPlease enter a different job number or leave it blank for auto-generation.`);
      } 
      // Check for other validation errors
      else if (errorMsg.toLowerCase().includes('required')) {
        setError(`❌ Missing Required Information\n\n${errorMsg}\n\nPlease fill in all required fields and try again.`);
      }
      // Generic error
      else {
        setError(`❌ Error Creating Job\n\n${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] pointer-events-none">
          <div className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto relative">
            <button
              onClick={() => setError('')}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Display error message with proper formatting */}
            <div className="text-center pr-8 whitespace-pre-line">
              {error.split('\n').map((line, index) => {
                // Check if it's a bullet point line
                if (line.startsWith('•')) {
                  return (
                    <div key={index} className="text-sm mb-1">
                      {line.replace('• ', '')}
                    </div>
                  );
                }
                // Check if it's a title line (contains emoji or all caps)
                else if (line.includes('❌') || /^[A-Z\s]+$/.test(line.trim())) {
                  return (
                    <h3 key={index} className="text-lg font-semibold mb-3">
                      {line}
                    </h3>
                  );
                }
                // Regular text
                else if (line.trim()) {
                  return (
                    <p key={index} className="text-sm mb-2">
                      {line}
                    </p>
                  );
                }
                // Empty line for spacing
                return <div key={index} className="h-2" />;
              })}
            </div>
            <button
              onClick={() => setError('')}
              className="w-full mt-6 px-4 py-2.5 bg-white text-[#0969a9] rounded-lg font-bold text-[14px] hover:bg-gray-100 transition-all uppercase"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showCustomerConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Confirm New Customer
              </h3>
              <p className="text-slate-600 mb-2">
                Are you sure you want to create:
              </p>
              <p className="text-2xl font-bold text-[#0969a9] mb-4 px-4 py-3 bg-blue-50 rounded-lg break-words">
                "{pendingCustomerName}"
              </p>
              <p className="text-sm text-slate-500">
                This will add a new customer to the system.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelCreateCustomer}
                disabled={isCreatingCustomer}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-[14px] hover:bg-gray-200 transition-all uppercase disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateCustomer}
                disabled={isCreatingCustomer}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-lg font-bold text-[14px] hover:shadow-lg transition-all uppercase disabled:opacity-50"
              >
                {isCreatingCustomer ? 'Creating...' : 'Yes, Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
            <h2 className="text-xl font-bold">Create New Job</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">{/* Removed inline error display */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {true && (
              <div>
                <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                  Job Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px] uppercase"
                  placeholder="Leave empty for auto-generation"
                />
                <p className="mt-1 text-xs text-ars-body">
                  If left empty, a job number will be automatically generated
                </p>
              </div>
            )}

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Customer Type
                <HelpIcon 
                  content={helpContent.jobs.customer + ' ' + helpContent.jobs.cashCustomer}
                  size="sm"
                />
              </label>
              <select
                value={customerSelection}
                onChange={(e) => setCustomerSelection(e.target.value as 'customer' | 'cash')}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="customer">Customer (from list)</option>
                <option value="cash">Cash Customer</option>
              </select>
            </div>

            {customerSelection === 'customer' && (
              <div ref={customerDropdownRef} className="relative">
                <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                  Customer *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                      // Clear selection if user is typing something different
                      if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                        setFormData({ ...formData, customer: '', machines: [] });
                        setSelectedCustomer(null);
                        setSelectedCustomerName('');
                        setMachines([]);
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Type to search customers..."
                    style={{ fontSize: '15px' }}
                    className={`w-full px-4 py-2.5 border rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent ${
                      selectedCustomer ? 'border-green-500 bg-green-50' : 'border-gray-300'
                    }`}
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchTerm('');
                        setFormData({ ...formData, customer: '', machines: [] });
                        setSelectedCustomer(null);
                        setSelectedCustomerName('');
                        setMachines([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Create new customer option */}
                    {customerSearchTerm.length >= 2 && !exactMatchExists && (
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={isCreatingCustomer}
                        className="w-full px-4 py-3 text-left flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium border-b border-blue-200"
                      >
                        <Plus className="w-4 h-4" />
                        {isCreatingCustomer ? (
                          <span>Creating "{customerSearchTerm}"...</span>
                        ) : (
                          <span>Create "{customerSearchTerm}" as new customer</span>
                        )}
                      </button>
                    )}
                    
                    {/* Customer list */}
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 ${
                            selectedCustomer?._id === customer._id ? 'bg-green-50 text-green-700' : ''
                          }`}
                        >
                          {customer.name}
                        </button>
                      ))
                    ) : customerSearchTerm.length > 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No customers found matching "{customerSearchTerm}"
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        Start typing to search customers...
                      </div>
                    )}
                  </div>
                )}
                
                {selectedCustomerName && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Selected: <span className="font-medium">{selectedCustomerName}</span>
                  </p>
                )}
              </div>
            )}

            {customerSelection === 'cash' && (
              <div>
                <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                  Cash Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.cashCustomer}
                  onChange={(e) => setFormData({ ...formData, cashCustomer: e.target.value })}
                  style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="e.g., John Citizen"
                />
              </div>
            )}

            {/* Notes field - shows under customer */}
            <div className="col-span-1">
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Notes <span className="font-normal text-gray-500 text-xs">(Site/Location)</span>
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                maxLength={50}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="e.g., Sandton Branch"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Rep Code *
              </label>
              <select
                value={formData.repCode}
                onChange={(e) => {
                  const selectedRepCodeId = e.target.value;
                  const selectedRepCode = repCodes.find(rc => rc._id === selectedRepCodeId);
                  
                  // Auto-populate branch and admin code if rep has them linked (uses first entry)
                  if (selectedRepCode) {
                    const updates: any = { repCode: selectedRepCodeId };
                    
                    if (selectedRepCode.adminCodes && selectedRepCode.adminCodes.length > 0) {
                      updates.adm = selectedRepCode.adminCodes[0];
                    }
                    
                    if (selectedRepCode.branches && selectedRepCode.branches.length > 0) {
                      const firstBranch = selectedRepCode.branches[0];
                      const branchId = typeof firstBranch === 'object' 
                        ? firstBranch._id 
                        : firstBranch;
                      updates.branch = branchId;
                    }
                    
                    setFormData({ ...formData, ...updates });
                  } else {
                    setFormData({ ...formData, repCode: selectedRepCodeId });
                  }
                }}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Branch *
                <HelpIcon 
                  content={helpContent.filters.branch}
                  size="sm"
                />
              </label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Select Branch</option>
                {(() => {
                  const selectedRepCode = repCodes.find(rc => rc._id === formData.repCode);
                  const linkedBranchIds = selectedRepCode?.branches?.map((b: any) => typeof b === 'object' ? b._id : b) || [];
                  const linkedBranches = linkedBranchIds.length > 0 ? branches.filter(b => linkedBranchIds.includes(b._id)) : [];
                  const otherBranches = linkedBranchIds.length > 0 ? branches.filter(b => !linkedBranchIds.includes(b._id)) : branches;
                  return (
                    <>
                      {linkedBranches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          ★ {branch.name}
                        </option>
                      ))}
                      {linkedBranches.length > 0 && otherBranches.length > 0 && (
                        <option disabled>── Other branches ──</option>
                      )}
                      {otherBranches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name}
                        </option>
                      ))}
                    </>
                  );
                })()}
              </select>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Initial Status *
                <HelpIcon 
                  content={helpContent.jobs.status}
                  size="sm"
                />
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Admin (ADM)
              </label>
              <select
                value={formData.adm}
                onChange={(e) => setFormData({ ...formData, adm: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Select Admin</option>
                {(() => {
                  const selectedRepCode = repCodes.find(rc => rc._id === formData.repCode);
                  const linkedAdminCodes = selectedRepCode?.adminCodes || [];
                  const activeAdminCodes = (adminCodes || []).filter(ac => ac.isActive);
                  const linked = linkedAdminCodes.length > 0 ? activeAdminCodes.filter(ac => linkedAdminCodes.includes(ac.code)) : [];
                  const others = linkedAdminCodes.length > 0 ? activeAdminCodes.filter(ac => !linkedAdminCodes.includes(ac.code)) : activeAdminCodes;
                  return (
                    <>
                      {linked.map((adminCode) => (
                        <option key={adminCode._id} value={adminCode.code}>
                          \u2605 {adminCode.code} {adminCode.description ? `- ${adminCode.description}` : ''}
                        </option>
                      ))}
                      {linked.length > 0 && others.length > 0 && (
                        <option disabled>\u2500\u2500 Other admins \u2500\u2500</option>
                      )}
                      {others.map((adminCode) => (
                        <option key={adminCode._id} value={adminCode.code}>
                          {adminCode.code} {adminCode.description ? `- ${adminCode.description}` : ''}
                        </option>
                      ))}
                    </>
                  );
                })()}
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Assisting Admin (ADM)
              </label>
              <select
                value={formData.assistingAdm}
                onChange={(e) => setFormData({ ...formData, assistingAdm: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Service Description
              </label>
              <select
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Job Source
              </label>
              <select
                value={formData.jobSource}
                onChange={(e) => setFormData({ ...formData, jobSource: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Select Source</option>
                {jobSources && jobSources.length > 0 ? (
                  jobSources.map((source) => (
                    <option key={source._id} value={source._id}>
                      {source.name}{source.isDefault ? ' (Default)' : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading sources...</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Value (ex VAT)
                <HelpIcon 
                  content={helpContent.jobs.valueExVat}
                  size="sm"
                />
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valueExVat}
                onChange={(e) => setFormData({ ...formData, valueExVat: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="10000.00"
              />
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Start Date
                <HelpIcon 
                  content={helpContent.jobs.startDate}
                  size="sm"
                />
              </label>
              <input
                type="date"
                value={formData.startDate || getTodayDate()}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div>
              <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-1">
                Date Quoted
                <HelpIcon 
                  content={helpContent.jobs.dateQuoted}
                  size="sm"
                />
              </label>
              <input
                type="date"
                value={formData.dateQuoted || ''}
                onChange={(e) => setFormData({ ...formData, dateQuoted: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="yyyy/mm/dd"
              />
            </div>

            {/* Machines Selection - Show if customer or cash customer is selected, OR if Rental branch is selected */}
            {(formData.customer || (customerSelection === 'cash' && formData.cashCustomer) || isRentalBranch) && (
              <div ref={machinesSectionRef} className="md:col-span-2">
                <label className="text-[14px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-ars-primary" />
                  {isRentalBranch ? 'Rental Fleet Machines' : 'Machines'}
                  {isRentalBranch && (
                    <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Rental Branch Selected
                    </span>
                  )}
                </label>
                <div className="space-y-3">
                  {/* Display selected machines */}
                  {Array.isArray(formData.machines) && formData.machines.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.machines.map((machineId, index) => {
                        // Look in both customer machines and rental machines
                        const machine = machines.find(m => m._id === machineId) || rentalMachines.find(m => m._id === machineId);
                        if (!machine) return null;
                        
                        // Auto-detect service type from Make or machineType field if not explicitly set
                        const makeLC = (machine.make || '').toLowerCase();
                        const typeLC = (machine.machineType || '').toLowerCase();
                        const isDateBased = machine.serviceType === 'date' || 
                          (!machine.serviceType && (typeLC.includes('dryer') || typeLC.includes('blower') || typeLC.includes('vacuum') || makeLC.includes('dryer') || makeLC.includes('blower') || makeLC.includes('vacuum')));
                        const serviceInfo = isDateBased
                          ? `Next Service: ${machine.nextServiceDate ? new Date(machine.nextServiceDate).toLocaleDateString() : 'N/A'}`
                          : `Hours: ${machine.machineHours?.toLocaleString() || 0} • Next: ${machine.nextServiceHours?.toLocaleString() || 0}`;
                        
                        return (
                          <div key={machine._id || index} className={`p-3 rounded-lg border flex items-center justify-between ${machine.isRental ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-ars-heading text-sm flex items-center gap-2">
                                {machine.assetNumber && <span className="text-amber-700">[{machine.assetNumber}]</span>}
                                {machine.make} {machine.model}
                                {machine.isRental && (
                                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">RENTAL</span>
                                )}
                                {isDateBased && (
                                  <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">DATE</span>
                                )}
                              </div>
                              <div className="text-xs text-ars-body mt-1">
                                Serial: {machine.serialNumber} • {serviceInfo}
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
                  
                  {/* Rental Machines Dropdown - Show when Rental branch is selected */}
                  {isRentalBranch && (
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
                        className="flex-1 min-w-0 px-4 py-2.5 border border-amber-300 rounded-[8px] focus:ring-2 focus:ring-amber-500 focus:border-transparent text-[15px] bg-amber-50"
                      >
                        <option value="">Select Rental Machine to Add</option>
                        {rentalMachines && rentalMachines.length > 0 ? (
                          rentalMachines
                            .filter(m => {
                              if (!m.isActive) return false;
                              const currentMachines = Array.isArray(formData.machines) ? formData.machines : [];
                              return !currentMachines.includes(m._id);
                            })
                            .map((machine) => {
                              const serviceInfo = machine.serviceType === 'date'
                                ? (machine.nextServiceDate ? `Due: ${new Date(machine.nextServiceDate).toLocaleDateString()}` : 'Date-based')
                                : `${machine.machineHours || 0} hrs`;
                              return (
                                <option key={machine._id} value={machine._id}>
                                  {machine.assetNumber ? `[${machine.assetNumber}] ` : ''}{machine.make} {machine.model} - {machine.serialNumber} ({serviceInfo})
                                </option>
                              );
                            })
                        ) : (
                          <option value="" disabled>No rental machines found</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Customer Machines Dropdown - Show when customer is selected */}
                  {(formData.customer || (customerSelection === 'cash' && formData.cashCustomer)) && (
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
                        className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px] bg-white"
                      >
                        <option value="">{isRentalBranch ? 'Or Select Customer Machine' : 'Select Machine to Add'}</option>
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
                        className="px-4 py-2.5 bg-ars-primary text-white rounded-[8px] hover:bg-ars-primary/90 transition-colors whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-1 sm:w-auto w-full"
                      >
                        <Plus className="w-4 h-4" />
                        {showNewMachineForm ? 'Cancel' : 'New Machine'}
                      </button>
                    </div>
                  )}
                  
                  {/* New Machine Form */}
                  {showNewMachineForm && (
                    <div className="p-4 bg-gray-50 rounded-[8px] border border-gray-200 space-y-3">
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
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Register Date
              </label>
              <input
                type="date"
                value={formData.registerDate}
                onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                RSR #
              </label>
              <input
                type="text"
                value={formData.rsrNumber}
                onChange={(e) => setFormData({ ...formData, rsrNumber: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter RSR number"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                PO Date
              </label>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                PO Number
              </label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter PO number"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Oil Sample #
              </label>
              <input
                type="text"
                value={formData.oilSampleNumber}
                onChange={(e) => setFormData({ ...formData, oilSampleNumber: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter oil sample number"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Store Pack
              </label>
              <input
                type="date"
                value={formData.storePack}
                onChange={(e) => setFormData({ ...formData, storePack: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Inv #
              </label>
              <input
                type="text"
                value={formData.invNumber}
                onChange={(e) => setFormData({ ...formData, invNumber: e.target.value })}
                style={{ fontSize: '15px' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter invoice number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                Feedback
              </label>
              <textarea
                rows={4}
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent resize-none text-[15px]"
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

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-[8px] font-bold text-[14px] text-ars-body hover:bg-gray-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
