export const SEARCH_MENU_WRAP = 'relative overflow-visible';
export const SEARCH_MENU_WRAP_OPEN = 'relative z-40 overflow-visible';
export const SEARCH_MENU_PANEL =
  'absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-[8px] border border-slate-200 bg-white shadow-lg';

export function searchMenuWrapClass(open: boolean): string {
  return open ? SEARCH_MENU_WRAP_OPEN : SEARCH_MENU_WRAP;
}
