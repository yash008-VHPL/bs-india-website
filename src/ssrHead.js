// Head values captured during the build-time prerender (see usePageMeta).
let current = null;
export const recordSsrHead = (v) => { current = v; };
export const takeSsrHead = () => { const v = current; current = null; return v; };
