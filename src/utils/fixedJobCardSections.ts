/**
 * Helpers for job card template section visibility and field counts.
 */

export interface TemplateVisibilityItem {
  visible?: boolean;
  isCustom?: boolean;
}

export interface FixedFormField extends TemplateVisibilityItem {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  unit?: string;
  jobFieldKey?: string;
  machineFieldKey?: string;
}

export interface ChecklistItem extends TemplateVisibilityItem {
  id: string;
  number: number;
  label: string;
  inputType?: string;
  unit?: string;
}

export interface FixedFormSection extends TemplateVisibilityItem {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  items?: ChecklistItem[];
  rows?: { id: string; label?: string; visible?: boolean; isCustom?: boolean; fields: FixedFormField[] }[];
}

/** Returns true when an item should be shown (default visible). */
export function isTemplateItemVisible(item: TemplateVisibilityItem): boolean {
  return item.visible !== false;
}

/**
 * Filters sections, fields, checklist items, and measurement rows by visibility flags.
 */
export function filterVisibleSections(sections: FixedFormSection[] = []): FixedFormSection[] {
  return sections
    .filter(isTemplateItemVisible)
    .map((section) => {
      const next: FixedFormSection = { ...section };

      if (next.fields) {
        next.fields = next.fields.filter(isTemplateItemVisible);
      }

      if (next.items) {
        next.items = next.items.filter(isTemplateItemVisible);
      }

      if (next.rows) {
        next.rows = next.rows
          .filter(isTemplateItemVisible)
          .map((row) => ({
            ...row,
            fields: row.fields.filter(isTemplateItemVisible),
          }))
          .filter((row) => row.fields.length > 0);
      }

      return next;
    })
    .filter((section) => {
      if (section.type === 'header' || section.type === 'signatures') {
        return true;
      }
      if (section.fields?.length) return true;
      if (section.items?.length) return true;
      if (section.rows?.length) return true;
      return false;
    });
}

/**
 * Counts all questions/fields in a template regardless of visibility.
 */
export function countAllTemplateFields(sections: FixedFormSection[] | undefined): number {
  if (!sections?.length) return 0;
  let count = 0;

  for (const section of sections) {
    if (section.type === 'checklist' && section.items) {
      count += section.items.length;
    } else if (section.fields) {
      count += section.fields.length;
    } else if (section.rows) {
      count += section.rows.reduce((n, row) => n + row.fields.length, 0);
    }
  }

  return count;
}

/**
 * Counts visible questions/fields across all sections in a template.
 */
export function countVisibleTemplateFields(sections: FixedFormSection[] | undefined): number {
  if (!sections?.length) return 0;

  const visibleSections = filterVisibleSections(sections);
  let count = 0;

  for (const section of visibleSections) {
    if (section.type === 'checklist' && section.items) {
      count += section.items.length;
    } else if (section.fields) {
      count += section.fields.length;
    } else if (section.rows) {
      count += section.rows.reduce((n, row) => n + row.fields.length, 0);
    }
  }

  return count;
}

/**
 * Generates a stable custom field ID for admin-added questions.
 */
export function generateCustomFieldId(prefix = 'custom'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns the next checklist item number for a section.
 */
export function getNextChecklistNumber(items: ChecklistItem[] = []): number {
  const max = items.reduce((n, item) => Math.max(n, item.number || 0), 0);
  return max + 1;
}

/**
 * Returns how many items in a section are currently visible.
 */
export function countSectionVisibleItems(section: FixedFormSection): { visible: number; total: number } {
  if (section.type === 'checklist' && section.items) {
    const total = section.items.length;
    const visible = section.items.filter(isTemplateItemVisible).length;
    return { visible, total };
  }

  if (section.fields) {
    const total = section.fields.length;
    const visible = section.fields.filter(isTemplateItemVisible).length;
    return { visible, total };
  }

  if (section.rows) {
    const total = section.rows.reduce((n, row) => n + row.fields.length, 0);
    const visible = section.rows
      .filter(isTemplateItemVisible)
      .reduce((n, row) => n + row.fields.filter(isTemplateItemVisible).length, 0);
    return { visible, total };
  }

  return { visible: 0, total: 0 };
}
