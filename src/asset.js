/**
 * Resolve a path in /public against the build's base URL.
 *
 * Vite rewrites absolute asset paths it can see - in index.html, and in CSS
 * url() - but NOT paths written as plain strings in JavaScript. Those would
 * stay pinned to the site root, so a build served from a sub-path (the /beta
 * review build) would silently load the ROOT site's logo and icons instead of
 * its own. Every /public reference in JS goes through here.
 *
 * import.meta.env.BASE_URL is replaced at build time and always ends with "/".
 */
export const asset = (path) =>
  import.meta.env.BASE_URL.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
