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
 * The institution name printed on every document.
 *
 * The old templates disagreed with each other: fee statements carried
 * "Inspire Royal Residential Junior College" while payslips and reports said
 * "INSPIRE JUNIOR COLLEGE". Two different names on documents issued by the
 * same office to the same parents. The fuller form is the formal one, so that
 * is what all of them use now.
 */
export const PDF_ORG_NAME = 'Inspire Royal Residential Junior College';

/** Literal palette. Deliberately not CSS variables — see the note above. */
export const PDF_COLORS = {
  ink: '#111827',
  inkSecondary: '#4B5563',
  inkMuted: '#9CA3AF',
  line: '#E5E7EB',
  lineStrong: '#D1D5DB',
  surface: '#FFFFFF',
  surfaceSunken: '#F9FAFB',
  accent: '#2A78D6',
  good: '#1BAF7A',
  goodWash: '#ECFDF5',
  warning: '#EDA100',
  warningWash: '#FFFBEB',
  critical: '#DC2626',
  criticalWash: '#FEF2F2'
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
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; background: #fff; color: ${C.ink};
  font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 11px; line-height: 1.45;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page { max-width: 186mm; margin: 0 auto; }

/* Header */
.pdf-hdr {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; padding: 16px 20px; margin-bottom: 16px;
  background: ${C.ink}; border-radius: 12px; border-bottom: 3px solid ${C.accent};
}
.pdf-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pdf-logo {
  width: 42px; height: 42px; object-fit: contain; flex: none;
  background: #fff; border-radius: 9px; padding: 4px;
}
.pdf-org { color: #fff; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.pdf-sub { color: #C7D2DE; font-size: 9px; margin-top: 2px; }
.pdf-title { text-align: right; flex: none; }
.pdf-title strong { display: block; color: #fff; font-size: 15px; font-weight: 800; text-transform: uppercase; }
.pdf-title span { display: block; color: ${C.warning}; font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }

/* Detail card */
.pdf-card {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  padding: 13px 16px; margin-bottom: 16px;
  background: ${C.surfaceSunken}; border: 1px solid ${C.line}; border-radius: 10px;
}
.pdf-card .k { display: block; font-size: 8px; font-weight: 700; color: ${C.inkSecondary}; text-transform: uppercase; letter-spacing: .05em; }
.pdf-card .v { display: block; font-size: 12px; font-weight: 700; color: ${C.ink}; margin-top: 2px; word-break: break-word; }

/* Section heading */
.pdf-sec {
  font-size: 9px; font-weight: 800; color: ${C.ink}; text-transform: uppercase;
  letter-spacing: .07em; margin: 16px 0 7px; padding-bottom: 4px;
  border-bottom: 1.5px solid ${C.line};
}

/* Tables */
.pdf-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid ${C.lineStrong}; }
.pdf-tbl th {
  padding: 7px 9px; text-align: left; font-size: 8px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .04em;
  background: ${C.surfaceSunken}; color: ${C.inkSecondary};
  border-bottom: 1.5px solid ${C.lineStrong};
}
.pdf-tbl td { padding: 7px 9px; border-bottom: 1px solid ${C.line}; vertical-align: top; }
.pdf-tbl tr:last-child td { border-bottom: none; }
.pdf-tbl .num { text-align: right; font-weight: 700; white-space: nowrap; }
.pdf-tbl .muted { color: ${C.inkMuted}; text-align: center; padding: 14px; }
.pdf-tbl tr.credit td { background: ${C.goodWash}; color: ${C.good}; font-weight: 700; }
.pdf-tbl tfoot td { font-weight: 800; background: ${C.surfaceSunken}; border-top: 1.5px solid ${C.lineStrong}; }

/* Rows must not be split down the middle by a page break, and a long table
   must repeat its header on each page rather than orphaning the columns. */
.pdf-tbl tr { page-break-inside: avoid; }
.pdf-tbl thead { display: table-header-group; }
.pdf-tbl tfoot { display: table-footer-group; }

/* Summary tiles */
.pdf-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-top: 14px; }
.pdf-tile { padding: 11px 13px; border: 1px solid ${C.line}; border-radius: 9px; background: #fff; }
.pdf-tile .k { font-size: 8px; font-weight: 700; color: ${C.inkSecondary}; text-transform: uppercase; letter-spacing: .05em; }
.pdf-tile .v { display: block; margin-top: 4px; font-size: 15px; font-weight: 800; color: ${C.ink}; }
.pdf-tile.good { border-color: ${C.good}; background: ${C.goodWash}; }
.pdf-tile.good .v { color: ${C.good}; }
.pdf-tile.due { border-color: ${C.critical}; background: ${C.criticalWash}; }
.pdf-tile.due .v { color: ${C.critical}; }
.pdf-tile.warn { border-color: ${C.warning}; background: ${C.warningWash}; }
.pdf-tile.warn .v { color: ${C.warning}; }

/* Badges */
.pdf-badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
.pdf-badge.paid { background: ${C.goodWash}; color: ${C.good}; border: 1px solid ${C.good}; }
.pdf-badge.due { background: ${C.criticalWash}; color: ${C.critical}; border: 1px solid ${C.critical}; }
.pdf-badge.part { background: ${C.warningWash}; color: ${C.warning}; border: 1px solid ${C.warning}; }

/* Footer */
.pdf-ftr {
  margin-top: 22px; padding-top: 10px; border-top: 1.5px dashed ${C.lineStrong};
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 8.5px; color: ${C.inkSecondary};
}
.pdf-sig { width: 140px; margin-top: 26px; padding-top: 4px; border-top: 1.5px solid ${C.ink};
  text-align: center; font-size: 8px; font-weight: 800; color: ${C.ink}; text-transform: uppercase; }
.pdf-note { max-width: 60%; line-height: 1.4; }

/* Print button — screen only */
.pdf-print-btn {
  display: block; margin: 0 auto 16px; padding: 10px 26px; cursor: pointer;
  background: ${C.ink}; color: #fff; border: none; border-radius: 9px;
  font-size: 12px; font-weight: 800; font-family: inherit;
}
.pdf-print-btn:hover { background: #000; }
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

export const pdfHeader = ({ logoSrc, title, subtitle, campus }: PdfHeaderOptions): string => `
  <div class="pdf-hdr">
    <div class="pdf-brand">
      <img class="pdf-logo" src="${escapeHtml(logoSrc)}" alt="" />
      <div>
        <div class="pdf-org">${escapeHtml(PDF_ORG_NAME)}</div>
        <div class="pdf-sub">${escapeHtml(campus || 'All Campuses')}${subtitle ? ` &middot; ${escapeHtml(subtitle)}` : ''}</div>
      </div>
    </div>
    <div class="pdf-title">
      <strong>${escapeHtml(title)}</strong>
      <span>${dateTimeStr()}</span>
    </div>
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
}

/**
 * Opens a print window containing one document.
 *
 * Writes the page with document.write rather than assigning innerHTML on a
 * blank document, because the latter leaves the popup's title as "about:blank"
 * — and the title is what the browser offers as the default PDF filename.
 */
export const openPrintDocument = ({ title, body, buttonLabel = 'Print / Save as PDF', onBlocked }: OpenPrintOptions): boolean => {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked?.();
    return false;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${PDF_CSS}</style>
</head>
<body>
<div class="page">
<button class="pdf-print-btn" onclick="window.print()">${escapeHtml(buttonLabel)}</button>
${body}
</div>
</body>
</html>`);
  win.document.close();
  return true;
};
