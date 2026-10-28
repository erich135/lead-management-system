/**
 * Listing helpers for the office Job Card Forms screen: version labels and search.
 */

export interface ListedTemplate {
  _id?: string;
  name: string;
  description?: string;
  templateKey?: string;
  version?: number;
  versionFamilyId?: string;
  sourceTemplateId?: string;
}

/** "V2", "V3"... for created versions. An original has no stored version and shows no label. */
export function versionLabel(template: ListedTemplate | { version?: number }): string | null {
  const version = Number(template.version);
  return Number.isInteger(version) && version >= 2 ? `V${version}` : null;
}

/** Name of the form this version was created from, when that form is in the loaded list. */
export function sourceTemplateName(template: ListedTemplate, all: ListedTemplate[]): string | null {
  if (!template.sourceTemplateId) return null;
  const source = all.find((item) => item._id === template.sourceTemplateId);
  return source ? source.name : null;
}

/** Case-insensitive match on name, description and version ("v2", "version 2"). Empty search matches all. */
export function matchesTemplateSearch(template: ListedTemplate, search: string): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const label = versionLabel(template);
  const haystack = [
    template.name,
    template.description || '',
    label || '',
    label ? `version ${label.slice(1)}` : '',
  ]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}