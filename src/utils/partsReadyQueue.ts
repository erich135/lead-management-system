export interface PartsReadyQueueAssignment {
  _id?: string;
  status?: string;
  assignedAt?: string;
  technician?: { _id?: string; name?: string } | null;
  submission?: { submittedAt?: string } | null;
}

export interface PartsReadyQueueJob {
  _id?: string;
  jobNumber?: string;
  createdAt?: string | Date;
  startDate?: string | Date;
  cashCustomer?: string;
  customer?: { name?: string } | string | null;
  branch?: { _id?: string; name?: string } | string | null;
  bookings?: Array<{ technicianId?: string; technicianName?: string }>;
}

export interface PartsReadyQueueItem {
  job: PartsReadyQueueJob;
  assignment?: PartsReadyQueueAssignment | null;
  assignments?: PartsReadyQueueAssignment[];
}

export type PartsReadySortField = "jobNumber" | "customer" | "dateAdded";
export type PartsReadySortDirection = "asc" | "desc";
export type PartsReadyStatusFilter = "all" | "unassigned" | "assigned" | "started" | "submitted";

export interface PartsReadyFilters {
  search: string;
  branchId: string;
  technicianId: string;
  status: PartsReadyStatusFilter;
  sortField: PartsReadySortField;
  sortDirection: PartsReadySortDirection;
}

export const EMPTY_PARTS_READY_FILTERS: PartsReadyFilters = {
  search: "",
  branchId: "",
  technicianId: "",
  status: "all",
  sortField: "dateAdded",
  sortDirection: "desc",
};

function assignmentsOf(item: PartsReadyQueueItem): PartsReadyQueueAssignment[] {
  if (item.assignments && item.assignments.length > 0) return item.assignments;
  if (item.assignment) return [item.assignment];
  return [];
}

export function partsReadyCustomerName(job: PartsReadyQueueJob): string {
  const customer = job.customer;
  if (customer && typeof customer === "object" && customer.name) return customer.name;
  return job.cashCustomer || "";
}

export function partsReadyBranchId(job: PartsReadyQueueJob): string {
  const branch = job.branch;
  if (!branch) return "";
  if (typeof branch === "string") return branch;
  return branch._id || "";
}

export function partsReadyDateAdded(job: PartsReadyQueueJob): number {
  const raw = job.createdAt || job.startDate;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * J2 sorts before J10. The letter prefix stays ahead of the number.
 */
export function compareJobNumbers(left: string, right: string): number {
  const parse = (value: string) => {
    const match = value.trim().match(/^([A-Za-z]*)(\d+)(.*)$/);
    if (!match) return { prefix: value.toLowerCase(), number: Number.POSITIVE_INFINITY, rest: value.toLowerCase() };
    return {
      prefix: match[1].toLowerCase(),
      number: Number(match[2]),
      rest: match[3].toLowerCase(),
    };
  };
  const a = parse(left);
  const b = parse(right);
  if (a.prefix !== b.prefix) return a.prefix < b.prefix ? -1 : 1;
  if (a.number !== b.number) return a.number - b.number;
  if (a.rest !== b.rest) return a.rest < b.rest ? -1 : 1;
  return 0;
}

function assignmentMatchesTechnician(
  assignment: PartsReadyQueueAssignment | undefined,
  technicianId: string,
): boolean {
  if (!technicianId) return true;
  const assignedId = assignment?.technician?._id || "";
  if (technicianId === "unassigned") return !assignedId;
  return assignedId === technicianId;
}

function assignmentMatchesStatus(
  assignment: PartsReadyQueueAssignment | undefined,
  status: PartsReadyStatusFilter,
): boolean {
  if (status === "all") return true;
  if (status === "unassigned") return !assignment;
  if (assignment?.submission || assignment?.status === "submitted") return status === "submitted";
  return assignment?.status === status;
}

/**
 * A job stays whole. One matching form keeps the job, including its other forms.
 */
export function filterAndSortPartsReady<T extends PartsReadyQueueItem>(
  items: T[],
  filters: PartsReadyFilters,
): T[] {
  const search = filters.search.trim().toLowerCase();
  const matched = items.filter((item) => {
    if (search) {
      const jobNumber = (item.job.jobNumber || "").toLowerCase();
      const customer = partsReadyCustomerName(item.job).toLowerCase();
      if (!jobNumber.includes(search) && !customer.includes(search)) return false;
    }
    if (filters.branchId && partsReadyBranchId(item.job) !== filters.branchId) return false;

    const forms = assignmentsOf(item);
    const formsToTest = forms.length > 0 ? forms : [undefined];
    return formsToTest.some(
      (form) =>
        assignmentMatchesTechnician(form, filters.technicianId) &&
        assignmentMatchesStatus(form, filters.status),
    );
  });

  const direction = filters.sortDirection === "asc" ? 1 : -1;
  return [...matched].sort((left, right) => {
    let result = 0;
    if (filters.sortField === "jobNumber") {
      result = compareJobNumbers(left.job.jobNumber || "", right.job.jobNumber || "");
    } else if (filters.sortField === "customer") {
      result = partsReadyCustomerName(left.job).localeCompare(partsReadyCustomerName(right.job));
    } else {
      result = partsReadyDateAdded(left.job) - partsReadyDateAdded(right.job);
    }
    if (result === 0) result = compareJobNumbers(left.job.jobNumber || "", right.job.jobNumber || "");
    return result * direction;
  });
}
