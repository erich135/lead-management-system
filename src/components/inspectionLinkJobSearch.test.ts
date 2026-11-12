import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { inspectionLinkJobSearch } from './InspectionReports';

const dialogSource = readFileSync(fileURLToPath(new URL('./InspectionReports.tsx', import.meta.url)), 'utf8');
const jobsScreenSource = readFileSync(fileURLToPath(new URL('./LeadsList.tsx', import.meta.url)), 'utf8');
const jobsApiSource = readFileSync(fileURLToPath(new URL('../lib/api.ts', import.meta.url)), 'utf8');
const jobsControllerSource = readFileSync(
  fileURLToPath(new URL('../../../../apps/ars-app-backend/src/controllers/job.controller.ts', import.meta.url)),
  'utf8',
);
const inspectionControllerSource = readFileSync(
  fileURLToPath(new URL('../../../../apps/ars-app-backend/src/controllers/inspection.controller.ts', import.meta.url)),
  'utf8',
);

function getJobsSource(): string {
  const start = jobsControllerSource.indexOf('export const getJobs');
  const end = jobsControllerSource.indexOf('export const getJobStats');
  return jobsControllerSource.slice(start, end);
}

describe('inspection link job search', () => {
  it('searches the existing jobs API across all dates by job number', () => {
    const query = inspectionLinkJobSearch('  L03569  ');
    expect(query).toEqual({ search: 'L03569', limit: 20, allTime: 'true' });
    expect(query).not.toHaveProperty('startDate');
    expect(query).not.toHaveProperty('endDate');
    expect(query).not.toHaveProperty('status');
    expect(query).not.toHaveProperty('includeHidden');
    expect(query).not.toHaveProperty('customer');
    expect(query).not.toHaveProperty('page');
  });

  it('keeps the first page size of the existing dialog', () => {
    expect(inspectionLinkJobSearch('L03569').limit).toBe(20);
    expect(dialogSource).toContain('void getJobs(inspectionLinkJobSearch(jobSearch))');
    expect(dialogSource).toContain('found.jobs');
  });

  it('sends allTime through the existing jobs request and leaves the Jobs screen request unchanged', () => {
    expect(jobsApiSource).toContain("if (params?.allTime) queryParams.append('allTime', params.allTime);");
    expect(jobsApiSource).toContain('return apiRequest(`/api/jobs${query ? `?${query}` : \'\'}`);');
    expect(jobsScreenSource).toContain("allTime: 'true'");
    expect(jobsScreenSource).toContain('limit: 50');
    expect(jobsScreenSource).not.toContain('inspectionLinkJobSearch');
  });

  it('keeps a December 2025 job outside the default three-month window and inside an all-time search', () => {
    const now = new Date(2026, 10, 12);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const historicalStart = new Date(2025, 11, 11);
    expect(historicalStart < threeMonthsAgo).toBe(true);
    expect(historicalStart > endOfCurrentMonth).toBe(false);
    const getJobs = getJobsSource();
    expect(getJobs).toContain('if (!allTime && !startDate && !endDate)');
    expect(getJobs).toContain('const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);');
    expect(getJobs).not.toContain('Invoiced');
    expect(getJobs).toContain('isHidden: true');
    expect(getJobs).toContain('filter.status = { $nin: hiddenStatusIds }');
    expect(getJobs).toContain('await applyJobVisibilityFilter(req.user?.id, filter);');
    expect(getJobs).toContain('{ jobNumber: { $regex: search as string, $options: "i" } }');
    expect(getJobs).toContain('page: pageNum');
    expect(getJobs).toContain('limit: limitNum');
  });

  it('leaves the existing inspection link and its 409 protection unchanged', () => {
    expect(dialogSource).toContain('await linkInspectionJob(linkTarget._id, selectedJob._id)');
    const link = inspectionControllerSource.slice(
      inspectionControllerSource.indexOf('export const confirmFollowUp'),
      inspectionControllerSource.indexOf('export const retryInspectionAttachment'),
    );
    expect(link).toContain('inspection.followUpJob = job._id');
    expect(link).toContain('This inspection is already linked to a different job');
    expect(link).toContain('409');
    expect(link).not.toContain('allTime');
  });
});
