/**
 * Line icons for the Company page, drawn in the same visual language as the
 * official Berg+Schmidt Animal Nutrition icon set: 2px round strokes, no
 * fill, square-ish silhouettes, inheriting currentColor.
 *
 * PLACEHOLDER: BSAN holds a fuller icon library and can draw more on brand.
 * These are stand-ins so no emoji ship; swap the paths when the official
 * set arrives.
 */
const P = {
  regulatory: <><path d="M3 10 12 4l9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 20h18"/></>,
  chemistry:  <><path d="M9 3v6L4 19a2 2 0 0 0 1.8 2h12.4A2 2 0 0 0 20 19l-5-10V3"/><path d="M8 3h8"/><path d="M6.5 14h11"/></>,
  science:    <><circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 21 21"/><path d="M11 8v6M8 11h6"/></>,
  globe:      <><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3 3.9 5.8 3.9 9S14.6 18 12 21c-2.6-3-3.9-5.8-3.9-9S9.4 6 12 3Z"/></>,
  research:   <><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.1.9 1.8V17h5.4v-1.4c0-.7.3-1.3.9-1.8A6 6 0 0 0 12 3Z"/><path d="M10 20h4"/></>,
  growth:     <><path d="M3 20h18"/><path d="M6 20v-6M11 20V9M16 20v-9M21 20V5"/></>,
  mail:       <><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 6.8 8.4 6 8.4-6"/></>,
  web:        <><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3 3.9 5.8 3.9 9S14.6 18 12 21c-2.6-3-3.9-5.8-3.9-9S9.4 6 12 3Z"/></>,
  news:       <><rect x="3" y="5" width="14" height="14" rx="1.6"/><path d="M17 9h3a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2h-2"/><path d="M6 9h8M6 12.5h8M6 16h5"/></>,
  check:      <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  india:      <><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></>,
};

export default function CapIcon({ name, size = 28, style = {} }) {
  const paths = P[name];
  if (!paths) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ display: 'block', ...style }}
    >
      {paths}
    </svg>
  );
}
