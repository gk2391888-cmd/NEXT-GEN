/**
 * Runs in <head> before the page paints (see app/layout.tsx), so a dark-mode
 * student never sees a white flash. Kept tiny and dependency-free; the key and
 * media query must match lib/theme.ts.
 */
export const THEME_KEY = 'nextgen-theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var p=localStorage.getItem('${THEME_KEY}')||'system';d.dataset.theme=p==='dark'||(p==='system'&&matchMedia('${DARK_QUERY}').matches)?'dark':'light'}catch(e){d.dataset.theme='light'}})();`;
