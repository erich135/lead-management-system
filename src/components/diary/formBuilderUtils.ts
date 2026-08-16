import type {
  PlannerFormContent,
  PlannerFormElement,
  PlannerFormElementType,
  PlannerFormField,
  PlannerFormFieldType,
} from '../../lib/api';

/** Input element types that collect rep values. */
export const INPUT_ELEMENT_TYPES: PlannerFormFieldType[] = [
  'text',
  'textarea',
  'number',
  'phone',
  'email',
  'date',
  'time',
  'dropdown',
  'checkbox',
  'radio',
  'address',
  'file',
];

/** Palette entries for + Add Element. */
export const ADD_ELEMENT_PALETTE: Array<{
  type: PlannerFormElementType;
  label: string;
  group: 'layout' | 'content' | 'input' | 'media' | 'action';
}> = [
  { type: 'heading', label: 'Heading', group: 'content' },
  { type: 'text_block', label: 'Description / Text', group: 'content' },
  { type: 'divider', label: 'Divider', group: 'layout' },
  { type: 'section', label: 'Section', group: 'layout' },
  { type: 'spacer', label: 'Spacer', group: 'layout' },
  { type: 'text', label: 'Input', group: 'input' },
  { type: 'textarea', label: 'Textarea', group: 'input' },
  { type: 'number', label: 'Number', group: 'input' },
  { type: 'phone', label: 'Phone', group: 'input' },
  { type: 'email', label: 'Email', group: 'input' },
  { type: 'date', label: 'Date', group: 'input' },
  { type: 'time', label: 'Time', group: 'input' },
  { type: 'dropdown', label: 'Dropdown', group: 'input' },
  { type: 'checkbox', label: 'Checkbox', group: 'input' },
  { type: 'radio', label: 'Radio', group: 'input' },
  { type: 'address', label: 'Address', group: 'input' },
  { type: 'file', label: 'File Upload', group: 'input' },
  { type: 'logo', label: 'Logo / Image', group: 'media' },
  { type: 'image', label: 'Image', group: 'media' },
  { type: 'button', label: 'Button', group: 'action' },
];

/**
 * Returns true when the element type collects user input.
 */
export function isInputElementType(
  type: PlannerFormElementType | string,
): type is PlannerFormFieldType {
  return (INPUT_ELEMENT_TYPES as string[]).includes(type);
}

/**
 * Creates a unique element id.
 */
export function createElementId(prefix = 'el'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Converts a legacy field into a builder element.
 */
export function fieldToElement(field: PlannerFormField): PlannerFormElement {
  return {
    id: field.id || createElementId('fld'),
    type: field.type,
    order: field.order,
    enabled: field.enabled !== false,
    label: field.label,
    key: field.key,
    required: Boolean(field.required),
    placeholder: field.placeholder,
    helpText: field.helpText,
    description: field.description,
    options: field.options || [],
    width: field.width === 'half' ? 'half' : 'full',
    settings: { visibility: true },
    children: [],
  };
}

/**
 * Converts an input element into a legacy field.
 */
export function elementToField(
  element: PlannerFormElement,
  order: number,
): PlannerFormField | null {
  if (!isInputElementType(element.type)) return null;
  return {
    id: element.id,
    key: element.key?.trim() || `field_${order}`,
    type: element.type,
    label: element.label?.trim() || `Field ${order}`,
    description: element.description,
    placeholder: element.placeholder,
    helpText: element.helpText,
    required: Boolean(element.required),
    enabled: element.enabled !== false,
    options: element.options || [],
    order,
    width: element.width === 'half' ? 'half' : 'full',
  };
}

/**
 * Depth-first walk of the element tree (sections expand children).
 */
export function walkElements(elements: PlannerFormElement[]): PlannerFormElement[] {
  const result: PlannerFormElement[] = [];
  const sorted = [...elements].sort((a, b) => a.order - b.order);
  for (const element of sorted) {
    result.push(element);
    if (element.type === 'section' && Array.isArray(element.children)) {
      result.push(...walkElements(element.children));
    }
  }
  return result;
}

/**
 * Derives fields[] from the visual element tree.
 */
export function deriveFieldsFromElements(elements: PlannerFormElement[]): PlannerFormField[] {
  const fields: PlannerFormField[] = [];
  for (const element of walkElements(elements)) {
    const field = elementToField(element, fields.length + 1);
    if (field) fields.push(field);
  }
  return fields.map((field, index) => ({ ...field, order: index + 1 }));
}

/**
 * Builds a default element tree from branding + legacy fields.
 */
export function buildElementsFromFields(
  content: Pick<PlannerFormContent, 'title' | 'description' | 'logoUrl' | 'fields'>,
): PlannerFormElement[] {
  const fields = [...(content.fields || [])].sort((a, b) => a.order - b.order);
  return [
    {
      id: 'el_logo',
      type: 'logo',
      order: 1,
      enabled: true,
      label: 'Logo',
      settings: {
        logoUrl: content.logoUrl || '/Logo.png',
        logoWidth: 140,
        textAlign: 'left',
        visibility: true,
      },
      children: [],
    },
    {
      id: 'el_title',
      type: 'heading',
      order: 2,
      enabled: true,
      label: 'Title',
      content: content.title || 'Form',
      settings: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'left',
        textColor: '#0f172a',
        visibility: true,
      },
      children: [],
    },
    {
      id: 'el_description',
      type: 'text_block',
      order: 3,
      enabled: true,
      label: 'Description',
      content: content.description || '',
      settings: {
        fontSize: 14,
        textAlign: 'left',
        textColor: '#475569',
        visibility: true,
      },
      children: [],
    },
    {
      id: 'el_divider_header',
      type: 'divider',
      order: 4,
      enabled: true,
      label: 'Divider',
      settings: { visibility: true },
      children: [],
    },
    {
      id: 'el_section_main',
      type: 'section',
      order: 5,
      enabled: true,
      label: 'Main fields',
      description: 'Primary form inputs',
      settings: {
        columns: 2,
        padding: '12px',
        backgroundColor: 'transparent',
        visibility: true,
      },
      children: fields.map((field, index) => ({
        ...fieldToElement(field),
        order: index + 1,
      })),
    },
    {
      id: 'el_actions',
      type: 'section',
      order: 6,
      enabled: true,
      label: 'Actions',
      description: 'Form action buttons',
      settings: { columns: 1, padding: '8px', visibility: true },
      children: [
        {
          id: 'el_submit_btn',
          type: 'button',
          order: 1,
          enabled: true,
          label: 'Save / Submit',
          content: 'Save Form',
          settings: {
            buttonStyle: 'primary',
            buttonAction: 'save',
            textAlign: 'left',
            visibility: true,
          },
          children: [],
        },
      ],
    },
  ];
}

/**
 * Ensures draft content has elements + synced fields/branding.
 */
export function ensureDraftElements(content: PlannerFormContent): PlannerFormContent {
  const safe: PlannerFormContent = content || {
    name: 'Form',
    title: 'Form',
    description: '',
    fields: [],
    elements: [],
  };
  const elements =
    Array.isArray(safe.elements) && safe.elements.length > 0
      ? safe.elements
      : buildElementsFromFields({
          title: safe.title || 'Form',
          description: safe.description,
          logoUrl: safe.logoUrl,
          fields: Array.isArray(safe.fields) ? safe.fields : [],
        });

  const fields = deriveFieldsFromElements(elements);
  const logo = walkElements(elements).find((el) => el.type === 'logo');
  const heading = walkElements(elements).find((el) => el.type === 'heading');
  const textBlock = walkElements(elements).find((el) => el.type === 'text_block');

  return {
    name: safe.name || 'Form',
    title: heading?.content?.trim() || safe.title || 'Form',
    description:
      typeof textBlock?.content === 'string' ? textBlock.content : safe.description,
    logoUrl: logo?.settings?.logoUrl || safe.logoUrl,
    elements,
    fields: fields.length ? fields : safe.fields || [],
  };
}

/**
 * Creates a new blank element of the given type for the palette.
 */
export function createBlankElement(type: PlannerFormElementType, order: number): PlannerFormElement {
  const id = createElementId(type);
  const base: PlannerFormElement = {
    id,
    type,
    order,
    enabled: true,
    settings: { visibility: true },
    children: [],
  };

  switch (type) {
    case 'heading':
      return {
        ...base,
        label: 'Heading',
        content: 'New heading',
        settings: { fontSize: 20, fontWeight: '700', textAlign: 'left', visibility: true },
      };
    case 'text_block':
      return {
        ...base,
        label: 'Text',
        content: 'Add description text…',
        settings: { fontSize: 14, textAlign: 'left', visibility: true },
      };
    case 'divider':
      return { ...base, label: 'Divider' };
    case 'spacer':
      return {
        ...base,
        label: 'Spacer',
        settings: { spacerHeight: 24, visibility: true },
      };
    case 'section':
      return {
        ...base,
        label: 'New section',
        description: '',
        settings: { columns: 2, padding: '12px', visibility: true },
        children: [],
      };
    case 'logo':
    case 'image':
      return {
        ...base,
        label: type === 'logo' ? 'Logo' : 'Image',
        settings: {
          logoUrl: '/Logo.png',
          imageUrl: '/Logo.png',
          logoWidth: 140,
          textAlign: 'left',
          visibility: true,
        },
      };
    case 'button':
      return {
        ...base,
        label: 'Button',
        content: 'Button',
        settings: {
          buttonStyle: 'primary',
          buttonAction: 'none',
          textAlign: 'left',
          visibility: true,
        },
      };
    case 'dropdown':
    case 'radio':
    case 'checkbox':
      return {
        ...base,
        label: 'New field',
        key: `custom_${Date.now()}`,
        required: false,
        width: 'full',
        options: [
          { value: 'option_1', label: 'Option 1' },
          { value: 'option_2', label: 'Option 2' },
        ],
        settings: { visibility: true },
      };
    default:
      return {
        ...base,
        label: 'New field',
        key: `custom_${Date.now()}`,
        required: false,
        width: 'full',
        placeholder: '',
        helpText: '',
        options: [],
        settings: { visibility: true },
      };
  }
}

/**
 * Finds an element by id anywhere in the tree.
 */
export function findElementById(
  elements: PlannerFormElement[],
  id: string,
): PlannerFormElement | null {
  for (const element of elements) {
    if (element.id === id) return element;
    if (element.children?.length) {
      const found = findElementById(element.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Updates an element by id (immutable).
 */
export function updateElementById(
  elements: PlannerFormElement[],
  id: string,
  patch: Partial<PlannerFormElement>,
): PlannerFormElement[] {
  return elements.map((element) => {
    if (element.id === id) {
      return {
        ...element,
        ...patch,
        settings: patch.settings
          ? { ...element.settings, ...patch.settings }
          : element.settings,
      };
    }
    if (element.children?.length) {
      return {
        ...element,
        children: updateElementById(element.children, id, patch),
      };
    }
    return element;
  });
}

/**
 * Removes an element by id from the tree.
 */
export function removeElementById(
  elements: PlannerFormElement[],
  id: string,
): PlannerFormElement[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) => ({
      ...element,
      children: element.children ? removeElementById(element.children, id) : [],
    }))
    .map((element, index) => ({ ...element, order: index + 1 }));
}

/**
 * Reorders a root-level (or section children) list by moving an item.
 */
export function moveElementInList(
  elements: PlannerFormElement[],
  id: string,
  direction: -1 | 1,
): PlannerFormElement[] {
  const sorted = [...elements].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((el) => el.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) {
    // Try inside sections
    return elements.map((element) => {
      if (element.type === 'section' && element.children?.length) {
        return {
          ...element,
          children: moveElementInList(element.children, id, direction),
        };
      }
      return element;
    });
  }
  const next = [...sorted];
  const tmp = next[index];
  next[index] = next[target];
  next[target] = tmp;
  return next.map((el, i) => ({ ...el, order: i + 1 }));
}

/**
 * Appends a new element into the main section (or root if none).
 */
export function appendElement(
  elements: PlannerFormElement[],
  newElement: PlannerFormElement,
  parentSectionId?: string | null,
): PlannerFormElement[] {
  if (parentSectionId) {
    return elements.map((element) => {
      if (element.id === parentSectionId && element.type === 'section') {
        const children = [...(element.children || []), newElement].map((child, i) => ({
          ...child,
          order: i + 1,
        }));
        return { ...element, children };
      }
      if (element.children?.length) {
        return {
          ...element,
          children: appendElement(element.children, newElement, parentSectionId),
        };
      }
      return element;
    });
  }

  const mainSection = elements.find((el) => el.type === 'section');
  if (mainSection) {
    return appendElement(elements, newElement, mainSection.id);
  }

  return [...elements, { ...newElement, order: elements.length + 1 }];
}

/**
 * Reorders siblings within the list (or nested section) by dragging one id onto another.
 */
export function reorderElementRelative(
  elements: PlannerFormElement[],
  dragId: string,
  dropId: string,
): PlannerFormElement[] {
  if (dragId === dropId) return elements;

  const rootIds = elements.map((el) => el.id);
  if (rootIds.includes(dragId) && rootIds.includes(dropId)) {
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    const from = sorted.findIndex((el) => el.id === dragId);
    const to = sorted.findIndex((el) => el.id === dropId);
    if (from < 0 || to < 0) return elements;
    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next.map((el, i) => ({ ...el, order: i + 1 }));
  }

  return elements.map((element) => {
    if (element.type === 'section' && element.children?.length) {
      return {
        ...element,
        children: reorderElementRelative(element.children, dragId, dropId),
      };
    }
    return element;
  });
}

/**
 * Syncs top-level content branding from elements after edits.
 */
export function syncContentFromElements(
  content: PlannerFormContent,
  elements: PlannerFormElement[],
): PlannerFormContent {
  const fields = deriveFieldsFromElements(elements);
  const logo = walkElements(elements).find((el) => el.type === 'logo');
  const heading = walkElements(elements).find((el) => el.type === 'heading');
  const textBlock = walkElements(elements).find((el) => el.type === 'text_block');

  return {
    ...content,
    title: heading?.content?.trim() || content.title,
    description:
      typeof textBlock?.content === 'string' ? textBlock.content : content.description,
    logoUrl: logo?.settings?.logoUrl || content.logoUrl,
    elements,
    fields,
  };
}
