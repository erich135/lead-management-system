import type { PlannerFormAdminTemplate } from '../../lib/api';

export const SYSTEM_FORM_TYPES = ['rfc', 'loan_rental', 'new_service_level'] as const;

/**
 * Returns true when an admin template is a custom General Visit form.
 */
export function isGeneralVisitAdminForm(form: {
  type: string;
  formCategory?: string;
  isSystem?: boolean;
}): boolean {
  if (form.isSystem) return false;
  if (form.formCategory === 'general_visit') return true;
  return /^general_visit_[a-z0-9_]+$/.test(form.type);
}

/**
 * Splits Form Editor templates into unchanged system forms and custom General Visit forms.
 */
export function splitAdminPlannerForms(forms: PlannerFormAdminTemplate[]): {
  systemForms: PlannerFormAdminTemplate[];
  generalVisitForms: PlannerFormAdminTemplate[];
} {
  const byType = new Map(forms.map((form) => [form.type, form]));
  const systemForms = SYSTEM_FORM_TYPES.map(
    (type) =>
      byType.get(type) ||
      ({
        type,
        draft: { name: type, title: type, fields: [] },
        published: null,
        hasUnpublishedChanges: false,
        isSystem: true,
        formCategory: 'system',
        isActive: true,
      } as PlannerFormAdminTemplate),
  );
  const generalVisitForms = forms
    .filter((form) => isGeneralVisitAdminForm(form))
    .sort((left, right) => (left.displayOrder ?? 100) - (right.displayOrder ?? 100));
  return { systemForms, generalVisitForms };
}

/**
 * Draft / unpublished / archived General Visit forms must never appear to representatives.
 */
export function isPlannerFormVisibleToRepresentatives(form: {
  published?: unknown | null;
  isActive?: boolean;
}): boolean {
  return form.isActive !== false && form.published != null;
}

/**
 * Human-readable Form Editor status for a custom General Visit card.
 */
export function generalVisitFormStatusLabel(form: PlannerFormAdminTemplate): string {
  if (form.isActive === false) return 'Archived';
  if (!form.published) {
    return form.hasUnpublishedChanges ? 'Draft' : 'Unpublished';
  }
  if (form.hasUnpublishedChanges) return 'Published · unpublished edits';
  return 'Published';
}
