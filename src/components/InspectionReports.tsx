import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  archiveInspection,
  linkInspectionJob,
  listInspections,
  openInspectionPrint,
  restoreInspection,
  retryInspectionAttachment,
  uploadOfficeInspectionPhoto,
  type InspectionListItem,
  getJobs,
  type Job,
} from '../lib/api';

function inspectionPhotosPending(inspection: InspectionListItem): boolean {
  if (inspection.photosPending) return true;
  const expected = inspection.expectedPhotoCount || 0;
  const received = inspection.photoCount ?? inspection.photos?.length ?? 0;
  return expected > 0 && received < expected;
}

function inspectionMachineLabel(inspection: InspectionListItem): string {
  if (inspection.machineNotListed) return 'Machine not listed';
  const snapshot = inspection.machineSnapshot;
  if (!snapshot) return '';
  const name = [snapshot.make, snapshot.model].filter(Boolean).join(' ');
  const identity = [
    snapshot.serialNumber ? `Serial ${snapshot.serialNumber}` : '',
    snapshot.assetNumber ? `Asset ${snapshot.assetNumber}` : '',
  ].filter(Boolean);
  return [name, ...identity].filter(Boolean).join(' · ');
}

/**
 * Office list of submitted inspections. Creating a job uses the existing job form fields and numbering.
 */
function formatOfficeDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
}

export function InspectionReports({ archived = false }: { archived?: boolean }) {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState<'' | 'yes' | 'no'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<InspectionListItem | null>(null);
  const [linkTarget, setLinkTarget] = useState<InspectionListItem | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [jobResults, setJobResults] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [linking, setLinking] = useState(false);
  const [createTarget, setCreateTarget] = useState<InspectionListItem | null>(null);

  const load = async () => {
    try {
      const result = await listInspections({
        search: search.trim(),
        linked,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
        to: to ? new Date(`${to}T23:59:59`).toISOString() : '',
        page,
        officeArchived: archived ? 'only' : 'exclude',
        sortBy: 'date',
        sortOrder: 'desc',
      });
      setInspections(result.inspections || []);
      setTotal(result.pagination?.total || result.inspections?.length || 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inspections could not be loaded');
    }
  };

  useEffect(() => {
    void load();
  }, [archived, page, linked, from, to, search]);

  useEffect(() => {
    if (!linkTarget) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setJobsLoading(true);
      void getJobs({ search: jobSearch.trim(), limit: 20 })
        .then((found) => {
          if (!cancelled) setJobResults(found.jobs || []);
        })
        .catch(() => {
          if (!cancelled) setJobResults([]);
        })
        .finally(() => {
          if (!cancelled) setJobsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [jobSearch, linkTarget]);

  const createFollowUp = (inspection: InspectionListItem) => {
    if (inspection.followUpJob?._id) {
      setMessage(`Already linked to ${inspection.followUpJob.jobNumber || 'a job'}. Open that job to print the inspection.`);
      return;
    }
    setCreateTarget(inspection);
  };

  const confirmCreate = () => {
    if (!createTarget) return;
    const inspectionId = createTarget._id;
    setCreateTarget(null);
    navigate(`/jobs?inspection=${inspectionId}`);
  };

  const openLink = (inspection: InspectionListItem) => {
    setLinkTarget(inspection);
    setJobSearch('');
    setSelectedJob(null);
    setJobResults([]);
  };

  const closeLink = () => {
    if (linking) return;
    setLinkTarget(null);
    setSelectedJob(null);
    setJobSearch('');
  };

  const confirmLink = async () => {
    if (!linkTarget || !selectedJob) return;
    setLinking(true);
    try {
      await linkInspectionJob(linkTarget._id, selectedJob._id);
      setMessage(`Linked inspection ${linkTarget.referenceNumber} to ${selectedJob.jobNumber}. The job was not marked complete.`);
      setLinkTarget(null);
      setSelectedJob(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The job could not be linked.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-[#383838] mb-2">{archived ? 'Archived inspections' : 'Inspections'}</h2>
      <p className="text-sm text-slate-600 mb-4">
        {archived
          ? 'Archived inspections keep their answers, signatures, photos and linked jobs.'
          : 'Submitted inspections stay here even if no follow-up job is created.'}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search reference, customer, serial or asset" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={linked} onChange={(event) => { setPage(1); setLinked(event.target.value as '' | 'yes' | 'no'); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Linked and not linked</option>
          <option value="yes">Linked to a job</option>
          <option value="no">Not linked</option>
        </select>
        <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} aria-label="Submitted from" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} aria-label="Submitted to" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" className="text-sm font-semibold text-[#0969a9]" onClick={() => { setSearch(''); setLinked(''); setFrom(''); setTo(''); setPage(1); }}>Clear filters</button>
        <span className="text-sm text-slate-500">{total} matching</span>
      </div>
      {message ? <p className="text-sm mb-3 text-[#075a8f]">{message}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Inspection</th>
              <th>Customer / site</th>
              <th>Reporter</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => (
              <tr key={inspection._id} className="border-t border-slate-100">
                <td className="py-2 font-semibold">{inspection.referenceNumber || 'Inspection'}</td>
                <td>
                  <div>{inspection.customer?.name || inspection.siteLabel}</div>
                  {inspectionMachineLabel(inspection) ? (
                    <div className="text-xs text-slate-500">{inspectionMachineLabel(inspection)}</div>
                  ) : null}
                </td>
                <td>{`${inspection.reporter?.firstName || ''} ${inspection.reporter?.lastName || ''}`.trim()}</td>
                <td>{formatOfficeDate(inspection.serverReceivedAt)}</td>
                <td className="py-2">
                  <div className="flex flex-wrap items-center gap-8">
                    <button type="button" className="text-[#0969a9] font-semibold" onClick={() => void openInspectionPrint(inspection._id)}>
                      View & Print
                    </button>
                    {archived ? (
                      <button type="button" className="text-[#383838] font-semibold" onClick={() => void restoreInspection(inspection._id).then(load)}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <button type="button" className="text-[#383838] font-semibold" onClick={() => createFollowUp(inspection)}>
                          Create job
                        </button>
                        <button type="button" className="text-[#383838] font-semibold" onClick={() => openLink(inspection)}>
                          Link job
                        </button>
                        <button type="button" className="text-[#383838] font-semibold" onClick={() => setArchiveTarget(inspection)}>
                          Archive
                        </button>
                        <label className="text-[#0969a9] font-semibold cursor-pointer">
                          Add photos
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (!file) return;
                              void uploadOfficeInspectionPhoto(inspection._id, file)
                                .then(() => {
                                  setMessage(`Photo attached to ${inspection.referenceNumber || 'the inspection'}.`);
                                  return load();
                                })
                                .catch((error) => setMessage(error instanceof Error ? error.message : 'The photo could not be attached'));
                            }}
                          />
                        </label>
                      </>
                    )}
                    {inspectionPhotosPending(inspection) ? (
                      <span className="text-xs font-semibold text-amber-800">Photos still need uploading</span>
                    ) : null}
                    {inspection.attachmentPending ? (
                      <button type="button" className="text-amber-800 font-semibold" onClick={() => void retryInspectionAttachment(inspection._id).then(load)}>
                        Retry attachment
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button type="button" disabled={page <= 1} className="font-semibold disabled:opacity-40" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={inspections.length < 25} className="font-semibold disabled:opacity-40" onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
      {archiveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold">Archive {archiveTarget.referenceNumber || 'this inspection'}?</h3>
            <p className="mt-2 text-sm text-slate-600">It leaves the active list and stays available under Archived, with its status, answers, signatures, photos and linked job kept. Restore it before creating or linking a new job.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="rounded-lg bg-[#f7c12b] px-4 py-2 text-sm font-bold" onClick={() => void archiveInspection(archiveTarget._id).then(() => { setArchiveTarget(null); setMessage('Inspection archived.'); return load(); })}>Archive</button>
            </div>
          </div>
        </div>
      ) : null}

      {createTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] px-6 py-4 text-white">
              <h3 className="text-lg font-bold">Create a job</h3>
              <p className="text-sm text-white/90">
                {createTarget.referenceNumber || 'Inspection'} · {createTarget.customer?.name || createTarget.siteLabel}
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#383838]">Are you sure you want to create a job</p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-[#383838] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCreate}
                  className="rounded-lg bg-[#f7c12b] px-4 py-2 text-sm font-bold text-[#383838]"
                >
                  Create job
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {linkTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="rounded-t-2xl bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] px-6 py-4 text-white">
              <h3 className="text-lg font-bold">Link an existing job</h3>
              <p className="text-sm text-white/90">
                {linkTarget.referenceNumber || 'Inspection'} · {linkTarget.customer?.name || linkTarget.siteLabel}
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-600 mb-2" htmlFor="inspection-job-search">
                Search job number
              </label>
              <input
                id="inspection-job-search"
                autoFocus
                value={jobSearch}
                onChange={(event) => {
                  setJobSearch(event.target.value);
                  setSelectedJob(null);
                }}
                placeholder="Type a job number, customer, or site"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]"
              />
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                {jobsLoading ? <p className="px-3 py-3 text-sm text-slate-500">Searching jobs…</p> : null}
                {!jobsLoading && jobResults.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">No jobs match that search.</p>
                ) : null}
                {jobResults.map((job) => {
                  const selected = selectedJob?._id === job._id;
                  const customer = job.customer?.name || job.cashCustomer || 'No customer name';
                  return (
                    <button
                      key={job._id}
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 ${
                        selected ? 'bg-[#e8f4fc]' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        <span className="block font-semibold text-[#383838]">{job.jobNumber}</span>
                        <span className="block text-sm text-slate-600">{customer}</span>
                      </span>
                      {job.status?.name ? <span className="text-xs text-slate-500">{job.status.name}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLink}
                  disabled={linking}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-[#383838] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmLink()}
                  disabled={!selectedJob || linking}
                  className="rounded-lg bg-[#f7c12b] px-4 py-2 text-sm font-bold text-[#383838] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {linking ? 'Linking…' : 'Link job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
