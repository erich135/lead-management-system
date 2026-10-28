/**
 * Photo helpers for job card reports: which questions are Photo questions, how many
 * photographs each one expects and has received, and the wording used on screen and in print.
 * Pure functions only, so the office view, the printed report and the print fixtures agree.
 */
import type { JobCardPhotoReport } from '../lib/api';

/** Loading state of one authenticated photograph. */
export type PhotoImageStatus = 'loading' | 'loaded' | 'error';

export interface PhotoImageState {
  status: PhotoImageStatus;
  /** Object URL for a loaded photograph. */
  url?: string;
}

/** Everything a report renderer needs to show photographs. Absent for reports without photos. */
export interface JobCardPhotoRenderData {
  report: JobCardPhotoReport;
  /** Image state keyed by clientPhotoId. */
  images: Record<string, PhotoImageState>;
  /** Opens a photograph in the lightbox (screen only; omitted for static renders). */
  onOpen?: (photo: { url: string; caption: string }) => void;
}

interface PhotoFieldLike {
  id: string;
  label: string;
  type: string;
  visible?: boolean;
}

interface PhotoSectionLike {
  id: string;
  title: string;
  type: string;
  fields?: PhotoFieldLike[];
}

export interface PhotoQuestionGroup {
  questionId: string;
  label: string;
  expected: number;
  received: number;
  missing: number;
  photos: Array<{ clientPhotoId: string; received: boolean }>;
}

/** True for a Photo question. */
export function isPhotoField(field: { type?: string } | null | undefined): boolean {
  return field?.type === 'photo';
}

/** True when a section is a questions section that holds at least one Photo question. */
export function sectionHasPhotoFields(section: PhotoSectionLike | null | undefined): boolean {
  return Boolean(section && section.type === 'fields' && section.fields?.some(isPhotoField));
}

/** Questions of a section that are not Photo questions. */
export function nonPhotoFields<T extends { type?: string }>(fields: T[] | undefined): T[] {
  return (fields || []).filter((field) => !isPhotoField(field));
}

/**
 * The photograph groups to show for the given Photo questions: only questions that expect or
 * hold at least one photograph, so a submission without photos shows nothing.
 */
export function buildPhotoGroups(
  fields: PhotoFieldLike[] | undefined,
  report: JobCardPhotoReport | undefined
): PhotoQuestionGroup[] {
  if (!report?.hasManifest) return [];
  const groups: PhotoQuestionGroup[] = [];
  for (const field of fields || []) {
    if (!isPhotoField(field)) continue;
    const entry = report.questions.find((question) => question.questionId === field.id);
    if (!entry || (entry.expected <= 0 && entry.received <= 0)) continue;
    groups.push({
      questionId: field.id,
      label: field.label,
      expected: entry.expected,
      received: entry.received,
      missing: entry.missing,
      photos: entry.photos.map((photo) => ({
        clientPhotoId: photo.clientPhotoId,
        received: photo.received,
      })),
    });
  }
  return groups;
}

/** Photograph groups for one section, in question order. */
export function buildSectionPhotoGroups(
  section: PhotoSectionLike,
  report: JobCardPhotoReport | undefined
): PhotoQuestionGroup[] {
  return buildPhotoGroups(section.fields, report);
}

/** "2 of 4 photographs received". */
export function photoCountText(received: number, expected: number): string {
  return `${received} of ${expected} ${expected === 1 ? 'photograph' : 'photographs'} received`;
}

/** Count text for a group, flagged when photographs are still outstanding. */
export function photoGroupText(group: Pick<PhotoQuestionGroup, 'received' | 'expected' | 'missing'>): string {
  const base = photoCountText(group.received, group.expected);
  return group.missing > 0 ? `${base} - incomplete` : base;
}

/** Message for the whole submission when photographs are outstanding, otherwise null. */
export function photoIncompleteMessage(report: JobCardPhotoReport | undefined): string | null {
  if (!report?.hasManifest || report.complete || report.missingTotal <= 0) return null;
  return `Photographs incomplete: ${photoCountText(report.receivedTotal, report.expectedTotal)}.`;
}

/** Ids of every received photograph in the report. */
export function receivedPhotoIds(report: JobCardPhotoReport | undefined): string[] {
  if (!report?.hasManifest) return [];
  return report.questions.flatMap((question) =>
    question.photos.filter((photo) => photo.received).map((photo) => photo.clientPhotoId)
  );
}

/** How many received photographs are still loading / failed to load. */
export function photoLoadCounts(
  report: JobCardPhotoReport | undefined,
  images: Record<string, PhotoImageState>
): { total: number; loading: number; failed: number } {
  const ids = receivedPhotoIds(report);
  let loading = 0;
  let failed = 0;
  for (const id of ids) {
    const status = images[id]?.status ?? 'loading';
    if (status === 'loading') loading += 1;
    else if (status === 'error') failed += 1;
  }
  return { total: ids.length, loading, failed };
}

/**
 * Splits the template's Photo sections for the fixed paper layouts (Mechanical Checklist and
 * Repair Status Report), which have no slot for arbitrary sections. Photo sections that sit
 * straight after Job Information stay there; the rest print just before the sign-off block.
 */
export function partitionPhotoSections<T extends PhotoSectionLike>(
  sections: T[] | undefined
): { afterHeader: T[]; beforeSignOff: T[] } {
  const afterHeader: T[] = [];
  const beforeSignOff: T[] = [];
  let onlyPhotoSectionsSoFar = true;
  for (const section of sections || []) {
    if (section.type === 'header') continue;
    if (section.type === 'signatures') break;
    if (sectionHasPhotoFields(section)) {
      (onlyPhotoSectionsSoFar ? afterHeader : beforeSignOff).push(section);
    } else {
      onlyPhotoSectionsSoFar = false;
    }
  }
  return { afterHeader, beforeSignOff };
}