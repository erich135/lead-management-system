import type { BouwaPilotAccessState } from '../../lib/api';

export type BouwaPilotPresentation = 'resolving' | 'allowed' | 'denied';

export function bouwaPilotPresentation(
  state: BouwaPilotAccessState | null,
  loading: boolean,
  unavailable: boolean,
): BouwaPilotPresentation {
  if (loading) return 'resolving';
  if (unavailable || state?.allowed !== true) return 'denied';
  return 'allowed';
}

export function canShowBouwaNavigation(
  state: BouwaPilotAccessState | null,
  loading: boolean,
  unavailable: boolean,
): boolean {
  return bouwaPilotPresentation(state, loading, unavailable) === 'allowed';
}
