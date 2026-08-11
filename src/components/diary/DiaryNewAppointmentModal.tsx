import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, User, X } from 'lucide-react';
import type { Branch, Customer, RepCode, SalesLead } from '../../lib/api';
import {
  createCustomer,
  createDiaryAppointment,
  createSalesLead,
  getBranches,
  getCustomers,
  getSalesLeads,
} from '../../lib/api';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { SmartDateInput } from '../SmartDateInput';
import { useAuth } from '../../contexts/AuthContext';
import { buildGeoLocationPayload } from '../../utils/geoLocation';
import {
  DIARY_APPOINTMENT_TYPE_OPTIONS,
  formatDateForInput,
  getAppointmentTypeBadgeLabel,
  getSuggestedAppointmentTime,
  loadDiaryBookingPrefs,
  normalizeDiaryAppointmentType,
  requiresSiteVisitPin,
  saveDiaryBookingPrefs,
} from './diaryUtils';

interface DiaryNewAppointmentModalProps {
  isOpen: boolean;
  repCodes: RepCode[];
  defaultDate?: string;
  preselectedLead?: SalesLead | null;
  defaultAppointmentType?: string;
  /**
   * When true, the appointment type was chosen via a Quick Action and the
   * type picker is hidden inside the modal.
   */
  lockAppointmentType?: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

interface NewClientFormState {
  companyName: string;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  physicalAddress: string;
  notes: string;
}

/** Unified suggestion row for existing customers and sales leads. */
type ClientSuggestion =
  | { kind: 'customer'; id: string; customer: Customer }
  | { kind: 'lead'; id: string; lead: SalesLead };

/**
 * Escapes user input so it is safe to use as a MongoDB regex prefix.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolves the logged-in user's primary rep code identifier.
 */
function getLoggedInRepId(user: ReturnType<typeof useAuth>['user']): string | undefined {
  return user?.repCodes?.[0]?.id || user?.repCode?.id;
}

/**
 * Determines whether the current user may assign appointments to other reps.
 */
function canAssignAppointmentsToOthers(
  user: ReturnType<typeof useAuth>['user'],
  isAdmin: boolean,
  isSuperAdmin: boolean,
): boolean {
  if (isAdmin || isSuperAdmin) {
    return true;
  }

  return user?.role.name === 'manager';
}

/**
 * Picks a usable branch ID for quick client creation (default branch first).
 */
function resolveBranchId(branches: Branch[]): string | undefined {
  const active = branches.filter((branch) => branch.isActive !== false);
  const preferred = active.find((branch) => branch.isDefault) || active[0] || branches[0];
  return preferred?._id;
}

const EMPTY_CLIENT_FORM: NewClientFormState = {
  companyName: '',
  contactPerson: '',
  mobileNumber: '',
  email: '',
  physicalAddress: '',
  notes: '',
};

const FIELD_LABEL = 'mb-1.5 block text-sm font-semibold text-gray-700';
const FIELD_INPUT =
  'w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-ars-primary focus:outline-none focus:ring-2 focus:ring-ars-primary/20';

/**
 * New Appointment modal for the Sales Diary — customer, type (Loan/RFC/etc), map, no purpose.
 * White design matching the restored app shell.
 */
const DiaryNewAppointmentModal: React.FC<DiaryNewAppointmentModalProps> = ({
  isOpen,
  repCodes,
  defaultDate,
  preselectedLead,
  defaultAppointmentType,
  lockAppointmentType = false,
  onClose,
  onCreated,
}) => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const allowRepAssignment = canAssignAppointmentsToOthers(user, isAdmin, isSuperAdmin);
  const loggedInRepId = useMemo(() => getLoggedInRepId(user), [user]);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationCoordinates, setLocationCoordinates] = useState<[number, number] | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [clientForm, setClientForm] = useState<NewClientFormState>(EMPTY_CLIENT_FORM);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [formData, setFormData] = useState({
    appointmentDate: defaultDate || formatDateForInput(new Date()),
    appointmentTime: '',
    appointmentType: 'site_visit',
    location: '',
    notes: '',
    assignedRep: loggedInRepId || '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const prefs = loadDiaryBookingPrefs();
    const lockedType = defaultAppointmentType
      ? normalizeDiaryAppointmentType(defaultAppointmentType)
      : null;
    const rememberedType = prefs.appointmentType || 'site_visit';

    setFormData({
      appointmentDate: defaultDate || formatDateForInput(new Date()),
      appointmentTime: getSuggestedAppointmentTime(),
      appointmentType: lockedType || rememberedType,
      location: preselectedLead?.contactAddress || '',
      notes: '',
      assignedRep: allowRepAssignment ? loggedInRepId || '' : loggedInRepId || '',
    });
    setLocationCoordinates(preselectedLead?.geoLocation?.coordinates ?? null);
    setError(null);
    setShowCreateClient(false);
    setClientForm(EMPTY_CLIENT_FORM);
    setClientError(null);

    if (preselectedLead) {
      setSelectedLead(preselectedLead);
      setSelectedCustomer(null);
      setCustomerSearch(preselectedLead.companyName);
    } else {
      setSelectedLead(null);
      setSelectedCustomer(null);
      setCustomerSearch('');
    }

    const focusTimer = window.setTimeout(() => {
      customerInputRef.current?.focus();
      customerInputRef.current?.select();
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [
    allowRepAssignment,
    defaultAppointmentType,
    defaultDate,
    isOpen,
    loggedInRepId,
    preselectedLead,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const query = customerSearch.trim();
    if (query.length < 1) {
      setClientSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (
      selectedCustomer &&
      query.toLowerCase() === selectedCustomer.name.trim().toLowerCase()
    ) {
      setClientSuggestions([]);
      return;
    }

    if (
      selectedLead &&
      query.toLowerCase() === selectedLead.companyName.trim().toLowerCase()
    ) {
      setClientSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [customerResponse, leadResponse] = await Promise.all([
          getCustomers({
            search: `^${escapeRegex(query)}`,
            limit: 15,
          }),
          getSalesLeads({
            search: query,
            limit: 15,
            sortBy: 'companyName',
            sortOrder: 'asc',
          }),
        ]);

        const customerMatches = (customerResponse.customers || [])
          .filter((customer) =>
            customer.name.toLowerCase().startsWith(query.toLowerCase()),
          )
          .map(
            (customer): ClientSuggestion => ({
              kind: 'customer',
              id: `customer-${customer._id}`,
              customer,
            }),
          );

        const leadMatches = (leadResponse.leads || [])
          .filter((lead) =>
            lead.companyName.toLowerCase().includes(query.toLowerCase()),
          )
          .map(
            (lead): ClientSuggestion => ({
              kind: 'lead',
              id: `lead-${lead._id}`,
              lead,
            }),
          );

        // Prefer sales leads first (richer CRM data), then reference customers.
        setClientSuggestions([...leadMatches, ...customerMatches].slice(0, 20));
      } catch (requestError) {
        console.error('Failed to load client suggestions:', requestError);
        setClientSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [customerSearch, isOpen, selectedCustomer, selectedLead]);

  if (!isOpen) {
    return null;
  }

  /**
   * Updates one field in the creation form.
   */
  function handleFieldChange(field: string, value: string): void {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Updates the customer field and clears any stale customer link.
   */
  function handleCustomerSearchChange(value: string): void {
    setCustomerSearch(value);

    if (selectedCustomer && value.trim().toLowerCase() !== selectedCustomer.name.trim().toLowerCase()) {
      setSelectedCustomer(null);
    }

    if (selectedLead && value.trim().toLowerCase() !== selectedLead.companyName.trim().toLowerCase()) {
      setSelectedLead(null);
    }
  }

  /**
   * Applies known client details onto the open appointment form.
   */
  function applyClientDetailsToForm(details: {
    location?: string;
    coordinates?: [number, number] | null;
    assignedRep?: string;
  }): void {
    if (details.location?.trim()) {
      handleFieldChange('location', details.location.trim());
    }

    if (details.coordinates) {
      setLocationCoordinates(details.coordinates);
    }

    if (details.assignedRep && allowRepAssignment) {
      handleFieldChange('assignedRep', details.assignedRep);
    }
  }

  /**
   * Links a Reference Data customer and auto-fills location / contact fields.
   */
  function handleSelectCustomer(customer: Customer): void {
    setSelectedCustomer(customer);
    setSelectedLead(null);
    setCustomerSearch(customer.name);
    setClientSuggestions([]);

    applyClientDetailsToForm({
      location: customer.address,
    });
  }

  /**
   * Links an existing sales lead and auto-fills all known CRM details.
   */
  function handleSelectLead(lead: SalesLead): void {
    setSelectedLead(lead);
    setSelectedCustomer(null);
    setCustomerSearch(lead.companyName);
    setClientSuggestions([]);

    const assignedRepId =
      typeof lead.assignedRep === 'object' && lead.assignedRep
        ? lead.assignedRep._id
        : typeof lead.assignedRep === 'string'
          ? lead.assignedRep
          : undefined;

    applyClientDetailsToForm({
      location: lead.contactAddress,
      coordinates: lead.geoLocation?.coordinates ?? null,
      assignedRep: assignedRepId,
    });
  }

  /**
   * Clears the linked customer while keeping the typed name.
   */
  function handleClearSelectedCustomer(): void {
    setSelectedCustomer(null);
    setSelectedLead(null);
  }

  /**
   * Opens the nested Create New Client popup without leaving New Appointment.
   */
  function handleOpenCreateClient(): void {
    setClientError(null);
    setClientForm({
      ...EMPTY_CLIENT_FORM,
      companyName: customerSearch.trim(),
      physicalAddress: formData.location.trim(),
    });
    setShowCreateClient(true);
  }

  /**
   * Closes the Create Client popup and keeps the appointment form intact.
   */
  function handleCloseCreateClient(): void {
    setShowCreateClient(false);
    setClientError(null);
    setIsSavingClient(false);
  }

  /**
   * Updates one field on the nested Create Client form.
   */
  function handleClientFieldChange(field: keyof NewClientFormState, value: string): void {
    setClientForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Creates the client immediately, selects them on the appointment, and closes only the nested popup.
   */
  async function handleSaveClient(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const companyName = clientForm.companyName.trim();
    const contactPerson = clientForm.contactPerson.trim();
    const mobileNumber = clientForm.mobileNumber.trim();
    const email = clientForm.email.trim();
    const physicalAddress = clientForm.physicalAddress.trim();
    const notes = clientForm.notes.trim();

    if (!companyName) {
      setClientError('Company Name is required.');
      return;
    }
    if (!contactPerson) {
      setClientError('Contact Person is required.');
      return;
    }
    if (!mobileNumber) {
      setClientError('Mobile Number is required.');
      return;
    }

    setIsSavingClient(true);
    setClientError(null);

    try {
      const { customer } = await createCustomer({
        name: companyName,
        defaultContactPerson: contactPerson,
        phone: mobileNumber,
        defaultWhatsAppNumber: mobileNumber,
        email: email || undefined,
        address: physicalAddress || undefined,
      });

      let createdLead: SalesLead | null = null;
      try {
        const { branches } = await getBranches();
        const branchId = resolveBranchId(branches || []);
        if (branchId) {
          createdLead = await createSalesLead({
            companyName,
            contactPerson,
            contactPhone: mobileNumber,
            contactEmail: email || undefined,
            contactAddress: physicalAddress || undefined,
            branch: branchId,
            assignedRep: formData.assignedRep || loggedInRepId || undefined,
            leadSource: 'Walk-in',
            notes: notes || 'Created from New Appointment',
          });
        }
      } catch (leadError) {
        // Customer was created — appointment can still continue with the customer selection.
        console.warn('Sales lead create skipped after new client:', leadError);
      }

      if (createdLead) {
        handleSelectLead(createdLead);
      } else {
        handleSelectCustomer(customer);
      }

      setShowCreateClient(false);
      setClientForm(EMPTY_CLIENT_FORM);
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to create client';
      setClientError(message);
    } finally {
      setIsSavingClient(false);
    }
  }

  /**
   * Closes the modal without wiping remembered type/time preferences.
   */
  function handleClose(): void {
    setCustomerSearch('');
    setClientSuggestions([]);
    setSelectedCustomer(null);
    setSelectedLead(null);
    setLocationCoordinates(null);
    setError(null);
    setShowCreateClient(false);
    setClientForm(EMPTY_CLIENT_FORM);
    setClientError(null);
    onClose();
  }

  /**
   * Saves the appointment using a Reference Data customer or a free-typed name.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const customerName = customerSearch.trim();
    if (!customerName) {
      setError('Enter a customer or company name.');
      customerInputRef.current?.focus();
      return;
    }

    const appointmentType = normalizeDiaryAppointmentType(formData.appointmentType);
    const trimmedLocation = formData.location.trim();

    if (requiresSiteVisitPin(appointmentType)) {
      if (!trimmedLocation) {
        setError('Enter a location for this Site Visit.');
        return;
      }

      if (!buildGeoLocationPayload(locationCoordinates)) {
        setError('Pin the Site Visit location on the map before saving.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assignedRep = allowRepAssignment
        ? formData.assignedRep || loggedInRepId || undefined
        : loggedInRepId || undefined;

      const geoLocation = buildGeoLocationPayload(locationCoordinates);

      await createDiaryAppointment({
        customerName: selectedCustomer?.name || customerName,
        salesLeadId: selectedLead?._id,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        appointmentType,
        status: 'appointment',
        location: trimmedLocation || undefined,
        notes: formData.notes,
        assignedRep,
        ...(geoLocation ? { geoLocation } : {}),
      });

      saveDiaryBookingPrefs({
        appointmentType,
        appointmentTime: formData.appointmentTime,
      });

      await onCreated();
      handleClose();
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  const linkedName = selectedCustomer?.name || selectedLead?.companyName;
  const linkedContact =
    selectedLead?.contactPerson || selectedCustomer?.defaultContactPerson || '';
  const linkedPhone =
    selectedLead?.contactPhone ||
    selectedCustomer?.phone ||
    selectedCustomer?.defaultWhatsAppNumber ||
    '';
  const linkedEmail = selectedLead?.contactEmail || selectedCustomer?.email || '';
  const linkedAddress =
    selectedLead?.contactAddress || selectedCustomer?.address || '';
  const showSuggestions =
    clientSuggestions.length > 0 &&
    customerSearch.trim().length >= 1 &&
    (!linkedName || customerSearch.trim().toLowerCase() !== linkedName.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="mobile-fit-modal relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-appointment-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="new-appointment-title" className="text-lg font-bold text-gray-900">
              New Appointment
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {lockAppointmentType
                ? `Booking ${getAppointmentTypeBadgeLabel(formData.appointmentType)} — who are you going to see?`
                : 'Customer, type, date/time and map location.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="diary-customer-search" className={FIELD_LABEL}>
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-ars-primary" />
                  Customer
                </span>
              </label>
              {linkedName && (
                <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{linkedName}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                        {linkedContact ? <p>Contact: {linkedContact}</p> : null}
                        {linkedPhone ? <p>Mobile: {linkedPhone}</p> : null}
                        {linkedEmail ? <p>Email: {linkedEmail}</p> : null}
                        {linkedAddress ? <p>Address: {linkedAddress}</p> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800"
                      aria-label="Clear selected customer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="diary-customer-search"
                  ref={customerInputRef}
                  type="text"
                  value={customerSearch}
                  onChange={(event) => handleCustomerSearchChange(event.target.value)}
                  placeholder="Search customer name…"
                  autoComplete="off"
                  autoFocus
                  className={`${FIELD_INPUT} pl-10`}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenCreateClient}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ars-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Client
              </button>
              {showSuggestions && (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  {clientSuggestions.map((suggestion) => {
                    if (suggestion.kind === 'lead') {
                      const lead = suggestion.lead;
                      return (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectLead(lead)}
                          className="flex min-h-[52px] w-full flex-col justify-center border-b border-gray-100 px-3.5 py-3 text-left last:border-b-0 hover:bg-gray-50"
                        >
                          <span className="font-semibold text-gray-900">{lead.companyName}</span>
                          <span className="mt-0.5 truncate text-xs text-gray-500">
                            {[lead.contactPerson, lead.contactPhone, lead.contactAddress]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </button>
                      );
                    }

                    const customer = suggestion.customer;
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="flex min-h-[52px] w-full flex-col justify-center border-b border-gray-100 px-3.5 py-3 text-left last:border-b-0 hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-900">{customer.name}</span>
                        {(customer.defaultContactPerson ||
                          customer.phone ||
                          customer.address) && (
                          <span className="mt-0.5 truncate text-xs text-gray-500">
                            {[
                              customer.defaultContactPerson,
                              customer.phone || customer.defaultWhatsAppNumber,
                              customer.address,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={FIELD_LABEL}>Date</label>
                <SmartDateInput
                  required
                  value={formData.appointmentDate}
                  onChange={(event) => handleFieldChange('appointmentDate', event.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Time</label>
                <input
                  required
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(event) => handleFieldChange('appointmentTime', event.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
            </div>

            {lockAppointmentType ? (
              <div className="flex min-h-[48px] items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Type
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {getAppointmentTypeBadgeLabel(formData.appointmentType)}
                </span>
              </div>
            ) : (
              <div>
                <label className={FIELD_LABEL}>Appointment type</label>
                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  {DIARY_APPOINTMENT_TYPE_OPTIONS.map((option) => {
                    const active = formData.appointmentType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFieldChange('appointmentType', option.value)}
                        className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                          active
                            ? 'border-ars-primary bg-ars-primary text-white shadow-md ring-2 ring-ars-primary/30'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-ars-primary/40 hover:text-gray-900'
                        }`}
                      >
                        <span className="text-base" aria-hidden>
                          {option.icon}
                        </span>
                        <span className="leading-tight">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className={FIELD_LABEL}>
                Location{' '}
                {requiresSiteVisitPin(formData.appointmentType) ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="font-medium text-gray-400">(optional)</span>
                )}
              </label>
              <AddressAutocomplete
                value={formData.location}
                coordinates={locationCoordinates}
                onChange={(address, coordinates) => {
                  handleFieldChange('location', address);
                  setLocationCoordinates(coordinates ?? null);
                }}
                placeholder="Search address or pin on map"
                required={requiresSiteVisitPin(formData.appointmentType)}
              />
              {requiresSiteVisitPin(formData.appointmentType) && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Site Visits need a pinned map location.
                </p>
              )}
            </div>

            <div>
              <label className={FIELD_LABEL}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(event) => handleFieldChange('notes', event.target.value)}
                rows={3}
                placeholder="Optional notes for this visit"
                className={FIELD_INPUT}
              />
            </div>

            {allowRepAssignment && repCodes.length > 0 && (
              <div>
                <label className={FIELD_LABEL}>Assigned rep</label>
                <select
                  value={formData.assignedRep}
                  onChange={(event) => handleFieldChange('assignedRep', event.target.value)}
                  className={FIELD_INPUT}
                >
                  {repCodes.map((repCode) => (
                    <option key={repCode._id} value={repCode._id}>
                      {repCode.description || repCode.code}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-gray-200 bg-white px-5 py-3">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[48px] flex-1 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-ars-primary text-sm font-semibold text-white hover:bg-ars-primary/90 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save appointment
            </button>
          </div>
        </form>

        {showCreateClient && (
          <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-3">
            <div
              className="flex max-h-[88%] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-client-title"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 id="create-client-title" className="text-lg font-bold text-gray-900">
                    Create New Client
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Save the client, then continue with this appointment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCreateClient}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close create client"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {clientError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {clientError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="new-client-company" className={FIELD_LABEL}>
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-client-company"
                      required
                      value={clientForm.companyName}
                      onChange={(event) => handleClientFieldChange('companyName', event.target.value)}
                      className={FIELD_INPUT}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="new-client-contact" className={FIELD_LABEL}>
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-client-contact"
                      required
                      value={clientForm.contactPerson}
                      onChange={(event) =>
                        handleClientFieldChange('contactPerson', event.target.value)
                      }
                      className={FIELD_INPUT}
                    />
                  </div>

                  <div>
                    <label htmlFor="new-client-mobile" className={FIELD_LABEL}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-client-mobile"
                      required
                      type="tel"
                      value={clientForm.mobileNumber}
                      onChange={(event) =>
                        handleClientFieldChange('mobileNumber', event.target.value)
                      }
                      className={FIELD_INPUT}
                    />
                  </div>

                  <div>
                    <label htmlFor="new-client-email" className={FIELD_LABEL}>
                      Email
                    </label>
                    <input
                      id="new-client-email"
                      type="email"
                      value={clientForm.email}
                      onChange={(event) => handleClientFieldChange('email', event.target.value)}
                      className={FIELD_INPUT}
                    />
                  </div>

                  <div>
                    <label htmlFor="new-client-address" className={FIELD_LABEL}>
                      Physical Address
                    </label>
                    <textarea
                      id="new-client-address"
                      rows={2}
                      value={clientForm.physicalAddress}
                      onChange={(event) =>
                        handleClientFieldChange('physicalAddress', event.target.value)
                      }
                      className={FIELD_INPUT}
                    />
                  </div>

                  <div>
                    <label htmlFor="new-client-notes" className={FIELD_LABEL}>
                      Notes <span className="font-medium text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id="new-client-notes"
                      rows={2}
                      value={clientForm.notes}
                      onChange={(event) => handleClientFieldChange('notes', event.target.value)}
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>

                <div className="flex gap-2 border-t border-gray-200 px-5 py-3">
                  <button
                    type="button"
                    onClick={handleCloseCreateClient}
                    disabled={isSavingClient}
                    className="min-h-[48px] flex-1 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingClient}
                    className="inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-ars-primary text-sm font-semibold text-white hover:bg-ars-primary/90 disabled:opacity-60"
                  >
                    {isSavingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryNewAppointmentModal;
