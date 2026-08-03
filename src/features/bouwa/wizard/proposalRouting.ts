/**
 * Where a proposal is, expressed as an address.
 *
 * The Bouwa module used to hold this in component state, which meant that a
 * refresh, a bookmark or a link put you back on the proposal list whatever you
 * had been looking at. A preview in particular has to survive a reload: it is
 * the thing a rep shows a customer, and one that vanishes when the page is
 * refreshed is one nobody relies on.
 *
 * Kept apart from the page that uses it so the mapping can be checked on its
 * own. A route table nobody can test is a route table that quietly drifts.
 */

export const PROPOSAL_BASE_PATH = '/bouwa/proposals';

export type ProposalPlace =
  | { kind: 'list' }
  | { kind: 'wizard'; draftId: string }
  | { kind: 'technical'; draftId: string }
  | { kind: 'preview'; draftId: string }
  | { kind: 'workspace'; draftId: string };

/** The address for a place, so links and navigation cannot drift apart. */
export function proposalPath(place: ProposalPlace): string {
  switch (place.kind) {
    case 'wizard':
      return `${PROPOSAL_BASE_PATH}/${place.draftId}`;
    case 'technical':
      return `${PROPOSAL_BASE_PATH}/${place.draftId}/technical-review`;
    case 'preview':
      return `${PROPOSAL_BASE_PATH}/${place.draftId}/preview`;
    case 'workspace':
      return `${PROPOSAL_BASE_PATH}/${place.draftId}/workspace`;
    default:
      return '/bouwa';
  }
}

/**
 * The place an address names.
 *
 * An address that does not name a proposal is the list, including a malformed
 * one: a bookmark to a proposal somebody deleted should land on the list, not
 * on an error page about a route.
 */
export function placeFromPath(pathname: string): ProposalPlace {
  if (!pathname.startsWith(`${PROPOSAL_BASE_PATH}/`)) return { kind: 'list' };
  const rest = pathname.slice(PROPOSAL_BASE_PATH.length + 1);
  const [draftId, part = ''] = rest.split('/');
  if (draftId === undefined || draftId === '') return { kind: 'list' };
  if (part === 'preview') return { kind: 'preview', draftId };
  if (part === 'technical-review') return { kind: 'technical', draftId };
  if (part === 'workspace') return { kind: 'workspace', draftId };
  return { kind: 'wizard', draftId };
}
