import { installedSpecSearchHint } from './equipmentState.ts';
import type { PublicMachineSpec } from './types.ts';

export const POSSIBLE_SPEC_MATCHES_HEADING = 'Possible specification matches';
export const NO_PUBLISHED_SPEC_MATCH_MESSAGE =
  'No matching published specification found';

const MARKS = /[\u00ae\u2122\u00a9]/g;

export function physicalMachineLibrarySearchQuery(make: string, model: string): string {
  return installedSpecSearchHint(make, model)
    .replace(MARKS, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldManufacturer(value: string): string {
  return value.replace(MARKS, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function compactManufacturer(value: string): string {
  return foldManufacturer(value).replace(/[^a-z0-9]+/g, '');
}

export function manufacturersAlign(machineMake: string, specManufacturer: string): boolean {
  const left = foldManufacturer(machineMake);
  const right = foldManufacturer(specManufacturer);
  if (left === '' || right === '') return false;
  if (left === right) return true;
  const leftCompact = compactManufacturer(machineMake);
  const rightCompact = compactManufacturer(specManufacturer);
  if (leftCompact === rightCompact) return true;
  const leftToken = left.split(/[\s-]+/)[0] ?? '';
  const rightToken = right.split(/[\s-]+/)[0] ?? '';
  return leftToken.length >= 3 && leftToken === rightToken;
}

function foldModelExact(value: string): string {
  return value.replace(MARKS, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function compactModel(value: string): string {
  return foldModelExact(value).replace(/[^a-z0-9+]+/g, '');
}

function modelTokens(value: string): string[] {
  return foldModelExact(value)
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length > 0);
}

function sameTokens(left: readonly string[], right: readonly string[]): boolean {
  if (left.length === 0 || left.length !== right.length) return false;
  return left.every((token, index) => token === right[index]);
}

function specModelText(spec: PublicMachineSpec): string {
  return [spec.model, spec.modelVariant ?? ''].filter((part) => part.trim() !== '').join(' ');
}

function isPublishedLibrarySpec(spec: PublicMachineSpec): boolean {
  return Boolean(spec.recordId?.trim() && spec.manufacturer?.trim() && spec.model?.trim());
}

/**
 * 1 = exact normalised model
 * 2 = model plus variant
 * 3 = controlled token, spacing or hyphen differences
 */
function modelMatchRank(machineModel: string, spec: PublicMachineSpec): number | null {
  const machineExact = foldModelExact(machineModel);
  if (machineExact === '') return null;

  const specExact = foldModelExact(spec.model);
  if (specExact !== '' && machineExact === specExact) return 1;

  const variant = spec.modelVariant?.trim() ?? '';
  if (variant !== '') {
    const joinedSpace = foldModelExact(`${spec.model} ${variant}`);
    const joinedHyphen = foldModelExact(`${spec.model}-${variant}`);
    if (machineExact === joinedSpace || machineExact === joinedHyphen) return 2;
    if (
      compactModel(machineModel) === compactModel(`${spec.model}${variant}`) ||
      compactModel(machineModel) === compactModel(`${spec.model} ${variant}`) ||
      compactModel(machineModel) === compactModel(`${spec.model}-${variant}`)
    ) {
      return 2;
    }
  }

  const specText = specModelText(spec);
  if (compactModel(machineModel) === compactModel(specText)) return 3;
  if (sameTokens(modelTokens(machineModel), modelTokens(specText))) return 3;
  return null;
}

export function rankPublishedSpecsForPhysicalMachine(
  machine: { make: string; model: string },
  specs: readonly PublicMachineSpec[],
): PublicMachineSpec[] {
  return specs
    .flatMap((spec) => {
      if (!isPublishedLibrarySpec(spec)) return [];
      if (!manufacturersAlign(machine.make, spec.manufacturer)) return [];
      const rank = modelMatchRank(machine.model, spec);
      if (rank === null) return [];
      return [{ spec, rank }];
    })
    .sort((left, right) => {
      return (
        left.rank - right.rank ||
        left.spec.manufacturer.localeCompare(right.spec.manufacturer) ||
        left.spec.model.localeCompare(right.spec.model) ||
        left.spec.recordId.localeCompare(right.spec.recordId)
      );
    })
    .map((item) => item.spec);
}
