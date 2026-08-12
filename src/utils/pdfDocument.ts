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
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; background: #fff; color: ${C.ink};
  font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 11px; line-height: 1.45;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page { max-width: 190mm; margin: 0 auto; padding: 2mm; }

/* --- Decorative frame ------------------------------------------------
   A double rule: a thin accent keyline inside a heavier dark border, which
   is the convention on printed certificates and financial statements and
   reads as deliberate rather than as a stray table border.

   Applied only to single-page documents. A bordered box spanning pages
   draws its top edge on the first page and its bottom on the last, leaving
   the middle pages open on two sides — worse than no frame at all. */
.pdf-frame {
  border: 2.5px solid ${C.ink};
  border-radius: 5px;
  padding: 5mm;
  position: relative;
}
.pdf-frame::before {
  content: ''; position: absolute; inset: 2.5mm;
  border: 0.9px solid ${C.accent}; border-radius: 3px; pointer-events: none;
}
.pdf-frame > * { position: relative; }

/* --- Letterhead ------------------------------------------------------ */
.pdf-hdr {
  display: flex; justify-content: space-between; align-items: center;
  gap: 14px; padding: 15px 18px; margin-bottom: 15px;
  background: linear-gradient(135deg, ${C.ink} 0%, #1F2937 100%);
  border-radius: 10px;
  border-bottom: 3px solid ${C.accent};
}
.pdf-brand { display: flex; align-items: center; gap: 15px; min-width: 0; }
.pdf-logo {
  width: 68px; height: 68px; object-fit: contain; flex: none;
  background: #fff; border-radius: 10px; padding: 5px;
  border: 2px solid ${C.accent};
}
.pdf-org {
  color: #fff; font-size: 16.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .05em; line-height: 1.2;
}
.pdf-rule { width: 48px; height: 2.5px; background: ${C.accent}; margin: 6px 0 5px; border-radius: 2px; }
.pdf-sub { color: #C3CEDC; font-size: 9px; letter-spacing: .03em; }
.pdf-title { text-align: right; flex: none; }
.pdf-title strong {
  display: block; color: #fff; font-size: 15px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .05em;
  padding-bottom: 5px; border-bottom: 2px solid ${C.warning};
}
.pdf-title span { display: block; color: ${C.warning}; font-size: 8.5px; font-weight: 700; text-transform: uppercase; margin-top: 5px; }

/* --- Detail card ----------------------------------------------------- */
.pdf-card {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px 16px;
  padding: 13px 16px; margin-bottom: 14px;
  background: ${C.surfaceSunken};
  border: 1px solid ${C.line}; border-left: 4px solid ${C.accent};
  border-radius: 8px;
}
.pdf-card .k { display: block; font-size: 7.5px; font-weight: 700; color: ${C.inkSecondary}; text-transform: uppercase; letter-spacing: .07em; }
.pdf-card .v { display: block; font-size: 12px; font-weight: 700; color: ${C.ink}; margin-top: 2px; word-break: break-word; }

/* --- Section heading -------------------------------------------------- */
.pdf-sec {
  display: flex; align-items: center; gap: 8px;
  font-size: 9.5px; font-weight: 800; color: ${C.ink}; text-transform: uppercase;
  letter-spacing: .09em; margin: 18px 0 8px;
}
.pdf-sec::before { content: ''; width: 4px; height: 13px; background: ${C.accent}; border-radius: 2px; flex: none; }
.pdf-sec::after { content: ''; flex: 1; height: 1px; background: ${C.line}; }

/* --- Tables ----------------------------------------------------------- */
.pdf-tbl {
  width: 100%; border-collapse: collapse; font-size: 10.5px;
  border: 1.5px solid ${C.ink};
}
.pdf-tbl th {
  padding: 8px 10px; text-align: left; font-size: 8px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .06em;
  background: ${C.ink}; color: #fff;
  border-right: 1px solid rgba(255,255,255,0.15);
}
.pdf-tbl th:last-child { border-right: none; }
.pdf-tbl td { padding: 7px 10px; border-bottom: 1px solid ${C.line}; border-right: 1px solid ${C.line}; vertical-align: top; }
.pdf-tbl td:last-child { border-right: none; }
.pdf-tbl tbody tr:nth-child(even) td { background: #FBFCFD; }
.pdf-tbl tbody tr:last-child td { border-bottom: none; }
.pdf-tbl .num { text-align: right; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pdf-tbl .muted { color: ${C.inkMuted}; text-align: center; padding: 16px; font-style: italic; }
.pdf-tbl tr.credit td { background: ${C.goodWash}; color: ${C.good}; font-weight: 700; }
.pdf-tbl tfoot td {
  font-weight: 800; font-size: 11px; background: ${C.surfaceSunken};
  border-top: 2px solid ${C.ink}; color: ${C.ink};
}

/* Rows must not be split down the middle by a page break, and a long table
   must repeat its header on each page rather than orphaning the columns. */
.pdf-tbl tr { page-break-inside: avoid; }
.pdf-tbl thead { display: table-header-group; }
.pdf-tbl tfoot { display: table-footer-group; }

/* --- Summary tiles ---------------------------------------------------- */
.pdf-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.pdf-tile {
  padding: 12px 14px; border: 1.5px solid ${C.lineStrong};
  border-top: 3px solid ${C.ink}; border-radius: 8px; background: #fff;
}
.pdf-tile .k { font-size: 7.5px; font-weight: 700; color: ${C.inkSecondary}; text-transform: uppercase; letter-spacing: .07em; }
.pdf-tile .v { display: block; margin-top: 5px; font-size: 16px; font-weight: 800; color: ${C.ink}; font-variant-numeric: tabular-nums; }
.pdf-tile.good { border-top-color: ${C.good}; background: ${C.goodWash}; border-color: ${C.good}; }
.pdf-tile.good .v { color: ${C.good}; }
.pdf-tile.due { border-top-color: ${C.critical}; background: ${C.criticalWash}; border-color: ${C.critical}; }
.pdf-tile.due .v { color: ${C.critical}; }
.pdf-tile.warn { border-top-color: ${C.warning}; background: ${C.warningWash}; border-color: ${C.warning}; }
.pdf-tile.warn .v { color: ${C.warning}; }

/* --- Badges ----------------------------------------------------------- */
.pdf-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
.pdf-badge.paid { background: ${C.goodWash}; color: ${C.good}; border: 1.2px solid ${C.good}; }
.pdf-badge.due { background: ${C.criticalWash}; color: ${C.critical}; border: 1.2px solid ${C.critical}; }
.pdf-badge.part { background: ${C.warningWash}; color: ${C.warning}; border: 1.2px solid ${C.warning}; }

/* --- Footer ----------------------------------------------------------- */
.pdf-ftr {
  margin-top: 26px; padding-top: 12px;
  border-top: 2px solid ${C.ink};
  display: flex; justify-content: space-between; align-items: flex-end;
  font-size: 8.5px; color: ${C.inkSecondary};
}
.pdf-sig {
  width: 150px; margin-top: 30px; padding-top: 5px;
  border-top: 1.5px solid ${C.ink}; text-align: center;
  font-size: 8px; font-weight: 800; color: ${C.ink};
  text-transform: uppercase; letter-spacing: .06em;
}
.pdf-note { max-width: 58%; line-height: 1.5; }
.pdf-note strong { color: ${C.ink}; }

/* --- Print button, screen only ---------------------------------------- */
.pdf-print-btn {
  display: block; margin: 0 auto 14px; padding: 11px 28px; cursor: pointer;
  background: ${C.ink}; color: #fff; border: none; border-radius: 8px;
  font-size: 12px; font-weight: 800; font-family: inherit; letter-spacing: .03em;
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
        <div class="pdf-rule"></div>
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
<button class="pdf-print-btn" onclick="window.print()">${escapeHtml(buttonLabel)}</button>
${framed ? `<div class="pdf-frame">${body}</div>` : body}
</div>
</body>
</html>`);
  win.document.close();
  return true;
};
