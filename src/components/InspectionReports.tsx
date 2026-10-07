import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  linkInspectionJob,
  listInspections,
  openInspectionPrint,
  retryInspectionAttachment,
  type InspectionListItem,
  getJobs,
  type Job,
} from '../lib/api';

/**
 * Office list of submitted inspections. Creating a job uses the existing job form fields and numbering.
 */
export function InspectionReports() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [message, setMessage] = useState('');
  const [linkTarget, setLinkTarget] = useState<InspectionListItem | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [jobResults, setJobResults] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [linking, setLinking] = useState(false);
  const [createTarget, setCreateTarget] = useState<InspectionListItem | null>(null);

  const load = async () => {
    try {
      const result = await listInspections();
      setInspections(result.inspections || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inspections could not be loaded');
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
      <h2 className="text-xl font-bold text-[#383838] mb-2">Inspections</h2>
      <p className="text-sm text-slate-600 mb-4">Submitted inspections stay here even if no follow-up job is created.</p>
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
                <td>{inspection.customer?.name || inspection.siteLabel}</td>
                <td>{`${inspection.reporter?.firstName || ''} ${inspection.reporter?.lastName || ''}`.trim()}</td>
                <td>{new Date(inspection.serverReceivedAt).toLocaleString()}</td>
                <td className="py-2">
                  <div className="flex flex-wrap items-center gap-8">
                    <button type="button" className="text-[#0969a9] font-semibold" onClick={() => void openInspectionPrint(inspection._id)}>
                      View & Print
                    </button>
                    <button type="button" className="text-[#383838] font-semibold" onClick={() => createFollowUp(inspection)}>
                      Create job
                    </button>
                    <button type="button" className="text-[#383838] font-semibold" onClick={() => openLink(inspection)}>
                      Link job
                    </button>
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
