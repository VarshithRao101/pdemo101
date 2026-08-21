/**
 * The Content Security Policy, defined once.
 *
 * WHY THIS FILE EXISTS
 *
 * This app has to ship its CSP twice. Hostinger's edge rewrites the
 * Content-Security-Policy header on every proxied response down to
 * "upgrade-insecure-requests" before it reaches a browser, so the header
 * helmet sets never actually arrives. What does arrive is a <meta> copy inside
 * the HTML body, which the edge cannot touch.
 *
 * Two copies of a security policy maintained by hand is a policy that drifts,
 * and the copy that drifts is the one nobody is watching — here, that is the
 * meta tag, the only one users are actually protected by. So both are built
 * from this object: the server passes DIRECTIVES to helmet, and the build
 * injects metaPolicy() into index.html.
 *
 * WHAT MAY NOT BE RELAXED
 *
 * script-src is 'self' with no 'unsafe-inline' and no 'unsafe-eval'. Access
 * tokens are kept in localStorage, so any script an attacker gets to run is a
 * full account takeover — this directive is the one carrying that risk. If a
 * build ever emits an inline script, give it a nonce or a hash. Do not reopen
 * the directive.
 *
 * frame-ancestors is header-only; it is not valid in a meta tag and browsers
 * ignore it there. Clickjacking therefore rests on X-Frame-Options for real
 * users, which does survive the edge — verified against the live site.
 */

const DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  // React sets style attributes throughout the UI. Inline CSS cannot execute
  // script under this policy, so this is a cheap allowance rather than a hole.
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'data:', 'blob:'],
  // Same origin only. This was ["'self'", 'https:', 'wss:'], which permitted a
  // connection to any HTTPS host on the internet. The app only ever talks to
  // its own origin, so the allowance bought nothing and left an exfiltration
  // route open for injected script — the precise risk script-src above exists
  // to contain, and the one that matters most here because access tokens live
  // in localStorage. Google Fonts is unaffected: a stylesheet is governed by
  // style-src and the font files by font-src, never by connect-src.
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: []
};

// Directives a browser ignores when they arrive in a meta tag. Emitting them
// there would be misleading rather than harmless: it reads as protection that
// is not in force.
const HEADER_ONLY = new Set(['frameAncestors']);

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/**
 * The policy string for the <meta> tag, which is the copy that survives the
 * edge and the one users are protected by.
 */
function metaPolicy() {
  return Object.entries(DIRECTIVES)
    .filter(([name]) => !HEADER_ONLY.has(name))
    .map(([name, values]) => (values.length ? `${kebab(name)} ${values.join(' ')}` : kebab(name)))
    .join('; ');
}

module.exports = { DIRECTIVES, HEADER_ONLY, metaPolicy };
