/**
 * Reading server/app.cjs as a list of routes.
 *
 * Shared so that every phase derives its expectations from the same parse. A
 * second copy would drift, and the first thing to drift would be the fixes
 * already made here — named handlers, the trailing paren, template holes —
 * each of which produced a confident, wrong finding before it was found.
 */
const fs = require('fs');
const path = require('path');

/**
 * Every route, with its middleware chain and handler body.
 *
 * Brace-matched rather than regex-matched to the end: a handler contains
 * nested functions, objects and template literals, and a lazy regex stops at
 * the first `})` inside one of them — which silently truncates the body and
 * makes an audited route look unaudited.
 */
/** The body of a named handler, brace matched from its declaration. */
function namedBody(src, name) {
  const decl = new RegExp(`(?:async\\s+function|function)\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=`);
  const at = src.search(decl);
  if (at < 0) return '';
  const open = src.indexOf('{', at);
  if (open < 0) return '';
  let i = open, depth = 0, inStr = null, prev = '';
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
    } else if (c === "'" || c === '"' || c === '`') inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
    prev = c;
    i++;
  }
  return src.slice(open);
}

function readRoutes(src) {
  const routes = [];
  const re = /app\.(get|post|patch|put|delete)\(\s*(\[[\s\S]*?\]|'[^']*')/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const method = m[1].toUpperCase();
    const paths = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);

    // Walk from the end of the path expression to the matching close paren.
    let i = re.lastIndex, depth = 1, inStr = null, prev = '';
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (inStr) {
        if (c === inStr && prev !== '\\') inStr = null;
      } else if (c === "'" || c === '"' || c === '`') {
        inStr = c;
      } else if (c === '(') depth++;
      else if (c === ')') depth--;
      prev = c === '\\' && prev === '\\' ? '' : c;
      i++;
    }
    // i has already stepped past the closing paren, so i-1 drops it. Keeping
    // it left every named handler ending in `)` instead of an identifier,
    // which defeated the name match below and made guarded, audited routes
    // look bare.
    const rest = src.slice(re.lastIndex, i - 1);

    // The middleware chain is everything before the handler.
    //
    // The handler is usually an inline arrow, but several routes pass a NAMED
    // function instead (createStudentHandler and friends). Treating those as
    // "no handler found" left the chain empty, which made a fully guarded
    // route look like it had no authentication at all — so the named case is
    // resolved by going and reading that function's body.
    const handlerAt = rest.search(/(async\s*)?\(\s*req\s*,\s*res/);
    let chain, body;
    if (handlerAt > 0) {
      chain = rest.slice(0, handlerAt);
      body = rest.slice(handlerAt);
    } else {
      chain = rest;
      const named = [...rest.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*$/g)].map(x => x[1]).pop()
        || (rest.match(/,\s*([A-Za-z_$][\w$]*)\s*$/) || [])[1];
      body = named ? namedBody(src, named) : rest;
    }

    const line = src.slice(0, m.index).split('\n').length;
    paths.forEach(p => routes.push({ method, path: p, chain, body, line }));
  }
  return routes;
}


/**
 * Comments removed, with the source's length preserved.
 *
 * The paren and brace walkers below track string state so that a bracket
 * inside a string does not confuse them — but they cannot tell a string from
 * an apostrophe or a backtick inside a COMMENT. One `reversed: false` written
 * in prose opened a template literal that never closed, the walker swallowed
 * the rest of the handler, and a fully audited route was reported as having no
 * audit call at all. A false finding produced by the tool that looks for
 * findings is the worst possible failure mode for this parser, so comments go
 * before anything else reads the text.
 *
 * Each removed character is replaced by a space, so every line number and
 * offset still matches the real file.
 */
function stripComments(src) {
  let out = '';
  let i = 0, inStr = null, prev = '';
  while (i < src.length) {
    const c = src[i], next = src[i + 1];
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      out += c; prev = prev === '\\' && c === '\\' ? '' : c; i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; out += c; prev = c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && next === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' '; i++;
      }
      out += '  '; i += 2;
      continue;
    }
    out += c; prev = c; i++;
  }
  return out;
}

/** Every route in server/app.cjs, parsed once. */
function loadRoutes() {
  const SERVER = fs.readFileSync(
    path.join(__dirname, '..', '..', 'server', 'app.cjs'), 'utf8');
  return readRoutes(stripComments(SERVER));
}

/** The roles a route names, or null when it names none. */
function rolesFor(route) {
  const m = route.chain.match(/requireRole\(([^)]*)\)/);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

/** The permission a route demands, or null. */
function permissionFor(route) {
  const m = route.chain.match(/requirePermission\('([^']+)'\)/);
  return m ? m[1] : null;
}

module.exports = { readRoutes, loadRoutes, rolesFor, permissionFor, namedBody, stripComments };
