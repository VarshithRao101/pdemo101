"""
Turn the college's "Inspire Students Fee Dashboard.xlsx" into one clean JSON
file that scripts/importFeeExcel.cjs loads into the database.

    python scripts/extract_fee_excel.py <workbook.xlsx> <outDir>

Writes <outDir>/students.json and <outDir>/review.csv (every row, with what
was changed or assumed). Nothing here touches the database.

The six campus tabs are the source of truth: their totals are exactly the
workbook's own Dashboard, and the import is checked against that Dashboard.
The side sheets are read only for Freshers Party Fee and Lab Fee, matched to
a student by admission number where the side sheet has one, else by name.

Rules (agreed with the operator on 2026-10-31):
  - Party/Lab fee: added to the student it belongs to; blank stays blank.
    They are listed in the side sheets as money collected (Sheet6 even says
    Cash / Society), so each becomes a fee head AND a matching receipt.
  - "Drop" / "Free" in the last column -> imported as Inactive.
  - A blank admission number, a group label in its place, or B2's serial
    numbers -> a temporary number, flagged for the college to replace.
  - The same admission number on two students -> the first keeps it, the
    second gets "<adm>-<campus>", and both are flagged.
"""
import difflib
import json
import os
import sys
import csv

import openpyxl

TABS = [
    # tab, code, campus, year
    ('Main Campus 1st year', 'M1', 'Erragattugutta C2', 'First Year'),
    ('Main Campus 2nd year', 'M2', 'Erragattugutta C2', 'Second Year'),
    ('IIT & NEET 1st Year', 'N1', 'Erragattugutta C1', 'First Year'),
    ('IIT &NEET 2nd Year', 'N2', 'Erragattugutta C1', 'Second Year'),
    # Neither boys' tab states a year. B1's admission numbers are this year's
    # 3xxx series and B2's names are the college's 2nd-year boys' ledger.
    ('B1 campus', 'B1', 'Beemaram C1', 'First Year'),
    ('B2 Campus', 'B2', 'Beemaram C2', 'Second Year'),
]

# B2 is laid out in blocks by group, each restarting its serial number.
# Rows that carry the group name instead of a serial confirm the block.
B2_BLOCKS = [(2, 94, 'MPC-EAPCET'), (95, 118, 'MPC-IIT'), (119, 132, 'BIPC-EAPCET/NEET'), (133, 144, 'CEC')]

DASHBOARD_COLS = ['students', 'commitment', 'tuition', 'others', 'total', 'tuitionPaid', 'othersPaid', 'totalPaid', 'due75']


def num(v):
    if v is None or (isinstance(v, str) and not v.strip()):
        return 0
    if isinstance(v, (int, float)):
        return v
    return float(str(v).replace(',', '').strip())


def norm(s):
    return ' '.join(str(s or '').lower().replace('.', ' ').split())


def adm_of(v):
    """A real admission number, or None for blanks, labels and serials."""
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    return s if s.isdigit() and int(s) >= 1000 else None


def main(path, out_dir):
    wb = openpyxl.load_workbook(path, data_only=True)
    os.makedirs(out_dir, exist_ok=True)

    students = []
    for tab, code, campus, year in TABS:
        ws = wb[tab]
        for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            r = list(r) + [None] * 14
            name = str(r[1] or '').strip()
            if not name or name.upper().startswith('TOTAL'):
                continue
            kind = str(r[10] or '').strip()
            s = {
                'tab': tab, 'code': code, 'row': i, 'campus': campus, 'year': year,
                'rawAdm': '' if r[0] is None else str(r[0]).strip(),
                'adm': adm_of(r[0]), 'name': ' '.join(name.split()),
                'commitment': num(r[2]), 'tuition': num(r[3]), 'others': num(r[4]), 'total': num(r[5]),
                'tuitionPaid': num(r[6]), 'othersPaid': num(r[7]), 'totalPaid': num(r[8]),
                'due75': num(r[9]), 'kind': kind,
                'course': '', 'party': 0, 'lab': 0, 'labMode': '', 'flags': [],
                'active': kind.lower() not in ('drop', 'free'),
            }
            # The workbook's own arithmetic, re-checked rather than trusted.
            if s['tuition'] + s['others'] != s['total']:
                s['flags'].append(f"Tuition {s['tuition']} + Others {s['others']} != Total {s['total']} in the Excel")
            if s['tuitionPaid'] + s['othersPaid'] != s['totalPaid']:
                s['flags'].append(f"Tuition paid + Others paid != Total paid in the Excel")
            if s['totalPaid'] > s['total']:
                s['flags'].append(f"Paid {s['totalPaid']} is more than the total fee {s['total']} (overpaid {s['totalPaid'] - s['total']})")
            if not s['active']:
                s['flags'].append(f"Marked '{kind}' in the Excel - imported as Inactive")
            if code == 'B2':
                s['course'] = next(c for a, b, c in B2_BLOCKS if a <= i <= b)
            if r[0] is not None and not s['adm'] and code != 'B2':
                s['flags'].append(f"Admission column held '{r[0]}', not a number")
            if 'DAYS' in name.upper():
                s['flags'].append('Name says DAYS (day scholar?)')
            # Main 1st year carries Party/Lab on the tab itself.
            if code == 'M1':
                s['party'], s['lab'] = num(r[11]), num(r[12])
            students.append(s)

    check_dashboard(wb, students)
    attach_party_lab(wb, students)
    assign_admission_numbers(students)

    for s in students:
        s['remaining'] = max(0, s['total'] - s['totalPaid'])

    with open(os.path.join(out_dir, 'students.json'), 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=1)
    cols = ['code', 'row', 'rawAdm', 'admissionNumber', 'name', 'campus', 'year', 'course', 'active', 'tuition', 'others',
            'total', 'tuitionPaid', 'othersPaid', 'totalPaid', 'remaining', 'due75', 'party', 'lab', 'labMode', 'flags']
    with open(os.path.join(out_dir, 'review.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(cols)
        for s in students:
            w.writerow([' | '.join(s['flags']) if c == 'flags' else s.get(c, '') for c in cols])

    print(f"{len(students)} students -> {out_dir}")
    print(f"  flagged {sum(1 for s in students if s['flags'])}, inactive {sum(1 for s in students if not s['active'])}, "
          f"temporary adm {sum(1 for s in students if s['admissionNumber'].startswith('T'))}")
    print(f"  party fees {sum(1 for s in students if s['party'])} = {sum(s['party'] for s in students)}, "
          f"lab fees {sum(1 for s in students if s['lab'])} = {sum(s['lab'] for s in students)}")


def check_dashboard(wb, students):
    """Fail loudly unless the tabs add up to the workbook's own Dashboard."""
    ws = wb['Dashboard']
    rows = {str(r[0]).strip(): r for r in ws.iter_rows(min_row=5, values_only=True) if r[0]}
    for tab, code, _, _ in TABS:
        d = rows[tab.strip()]
        mine = [s for s in students if s['tab'] == tab]
        got = [sum(s[k] for s in mine) for k in DASHBOARD_COLS[1:]]
        want = [num(x) for x in d[2:10]]
        if got != want:
            raise SystemExit(f"{tab}: tab sums {got} do not match Dashboard {want}")
        # The Dashboard's student counts are typed in, not formulas, so a
        # wrong count there is reported rather than treated as a data error.
        if len(mine) != num(d[1]):
            print(f"  NOTE {tab}: Dashboard says {d[1]} students, the tab lists {len(mine)}")
    print('Every money column matches the Dashboard.')


def side_rows(wb, sheet, adm_col, name_col, party_col, lab_col, first_row):
    out = []
    for r in wb[sheet].iter_rows(min_row=first_row, values_only=True):
        r = list(r) + [None] * 12
        if not r[name_col] or str(r[name_col]).strip().upper().startswith('TOTAL'):
            continue
        # Sheet4 repeats its header row between the two years.
        if str(r[name_col]).strip().lower() in ('name', 'student name'):
            continue
        party = num(r[party_col]) if party_col is not None else 0
        lab = num(r[lab_col]) if lab_col is not None else 0
        out.append({'adm': adm_of(r[adm_col]) if adm_col is not None else None, 'name': str(r[name_col]).strip(),
                    'party': party, 'lab': lab, 'note': str(r[4] or '').strip() if sheet == 'Sheet2 (2)' else ''})
    return out


def match(pool, row, used):
    """The pool student this side-sheet row is about, or None."""
    if row['adm']:
        hits = [s for s in pool if s['adm'] == row['adm'] and norm(s['name'])[:4] == norm(row['name'])[:4]]
        if len(hits) == 1:
            return hits[0]
    names = [norm(s['name']) for s in pool]
    exact = [s for s in pool if norm(s['name']) == norm(row['name'])]
    if len(exact) == 1:
        return exact[0]
    close = difflib.get_close_matches(norm(row['name']), names, 2, 0.84)
    if len(close) == 1 or (len(close) == 2 and difflib.SequenceMatcher(None, norm(row['name']), close[0]).ratio() > 0.92):
        return pool[names.index(close[0])]
    return None


def attach_party_lab(wb, students):
    by = lambda codes: [s for s in students if s['code'] in codes]
    unmatched = []

    def apply(rows, pool, source, mode_of=None):
        used = set()
        for row in rows:
            if not row['party'] and not row['lab']:
                continue
            s = match(pool, row, used)
            if not s:
                unmatched.append((source, row['adm'], row['name'], row['party'], row['lab']))
                continue
            if id(s) in used:
                s['flags'].append(f"{source} lists this student twice - second entry ignored")
                continue
            used.add(id(s))
            for k in ('party', 'lab'):
                if row[k] and s[k] and s[k] != row[k]:
                    s['flags'].append(f"{k} fee {s[k]} on the campus tab but {row[k]} in {source} - campus tab kept")
                elif row[k] and not s[k]:
                    s[k] = row[k]
            if row['lab'] and mode_of:
                s['labMode'] = mode_of(row)
            if norm(s['name']) != norm(row['name']):
                s['flags'].append(f"Party/Lab fee matched from {source} entry '{row['name']}'")
            if row.get('note'):
                s['flags'].append(f"{source} note: {row['note']}")

    apply(side_rows(wb, 'Sheet4', 0, 1, 11, 12, 3), by({'M1', 'M2'}), 'Sheet4 (Main Campus)')
    apply(side_rows(wb, 'Sheet3', 0, 1, 2, 3, 3), by({'N1', 'N2'}), 'Sheet3 (IIT & NEET)')
    apply(side_rows(wb, 'Sheet2 (2)', 0, 1, 2, 3, 3), by({'B1'}), 'Sheet2 (2) (B1)')
    apply(side_rows(wb, 'Sheet6', None, 0, 1, 2, 3), by({'B2'}), 'Sheet6 (B2)')

    # Sheet6's E2 and E1 lists: lab fee only, paid in Cash or through Society.
    for name_col, label in ((4, 'Sheet6 E2'), (8, 'Sheet6 E1')):
        rows = []
        for r in wb['Sheet6'].iter_rows(min_row=3, values_only=True):
            r = list(r) + [None] * 12
            nm = r[name_col]
            if not nm or str(nm).strip().upper() == 'TOTAL':
                continue
            cash, soc = num(r[name_col + 1]), num(r[name_col + 2])
            rows.append({'adm': None, 'name': str(nm).strip(), 'party': 0, 'lab': cash + soc,
                         'mode': 'Society' if soc and not cash else 'Cash' if cash and not soc else 'Cash + Society'})
        apply(rows, by({'B2'}), label, mode_of=lambda row: row['mode'])

    print(f"Side-sheet Party/Lab rows with no matching student: {len(unmatched)}")
    for u in unmatched:
        print('   ', u)
    students_unmatched.extend(unmatched)


students_unmatched = []


def assign_admission_numbers(students):
    seen = {}
    for s in students:
        if s['adm'] and s['adm'] in seen:
            first = seen[s['adm']]
            s['admissionNumber'] = f"{s['adm']}-{s['code']}"
            s['flags'].insert(0, f"Admission no. {s['adm']} is also used by {first['name']} ({first['tab']}) - stored as {s['admissionNumber']}")
            first['flags'].insert(0, f"Admission no. {s['adm']} is also written for {s['name']} ({s['tab']})")
        elif s['adm']:
            s['admissionNumber'] = s['adm']
            seen[s['adm']] = s
    counters = {}
    for s in students:
        if 'admissionNumber' in s:
            continue
        counters[s['code']] = counters.get(s['code'], 0) + 1
        s['admissionNumber'] = f"T{s['code']}-{counters[s['code']]:03d}"
        why = f"serial {s['rawAdm']}" if s['code'] == 'B2' and s['rawAdm'] else 'blank' if not s['rawAdm'] else f"'{s['rawAdm']}'"
        s['flags'].insert(0, f"Temporary admission no. {s['admissionNumber']} (Excel had {why}) - replace with the real number")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
    with open(os.path.join(sys.argv[2], 'unmatched-party-lab.json'), 'w', encoding='utf-8') as f:
        json.dump(students_unmatched, f, ensure_ascii=False, indent=1)
