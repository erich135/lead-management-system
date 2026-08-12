import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type {
  PlannerFormElement,
  PlannerFormElementType,
  PlannerFormFieldType,
} from '../../lib/api';
import { ADD_ELEMENT_PALETTE, isInputElementType } from './formBuilderUtils';

interface FormBuilderInspectorProps {
  element: PlannerFormElement | null;
  formName: string;
  onFormNameChange: (name: string) => void;
  onChange: (patch: Partial<PlannerFormElement>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

type InspectorTab = 'general' | 'layout' | 'appearance' | 'validation' | 'advanced';

const FIELD_TYPE_OPTIONS: Array<{ value: PlannerFormFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'address', label: 'Address' },
  { value: 'file', label: 'File upload' },
];

/**
 * Shopify-style side inspector for the selected form element.
 */
export function FormBuilderInspector({
  element,
  formName,
  onFormNameChange,
  onChange,
  onRemove,
  onMove,
}: FormBuilderInspectorProps): React.ReactElement {
  const [tab, setTab] = useState<InspectorTab>('general');

  /**
   * Patches nested settings on the selected element.
   */
  function patchSettings(patch: NonNullable<PlannerFormElement['settings']>): void {
    onChange({ settings: { ...element?.settings, ...patch } });
  }

  /**
   * Reads a logo/image file into a data URL.
   */
  function handleImageFile(file: File | null): void {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        patchSettings({ logoUrl: reader.result, imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  if (!element) {
    return (
      <aside className="flex h-full flex-col border-l border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Form settings
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">No element selected</p>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Form name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={formName}
              onChange={(event) => onFormNameChange(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500">
            Click any element on the live preview to edit its properties here.
          </p>
        </div>
      </aside>
    );
  }

  const tabs: Array<{ id: InspectorTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'layout', label: 'Layout' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'validation', label: 'Validation' },
    { id: 'advanced', label: 'Advanced' },
  ];

  const typeLabel = element.type.replace(/_/g, ' ');

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Selected element
        </p>
        <p className="mt-0.5 truncate text-sm font-extrabold capitalize text-slate-900">
          {element.label || typeLabel}
        </p>
        <p className="text-[11px] uppercase text-slate-400">{typeLabel}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Move up
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Move down
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>

      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-slate-100 px-2 py-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-2 py-1 text-[11px] font-bold ${
              tab === item.id
                ? 'bg-ars-primary/10 text-ars-primary'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {tab === 'general' ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Form name</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={formName}
                onChange={(event) => onFormNameChange(event.target.value)}
              />
            </label>

            {(element.type === 'heading' ||
              element.type === 'text_block' ||
              element.type === 'button') && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">
                  {element.type === 'button' ? 'Button text' : 'Content'}
                </span>
                {element.type === 'text_block' ? (
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.content || ''}
                    onChange={(event) => onChange({ content: event.target.value })}
                  />
                ) : (
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.content || ''}
                    onChange={(event) => onChange({ content: event.target.value })}
                  />
                )}
              </label>
            )}

            {(element.type === 'section' || isInputElementType(element.type)) && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">
                  {element.type === 'section' ? 'Section title' : 'Label'}
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.label || ''}
                  onChange={(event) => onChange({ label: event.target.value })}
                />
              </label>
            )}

            {(element.type === 'section' || isInputElementType(element.type)) && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Description</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.description || ''}
                  onChange={(event) => onChange({ description: event.target.value })}
                />
              </label>
            )}

            {isInputElementType(element.type) ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Field type</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.type}
                    onChange={(event) =>
                      onChange({ type: event.target.value as PlannerFormElementType })
                    }
                  >
                    {FIELD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Placeholder</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.placeholder || ''}
                    onChange={(event) => onChange({ placeholder: event.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Help text</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.helpText || ''}
                    onChange={(event) => onChange({ helpText: event.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Default value</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.defaultValue || ''}
                    onChange={(event) => onChange({ defaultValue: event.target.value })}
                  />
                </label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(element.required)}
                      onChange={(event) => onChange({ required: event.target.checked })}
                    />
                    Required
                  </label>
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={element.enabled !== false}
                      onChange={(event) => onChange({ enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>
              </>
            ) : null}

            {(element.type === 'logo' || element.type === 'image') && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs"
                  onChange={(event) => handleImageFile(event.target.files?.[0] || null)}
                />
              </label>
            )}

            {element.type === 'button' ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Button style</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.buttonStyle || 'primary'}
                    onChange={(event) =>
                      patchSettings({
                        buttonStyle: event.target.value as 'primary' | 'secondary' | 'outline',
                      })
                    }
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Action</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.buttonAction || 'none'}
                    onChange={(event) =>
                      patchSettings({
                        buttonAction: event.target.value as
                          | 'save'
                          | 'submit'
                          | 'next'
                          | 'none',
                      })
                    }
                  >
                    <option value="save">Save</option>
                    <option value="submit">Submit</option>
                    <option value="next">Next</option>
                    <option value="none">None</option>
                  </select>
                </label>
              </>
            ) : null}

            {(element.type === 'dropdown' ||
              element.type === 'radio' ||
              element.type === 'checkbox') && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase text-slate-500">Options</p>
                  <button
                    type="button"
                    className="text-xs font-bold text-ars-primary"
                    onClick={() =>
                      onChange({
                        options: [
                          ...(element.options || []),
                          {
                            value: `option_${(element.options || []).length + 1}`,
                            label: `Option ${(element.options || []).length + 1}`,
                          },
                        ],
                      })
                    }
                  >
                    + Add
                  </button>
                </div>
                {(element.options || []).map((option, index) => (
                  <div key={`${option.value}-${index}`} className="flex gap-1.5">
                    <input
                      className="w-1/3 rounded border border-slate-300 px-2 py-1 text-xs"
                      value={option.value}
                      onChange={(event) => {
                        const options = [...(element.options || [])];
                        options[index] = { ...options[index], value: event.target.value };
                        onChange({ options });
                      }}
                    />
                    <input
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                      value={option.label}
                      onChange={(event) => {
                        const options = [...(element.options || [])];
                        options[index] = { ...options[index], label: event.target.value };
                        onChange({ options });
                      }}
                    />
                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={() =>
                        onChange({
                          options: (element.options || []).filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {tab === 'layout' ? (
          <>
            {isInputElementType(element.type) || element.type === 'button' ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Width</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.width || 'full'}
                  onChange={(event) =>
                    onChange({
                      width: event.target.value as 'full' | 'half' | 'third',
                    })
                  }
                >
                  <option value="full">Full</option>
                  <option value="half">Half</option>
                  <option value="third">Third</option>
                </select>
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Alignment</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={element.settings?.textAlign || 'left'}
                onChange={(event) =>
                  patchSettings({
                    textAlign: event.target.value as 'left' | 'center' | 'right',
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            {element.type === 'section' ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Columns</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.settings?.columns ?? 2}
                  onChange={(event) =>
                    patchSettings({ columns: Number(event.target.value) || 1 })
                  }
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Padding</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={element.settings?.padding || ''}
                placeholder="e.g. 12px"
                onChange={(event) => patchSettings({ padding: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Margin</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={element.settings?.margin || ''}
                placeholder="e.g. 8px 0"
                onChange={(event) => patchSettings({ margin: event.target.value })}
              />
            </label>
            {(element.type === 'logo' || element.type === 'image') && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Width (px)</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.logoWidth ?? 140}
                    onChange={(event) =>
                      patchSettings({ logoWidth: Number(event.target.value) || 140 })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Height (px)</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.logoHeight ?? ''}
                    onChange={(event) =>
                      patchSettings({
                        logoHeight: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                  />
                </label>
              </>
            )}
            {element.type === 'spacer' ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Height (px)</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.settings?.spacerHeight ?? 24}
                  onChange={(event) =>
                    patchSettings({ spacerHeight: Number(event.target.value) || 24 })
                  }
                />
              </label>
            ) : null}
          </>
        ) : null}

        {tab === 'appearance' ? (
          <>
            {(element.type === 'heading' || element.type === 'text_block') && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Font size</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.fontSize ?? 16}
                    onChange={(event) =>
                      patchSettings({ fontSize: Number(event.target.value) || 16 })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Font weight</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={element.settings?.fontWeight || '400'}
                    onChange={(event) => patchSettings({ fontWeight: event.target.value })}
                  >
                    <option value="400">Regular</option>
                    <option value="600">Semibold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra bold</option>
                  </select>
                </label>
              </>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Text color</span>
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-slate-300"
                value={element.settings?.textColor || '#0f172a'}
                onChange={(event) => patchSettings({ textColor: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Background</span>
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-slate-300"
                value={
                  element.settings?.backgroundColor &&
                  element.settings.backgroundColor !== 'transparent'
                    ? element.settings.backgroundColor
                    : '#ffffff'
                }
                onChange={(event) => patchSettings({ backgroundColor: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Border radius</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={element.settings?.borderRadius || ''}
                placeholder="e.g. 8px"
                onChange={(event) => patchSettings({ borderRadius: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Border color</span>
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-slate-300"
                value={element.settings?.borderColor || '#e2e8f0'}
                onChange={(event) => patchSettings({ borderColor: event.target.value })}
              />
            </label>
          </>
        ) : null}

        {tab === 'validation' ? (
          isInputElementType(element.type) ? (
            <>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(element.required)}
                  onChange={(event) => onChange({ required: event.target.checked })}
                />
                Required field
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Min</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.settings?.validationMin ?? ''}
                  onChange={(event) =>
                    patchSettings({
                      validationMin: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Max</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.settings?.validationMax ?? ''}
                  onChange={(event) =>
                    patchSettings({
                      validationMax: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Pattern (regex)</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={element.settings?.validationPattern || ''}
                  onChange={(event) =>
                    patchSettings({ validationPattern: event.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500">Validation applies to input fields only.</p>
          )
        ) : null}

        {tab === 'advanced' ? (
          <>
            {isInputElementType(element.type) ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700">Field key</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  value={element.key || ''}
                  onChange={(event) => onChange({ key: event.target.value })}
                />
              </label>
            ) : null}
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={element.settings?.visibility !== false}
                onChange={(event) => patchSettings({ visibility: event.target.checked })}
              />
              Visible
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={element.enabled !== false}
                onChange={(event) => onChange({ enabled: event.target.checked })}
              />
              Enabled
            </label>
            <p className="break-all text-[10px] text-slate-400">ID: {element.id}</p>
          </>
        ) : null}
      </div>
    </aside>
  );
}

interface FormElementPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: PlannerFormElementType) => void;
}

/**
 * Modal palette for adding a new element to the form.
 */
export function FormElementPalette({
  isOpen,
  onClose,
  onAdd,
}: FormElementPaletteProps): React.ReactElement | null {
  if (!isOpen) return null;

  const groups = [
    { id: 'content' as const, label: 'Content' },
    { id: 'layout' as const, label: 'Layout' },
    { id: 'input' as const, label: 'Inputs' },
    { id: 'media' as const, label: 'Media' },
    { id: 'action' as const, label: 'Actions' },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="max-h-[80%] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-extrabold text-slate-900">Add Element</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ADD_ELEMENT_PALETTE.filter((item) => item.group === group.id).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      onAdd(item.type);
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:border-ars-primary hover:bg-ars-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5 text-ars-primary" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FormBuilderInspector;
