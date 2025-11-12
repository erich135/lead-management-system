import { useState, FormEvent, useEffect, useRef } from 'react';
import { createJob, getStatuses, getBranches, getCustomers, createCustomer, getTechnicians, getServiceDescriptions, getRepCodes, type Status, type Branch, type Customer, type Technician, type ServiceDescription, type RepCode } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { X, AlertCircle, Search, Plus } from 'lucide-react';

interface LeadFormProps {
  statuses: Status[];
  branches: Branch[];
  customers?: Customer[]; // Optional, will load dynamically
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Form component for creating a new job.
 * Uses the new API structure with proper types and error handling.
 */
export function LeadForm({ statuses, branches, customers: initialCustomers, onClose, onSaved }: LeadFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<ServiceDescription[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingCustomerRef = useRef(false); // Flag to prevent search when selecting
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Load technicians, service descriptions, and rep codes on mount
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [techsData, descsData, repCodesData] = await Promise.all([
          getTechnicians(),
          getServiceDescriptions(),
          getRepCodes(),
        ]);
        setTechnicians(techsData.technicians || []);
        setServiceDescriptions(descsData.descriptions || []);
        setRepCodes(repCodesData.repCodes || []);
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

  function handleCustomerSelect(customer: Customer) {
    isSelectingCustomerRef.current = true; // Set flag to prevent search
    setFormData({ ...formData, customer: customer._id });
    setSelectedCustomer(customer);
    setSelectedCustomerName(customer.name);
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    setSearchedCustomers([]); // Clear search results since we've selected
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

  const [formData, setFormData] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      jobNumber: '',
      customer: '',
      cashCustomer: '',
      branch: branches[0]?._id || '',
      status: statuses[0]?._id || '',
      description: '',
      valueExVat: '',
      adm: '',
      repCode: '',
      registerDate: today,
      techBooked: '',
      dateBooked: today,
      rsrNumber: '',
      feedback: '',
      poDate: '',
      poNumber: '',
      oilSampleNumber: '',
      storePack: '',
      invoiceDate: '',
      invNumber: '',
      startDate: '',
      dateQuoted: '',
    };
  });

  const [customerSelection, setCustomerSelection] = useState<'customer' | 'cash'>('customer');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        branch: formData.branch,
        status: formData.status,
        valueExVat: formData.valueExVat ? parseFloat(formData.valueExVat) : undefined,
        adm: formData.adm || undefined,
        repCode: formData.repCode || undefined,
        registerDate: formData.registerDate || undefined,
        techBooked: formData.techBooked || undefined,
        dateBooked: formData.dateBooked || undefined,
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

      await createJob(payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold">Create New Job</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">Customer Type</label>
              <select
                value={customerSelection}
                onChange={(e) => setCustomerSelection(e.target.value as 'customer' | 'cash')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                    required={customerSelection === 'customer'}
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={isCreatingCustomer}
                        className="w-full px-4 py-2 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isCreatingCustomer ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create "{customerSearchTerm}"
                          </>
                        )}
                      </button>
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
                  required={customerSelection === 'cash'}
                  value={formData.cashCustomer}
                  onChange={(e) => setFormData({ ...formData, cashCustomer: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="e.g., John Citizen"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Branch *
              </label>
              <select
                required
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
              <input
                type="text"
                value={formData.adm}
                onChange={(e) => setFormData({ ...formData, adm: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="e.g., AS, ER, HT"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Technician
              </label>
              <select
                value={formData.techBooked}
                onChange={(e) => setFormData({ ...formData, techBooked: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {technicians && technicians.length > 0 ? (
                  technicians.map((tech) => (
                    <option key={tech._id} value={tech._id}>
                      {tech.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading technicians...</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Service Description
              </label>
              <select
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="10000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Date Quoted
              </label>
              <input
                type="date"
                value={formData.dateQuoted}
                onChange={(e) => setFormData({ ...formData, dateQuoted: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Rep Code
              </label>
              <select
                value={formData.repCode}
                onChange={(e) => setFormData({ ...formData, repCode: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Register Date
              </label>
              <input
                type="date"
                value={formData.registerDate}
                onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Date Booked
              </label>
              <input
                type="date"
                value={formData.dateBooked}
                onChange={(e) => setFormData({ ...formData, dateBooked: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter oil sample number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ars-body mb-2">
                Store Pack
              </label>
              <input
                type="text"
                value={formData.storePack}
                onChange={(e) => setFormData({ ...formData, storePack: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Enter store pack"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent resize-none"
                placeholder="Enter feedback or notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-ars-body hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
