import assert from "node:assert/strict";
import {
  compareJobNumbers,
  filterAndSortPartsReady,
  type PartsReadyQueueItem,
} from "./partsReadyQueue.ts";

const items: PartsReadyQueueItem[] = [
  {
    job: {
      _id: "job-b",
      jobNumber: "J10",
      createdAt: "2026-10-01T00:00:00.000Z",
      customer: { name: "Quantum Foods" },
      branch: { _id: "branch-ct", name: "Cape Town" },
    },
    assignments: [
      { _id: "a1", status: "assigned", technician: { _id: "tech-1", name: "Abel" } },
      { _id: "a2", status: "started", technician: { _id: "tech-2", name: "Nico" } },
    ],
  },
  {
    job: {
      _id: "job-a",
      jobNumber: "J2",
      createdAt: "2026-10-03T00:00:00.000Z",
      customer: { name: "Acme Plant" },
      branch: { _id: "branch-jhb", name: "Johannesburg" },
    },
    assignments: [
      { _id: "a3", status: "submitted", technician: { _id: "tech-1", name: "Abel" }, submission: { submittedAt: "2026-10-04" } },
    ],
  },
  {
    job: {
      _id: "job-c",
      jobNumber: "M4",
      createdAt: "2026-09-01T00:00:00.000Z",
      cashCustomer: "Cash Site",
      branch: { _id: "branch-ct", name: "Cape Town" },
    },
    assignments: [],
  },
];

assert.deepEqual(
  ["J10", "J2", "M4"].sort(compareJobNumbers),
  ["J2", "J10", "M4"],
);

const byTech = filterAndSortPartsReady(items, {
  search: "",
  branchId: "",
  technicianId: "tech-1",
  status: "all",
  sortField: "jobNumber",
  sortDirection: "asc",
});
assert.deepEqual(byTech.map((item) => item.job.jobNumber), ["J2", "J10"]);
assert.equal(byTech[1].assignments?.length, 2);

const unassigned = filterAndSortPartsReady(items, {
  search: "cash",
  branchId: "branch-ct",
  technicianId: "unassigned",
  status: "unassigned",
  sortField: "customer",
  sortDirection: "asc",
});
assert.deepEqual(unassigned.map((item) => item.job.jobNumber), ["M4"]);

const startedInCapeTown = filterAndSortPartsReady(items, {
  search: "quantum",
  branchId: "branch-ct",
  technicianId: "tech-2",
  status: "started",
  sortField: "dateAdded",
  sortDirection: "desc",
});
assert.deepEqual(startedInCapeTown.map((item) => item.job.jobNumber), ["J10"]);
assert.equal(startedInCapeTown[0].assignments?.length, 2);

const wrongPair = filterAndSortPartsReady(items, {
  search: "",
  branchId: "",
  technicianId: "tech-1",
  status: "started",
  sortField: "jobNumber",
  sortDirection: "asc",
});
assert.deepEqual(wrongPair.map((item) => item.job.jobNumber), []);

console.log("parts ready queue checks passed");
