import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { PlannerFormContent, PlannerFormElementType } from '../../lib/api';
import { FormBuilderCanvas } from './FormBuilderCanvas';
import { FormBuilderInspector, FormElementPalette } from './FormBuilderInspector';
import {
  appendElement,
  createBlankElement,
  ensureDraftElements,
  findElementById,
  moveElementInList,
  removeElementById,
  reorderElementRelative,
  syncContentFromElements,
  updateElementById,
} from './formBuilderUtils';
import { createEmptyDynamicFormValues } from './DynamicPlannerFormRenderer';

interface VisualFormBuilderProps {
  draft: PlannerFormContent;
  onChange: (next: PlannerFormContent) => void;
  publishedVersion: number | null;
  /** When true, show that the draft differs from published. */
  hasUnpublishedChanges?: boolean;
}

/**
 * Shopify-style visual form builder: live canvas + side inspector + add palette.
 */
export function VisualFormBuilder({
  draft,
  onChange,
  publishedVersion,
  hasUnpublishedChanges = false,
}: VisualFormBuilderProps): React.ReactElement {
  const content = useMemo(() => ensureDraftElements(draft), [draft]);
  const elements = content.elements || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const selected = selectedId ? findElementById(elements, selectedId) : null;
  const previewValues = useMemo(
    () => createEmptyDynamicFormValues(content.fields || []),
    [content.fields],
  );

  /**
   * Commits an updated element tree into the draft content.
   */
  function commitElements(nextElements: typeof elements): void {
    onChange(syncContentFromElements(content, nextElements));
  }

  /**
   * Patches the currently selected element.
   */
  function patchSelected(patch: Parameters<typeof updateElementById>[2]): void {
    if (!selectedId) return;
    commitElements(updateElementById(elements, selectedId, patch));
  }

  /**
   * Adds a new element from the palette into the main section.
   */
  function handleAdd(type: PlannerFormElementType): void {
    const blank = createBlankElement(type, 1);
    const next = appendElement(elements, blank);
    commitElements(next);
    setSelectedId(blank.id);
  }

  return (
    <div className="relative flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {hasUnpublishedChanges ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Draft
            </span>
          ) : null}
          <span className="text-[11px] font-semibold text-slate-500">
            Click to edit · drag to reorder · live preview
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAdd('text')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ars-primary/40 bg-white px-3 py-2 text-xs font-bold text-ars-primary shadow-sm hover:bg-ars-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ars-primary/40 bg-ars-primary/10 px-3 py-2 text-xs font-bold text-ars-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Element
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <FormBuilderCanvas
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            previewOnly
            values={previewValues}
            adminMode
            onReorder={(dragId, dropId) => {
              commitElements(reorderElementRelative(elements, dragId, dropId));
            }}
          />
        </div>
      </div>

      <div className="h-[340px] w-full shrink-0 border-t border-slate-200 lg:h-auto lg:w-[320px] lg:border-t-0">
        <FormBuilderInspector
          element={selected}
          formName={content.name}
          onFormNameChange={(name) => onChange({ ...content, name })}
          onChange={patchSelected}
          onRemove={() => {
            if (!selectedId) return;
            commitElements(removeElementById(elements, selectedId));
            setSelectedId(null);
          }}
          onMove={(direction) => {
            if (!selectedId) return;
            commitElements(moveElementInList(elements, selectedId, direction));
          }}
        />
      </div>

      <FormElementPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default VisualFormBuilder;
