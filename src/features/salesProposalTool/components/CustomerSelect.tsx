import { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { getCustomers, type Customer } from '../../../lib/api';
import { SEARCH_MENU_PANEL, searchMenuWrapClass } from '../searchOverlay';

interface CustomerSelectProps {
  customerId: string | null;
  customerName: string | null;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
}

export function CustomerSelect({
  customerId,
  customerName,
  onSelect,
  onClear,
}: CustomerSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void getCustomers({ search: trimmed, limit: 10 })
        .then(({ customers }) => {
          if (!cancelled) {
            setResults(customers);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setResults([]);
            setError(err instanceof Error ? err.message : 'Could not search customers.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (customerId && customerName) {
    return (
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
          Customer
        </label>
        <div className="flex items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-[#383838]">{customerName}</p>
          <button
            type="button"
            onClick={onClear}
            className="text-slate-500 hover:text-[#383838]"
            title="Change customer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
        Customer
      </label>
      <div className={searchMenuWrapClass(results.length > 0 || loading)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer"
          className="w-full rounded-[8px] border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {results.length > 0 && (
          <ul className={SEARCH_MENU_PANEL}>
            {results.map((customer) => (
              <li key={customer._id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-[#383838] hover:bg-slate-50"
                  onClick={() => {
                    onSelect(customer);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  {customer.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
