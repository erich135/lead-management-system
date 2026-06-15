import { useState } from 'react';
import { X, ClipboardList, CheckSquare, Thermometer, Eye } from 'lucide-react';
import type { JobCardTemplate } from '../lib/api';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';
import { generateDummyJobCardPreviewData } from '../utils/fixedJobCardDummyData';

interface FixedFormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
  unit?: string;
}

interface ChecklistItem {
  id: string;
  number: number;
  label: string;
  inputType?: string;
  unit?: string;
}

interface FixedFormSection {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  items?: ChecklistItem[];
  rows?: { id: string; label?: string; fields: FixedFormField[] }[];
}

interface SystemJobCardTemplateViewProps {
  template: JobCardTemplate & {
    sections?: FixedFormSection[];
    templateKey?: string;
    pdfBackground?: string;
    isSystemTemplate?: boolean;
  };
  onClose: () => void;
}

/**
 * Returns a human-readable label for a field input type.
 */
function fieldTypeLabel(type: string, inputType?: string): string {
  if (inputType === 'pass_fail') return 'Check / tick';
  if (inputType === 'number') return 'Number';
  if (type === 'yesno') return 'Yes / No';
  if (type === 'textarea') return 'Text area';
  if (type === 'signature') return 'Signature';
  if (type === 'jobField' || type === 'machineField') return 'Auto-filled from job';
  if (type === 'select') return 'Select one';
  return 'Text';
}

/**
 * Counts total questions/fields across all sections in a system template.
 */
export function countSystemTemplateFields(sections: FixedFormSection[] | undefined): number {
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
 * Read-only viewer for the two fixed ARS job card forms (sections + checklist items).
 */
export function SystemJobCardTemplateView({ template, onClose }: SystemJobCardTemplateViewProps) {
  const sections = (template.sections || []) as FixedFormSection[];
  const totalFields = countSystemTemplateFields(sections);
  const [showFilledPreview, setShowFilledPreview] = useState(false);

  /**
   * Opens the print preview overlay with dummy technician submission data.
   */
  const handlePreviewFilled = () => {
    setShowFilledPreview(true);
  };

  if (showFilledPreview) {
    const dummy = generateDummyJobCardPreviewData(sections, template.templateKey);
    return (
      <FixedJobCardPrintView
        template={template}
        fieldValues={dummy.fieldValues}
        job={dummy.job}
        machine={dummy.machine}
        reportNumber={dummy.reportNumber}
        isPreviewSample
        onClose={() => setShowFilledPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                System form
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {totalFields} fields and checks · Used by technicians on mobile · Matches paper PDF layout
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sections.length > 0 && (
              <button
                type="button"
                onClick={handlePreviewFilled}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-600"
              >
                <Eye className="w-4 h-4" />
                Preview filled form
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {template.description && (
          <p className="text-sm text-gray-600 bg-white rounded-lg border p-4">{template.description}</p>
        )}

        {sections.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-900">
            <p className="font-medium">No questions loaded for this template.</p>
            <p className="text-sm mt-2">
              Run <code className="bg-amber-100 px-1 rounded">npm run seed:job-card-templates</code> in the
              backend to load all checklist items and fields from the PDF forms.
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))
        )}

        <p className="text-xs text-gray-500 pb-8">
          To add or remove questions later, update{' '}
          <code className="bg-gray-100 px-1 rounded">ars-backend/src/data/fixedJobCardTemplates.ts</code>{' '}
          and run the seed command again.
        </p>
      </div>
    </div>
  );
}

/**
 * Renders one section block (checklist, fields, measurements, etc.).
 */
function SectionBlock({ section }: { section: FixedFormSection }) {
  const icon =
    section.type === 'checklist' ? (
      <CheckSquare className="w-5 h-5 text-[#0969a9]" />
    ) : section.type === 'measurement_table' ? (
      <Thermometer className="w-5 h-5 text-[#0969a9]" />
    ) : (
      <ClipboardList className="w-5 h-5 text-[#0969a9]" />
    );

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{section.title}</h2>
        {section.type === 'checklist' && section.items && (
          <span className="text-xs text-gray-500 ml-auto">{section.items.length} items</span>
        )}
      </div>

      <div className="p-4">
        {section.type === 'checklist' && section.items && (
          <ol className="space-y-2">
            {section.items.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm border-b border-gray-50 pb-2 last:border-0">
                <span className="font-semibold text-gray-500 w-8 shrink-0">{item.number}.</span>
                <div className="flex-1">
                  <span className="text-gray-900">{item.label}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    ({fieldTypeLabel('', item.inputType)}
                    {item.unit ? ` · ${item.unit}` : ''})
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

        {section.type === 'measurement_table' && section.rows && (
          <div className="space-y-4">
            {section.rows.map((row) => (
              <div key={row.id}>
                {row.label && (
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{row.label}</p>
                )}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {row.fields.map((field) => (
                    <li key={field.id} className="text-sm text-gray-800 py-1">
                      · {field.label}
                      {field.unit ? ` (${field.unit})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {section.fields && section.type !== 'checklist' && (
          <ul className="space-y-2">
            {section.fields.map((field) => (
              <li key={field.id} className="text-sm flex flex-wrap gap-x-2 border-b border-gray-50 pb-2 last:border-0">
                <span className="font-medium text-gray-900">{field.label}</span>
                <span className="text-gray-400">— {fieldTypeLabel(field.type)}</span>
                {field.options && field.options.length > 0 && (
                  <span className="text-xs text-gray-500 w-full mt-0.5">
                    Options: {field.options.join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
