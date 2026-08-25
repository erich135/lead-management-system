/**
 * Visit published-form selection helpers.
 * Generic Site Visit appointments choose RFC / Loan and Rental / New Service Level
 * plus any published custom General Visit forms after Start Visit.
 * Typed appointments keep their scheduled form.
 */

import type { SalesRequestType } from '../../lib/api';
import { appointmentTypeToPlannerFormType, appointmentTypeToSalesRequestType } from './diaryUtils';

export const VISIT_SYSTEM_PLANNER_FORM_TYPES = ['rfc', 'loan_rental', 'new_service_level'] as const;

export type VisitSystemPlannerFormType = (typeof VISIT_SYSTEM_PLANNER_FORM_TYPES)[number];

export type VisitWorkspaceTab =
  | 'rfc'
  | 'loan_rental'
  | 'new_service_level'
  | 'general_visit'
  | 'notes';

export const VISIT_CHOOSER_FORM_OPTIONS: Array<{
  type: VisitSystemPlannerFormType;
  title: string;
  description: string;
}> = [
  {
    type: 'rfc',
    title: 'RFC',
    description: 'Request for costing captured during the customer visit.',
  },
  {
    type: 'loan_rental',
    title: 'Loan and Rental',
    description: 'Loan and rental unit request captured during the visit.',
  },
  {
    type: 'new_service_level',
    title: 'New Service Level',
    description: 'New service level agreement details captured on site.',
  },
];

/**
 * Returns true when the value is one of the three supported visit system forms.
 */
export function isVisitSystemPlannerFormType(
  value?: string | null,
): value is VisitSystemPlannerFormType {
  return (
    value === 'rfc' || value === 'loan_rental' || value === 'new_service_level'
  );
}

/**
 * Returns true when the value is a custom General Visit planner slug.
 */
export function isGeneralVisitPlannerFormType(value?: string | null): boolean {
  return typeof value === 'string' && /^general_visit_[a-z0-9_]+$/.test(value);
}

/**
 * Returns true when the value can be restored as the visit's selected published form.
 */
export function isVisitChooserPlannerFormType(value?: string | null): boolean {
  return isVisitSystemPlannerFormType(value) || isGeneralVisitPlannerFormType(value);
}

/**
 * Maps a selected published planner form to the sales-request type used on submit.
 */
export function plannerFormTypeToSalesRequestType(
  value?: string | null,
): SalesRequestType | null {
  if (value === 'rfc') return 'rfc';
  if (value === 'loan_rental') return 'loan_rental';
  if (value === 'new_service_level') return 'rfc_new_service_level';
  if (isGeneralVisitPlannerFormType(value)) return 'general_visit';
  return null;
}

/**
 * Resolves the published planner form that this visit should load.
 * An explicit selection (generic Visit chooser) wins over appointment type.
 */
export function resolveVisitPlannerFormType(
  appointmentType?: string,
  selectedPlannerFormType?: string | null,
): string | null {
  if (isVisitChooserPlannerFormType(selectedPlannerFormType)) {
    return selectedPlannerFormType as string;
  }
  const fromAppointment = appointmentTypeToPlannerFormType(appointmentType);
  return isVisitSystemPlannerFormType(fromAppointment) ? fromAppointment : null;
}

/**
 * Resolves the sales-request type for submit.
 * Typed loan/rental appointments keep loan vs rental; generic Visit uses the chosen form.
 */
export function resolveVisitSalesRequestType(
  appointmentType?: string,
  plannerFormType?: string | null,
): SalesRequestType | null {
  if (isGeneralVisitPlannerFormType(plannerFormType)) {
    return 'general_visit';
  }
  const fromAppointment = appointmentTypeToSalesRequestType(appointmentType);
  if (fromAppointment) return fromAppointment;
  return plannerFormTypeToSalesRequestType(plannerFormType);
}

/**
 * Returns true when a generic Visit must choose a published form before notes/photos.
 * Completed / pending-approval visits do not reopen the chooser.
 */
export function visitNeedsPublishedFormChooser(options: {
  appointmentType?: string;
  appointmentStatus?: string;
  attended?: boolean;
  selectedPlannerFormType?: string | null;
}): boolean {
  const status = options.appointmentStatus;
  const isClosed =
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'pending_approval';
  if (isClosed) return false;
  if (options.attended && status !== 'in_progress' && status !== 'rejected') {
    return false;
  }
  return (
    resolveVisitPlannerFormType(
      options.appointmentType,
      options.selectedPlannerFormType,
    ) === null
  );
}

/**
 * Returns whether the visit workspace should show notes, photos, and the finish/submit bar.
 */
export function visitAllowsNotesPhotosAndSubmit(options: {
  appointmentType?: string;
  appointmentStatus?: string;
  attended?: boolean;
  selectedPlannerFormType?: string | null;
  hasLoadedSheetForm: boolean;
}): boolean {
  if (visitNeedsPublishedFormChooser(options)) return false;
  if (
    resolveVisitPlannerFormType(
      options.appointmentType,
      options.selectedPlannerFormType,
    ) &&
    !options.hasLoadedSheetForm
  ) {
    return false;
  }
  return true;
}

export type VisitStartActionLabel = 'Start Visit' | 'Resume Visit';

/**
 * Dashboard / detail CTA: Resume when the visit is already in progress or a session exists.
 */
export function getVisitStartActionLabel(options: {
  appointmentStatus?: string;
  hasVisitSession?: boolean;
}): VisitStartActionLabel {
  if (options.appointmentStatus === 'in_progress' || options.hasVisitSession) {
    return 'Resume Visit';
  }
  return 'Start Visit';
}

export interface PublishedVisitFormMeta {
  type: string;
  name?: string;
  title?: string;
  description?: string;
  version?: number;
  formCategory?: string;
  displayOrder?: number;
  id?: string;
}

/**
 * Keeps the three system forms in RFC → Loan and Rental → New Service Level order,
 * then appends published custom General Visit forms. Draft/custom_* entries stay out.
 */
export function filterVisitChooserPublishedForms(
  forms: PublishedVisitFormMeta[] | undefined | null,
): PublishedVisitFormMeta[] {
  const byType = new Map(
    (forms || [])
      .filter((form) => isVisitSystemPlannerFormType(form.type))
      .map((form) => [form.type, form] as const),
  );
  const systemForms = VISIT_CHOOSER_FORM_OPTIONS.map((option) => {
    const published = byType.get(option.type);
    return {
      type: option.type,
      name: published?.name || option.title,
      title: published?.title || option.title,
      description: published?.description || option.description,
      version: published?.version,
      formCategory: 'system',
      displayOrder: published?.displayOrder,
      id: published?.id,
    };
  });

  const generalVisitForms = (forms || [])
    .filter(
      (form) =>
        isGeneralVisitPlannerFormType(form.type) || form.formCategory === 'general_visit',
    )
    .filter((form) => !isVisitSystemPlannerFormType(form.type))
    .sort((left, right) => {
      const order =
        (left.displayOrder ?? 100) - (right.displayOrder ?? 100);
      if (order !== 0) return order;
      return (left.title || left.name || left.type).localeCompare(
        right.title || right.name || right.type,
      );
    })
    .map((form) => ({
      type: form.type,
      name: form.name || form.title || 'General Visit',
      title: form.title || form.name || 'General Visit',
      description: form.description || 'Custom General Visit form.',
      version: form.version,
      formCategory: 'general_visit',
      displayOrder: form.displayOrder,
      id: form.id,
    }));

  return [...systemForms, ...generalVisitForms];
}

export type VisitWorkspaceSurface =
  | 'chooser'
  | 'chooser_error'
  | 'form_loading'
  | 'form_error'
  | 'workspace';

/**
 * Resolves which visit surface to show so notes/photos cannot appear before a form is ready.
 */
export function resolveVisitWorkspaceSurface(options: {
  appointmentType?: string;
  appointmentStatus?: string;
  attended?: boolean;
  selectedPlannerFormType?: string | null;
  hasLoadedSheetForm: boolean;
  chooserError?: string | null;
  templateLoadError?: string | null;
}): VisitWorkspaceSurface {
  if (visitNeedsPublishedFormChooser(options)) {
    return options.chooserError ? 'chooser_error' : 'chooser';
  }
  const plannerType = resolveVisitPlannerFormType(
    options.appointmentType,
    options.selectedPlannerFormType,
  );
  if (plannerType && options.templateLoadError) return 'form_error';
  if (plannerType && !options.hasLoadedSheetForm) return 'form_loading';
  return 'workspace';
}

export type VisitPrimaryActionLabel =
  | 'Submit for Approval'
  | 'Finish Visit'
  | 'Save Changes & Return to History';

/**
 * Primary footer action. Returns null while the chooser or unpublished template is showing.
 */
export function getVisitPrimaryActionLabel(options: {
  allowsNotesPhotosAndSubmit: boolean;
  hasLoadedSheetForm: boolean;
  isEditingCompletedVisit?: boolean;
}): VisitPrimaryActionLabel | null {
  if (!options.allowsNotesPhotosAndSubmit) return null;
  if (options.isEditingCompletedVisit) return 'Save Changes & Return to History';
  if (options.hasLoadedSheetForm) return 'Submit for Approval';
  return 'Finish Visit';
}

/**
 * Retry-safe draft write: reuse an existing draft id instead of creating another request.
 */
export function resolveSalesRequestDraftWrite(
  sessionSalesRequestId?: string | null,
  editableRequestId?: string | null,
): { action: 'update'; id: string } | { action: 'create' } {
  const id = sessionSalesRequestId || editableRequestId;
  if (id) return { action: 'update', id };
  return { action: 'create' };
}

export function plannerFormTypeToVisitTab(plannerFormType: string): VisitWorkspaceTab {
  if (plannerFormType === 'loan_rental') return 'loan_rental';
  if (plannerFormType === 'new_service_level') return 'new_service_level';
  if (isGeneralVisitPlannerFormType(plannerFormType)) return 'general_visit';
  return 'rfc';
}

/**
 * Builds the sales-request formData payload from a selected published template.
 */
export function buildDynamicVisitSalesRequestFormData(options: {
  formTemplateType: string;
  formTemplateName?: string;
  formTemplateId?: string;
  formTemplateVersion: number;
  formSchemaSnapshot: unknown;
  values: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    formTemplateType: options.formTemplateType,
    formTemplateName: options.formTemplateName,
    formTemplateId: options.formTemplateId,
    formTemplateVersion: options.formTemplateVersion,
    formSchemaSnapshot: options.formSchemaSnapshot,
    values: options.values,
    formCategory: isGeneralVisitPlannerFormType(options.formTemplateType)
      ? 'general_visit'
      : undefined,
  };
}
