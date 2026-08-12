import React, { useMemo } from 'react';
import type {
  PlannerFormContent,
  PlannerFormElement,
  PlannerFormField,
  PlannerFormPublished,
} from '../../lib/api';
import { FormBuilderCanvas } from './FormBuilderCanvas';
import {
  buildElementsFromFields,
  deriveFieldsFromElements,
  ensureDraftElements,
} from './formBuilderUtils';
import type { DynamicFormValues } from './dynamicFormValues';
import { isDynamicFieldEmpty } from './dynamicFormValues';

export type { DynamicFormValues } from './dynamicFormValues';
export { isDynamicFieldEmpty } from './dynamicFormValues';

interface DynamicPlannerFormRendererProps {
  schema: Pick<
    PlannerFormPublished,
    'name' | 'title' | 'description' | 'logoUrl' | 'fields' | 'version'
  > & {
    elements?: PlannerFormElement[];
  };
  values: DynamicFormValues;
  onChange: (next: DynamicFormValues) => void;
  disabled?: boolean;
  /** When true, show validation highlights for empty required fields. */
  showValidation?: boolean;
  /**
   * Super Admin inline-edit mode (legacy). Prefer VisualFormBuilder for editing.
   */
  adminMode?: boolean;
  /** Called when Super Admin edits form branding / field definitions. */
  onAdminSchemaChange?: (
    next: Partial<PlannerFormContent> & { fields?: PlannerFormField[] },
  ) => void;
  /** Currently selected field id in admin mode. */
  selectedFieldId?: string | null;
  /** Selects a field for deeper editing (type, required, options). */
  onSelectField?: (fieldId: string) => void;
}

/**
 * Builds empty values map for a published schema.
 */
export function createEmptyDynamicFormValues(
  fields: PlannerFormField[],
): DynamicFormValues {
  const values: DynamicFormValues = {};
  for (const field of fields) {
    if (field.type === 'checkbox') {
      values[field.id] = [];
    } else if (field.type === 'number') {
      values[field.id] = '';
    } else {
      values[field.id] = '';
    }
  }
  return values;
}

/**
 * Lists missing required field labels for the current values.
 */
export function getMissingRequiredDynamicFields(
  fields: PlannerFormField[],
  values: DynamicFormValues,
): string[] {
  return fields
    .filter((field) => field.enabled !== false && field.required)
    .filter((field) => isDynamicFieldEmpty(values[field.id]))
    .map((field) => field.label);
}

/**
 * Resolves the element tree from a published/draft schema (migrates legacy fields).
 */
function resolveElements(
  schema: DynamicPlannerFormRendererProps['schema'],
): PlannerFormElement[] {
  if (Array.isArray(schema.elements) && schema.elements.length > 0) {
    return schema.elements;
  }
  return buildElementsFromFields({
    title: schema.title,
    description: schema.description,
    logoUrl: schema.logoUrl,
    fields: schema.fields || [],
  });
}

/**
 * Renders a Super Admin–configured planner form for reps from published elements.
 */
export function DynamicPlannerFormRenderer({
  schema,
  values,
  onChange,
  disabled = false,
  showValidation = false,
  adminMode = false,
  selectedFieldId = null,
  onSelectField,
}: DynamicPlannerFormRendererProps): React.ReactElement {
  const elements = useMemo(() => resolveElements(schema), [schema]);

  // Admin editing should use VisualFormBuilder; keep a selectable canvas fallback.
  if (adminMode) {
    const ensured = ensureDraftElements({
      name: schema.name,
      title: schema.title,
      description: schema.description,
      logoUrl: schema.logoUrl,
      elements,
      fields: schema.fields || deriveFieldsFromElements(elements),
    });
    return (
      <FormBuilderCanvas
        elements={ensured.elements || []}
        selectedId={selectedFieldId}
        onSelect={(id) => onSelectField?.(id || '')}
        previewOnly
        values={values}
        adminMode
      />
    );
  }

  return (
    <div className="space-y-2">
      {schema.version ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {schema.name} · v{schema.version}
        </p>
      ) : null}
      <FormBuilderCanvas
        elements={elements}
        selectedId={null}
        onSelect={() => undefined}
        previewOnly={disabled}
        values={values}
        onChangeValues={disabled ? undefined : onChange}
        showValidation={showValidation}
        adminMode={false}
      />
    </div>
  );
}

export default DynamicPlannerFormRenderer;
