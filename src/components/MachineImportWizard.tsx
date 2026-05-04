import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  importCustomerMachines,
  type ImportableMachineRow,
  type Customer,
} from '../lib/api';
import {
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Users,
  Cog,
  Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;
  clientName: string;
  machineType: string;
  make: string;
  model: string;
  serialNumber: string;
  rawServiceType: string;
  machineHours: number | null;
  nextServiceHours: number | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  assetNumber: string;
  currentLocation: string;
  cashCustomer: string;
  lastOilSampleDate: string | null;
  oilSampleComment: string;
  // resolved during preview step
  resolvedCustomerId?: string;
  matchStatus: 'matched' | 'unmatched' | 'skipped';
  ownershipType: 'customer' | 'ars_rental';
}

type WizardStep = 'upload' | 'preview' | 'confirm' | 'done';

interface Props {
  customers: Customer[];
  onClose: () => void;
  onImportComplete: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function excelDateToISO(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    // Excel serial date → JS Date
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    const y = date.y;
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Accept common date strings
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function normalise(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildCustomerIndex(customers: Customer[]): Map<string, Customer> {
  const map = new Map<string, Customer>();
  for (const c of customers) {
    map.set(normalise(c.name), c);
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MachineImportWizard({ customers, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customerIndex = buildCustomerIndex(customers);

  // ── Step 1: file picked ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setParseError(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        setSheetNames(wb.SheetNames);
        // Default: pick the last non-helper sheet (usually the latest month)
        const preferred = wb.SheetNames.find((n) =>
          /desember|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov/i.test(n),
        );
        setSelectedSheet(preferred || wb.SheetNames[wb.SheetNames.length - 1]);
      } catch {
        setParseError('Could not read the file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // ── Step 1 → 2: parse selected sheet ────────────────────────────────────
  const handleParse = useCallback(() => {
    if (!file || !selectedSheet) return;
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[selectedSheet];
        if (!ws) { setParseError('Sheet not found.'); return; }

        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (rawRows.length < 2) { setParseError('Sheet appears to be empty.'); return; }

        // Find header row (first row that has "Client" or "Make")
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(5, rawRows.length); r++) {
          const row = rawRows[r] as unknown[];
          const joined = row.map((c) => String(c ?? '').toLowerCase()).join(' ');
          if (joined.includes('client') || joined.includes('make')) {
            headerRowIndex = r;
            break;
          }
        }

        const headers = (rawRows[headerRowIndex] as unknown[]).map((h) =>
          String(h ?? '').toLowerCase().trim(),
        );

        const col = (names: string[]) => {
          for (const n of names) {
            const i = headers.indexOf(n);
            if (i !== -1) return i;
          }
          return -1;
        };

        const clientCol = col(['client', 'customer', 'customer name']);
        const typeCol = col(['type', 'machine type', 'machinetype']);
        const makeCol = col(['make']);
        const modelCol = col(['model']);
        const serialCol = col(['s/n', 'serial number', 'serialnumber', 'serial', 'serial no']);
        const svcTypeCol = col(['service type', 'servicetype']);
        const lastHourCol = col(['last hour', 'last hours', 'machine hours', 'machinehours', 'hours']);
        const nextSvcHoursCol = col(['next service', 'next service hours', 'nextservicehours', 'next service (hours)']);
        const lastSvcDateCol = col(['last service date', 'lastservicedate', 'last service']);
        const nextSvcDateCol = col(['next service date', 'nextservicedate']);
        const assetCol = col(['asset number', 'assetnumber', 'asset', 'asset #']);
        const currentLocationCol = col(['current location', 'currentlocation', 'location']);
        const cashCustomerCol = col(['cash customer', 'cashcustomer']);
        const lastOilSampleDateCol = col(['last oil sample date', 'lastoilsampledate', 'oil sample date']);
        const oilSampleCommentCol = col(['oil sample comment', 'oilsamplecomment', 'oil comment']);
        const ownershipCol = col(['unit ownership', 'ownership', 'ownershiptype']);

        if (makeCol === -1 || modelCol === -1 || serialCol === -1) {
          setParseError('Could not find required columns (Make, Model, S/N). Check that you selected the correct sheet.');
          return;
        }

        const rows: ParsedRow[] = [];
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r] as unknown[];
          const serialRaw = String(row[serialCol] ?? '').trim();
          const makeRaw = String(row[makeCol] ?? '').trim();
          const modelRaw = String(row[modelCol] ?? '').trim();
          if (!serialRaw || !makeRaw || !modelRaw) continue;

          const clientName = clientCol !== -1 ? String(row[clientCol] ?? '').trim() : '';
          const rawServiceType = svcTypeCol !== -1 ? String(row[svcTypeCol] ?? '').toLowerCase().trim() : 'hours';
          const serviceTypeIsDate = rawServiceType === 'date';

          const machineHoursVal = lastHourCol !== -1 ? parseNumber(row[lastHourCol]) : null;
          const nextServiceHoursVal = nextSvcHoursCol !== -1 ? parseNumber(row[nextSvcHoursCol]) : null;

          const assetNumber = assetCol !== -1 ? String(row[assetCol] ?? '').trim() : '';
          const currentLocation = currentLocationCol !== -1 ? String(row[currentLocationCol] ?? '').trim() : '';
          const cashCustomer = cashCustomerCol !== -1 ? String(row[cashCustomerCol] ?? '').trim() : '';
          const lastOilSampleDate = lastOilSampleDateCol !== -1 ? excelDateToISO(row[lastOilSampleDateCol]) : null;
          const oilSampleComment = oilSampleCommentCol !== -1 ? String(row[oilSampleCommentCol] ?? '').trim() : '';
          const ownershipRaw = ownershipCol !== -1 ? String(row[ownershipCol] ?? '').trim().toLowerCase() : '';
          const ownershipType: 'customer' | 'ars_rental' =
            ownershipRaw === 'ars_rental' || ownershipRaw === 'ars rental' || ownershipRaw === 'rental'
              ? 'ars_rental' : 'customer';

          // Resolve customer
          const matched = clientName ? customerIndex.get(normalise(clientName)) : undefined;

          rows.push({
            rowIndex: r + 1,
            clientName,
            machineType: typeCol !== -1 ? String(row[typeCol] ?? '').trim() : '',
            make: makeRaw,
            model: modelRaw,
            serialNumber: serialRaw,
            rawServiceType,
            machineHours: serviceTypeIsDate ? null : machineHoursVal,
            nextServiceHours: serviceTypeIsDate ? null : nextServiceHoursVal,
            lastServiceDate: serviceTypeIsDate ? excelDateToISO(lastSvcDateCol !== -1 ? row[lastSvcDateCol] : null) : null,
            nextServiceDate: excelDateToISO(nextSvcDateCol !== -1 ? row[nextSvcDateCol] : null),
            assetNumber,
            currentLocation,
            cashCustomer,
            lastOilSampleDate,
            oilSampleComment,
            resolvedCustomerId: matched?._id,
            matchStatus: matched ? 'matched' : clientName ? 'unmatched' : 'skipped',
            ownershipType,
          });
        }

        if (rows.length === 0) {
          setParseError('No valid rows found in the selected sheet.');
          return;
        }

        setParsedRows(rows);
        setStep('preview');
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file, selectedSheet, customerIndex]);

  // ── Preview helpers ──────────────────────────────────────────────────────
  const toggleSkip = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (row.matchStatus === 'skipped') {
          const matched = customerIndex.get(normalise(row.clientName));
          return { ...row, matchStatus: matched ? 'matched' : 'unmatched', resolvedCustomerId: matched?._id };
        }
        return { ...row, matchStatus: 'skipped' };
      }),
    );
  };

  const reassignCustomer = (index: number, customerId: string) => {
    setParsedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, resolvedCustomerId: customerId || undefined, matchStatus: customerId ? 'matched' : 'unmatched' };
      }),
    );
  };

  const toggleOwnership = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, ownershipType: row.ownershipType === 'customer' ? 'ars_rental' : 'customer' };
      }),
    );
  };

  const rowsToImport = parsedRows.filter((r) => r.matchStatus !== 'skipped');
  const matched = parsedRows.filter((r) => r.matchStatus === 'matched').length;
  const unmatched = parsedRows.filter((r) => r.matchStatus === 'unmatched').length;
  const skipped = parsedRows.filter((r) => r.matchStatus === 'skipped').length;

  const filteredRows = parsedRows.filter((r) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.clientName.toLowerCase().includes(q) ||
      r.make.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q) ||
      r.serialNumber.toLowerCase().includes(q)
    );
  });

  // ── Step 3: run import ───────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const payload: ImportableMachineRow[] = rowsToImport.map((r) => ({
        clientName: r.clientName,
        customerId: r.resolvedCustomerId,
        machineType: r.machineType || undefined,
        make: r.make,
        model: r.model,
        serialNumber: r.serialNumber,
        serviceType: r.rawServiceType === 'date' ? 'date' : 'hours',
        machineHours: r.machineHours ?? undefined,
        nextServiceHours: r.nextServiceHours ?? undefined,
        lastServiceDate: r.lastServiceDate ?? undefined,
        nextServiceDate: r.nextServiceDate ?? undefined,
        ownershipType: r.ownershipType,
        isRental: r.ownershipType === 'ars_rental',
        assetNumber: r.assetNumber || undefined,
        currentLocation: r.currentLocation || undefined,
        cashCustomer: r.cashCustomer || undefined,
        lastOilSampleDate: r.lastOilSampleDate ?? undefined,
        oilSampleComment: r.oilSampleComment || undefined,
      }));

      const result = await importCustomerMachines(payload);
      setImportResult(result.data);
      setStep('done');
      onImportComplete();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Import Customer Machines</h2>
              <p className="text-blue-200 text-xs">From Excel (XLSX)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-500 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2">
          {(['upload', 'preview', 'confirm', 'done'] as WizardStep[]).map((s, idx) => {
            const labels = ['1. Upload', '2. Preview', '3. Confirm', '4. Done'];
            const isActive = step === s;
            const isPast = ['upload', 'preview', 'confirm', 'done'].indexOf(step) > idx;
            return (
              <div key={s} className="flex items-center">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  isActive ? 'bg-blue-600 text-white' :
                  isPast ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {labels[idx]}
                </div>
                {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700">Click to select your XLSX file</p>
                <p className="text-sm text-slate-400 mt-1">Max 10 MB · .xlsx only</p>
                {file && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    <FileSpreadsheet className="w-4 h-4" />
                    {file.name}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />

              {sheetNames.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {sheetNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    The latest month sheet (e.g. "DESEMBER 2025") contains the most current service data.
                  </p>
                </div>
              )}

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-2xl font-bold text-slate-700">{parsedRows.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Total rows</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{matched}</div>
                  <div className="text-xs text-green-600 mt-0.5">Customer matched</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{unmatched}</div>
                  <div className="text-xs text-amber-600 mt-0.5">Unmatched</div>
                </div>
                <div className="bg-slate-100 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-2xl font-bold text-slate-500">{skipped}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Skipped</div>
                </div>
              </div>

              {unmatched > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{unmatched} rows</strong> have customer names that don't exactly match any customer in the system.
                    Use the dropdown in each row to manually assign a customer, or click <strong>Skip</strong> to exclude them.
                    Unmatched rows will still be imported but won't be linked to a customer.
                  </span>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter rows by client, make, model, serial..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Client (Excel)</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Matched Customer</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Make / Model</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Serial #</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Svc</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Ownership</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, idx) => {
                      const realIdx = parsedRows.indexOf(row);
                      const isSkipped = row.matchStatus === 'skipped';
                      return (
                        <tr key={row.rowIndex} className={`transition-colors ${isSkipped ? 'opacity-40 bg-slate-50' : row.matchStatus === 'unmatched' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2 text-slate-400">{row.rowIndex}</td>

                          {/* Client name */}
                          <td className="px-3 py-2 max-w-[140px]">
                            <span className="truncate block text-slate-700">{row.clientName || '—'}</span>
                          </td>

                          {/* Customer dropdown */}
                          <td className="px-3 py-2 min-w-[160px]">
                            {row.matchStatus === 'matched' ? (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[120px]">{customers.find((c) => c._id === row.resolvedCustomerId)?.name || '—'}</span>
                              </span>
                            ) : (
                              <select
                                value={row.resolvedCustomerId || ''}
                                onChange={(e) => reassignCustomer(realIdx, e.target.value)}
                                disabled={isSkipped}
                                className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">— unmatched —</option>
                                {customers.map((c) => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Machine type */}
                          <td className="px-3 py-2 text-slate-600">{row.machineType || '—'}</td>

                          {/* Make / Model */}
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-800">{row.make}</span>
                            <span className="text-slate-400"> / </span>
                            <span className="text-slate-600">{row.model}</span>
                          </td>

                          {/* Serial */}
                          <td className="px-3 py-2 font-mono text-slate-700">{row.serialNumber}</td>

                          {/* Service type */}
                          <td className="px-3 py-2 text-slate-500">
                            {row.rawServiceType === 'date' ? (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Date</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {row.machineHours ?? '?'}h
                              </span>
                            )}
                          </td>

                          {/* Ownership toggle */}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleOwnership(realIdx)}
                              disabled={isSkipped}
                              title="Click to toggle between Customer's Own and ARS Rental"
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                                row.ownershipType === 'ars_rental'
                                  ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {row.ownershipType === 'ars_rental' ? 'ARS Rental' : "Customer's Own"}
                            </button>
                          </td>

                          {/* Action */}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleSkip(realIdx)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                                isSkipped
                                  ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              {isSkipped ? 'Include' : 'Skip'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Cog className="w-5 h-5" /> Ready to import
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-700">{rowsToImport.length}</div>
                    <div className="text-sm text-blue-600">machines to import</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">{rowsToImport.filter((r) => r.matchStatus === 'matched').length}</div>
                    <div className="text-sm text-green-600">linked to a customer</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-500">{skipped}</div>
                    <div className="text-sm text-slate-500">skipped</div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  If a machine with the same serial number already exists for the same customer, it will be <strong>skipped</strong> — existing data will not be changed.
                  Only new machines will be created.
                </span>
              </div>

              {importError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {importError}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && importResult && (
            <div className="space-y-5 text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-slate-800">Import Complete</h3>
                <p className="text-slate-500 mt-1">Your machines have been saved to the database.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-700">{importResult.imported}</div>
                  <div className="text-xs text-green-600">Created</div>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                  <div className="text-2xl font-bold text-slate-600">{importResult.skipped}</div>
                  <div className="text-xs text-slate-500">Skipped (duplicates)</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-700">{importResult.errors.length}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-left max-w-lg mx-auto">
                  <p className="text-sm font-semibold text-red-700 mb-2">Row errors:</p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto text-xs text-red-600">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={step === 'done' ? onClose : step === 'upload' ? onClose : () => setStep(step === 'preview' ? 'upload' : 'preview')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 'done' || step === 'upload' ? 'Close' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <button
                onClick={handleParse}
                disabled={!file || !selectedSheet}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Parse File
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('confirm')}
                disabled={rowsToImport.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Review & Confirm ({rowsToImport.length} rows)
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'confirm' && (
              <button
                onClick={handleImport}
                disabled={importing || rowsToImport.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                ) : (
                  <><Users className="w-4 h-4" /> Import {rowsToImport.length} Machines</>
                )}
              </button>
            )}
            {step === 'done' && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
