import pdfCss from '../styles/pdf.css?raw';

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

/**
 * One stylesheet for every document, loaded from src/styles/pdf.css.
 *
 * Kept as a plain .css file rather than a template literal because the SERVER
 * needs the same bytes: the public receipt page a parent opens from WhatsApp
 * is rendered by Express, and it has to be the same document as the one the
 * counter prints. Two copies of this stylesheet would be two receipts.
 */
export const PDF_CSS = pdfCss;

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
   * Half an A4 sheet, for fee receipts.
   *
   * A4 is 210 x 297mm, so half of it cut across the short edge is
   * 210 x 148.5mm — the same as A5 landscape. Declaring the exact millimetres
   * rather than `A5 landscape` matters: the sheet in the printer is still A4,
   * and the operator cuts it after printing. Naming A5 would make some drivers
   * ask for A5 paper that is not loaded.
   *
   * Margins drop to 8mm because 14mm on a half sheet leaves very little room
   * for the receipt itself.
   */
  halfA4?: boolean;
  /**
   * Print the SAME document twice on one A4 sheet, top and bottom, each
   * labelled — for a receipt where the parent keeps one half and the student
   * or the office keeps the other.
   *
   * Give the two captions in order, top first: `['PARENT COPY', 'STUDENT COPY']`.
   *
   * WHY THIS IS NOT `halfA4` TWICE
   *
   * `halfA4` declares a 210 x 148.5mm PAGE. Two of those are two pages, and a
   * printer given two pages puts them on two sheets unless somebody remembers
   * to ask for two-up — which nobody does at a fee counter on a busy morning.
   * This keeps ONE A4 page and stacks two copies inside it, so what comes out
   * of the tray is a single sheet the clerk cuts once across the middle.
   *
   * Each copy is measured against HALF the printable height, so the fitter
   * shrinks the content to fit its own half rather than the whole sheet.
   *
   * The previous two-copy layout was removed for looking like a till slip at
   * 9.5px. This one is the current receipt design at whatever scale it takes
   * to fit — usually around 0.8 — so the two halves read like the statement
   * they belong with.
   */
  copies?: [string, string];
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

/** The printable area of one sheet, in millimetres, less its @page margins. */
interface Sheet { heightMm: number; widthMm: number; }

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
const fitToSinglePage = (win: Window, sheet: Sheet): void => {
  // Every copy on the sheet. A one-copy document has a single pair and behaves
  // exactly as before; a two-copy receipt has two, and they are measured and
  // scaled INDEPENDENTLY rather than sharing a scale computed from the first.
  //
  // They hold identical content, so in practice both settle on the same number
  // — but only in practice. Reusing one measurement would mean that if they
  // ever diverge (a longer name wrapping in one and not the other, a browser
  // rounding a millimetre differently) the second copy overflows its half and
  // prints across the cut line, and nothing on screen would explain why.
  const shells = Array.from(win.document.querySelectorAll<HTMLElement>('.pdf-fit-shell'));
  for (const shell of shells) {
    const fit = shell.querySelector<HTMLElement>('.pdf-fit');
    if (fit) fitOne(shell, fit, sheet);
  }
};

const fitOne = (shell: HTMLElement, fit: HTMLElement, sheet: Sheet): void => {

  // The sheet this document is actually going onto, less its @page margins.
  // Passed in rather than assumed: this used to hardcode A4, so a half-A4
  // receipt was measured against a page twice its height, judged to fit, and
  // printed unscaled — off the bottom of the sheet it was sized for.
  const availablePx = sheet.heightMm * MM_TO_PX;
  const targetWidthMm = sheet.widthMm;

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
/**
 * The @page rules and the real printable area for one paper choice.
 *
 * Both come from the same decision on purpose. They were separate before —
 * the CSS said half A4 while the fitter measured against full A4 — so a
 * receipt was judged to fit a sheet twice the height it actually had.
 *
 * page-break-inside: avoid is deliberately NOT set on .page. It wraps the
 * whole document, so when the content is taller than the sheet the rule
 * cannot be honoured, and Chrome resolves that by pushing the block onto a
 * fresh page — printing a blank first sheet with the letterhead nowhere in
 * the preview. Keeping a document to one sheet is the fitter's job.
 */
export const pageGeometry = (halfA4: boolean, landscape: boolean, twoCopies = false): { css: string; sheet: Sheet } => {
  // Two copies on one sheet. The PAGE stays A4 — see `copies` in the options
  // for why this is not two half-A4 pages — and each copy is measured against
  // half of what is printable, less the strip the cut line sits in.
  //
  // 297 - 16 (margins) = 281mm printable. The cut rule and its label take 9mm,
  // leaving 272 for the two copies: 136mm each.
  if (twoCopies) {
    return {
      css: `@page { size: A4 portrait; margin: 8mm; }
            .page { max-width: 194mm; }
            .pdf-copy { height: 136mm; overflow: hidden; }
            .pdf-copy + .pdf-cut { margin: 0; }
            /* The cut line, and the only thing between the two copies. */
            .pdf-cut {
              height: 9mm; display: flex; align-items: center; gap: 6px;
              color: #6b7785; font-size: 8px; letter-spacing: 0.12em;
              text-transform: uppercase; font-weight: 700;
            }
            .pdf-cut::before, .pdf-cut::after {
              content: ''; flex: 1; border-top: 1px dashed #9aa7b4;
            }
            /* Which copy this is. Printed at the very top of each half so it
               survives the cut on whichever piece it belongs to. */
            .pdf-copy-label {
              font-size: 8px; font-weight: 800; letter-spacing: 0.14em;
              text-transform: uppercase; color: #087FBC; text-align: right;
              margin-bottom: 2mm;
            }
            @media print { .pdf-print-btn { display: none; } }`,
      sheet: { heightMm: 136, widthMm: 194 }
    };
  }
  // Half A4 wins over landscape if both are asked for — a receipt is a
  // receipt whatever else was requested.
  if (halfA4) {
    return {
      css: `@page { size: 210mm 148.5mm; margin: 8mm; }
            .page { max-width: 194mm; }
            html, body { font-size: 9.5px; }`,
      sheet: { heightMm: 148.5 - 16, widthMm: 194 }
    };
  }
  if (landscape) {
    return {
      css: '@page { size: A4 landscape; margin: 10mm; } .page { max-width: 272mm; }',
      sheet: { heightMm: 210 - 20, widthMm: 272 }
    };
  }
  return { css: '', sheet: { heightMm: 297 - 28, widthMm: 182 } };
};

/**
 * The complete print document, as HTML.
 *
 * Separate from opening the window so the document can be built and inspected
 * without a popup — which is the only way to check that the letterhead
 * actually renders, given browsers block popups outside a click.
 */
export const buildPrintDocument = (
  { title, body, buttonLabel = 'Print / Save as PDF', framed = false, css = '', copies }:
  { title: string; body: string; buttonLabel?: string; framed?: boolean; css?: string; copies?: [string, string] }
): string => {
  const wrapped = framed ? `<div class="pdf-frame">${body}</div>` : body;

  // One copy, or the same document twice with a cut line between.
  //
  // The body is emitted verbatim both times — the two halves must be the same
  // receipt, not two documents that could drift apart. Only the caption above
  // each differs, and it is the caption that tells the clerk which half to
  // hand over.
  const inner = copies
    ? `<div class="pdf-copy"><div class="pdf-fit-shell"><div class="pdf-fit">` +
      `<div class="pdf-copy-label">${escapeHtml(copies[0])}</div>${wrapped}` +
      `</div></div></div>` +
      `<div class="pdf-cut">cut here</div>` +
      `<div class="pdf-copy"><div class="pdf-fit-shell"><div class="pdf-fit">` +
      `<div class="pdf-copy-label">${escapeHtml(copies[1])}</div>${wrapped}` +
      `</div></div></div>`
    : `<div class="pdf-fit-shell"><div class="pdf-fit">${wrapped}</div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${PDF_CSS}${css}</style>
</head>
<body>
<div class="page">
<button class="pdf-print-btn" type="button">${escapeHtml(buttonLabel)}</button>
${inner}
</div>
</body>
</html>`;
};

export const openPrintDocument = ({
  title, body, buttonLabel = 'Print / Save as PDF', onBlocked, landscape = false, framed = false,
  halfA4 = false, copies
}: OpenPrintOptions): boolean => {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked?.();
    return false;
  }

  const { css, sheet } = pageGeometry(halfA4, landscape, Boolean(copies));

  win.document.write(buildPrintDocument({ title, body, buttonLabel, framed, css, copies }));
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
  whenMeasurable(win, () => fitToSinglePage(win, sheet));
  win.addEventListener('beforeprint', () => fitToSinglePage(win, sheet));

  return true;
};
