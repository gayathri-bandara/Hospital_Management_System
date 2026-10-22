import { useState } from 'react';
import api, { errorText } from '../api';
import { useAuth } from '../AuthContext';
import { downloadCsv, esc, fmt, printHtml } from '../utils';

const REPORTS = [
  { id: 'patients', label: 'Patient report', roles: ['Receptionist', 'Doctor'] },
  { id: 'appointments', label: 'Appointment report', roles: ['Receptionist', 'Doctor'] },
  { id: 'revenue', label: 'Revenue report', roles: ['Accountant'] },
  { id: 'pharmacy', label: 'Pharmacy report', roles: ['Pharmacist'] },
  { id: 'laboratory', label: 'Laboratory report', roles: ['LabStaff', 'Doctor'] },
  { id: 'staff', label: 'Staff report', roles: [] },
];

export default function Reports() {
  const { user } = useAuth();
  const allowed = REPORTS.filter((r) => user.role === 'Admin' || r.roles.includes(user.role));
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [type, setType] = useState(allowed[0]?.id || '');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.get(`/reports/${type}`, { params: { from, to } });
      setRows(data);
    } catch (err) { setError(errorText(err)); setRows(null); }
  };

  const cols = rows && rows.length ? Object.keys(rows[0]) : [];
  const title = allowed.find((r) => r.id === type)?.label || 'Report';

  const print = () => printHtml(title, `<h1>${esc(title)}</h1><div class="muted">${esc(from)} to ${esc(to)}</div>
    <table><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(fmt(r[c]))}</td>`).join('')}</tr>`).join('')}</table>`);

  return (
    <div>
      <div className="page-head"><h1>Reports</h1></div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={run} className="toolbar">
        <div className="item"><label>Report</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {allowed.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select></div>
        <div className="item"><label>From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="item"><label>To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <button className="primary">Show report</button>
        {rows && rows.length > 0 && <button type="button" onClick={() => downloadCsv(`${type}-report.csv`, rows)}>Download CSV</button>}
        {rows && rows.length > 0 && <button type="button" onClick={print}>Print</button>}
      </form>

      {rows && (
        <div className="table-wrap">
          <table>
            <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{fmt(r[c])}</td>)}</tr>)}</tbody>
          </table>
          {!rows.length && <div className="empty">No data for these dates.</div>}
        </div>
      )}
    </div>
  );
}
