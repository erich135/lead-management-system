/**
 * Choosing the customer and the site from ARS.
 *
 * What ARS can and cannot supply — in particular that it has no site register,
 * only addresses and machine locations — is described and worked out in
 * `customerSiteSelection.ts`. This is the screen around it.
 */

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, Loader2, MapPin, Search, X } from 'lucide-react';

import { getCustomers, getMachinesByCustomer } from '../../../../lib/api';
import type { Customer, Machine } from '../../../../lib/api';
import { siteCandidates } from '../customerSiteSelection';
import type {
  ChosenCustomer,
  ChosenSite,
  SiteCandidate,
} from '../customerSiteSelection';

const SEARCH_DEBOUNCE_MS = 250;

export interface CustomerSitePickerProps {
  customerId: string | null;
  customerName: string | null;
  siteName: string | null;
  disabled: boolean;
  onChooseCustomer: (customer: ChosenCustomer) => void;
  onChooseSite: (site: ChosenSite) => void;
  /** Machines held against the chosen customer, for the site list and the machine step. */
  onMachinesLoaded: (machines: Machine[]) => void;
}

export function CustomerSitePicker({
  customerId,
  customerName,
  siteName,
  disabled,
  onChooseCustomer,
  onChooseSite,
  onMachinesLoaded,
}: CustomerSitePickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState('');
  const [candidates, setCandidates] = useState<SiteCandidate[]>([]);
  const [typedSite, setTypedSite] = useState('');
  const chosen = useRef<ChosenCustomer | null>(
    customerId === null || customerName === null
      ? null
      : { customerId, customerName, address: null },
  );

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    setSearching(true);
    const timer = setTimeout(() => {
      getCustomers({ search: search.trim(), limit: 10 })
        .then(response => {
          if (live) setResults(response.customers ?? []);
        })
        .catch(() => {
          if (live) setProblem('The customer list could not be searched.');
        })
        .finally(() => {
          if (live) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search]);

  async function choose(customer: Customer) {
    const picked: ChosenCustomer = {
      customerId: customer._id,
      customerName: customer.name,
      address: customer.address ?? null,
    };
    chosen.current = picked;
    setSearch('');
    setResults([]);
    setProblem('');
    onChooseCustomer(picked);
    try {
      const response = await getMachinesByCustomer(customer._id);
      const machines = response.machines ?? [];
      onMachinesLoaded(machines);
      setCandidates(siteCandidates(picked, machines));
    } catch {
      onMachinesLoaded([]);
      setCandidates(siteCandidates(picked, []));
      setProblem(
        'The machines held against this customer could not be read, so the site list shows only the customer address.',
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Building2 className="h-4 w-4 text-ars-primary" />
          Customer
        </p>
        {customerName === null ? null : (
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            {customerName}
            <span className="text-[11px] text-slate-400">
              ARS customer {customerId}
            </span>
          </p>
        )}
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            disabled={disabled}
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={
              customerName === null
                ? 'Search the ARS customer register…'
                : 'Search to change the customer…'
            }
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-8 text-sm disabled:bg-slate-100"
          />
          {searching ? (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
          ) : search === '' ? null : (
            <button
              type="button"
              aria-label="Clear the search"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {results.length === 0 ? null : (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map(customer => (
                <li key={customer._id}>
                  <button
                    type="button"
                    onClick={() => void choose(customer)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="block font-medium text-slate-800">
                      {customer.name}
                    </span>
                    {customer.address ? (
                      <span className="block truncate text-xs text-slate-500">
                        {customer.address}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <MapPin className="h-4 w-4 text-ars-primary" />
          Site
        </p>
        {customerName === null ? (
          <p className="mt-1 text-xs text-slate-500">
            Choose the customer first. The sites offered are the ones ARS holds
            against them.
          </p>
        ) : (
          <>
            {siteName === null ? null : (
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                {siteName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidates.map(candidate => (
                <button
                  key={candidate.siteName}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChooseSite({
                      siteId: null,
                      siteName: candidate.siteName,
                      address: candidate.address,
                    })
                  }
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${
                    siteName === candidate.siteName
                      ? 'border-ars-primary bg-blue-50 text-ars-primary'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {candidate.siteName}
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    {candidate.origin === 'customer_address'
                      ? 'customer address'
                      : 'machine location'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                disabled={disabled}
                value={typedSite}
                onChange={event => setTypedSite(event.target.value)}
                placeholder="Site not listed — type its name"
                className="min-w-[16rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={disabled || typedSite.trim() === ''}
                onClick={() => {
                  onChooseSite({
                    siteId: null,
                    siteName: typedSite.trim(),
                    address: null,
                  });
                  setTypedSite('');
                }}
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Use this site
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              ARS holds no site register, so a site typed here is stored by name
              only. Give your own site reference below if there is one.
            </p>
          </>
        )}
        {problem === '' ? null : (
          <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
        )}
      </div>
    </div>
  );
}
