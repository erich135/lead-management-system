import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  linkInspectionJob,
  listInspections,
  openInspectionPrint,
  retryInspectionAttachment,
  type InspectionListItem,
  getJobs,
} from '../lib/api';

/**
 * Office list of submitted inspections. Creating a job uses the existing job form fields and numbering.
 */
export function InspectionReports() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [message, setMessage] = useState('');

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

  const createFollowUp = (inspection: InspectionListItem) => {
    if (inspection.followUpJob?._id) {
      setMessage(`Already linked to ${inspection.followUpJob.jobNumber || 'a job'}. Open that job to print the inspection.`);
      return;
    }
    navigate(`/jobs?inspection=${inspection._id}`);
  };

  const linkExisting = async (inspection: InspectionListItem) => {
    const jobNumber = window.prompt('Existing job number to link');
    if (!jobNumber) return;
    const found = await getJobs({ search: jobNumber.trim(), limit: 5 });
    const job = found.jobs.find((item) => item.jobNumber?.toLowerCase() === jobNumber.trim().toLowerCase()) || found.jobs[0];
    if (!job) {
      setMessage('No matching job was found.');
      return;
    }
    await linkInspectionJob(inspection._id, job._id);
    setMessage(`Linked inspection ${inspection.referenceNumber} to ${job.jobNumber}. The job was not marked complete.`);
    await load();
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
                <td className="py-2 space-x-2">
                  <button type="button" className="text-[#0969a9] font-semibold" onClick={() => void openInspectionPrint(inspection._id)}>
                    View & Print
                  </button>
                  <button type="button" className="text-[#383838] font-semibold" onClick={() => createFollowUp(inspection)}>
                    Create job
                  </button>
                  <button type="button" className="text-[#383838] font-semibold" onClick={() => void linkExisting(inspection)}>
                    Link job
                  </button>
                  {inspection.attachmentPending ? (
                    <button type="button" className="text-amber-800 font-semibold" onClick={() => void retryInspectionAttachment(inspection._id).then(load)}>
                      Retry attachment
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
