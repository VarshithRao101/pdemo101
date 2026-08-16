/**
 * Shared print/PDF document system.
 *
 * Every printable document in the app used to carry its own copy of a large
 * CSS string — ten copies, drifting apart — and every one of them styled
 * itself with the app's theme variables: `var(--ink)`, `var(--accent)`,
 * `var(--good)` and so on.
 *
 * Those variables do not exist in a print window. The documents are rendered
 * into `window.open('', '_blank')`, which has no stylesheet at all, so all 170
 * of those references resolved to nothing. The visible result was worse than
 * "slightly off colours": the page header sets
 *
 *     .hdr  { background: linear-gradient(135deg, var(--ink), var(--ink)) }
 *     .iname{ color: #fff }
 *
 * so with the variable undefined the header had NO background and the college
 * name was white text on white paper — invisible on every statement, payslip,
 * bill and ledger the college has ever printed.
 *
 * Everything here uses literal colours for that reason. A print document must
 * be self-contained; it cannot borrow from the app it was launched from.
 */

/**
 * The institution name.
 *
 * Used for the document <title>, which is what a browser offers as the
 * default PDF filename. It is NOT printed in the letterhead: the official
 * logo already contains the name, so setting it again beside the logo would
 * print it twice on every page.
 */
export const PDF_ORG_NAME = 'Inspire Junior College';

/**
 * Monochrome palette. Black, white and grey only.
 *
 * Still literal values rather than CSS variables — that is what made the old
 * documents print white-on-white, and the reason has not changed.
 *
 * The semantic names are kept so call sites do not all have to change, but
 * they now resolve to greys. Emphasis on these documents comes from weight,
 * rules and whitespace, never from hue. The one exception on the page is the
 * college logo itself, which is a brand asset and stays as issued.
 */
export const PDF_COLORS = {
  ink: '#111111',
  inkSecondary: '#555555',
  inkMuted: '#8A8A8A',
  line: '#DDDDDD',
  lineStrong: '#BBBBBB',
  surface: '#FFFFFF',
  surfaceSunken: '#F5F5F5',
  // Retained as aliases so existing call sites keep compiling. Anything that
  // used to be blue, green, amber or red is now simply ink or a grey.
  accent: '#111111',
  good: '#111111',
  goodWash: '#F5F5F5',
  warning: '#555555',
  warningWash: '#F5F5F5',
  critical: '#111111',
  criticalWash: '#F5F5F5'
} as const;

const C = PDF_COLORS;

/**
 * One stylesheet for every document.
 *
 * `print-color-adjust: exact` is load-bearing: without it browsers drop
 * background fills when printing, which would take the header and every
 * status badge back to plain white.
 */
export const PDF_CSS = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; background: #fff; color: ${C.ink};
  font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 10.5px; line-height: 1.5;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page { max-width: 182mm; margin: 0 auto; }

/* --- One-page fitting --------------------------------------------------
   Every document in this app is meant to come out as a single sheet. The
   content is wrapped in .pdf-fit so the opener can measure it (the print
   button is outside the wrapper and must not count towards the height) and
   scale it down until it fits.

   The shell exists because a transform is purely visual: a scaled element
   still occupies its original height in layout, which would push a blank
   second page. The opener sets the shell's height to the SCALED height so
   the layout box matches what is actually drawn. Both are left untouched
   when the document already fits, which is the common case. */
.pdf-fit { transform-origin: top left; display: flow-root; }
.pdf-fit-shell { overflow: hidden; }

/* --- Frame ------------------------------------------------------------
   A single hairline. The earlier version used a heavy border with a second
   inset keyline, which fought the content for attention on a page whose job
   is to present numbers.

   Single-page documents only: a bordered box spanning pages draws its top
   edge on the first page and its bottom on the last, leaving middle pages
   open on two sides. */
.pdf-frame { border: 1px solid ${C.line}; padding: 6mm; }

/* --- Letterhead -------------------------------------------------------
   The logo is the letterhead. It already contains the college name, the
   stream badge and the tagline, so setting the name again beside it would
   print it twice. */
.pdf-hdr {
  text-align: center;
  padding-bottom: 8px; margin-bottom: 4px;
  border-bottom: 1px solid ${C.ink};
}
.pdf-logo { width: 200px; max-width: 50%; height: auto; display: block; margin: 0 auto 8px; }
.pdf-sub {
  color: ${C.inkSecondary}; font-size: 8.5px;
  letter-spacing: .16em; text-transform: uppercase;
}
.pdf-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 5px 0 0; margin-bottom: 10px;
  font-size: 8px; color: ${C.inkSecondary};
  letter-spacing: .1em; text-transform: uppercase;
}
.pdf-doctype { font-size: 12px; font-weight: 700; color: ${C.ink}; letter-spacing: .18em; }

/* --- Detail block ----------------------------------------------------- */
.pdf-card {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px;
  padding: 8px 0 10px; margin-bottom: 3px;
  border-bottom: 1px solid ${C.line};
}
.pdf-card .k { display: block; font-size: 7.5px; font-weight: 600; color: ${C.inkMuted}; text-transform: uppercase; letter-spacing: .1em; }
.pdf-card .v { display: block; font-size: 11.5px; font-weight: 600; color: ${C.ink}; margin-top: 3px; word-break: break-word; }

/* --- Section heading -------------------------------------------------- */
.pdf-sec {
  font-size: 8.5px; font-weight: 700; color: ${C.ink};
  text-transform: uppercase; letter-spacing: .16em;
  margin: 12px 0 6px; padding-bottom: 4px;
  border-bottom: 1px solid ${C.line};
}

/* --- Tables ------------------------------------------------------------
   Horizontal rules only. Vertical gridlines and banded fills turn a short
   table into a block of texture; on a fee statement the numbers should be
   the darkest thing on the page. */
.pdf-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.pdf-tbl th {
  padding: 5px 6px 4px; text-align: left;
  font-size: 7.5px; font-weight: 700; color: ${C.inkSecondary};
  text-transform: uppercase; letter-spacing: .1em;
  border-bottom: 1px solid ${C.ink};
}
.pdf-tbl td { padding: 4px 6px; border-bottom: 1px solid ${C.line}; vertical-align: top; }
.pdf-tbl .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
/* The one way to emphasise a figure. Call sites used to set colour and weight
   inline, differently in each document; with a greyscale palette those became
   stray weights that made otherwise identical tables look unalike. */
.pdf-strong { font-weight: 700; color: ${C.ink}; }
.pdf-dim { color: ${C.inkMuted}; }

/* Proportion bar, for reports that show a share of a total. Monochrome: a
   dark fill on a light track, no rounded ends, no colour coding. */
.pdf-bar { height: 5px; background: ${C.line}; margin-top: 4px; overflow: hidden; }
.pdf-bar > span { display: block; height: 5px; background: ${C.ink}; }

/* Small boxed note, for a summary line inside a report. */
.pdf-callout { padding: 8px 10px; background: ${C.surfaceSunken}; font-size: 10px; }
.pdf-callout-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; color: ${C.ink}; }
.pdf-tbl .muted { color: ${C.inkMuted}; text-align: center; padding: 18px; }
.pdf-tbl tr.credit td { color: ${C.inkSecondary}; }
.pdf-tbl tfoot td {
  font-weight: 700; font-size: 11px; color: ${C.ink};
  border-top: 1px solid ${C.ink}; border-bottom: none; padding-top: 8px;
}

/* Rows must not be split down the middle by a page break, and a long table
   must repeat its header on each page rather than orphaning the columns. */
.pdf-tbl tr { page-break-inside: avoid; }
.pdf-tbl thead { display: table-header-group; }
.pdf-tbl tfoot { display: table-footer-group; }

/* --- Summary figures ---------------------------------------------------
   Separated by rules rather than boxed. Four bordered cards in a row read as
   four buttons; these read as a summary. */
.pdf-tiles {
  display: grid; grid-template-columns: repeat(4, 1fr);
  margin-top: 10px; border-top: 1px solid ${C.ink}; border-bottom: 1px solid ${C.line};
}
.pdf-tile { padding: 8px 10px; border-right: 1px solid ${C.line}; }
.pdf-tile:last-child { border-right: none; }
.pdf-tile .k { font-size: 7.5px; font-weight: 600; color: ${C.inkMuted}; text-transform: uppercase; letter-spacing: .1em; }
.pdf-tile .v { display: block; margin-top: 3px; font-size: 13px; font-weight: 700; color: ${C.ink}; font-variant-numeric: tabular-nums; }
/* Emphasis is weight and rule, never hue. */
.pdf-tile.good .v, .pdf-tile.warn .v { color: ${C.ink}; }
.pdf-tile.due { background: ${C.surfaceSunken}; }
.pdf-tile.due .v { color: ${C.ink}; }

/* --- Status labels ----------------------------------------------------- */
.pdf-badge {
  display: inline-block; padding: 2px 7px;
  font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  border: 1px solid ${C.lineStrong}; color: ${C.inkSecondary};
}
.pdf-badge.paid { border-color: ${C.ink}; color: ${C.ink}; }
.pdf-badge.due { border-color: ${C.ink}; color: #fff; background: ${C.ink}; }
.pdf-badge.part { border-color: ${C.inkSecondary}; color: ${C.inkSecondary}; }

/* --- Footer ------------------------------------------------------------ */
.pdf-ftr {
  margin-top: 16px; padding-top: 8px;
  border-top: 1px solid ${C.line};
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 8px; color: ${C.inkMuted}; line-height: 1.6;
}
.pdf-sig {
  width: 150px; margin-top: 20px; padding-top: 5px;
  border-top: 1px solid ${C.ink}; text-align: center;
  font-size: 7.5px; font-weight: 600; color: ${C.ink};
  text-transform: uppercase; letter-spacing: .12em;
}
.pdf-note { max-width: 58%; }
.pdf-note strong { color: ${C.inkSecondary}; font-weight: 600; }

/* --- Print button, screen only ----------------------------------------- */
.pdf-print-btn {
  display: block; margin: 0 auto 18px; padding: 10px 26px; cursor: pointer;
  background: #fff; color: ${C.ink}; border: 1px solid ${C.ink}; border-radius: 2px;
  font-size: 10px; font-weight: 700; font-family: inherit;
  letter-spacing: .12em; text-transform: uppercase;
}
.pdf-print-btn:hover { background: ${C.ink}; color: #fff; }
@media print { .pdf-print-btn { display: none !important; } }
`;

/** HTML-escapes a value for interpolation into a print document. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Indian-format currency, always with the unit, never NaN. */
export const money = (value: unknown): string => {
  const n = Number(value);
  return `Rs. ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;
};

/** A date, or an em dash — never "Invalid Date". */
export const dateStr = (value: unknown): string => {
  if (!value) return '—';
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
};

export const dateTimeStr = (value: unknown = new Date()): string => {
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export interface PdfHeaderOptions {
  logoSrc: string;
  title: string;
  subtitle?: string;
  campus?: string;
}

/**
 * Centred letterhead: the official logo, large, and nothing competing with it.
 *
 * The logo carries the college name, the stream badge and the tagline, so no
 * name is set alongside it — the previous layout printed "Inspire Junior
 * College" in type immediately next to a logo that already said exactly that.
 *
 * The document type and campus sit below the rule in small letterspaced caps,
 * which keeps the top of the page quiet and makes the logo the only thing
 * anyone sees first.
 */
export const pdfHeader = ({ logoSrc, title, subtitle, campus }: PdfHeaderOptions): string => `
  <div class="pdf-hdr">
    <img class="pdf-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(PDF_ORG_NAME)}" />
    ${subtitle ? `<div class="pdf-sub">${escapeHtml(subtitle)}</div>` : ''}
  </div>
  <div class="pdf-meta">
    <span class="pdf-doctype">${escapeHtml(title)}</span>
    <span>${escapeHtml(campus || 'All Campuses')} &nbsp;&middot;&nbsp; ${dateTimeStr()}</span>
  </div>
`;

export interface PdfFooterOptions {
  note?: string;
  signatory?: string;
  generatedBy?: string;
}

export const pdfFooter = ({ note, signatory = 'Authorised Signatory', generatedBy }: PdfFooterOptions = {}): string => `
  <div class="pdf-ftr">
    <div class="pdf-note">
      ${escapeHtml(note || 'This is a computer-generated document. Retain it for your records.')}
      ${generatedBy ? `<br/>Generated by ${escapeHtml(generatedBy)} on ${dateTimeStr()}.` : ''}
    </div>
    <div class="pdf-sig">${escapeHtml(signatory)}</div>
  </div>
`;

/** A card of label/value pairs. Empty values are dropped rather than printed blank. */
export const pdfDetailCard = (pairs: Array<[string, unknown]>): string => {
  const cells = pairs
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<div><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`)
    .join('');
  return cells ? `<div class="pdf-card">${cells}</div>` : '';
};

export interface PdfTableOptions {
  headers: string[];
  rows: string[][];
  /** Column indexes to right-align as numbers. */
  numeric?: number[];
  footer?: string[];
  emptyMessage?: string;
}

export const pdfTable = ({ headers, rows, numeric = [], footer, emptyMessage = 'No records.' }: PdfTableOptions): string => {
  const cls = (i: number) => (numeric.includes(i) ? ' class="num"' : '');
  const head = `<thead><tr>${headers.map((h, i) => `<th${cls(i)}>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const body = rows.length
    ? rows.map(r => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="muted" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`;
  const foot = footer
    ? `<tfoot><tr>${footer.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr></tfoot>`
    : '';
  return `<table class="pdf-tbl">${head}<tbody>${body}</tbody>${foot}</table>`;
};

export const pdfSection = (title: string): string => `<div class="pdf-sec">${escapeHtml(title)}</div>`;

export interface PdfTile { label: string; value: string; tone?: 'good' | 'due' | 'warn' }

export const pdfTiles = (tiles: PdfTile[]): string => `
  <div class="pdf-tiles">
    ${tiles.map(t => `
      <div class="pdf-tile${t.tone ? ` ${t.tone}` : ''}">
        <span class="k">${escapeHtml(t.label)}</span>
        <span class="v">${escapeHtml(t.value)}</span>
      </div>`).join('')}
  </div>
`;

export interface OpenPrintOptions {
  title: string;
  body: string;
  /** Button caption; the button is hidden when printing. */
  buttonLabel?: string;
  /** Called when the popup could not be opened, so the caller can warn. */
  onBlocked?: () => void;
  /** Landscape for wide tables — an audit ledger does not fit in portrait. */
  landscape?: boolean;
  /**
   * Draws the decorative double border.
   *
   * Only for documents that fit on one page — a receipt, payslip or bill. A
   * bordered box that spans pages draws its top edge on the first page and
   * its bottom on the last, leaving the middle pages open on two sides, which
   * looks like a rendering fault rather than a frame. Long ledgers and audit
   * reports therefore leave it off.
   */
  framed?: boolean;
}

/** CSS absolute units: 1mm is 96/25.4 px by definition, at any zoom. */
const MM_TO_PX = 96 / 25.4;

/**
 * The smallest the content may be shrunk.
 *
 * Below about half size the figures on a fee statement stop being readable in
 * print, and an unreadable single page is worse than two readable ones. A
 * document that still does not fit at this scale — a ledger with a few hundred
 * rows — is allowed to run on rather than be reduced to noise.
 */
const MIN_FIT_SCALE = 0.5;

/**
 * Shrinks the document until it fits on exactly one sheet.
 *
 * Measured in millimetres against the real printable area rather than against
 * the popup's window size, which is whatever the browser felt like and has no
 * relationship to the paper.
 *
 * The loop exists because the two variables are coupled: scaling to 0.8 leaves
 * the content only 80% as wide, so the wrapper is widened to compensate — and
 * at a greater width the text rewraps into fewer lines, so the height drops
 * and less shrinking is needed than the first pass calculated. Each pass gets
 * closer; four is comfortably more than enough to settle.
 */
const fitToSinglePage = (win: Window, landscape: boolean): void => {
  const shell = win.document.querySelector<HTMLElement>('.pdf-fit-shell');
  const fit = win.document.querySelector<HTMLElement>('.pdf-fit');
  if (!shell || !fit) return;

  // A4 less the @page margins declared above: 297−28 portrait, 210−20 landscape.
  const availablePx = (landscape ? 210 - 20 : 297 - 28) * MM_TO_PX;
  const targetWidthMm = landscape ? 272 : 182;

  let scale = 1;
  for (let pass = 0; pass < 4; pass++) {
    fit.style.transform = 'none';
    fit.style.width = `${targetWidthMm / scale}mm`;
    // scrollHeight is the LAYOUT height and ignores transforms, which is what
    // is wanted here — the drawn height is that value times the scale.
    const naturalPx = fit.scrollHeight;
    if (naturalPx * scale <= availablePx) break;
    const next = Math.max(MIN_FIT_SCALE, scale * (availablePx / (naturalPx * scale)));
    if (Math.abs(next - scale) < 0.005) { scale = next; break; }
    scale = next;
  }

  if (scale >= 1) {
    // Already a single page. Leave it exactly as the document was authored
    // rather than reapplying a no-op transform, which would still force the
    // content onto its own compositing layer and can soften text in print.
    fit.style.transform = '';
    fit.style.width = '';
    shell.style.height = '';
    return;
  }

  fit.style.width = `${targetWidthMm / scale}mm`;
  fit.style.transform = `scale(${scale})`;
  shell.style.height = `${fit.scrollHeight * scale}px`;
};

/**
 * Runs `cb` once the document is actually measurable.
 *
 * Measuring before the letterhead logo has loaded reads a height with a
 * zero-height image in it, which is exactly the case where the answer is most
 * wrong — the logo is the single tallest element on a short receipt.
 */
const whenMeasurable = (win: Window, cb: () => void): void => {
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    cb();
  };

  const pending = Array.from(win.document.images).filter(img => !img.complete);
  let left = pending.length;

  const settle = () => {
    if (left > 0 && --left > 0) return;
    // Fonts change metrics too, and swap in after the images on a cold load.
    const fonts = (win.document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) fonts.ready.then(run, run);
    else run();
  };

  if (!left) settle();
  else pending.forEach(img => {
    img.addEventListener('load', settle);
    img.addEventListener('error', settle);
  });

  // A stalled or blocked image must not leave the document unscaled forever.
  win.setTimeout(run, 2000);
};

/**
 * Opens a print window containing one document.
 *
 * Writes the page with document.write rather than assigning innerHTML on a
 * blank document, because the latter leaves the popup's title as "about:blank"
 * — and the title is what the browser offers as the default PDF filename.
 */
export const openPrintDocument = ({
  title, body, buttonLabel = 'Print / Save as PDF', onBlocked, landscape = false, framed = false
}: OpenPrintOptions): boolean => {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked?.();
    return false;
  }

  const orientation = landscape
    ? '@page { size: A4 landscape; margin: 10mm; } .page { max-width: 272mm; }'
    : '';

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${PDF_CSS}${orientation}</style>
</head>
<body>
<div class="page">
<button class="pdf-print-btn" type="button">${escapeHtml(buttonLabel)}</button>
<div class="pdf-fit-shell"><div class="pdf-fit">
${framed ? `<div class="pdf-frame">${body}</div>` : body}
</div></div>
</div>
</body>
</html>`);
  win.document.close();

  // The button's handler is attached from here rather than written into the
  // markup as onclick="window.print()".
  //
  // A window opened on about:blank inherits the OPENER's Content Security
  // Policy, and that policy no longer allows inline script — an inline
  // handler would be blocked and the button would look normal while doing
  // nothing at all. Attaching the listener from this side is ordinary bundled
  // code, so it runs under 'self' and the policy stays strict.
  win.document.querySelector('.pdf-print-btn')
    ?.addEventListener('click', () => win.print());

  // Fit to one page, for the same reason and by the same route: this is the
  // opener's own bundled code reaching into the popup, so it needs no script
  // in the document and stays inside `script-src 'self'`.
  //
  // Measured twice on purpose. Once when the content settles, so what is on
  // screen is what will print; and again on `beforeprint`, which is the only
  // moment the browser guarantees final layout — a window resized between
  // opening and printing rewraps the text, and the first measurement would be
  // describing a layout that no longer exists.
  whenMeasurable(win, () => fitToSinglePage(win, landscape));
  win.addEventListener('beforeprint', () => fitToSinglePage(win, landscape));

  return true;
};
