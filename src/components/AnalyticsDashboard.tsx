/**
 * Analytics dashboard.
 *
 * Every number rendered here is computed server-side by /api/admin1/analytics
 * and displayed verbatim. There is deliberately no arithmetic in this file —
 * a dashboard that re-derives its own totals is a dashboard that will one day
 * disagree with the ledger it is describing.
 *
 * Campus scoping is the server's job too: an admin2 or accountant calling the
 * same endpoint gets only their own campus, so this component does not need
 * to know who is looking at it.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { Panel, Stat, Trend, Bars, Composition, Recovery, TableView, Empty, inrFull } from './common/Charts';

interface Analytics {
  scope: string;
  windowDays: number;
  headline: {
    students: number; activeStudents: number; billed: number; collected: number;
    outstanding: number; recoveryRate: number; expenditure: number; payroll: number;
    netPosition: number; receipts: number; teachers: number;
    monthlySalaryCommitment: number; enquiries: number;
  };
  collections: Array<{ date: string; amount: number; count: number }>;
  campusBreakdown: Array<{ campus: string; students: number; collected: number; outstanding: number; billed: number; receipts: number; recoveryRate: number }>;
  feeStatus: Array<{ label: string; count: number }>;
  enquiryFunnel: Array<{ stage: string; count: number }>;
  enquiryByStream: Array<{ stream: string; count: number }>;
  expenditureByCategory: Array<{ category: string; amount: number; count: number }>;
  paymentModes: Array<{ mode: string; amount: number; count: number }>;
  recentPayments: Array<{ receiptNumber: string; studentName: string; amount: number; date: string; mode: string; branch: string }>;
}

const WINDOWS = [7, 30, 90];

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

export const AnalyticsDashboard: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  // '' means every campus the account is entitled to. The server decides what
  // that covers, so a campus-scoped account simply sees its own figures here
  // and the buttons below are not offered to it.
  const [campus, setCampus] = useState('');
  // Whether this account can see more than one campus at all, learned from the
  // FIRST response, which is always unfiltered. It cannot be re-derived from
  // `data.scope` on every render: once a campus is selected the server reports
  // that campus as the scope, so a condition reading it live would hide the
  // buttons the moment one was pressed and strand the user with no way back
  // to All.
  const [orgWide, setOrgWide] = useState(false);

  const load = useCallback(async (windowDays: number, branch: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = `/admin1/analytics?days=${windowDays}`
        + (branch ? `&branch=${encodeURIComponent(branch)}` : '');
      const res = await apiClient.get<{ status: string; data: Analytics }>(query);
      if (!branch && /all/i.test(String(res.data?.scope || ''))) setOrgWide(true);
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days, campus); }, [days, campus, load]);

  if (loading && !data) {
    return (
      <div className="analytics">
        <div className="viz-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="viz-skeleton" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics">
        <div className="viz-error">
          <p>{error}</p>
          <button className="btn" onClick={() => load(days, campus)}>Try again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const h = data.headline;
  const net = h.netPosition;

  return (
    <div className="analytics anim-rise">
      <header className="analytics-head">
        <div>
          <p className="eyebrow">{data.scope}</p>
          <h2 className="analytics-title">Analytics</h2>
        </div>
        <div className="analytics-controls">
          {/*
            Campus selector. Offered only to an account that can actually see
            more than one campus — for a campus-scoped account the server
            returns their own figures regardless, so a row of buttons where
            four of the five are refused would be a menu of dead ends.
            `data.scope` is what the server says this response covers, so the
            condition follows the data rather than second-guessing the role.
          */}
          {orgWide && (
            <div className="seg seg-campus">
              <button className={`seg-btn${campus === '' ? ' is-active' : ''}`}
                      onClick={() => setCampus('')}>All</button>
              {CAMPUSES.map(c => (
                <button key={c}
                        className={`seg-btn${campus === c ? ' is-active' : ''}`}
                        onClick={() => setCampus(c)}
                        title={c}>{c}</button>
              ))}
            </div>
          )}
          <div className="seg">
            {WINDOWS.map(w => (
              <button key={w}
                      className={`seg-btn${days === w ? ' is-active' : ''}`}
                      onClick={() => setDays(w)}>{w}d</button>
            ))}
          </div>
          <button className="btn ghost" onClick={() => setShowTable(v => !v)}>
            {showTable ? 'Charts' : 'Table'}
          </button>
          {onBack && <button className="btn ghost" onClick={onBack}>Back</button>}
        </div>
      </header>

      {/* Headline figures. A stat tile, not a chart — these are single values
          whose job is recall, and a chart would add nothing. */}
      <div className="viz-stat-row">
        <Stat label="Collected" value={inrFull(h.collected)} sub={`${h.receipts} receipts`} />
        <Stat label="Outstanding" value={inrFull(h.outstanding)}
              sub={`${h.students} students billed`}
              tone={h.outstanding > h.collected ? 'warning' : 'neutral'} />
        <Stat label="Fee recovery" value={`${h.recoveryRate}%`} sub={`of ${inrFull(h.billed)}`}
              tone={h.recoveryRate < 50 ? 'critical' : h.recoveryRate < 80 ? 'warning' : 'good'} />
        <Stat label="Net position" value={inrFull(net)}
              sub="collections less spend & payroll"
              tone={net < 0 ? 'critical' : 'good'} />
      </div>

      {showTable ? (
        <Panel title="All figures" hint="The same data as the charts, as a table.">
          <TableView
            columns={['Campus', 'Students', 'Billed', 'Collected', 'Outstanding', 'Recovery']}
            rows={data.campusBreakdown.map(c => [
              c.campus, c.students, inrFull(c.billed), inrFull(c.collected),
              inrFull(c.outstanding), `${c.recoveryRate}%`
            ])}
          />
          <div style={{ height: 'var(--s5)' }} />
          <TableView
            columns={['Date', 'Collected', 'Receipts']}
            rows={data.collections.filter(c => c.amount > 0).map(c => [c.date, inrFull(c.amount), c.count])}
          />
        </Panel>
      ) : (
        <div className="viz-grid">
          <Panel title="Daily collections" span={2}
                 hint={`Fee receipts over the last ${data.windowDays} days. Hover for a day.`}>
            <Trend data={data.collections} />
          </Panel>

          <Panel title="Fee recovery" hint="Collected against what has been billed.">
            <Recovery pct={h.recoveryRate} collected={h.collected} billed={h.billed} />
          </Panel>

          <Panel title="Students by balance" hint="How the outstanding load is distributed.">
            <Composition data={data.feeStatus.map(f => ({ label: f.label, value: f.count }))}
                         format={(n) => `${n} student${n === 1 ? '' : 's'}`} />
          </Panel>

          <Panel title="Collections by campus" span={2}
                 hint="Each campus against the strongest. Values labelled directly.">
            <Bars data={data.campusBreakdown.map(c => ({
              label: c.campus,
              value: c.collected,
              note: c.students ? ` · ${c.students} students · ${c.recoveryRate}% recovered` : ' · no students'
            }))} colorBySlot />
          </Panel>

          <Panel title="Outstanding by campus" hint="Where the unpaid fees sit.">
            <Bars data={data.campusBreakdown.map(c => ({ label: c.campus, value: c.outstanding }))} />
          </Panel>

          <Panel title="Admissions pipeline" hint={`${h.enquiries} enquiries received.`}>
            {data.enquiryFunnel.length
              ? <Bars data={data.enquiryFunnel.map(f => ({ label: f.stage, value: f.count }))}
                      format={(n) => String(n)} />
              : <Empty note="No enquiries yet." />}
          </Panel>

          <Panel title="Interest by stream" hint="What applicants are asking for.">
            <Bars data={data.enquiryByStream.slice(0, 6).map(s => ({ label: s.stream, value: s.count }))}
                  format={(n) => String(n)} />
          </Panel>

          <Panel title="Where money goes" hint="Recorded expenditure by category.">
            <Bars data={data.expenditureByCategory.map(e => ({ label: e.category, value: e.amount }))} />
          </Panel>

          <Panel title="How fees arrive" hint="Collections split by payment method.">
            <Composition data={data.paymentModes.map(m => ({ label: m.mode, value: m.amount }))}
                         format={inrFull} />
          </Panel>

          <Panel title="Standing commitments" hint="Recurring monthly obligations.">
            <div className="viz-mini-rows">
              <div><span>Faculty on roll</span><strong>{h.teachers}</strong></div>
              <div><span>Monthly salary</span><strong>{inrFull(h.monthlySalaryCommitment)}</strong></div>
              <div><span>Worker payments made</span><strong>{inrFull(h.payroll)}</strong></div>
              <div><span>Expenditure recorded</span><strong>{inrFull(h.expenditure)}</strong></div>
            </div>
          </Panel>

          <Panel title="Latest receipts" span={2} hint="The most recent fee collections.">
            {data.recentPayments.length ? (
              <TableView
                columns={['Receipt', 'Student', 'Amount', 'Mode', 'Date']}
                rows={data.recentPayments.map(p => [
                  p.receiptNumber, p.studentName, inrFull(p.amount), p.mode,
                  new Date(p.date).toLocaleDateString('en-IN')
                ])}
              />
            ) : <Empty note="No payments recorded yet." />}
          </Panel>
        </div>
      )}

      <p className="analytics-foot">
        Computed server-side from live records · scope {data.scope} · {data.windowDays}-day window
      </p>
    </div>
  );
};

export default AnalyticsDashboard;
