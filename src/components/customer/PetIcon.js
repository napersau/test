const paths = {
  paw: 'M8 13c-2 0-4 3-4 5 0 4 4 2 8 2s8 2 8-2c0-2-2-5-4-5l-4-2z M6 9a2 3 0 1 1-4 0 2 3 0 0 1 4 0 M11 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0 M17 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0 M22 9a2 3 0 1 1-4 0 2 3 0 0 1 4 0',
  plus: 'M12 5v14 M5 12h14', search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  edit: 'M16 4l4 4 M4 20l5-1L21 7l-4-4L5 15z', archive: 'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
  heart: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 6 8 15 8 15S25 11 20 5z',
  back: 'M20 12H4 M10 6l-6 6 6 6', arrow: 'M4 12h16 M14 6l6 6-6 6',
};
export default function PetIcon({ name = 'paw', ...props }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.paw} /></svg>;
}
