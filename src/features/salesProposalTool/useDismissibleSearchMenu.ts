import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dismissible type-ahead menu. Closed until the field is clicked, focused, or
 * typed in. Escape and outside pointer close it without clearing the query.
 * Search responses must not call openMenu().
 */
export function useDismissibleSearchMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    const active = document.activeElement;
    if (active instanceof HTMLElement && menuRef.current?.contains(active)) {
      active.blur();
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnPointerAway(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        closeMenu();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeMenu();
    }

    document.addEventListener('pointerdown', closeOnPointerAway);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerAway);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, closeMenu]);

  return { menuOpen, setMenuOpen, menuRef, openMenu, closeMenu };
}
