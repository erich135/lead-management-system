import React from 'react';
import type { PlannerFormElement } from '../../lib/api';
import { isInputElementType } from './formBuilderUtils';
import type { DynamicFormValues } from './dynamicFormValues';
import { isDynamicFieldEmpty } from './dynamicFormValues';

interface FormBuilderCanvasProps {
  elements: PlannerFormElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** When true, inputs are disabled (editor preview). */
  previewOnly?: boolean;
  values?: DynamicFormValues;
  onChangeValues?: (next: DynamicFormValues) => void;
  showValidation?: boolean;
  adminMode?: boolean;
  /** Drag-and-drop reorder callback (admin mode). */
  onReorder?: (dragId: string, dropId: string) => void;
}

/**
 * Renders a single interactive form element for canvas or rep fill.
 */
function FormElementView({
  element,
  selectedId,
  onSelect,
  previewOnly,
  values,
  onChangeValues,
  showValidation,
  adminMode,
  onReorder,
  depth = 0,
}: {
  element: PlannerFormElement;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  previewOnly?: boolean;
  values?: DynamicFormValues;
  onChangeValues?: (next: DynamicFormValues) => void;
  showValidation?: boolean;
  adminMode?: boolean;
  onReorder?: (dragId: string, dropId: string) => void;
  depth?: number;
}): React.ReactElement | null {
  if (element.settings?.visibility === false && !adminMode) {
    return null;
  }
  if (element.enabled === false && !adminMode) {
    return null;
  }

  const selected = adminMode && selectedId === element.id;
  const settings = element.settings || {};
  const align = settings.textAlign || 'left';

  /**
   * Selects this element in admin mode without bubbling.
   */
  function handleSelect(event: React.MouseEvent): void {
    if (!adminMode) return;
    event.stopPropagation();
    onSelect(element.id);
  }

  const outlineClass = selected
    ? 'ring-2 ring-ars-primary ring-offset-1'
    : adminMode
      ? 'hover:ring-1 hover:ring-ars-primary/40'
      : '';

  const dragProps = adminMode
    ? {
        draggable: true,
        onDragStart: (event: React.DragEvent) => {
          event.stopPropagation();
          event.dataTransfer.setData('text/plain', element.id);
          event.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (event: React.DragEvent) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          event.stopPropagation();
          const dragId = event.dataTransfer.getData('text/plain');
          if (dragId && onReorder) onReorder(dragId, element.id);
        },
      }
    : {};

  const style: React.CSSProperties = {
    textAlign: align,
    color: settings.textColor,
    backgroundColor:
      settings.backgroundColor && settings.backgroundColor !== 'transparent'
        ? settings.backgroundColor
        : undefined,
    padding: settings.padding,
    margin: settings.margin,
    borderRadius: settings.borderRadius,
    borderColor: settings.borderColor,
    borderWidth: settings.borderColor ? 1 : undefined,
    borderStyle: settings.borderColor ? 'solid' : undefined,
    opacity: element.enabled === false ? 0.5 : 1,
  };

  if (element.type === 'logo' || element.type === 'image') {
    const src = settings.logoUrl || settings.imageUrl || '/Logo.png';
    return (
      <div
        className={`rounded-lg p-1 ${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        <img
          src={src}
          alt={element.label || 'Logo'}
          style={{
            width: settings.logoWidth || 140,
            height: settings.logoHeight || 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'inline-block',
          }}
        />
      </div>
    );
  }

  if (element.type === 'heading') {
    return (
      <div
        className={`rounded-lg px-1 py-0.5 ${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        <h3
          style={{
            fontSize: settings.fontSize || 22,
            fontWeight: Number(settings.fontWeight) || 800,
            margin: 0,
            color: settings.textColor || '#0f172a',
          }}
        >
          {element.content || 'Heading'}
        </h3>
      </div>
    );
  }

  if (element.type === 'text_block') {
    return (
      <div
        className={`rounded-lg px-1 py-0.5 ${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        <p
          style={{
            fontSize: settings.fontSize || 14,
            color: settings.textColor || '#475569',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {element.content || ''}
        </p>
      </div>
    );
  }

  if (element.type === 'divider') {
    return (
      <div
        className={`py-2 ${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        onClick={handleSelect}
        {...dragProps}
      >
        <hr className="border-slate-200" />
      </div>
    );
  }

  if (element.type === 'spacer') {
    return (
      <div
        className={`${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        style={{ height: settings.spacerHeight || 24 }}
        onClick={handleSelect}
        {...dragProps}
      />
    );
  }

  // Builder chrome only — reps finish via Visit workspace, not schema buttons.
  if (element.type === 'button') {
    if (!adminMode) {
      return null;
    }

    const btnStyle = settings.buttonStyle || 'primary';
    const btnClass =
      btnStyle === 'outline'
        ? 'border border-slate-300 bg-white text-slate-800'
        : btnStyle === 'secondary'
          ? 'bg-slate-100 text-slate-800'
          : 'bg-ars-primary text-white';
    return (
      <div
        className={`rounded-lg p-1 ${outlineClass} ${adminMode ? 'cursor-pointer' : ''}`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        <button
          type="button"
          disabled={previewOnly || adminMode}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold ${btnClass}`}
        >
          {element.content || element.label || 'Button'}
        </button>
      </div>
    );
  }

  if (element.type === 'section') {
    const cols = settings.columns || 2;
    const gridClass =
      cols >= 3
        ? 'grid grid-cols-1 gap-3 md:grid-cols-3'
        : cols === 1
          ? 'grid grid-cols-1 gap-3'
          : 'grid grid-cols-1 gap-3 md:grid-cols-2';

    const sortedChildren = [...(element.children || [])].sort(
      (a, b) => a.order - b.order,
    );
    // Hide empty Actions sections once schema buttons are filtered out for reps.
    const fillChildren = adminMode
      ? sortedChildren
      : sortedChildren.filter((child) => child.type !== 'button');

    if (!adminMode && fillChildren.length === 0) {
      return null;
    }

    return (
      <section
        className={`rounded-xl border border-slate-100 p-3 ${outlineClass} ${
          adminMode ? 'cursor-pointer' : ''
        }`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        {element.label ? (
          <div className="mb-2">
            <p className="text-sm font-extrabold text-slate-900">{element.label}</p>
            {element.description ? (
              <p className="text-xs text-slate-500">{element.description}</p>
            ) : null}
          </div>
        ) : null}
        <div className={gridClass}>
          {fillChildren.map((child) => (
              <FormElementView
                key={child.id}
                element={child}
                selectedId={selectedId}
                onSelect={onSelect}
                previewOnly={previewOnly}
                values={values}
                onChangeValues={onChangeValues}
                showValidation={showValidation}
                adminMode={adminMode}
                onReorder={onReorder}
                depth={depth + 1}
              />
            ))}
        </div>
      </section>
    );
  }

  if (isInputElementType(element.type)) {
    const value = values?.[element.id];
    const invalid =
      showValidation && element.required && isDynamicFieldEmpty(value);
    const widthClass =
      element.width === 'half'
        ? 'md:col-span-1'
        : element.width === 'third'
          ? 'md:col-span-1'
          : 'md:col-span-2';
    const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ars-primary/20 ${
      invalid
        ? 'border-rose-400'
        : 'border-slate-300 focus:border-ars-primary'
    }`;

    /**
     * Updates one field value.
     */
    function setValue(next: DynamicFormValues[string]): void {
      if (!onChangeValues || !values) return;
      onChangeValues({ ...values, [element.id]: next });
    }

    /**
     * Toggles a checkbox option.
     */
    function toggleOption(optionValue: string): void {
      const current = Array.isArray(value) ? (value as string[]) : [];
      const next = current.includes(optionValue)
        ? current.filter((item) => item !== optionValue)
        : [...current, optionValue];
      setValue(next);
    }

    return (
      <div
        className={`${widthClass} rounded-xl p-2 ${outlineClass} ${
          adminMode ? 'cursor-pointer' : ''
        }`}
        style={style}
        onClick={handleSelect}
        {...dragProps}
      >
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
          {element.label || 'Field'}
          {element.required ? <span className="text-rose-500"> *</span> : null}
        </label>
        {element.description ? (
          <p className="mb-1 text-xs text-slate-500">{element.description}</p>
        ) : null}

        {element.type === 'textarea' || element.type === 'address' ? (
          <textarea
            rows={element.type === 'address' ? 2 : 4}
            disabled={previewOnly || adminMode}
            className={inputClass}
            placeholder={element.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : element.type === 'dropdown' ? (
          <select
            disabled={previewOnly || adminMode}
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="">Select…</option>
            {(element.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : element.type === 'radio' ? (
          <div className="flex flex-wrap gap-3">
            {(element.options || []).map((option) => (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  disabled={previewOnly || adminMode}
                  name={element.id}
                  checked={value === option.value}
                  onChange={() => setValue(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        ) : element.type === 'checkbox' ? (
          <div className="flex flex-col gap-2">
            {(element.options || []).map((option) => {
              const checked = Array.isArray(value) && value.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="inline-flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    disabled={previewOnly || adminMode}
                    checked={checked}
                    onChange={() => toggleOption(option.value)}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        ) : element.type === 'file' ? (
          <input
            type="file"
            disabled={previewOnly || adminMode}
            className={inputClass}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setValue(file ? file.name : '');
            }}
          />
        ) : (
          <input
            type={
              element.type === 'number'
                ? 'number'
                : element.type === 'email'
                  ? 'email'
                  : element.type === 'phone'
                    ? 'tel'
                    : element.type === 'date'
                      ? 'date'
                      : element.type === 'time'
                        ? 'time'
                        : 'text'
            }
            disabled={previewOnly || adminMode}
            className={inputClass}
            placeholder={element.placeholder}
            value={
              typeof value === 'string' || typeof value === 'number' ? String(value) : ''
            }
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {element.helpText ? (
          <p className="mt-1 text-[11px] text-slate-500">{element.helpText}</p>
        ) : null}
        {invalid ? (
          <p className="mt-1 text-[11px] font-semibold text-rose-600">Required</p>
        ) : null}
      </div>
    );
  }

  return null;
}

/**
 * Live form canvas — click elements to select them in the visual builder.
 */
export function FormBuilderCanvas({
  elements,
  selectedId,
  onSelect,
  previewOnly = true,
  values = {},
  onChangeValues,
  showValidation = false,
  adminMode = false,
  onReorder,
}: FormBuilderCanvasProps): React.ReactElement {
  const sorted = [...elements].sort((a, b) => a.order - b.order);

  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      onClick={() => {
        if (adminMode) onSelect(null);
      }}
    >
      {sorted.map((element) => (
        <FormElementView
          key={element.id}
          element={element}
          selectedId={selectedId}
          onSelect={onSelect}
          previewOnly={previewOnly}
          values={values}
          onChangeValues={onChangeValues}
          showValidation={showValidation}
          adminMode={adminMode}
          onReorder={onReorder}
        />
      ))}
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No elements yet. Use + Add Element to build this form.
        </p>
      ) : null}
    </div>
  );
}

export default FormBuilderCanvas;
