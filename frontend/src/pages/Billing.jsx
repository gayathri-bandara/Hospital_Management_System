import { useCallback, useEffect, useState } from 'react';
import api, { errorText } from '../api';
import Modal from '../components/Modal';
import { esc, fmt, money, patientLabel, printHtml } from '../utils';

const TYPES = ['Consultation', 'Laboratory', 'Pharmacy', 'Admission', 'Other'];
const METHODS = ['Cash', 'Card', 'Online', 'Insurance'];

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [patients, setPatients] = useState([]);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/billing', { params: { q, Status: status } });
      setBills(data); setError('');
    } catch (err) { setError(errorText(err)); }
  }, [q, status]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get('/patients').then((r) => setPatients(r.data)).catch(() => {}); }, []);

  const open = async (id) => {
    try { const { data } = await api.get(`/billing/${id}`); setDetail(data); }
    catch (err) { setError(errorText(err)); }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <button className="primary" onClick={() => setCreating(true)}>Create invoice</button>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success" onClick={() => setMsg('')}>{msg}</div>}

      <div className="toolbar">
        <div className="grow"><label>Search</label>
          <input placeholder="Patient name or bill number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="item"><label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option>Unpaid</option><option>Partial</option><option>Paid</option>
          </select></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Bill</th><th>Date</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.BillId}>
                <td>#{b.BillId}</td><td>{fmt(b.CreatedAt)}</td><td>{b.PatientName}</td>
                <td>{money(b.TotalAmount)}</td><td>{money(b.PaidAmount)}</td><td>{money(b.Balance)}</td>
                <td><span className={`badge ${b.Status}`}>{b.Status}</span></td>
                <td><button onClick={() => open(b.BillId)}>View / pay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bills.length && <div className="empty">No bills found.</div>}
      </div>

      {creating && (
        <NewBill patients={patients} onClose={() => setCreating(false)}
          onSaved={(id) => { setCreating(false); setMsg('Invoice created.'); load(); open(id); }} />
      )}
      {detail && (
        <BillDetail data={detail} onClose={() => setDetail(null)}
          onChanged={(id) => { load(); open(id); }} />
      )}
    </div>
  );
}

function NewBill({ patients, onClose, onSaved }) {
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([{ ItemType: 'Consultation', Description: '', Amount: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setItem = (i, key, value) => setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const total = items.reduce((s, it) => s + (Number(it.Amount) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/billing', { PatientId: patientId, Items: items });
      onSaved(data.id);
    } catch (err) { setError(errorText(err)); }
    setBusy(false);
  };

  return (
    <Modal title="Create invoice" onClose={onClose} wide>
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Patient</label>
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ marginBottom: 14 }}>
          <option value="">-- Select --</option>
          {patients.map((p) => <option key={p.PatientId} value={p.PatientId}>{patientLabel(p)}</option>)}
        </select>

        <label>Charges (consultation, laboratory, pharmacy, admission...)</label>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px auto', gap: 8, marginBottom: 8 }}>
            <select value={it.ItemType} onChange={(e) => setItem(i, 'ItemType', e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Description" required value={it.Description} onChange={(e) => setItem(i, 'Description', e.target.value)} />
            <input type="number" min="0.01" step="0.01" placeholder="Amount" required value={it.Amount}
              onChange={(e) => setItem(i, 'Amount', e.target.value)} />
            <button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, x) => x !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { ItemType: 'Other', Description: '', Amount: '' }])}>Add another charge</button>
        <p style={{ fontWeight: 600, fontSize: 17 }}>Total: {money(total)}</p>
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save invoice'}</button>
        </div>
      </form>
    </Modal>
  );
}

function BillDetail({ data, onClose, onChanged }) {
  const { bill, items, payments } = data;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [error, setError] = useState('');

  const pay = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/billing/${bill.BillId}/payments`, { Amount: amount, Method: method });
      setAmount('');
      onChanged(bill.BillId);
    } catch (err) { setError(errorText(err)); }
  };

  const print = () => printHtml(`Receipt ${bill.BillId}`, `
    <h1>Hospital Management System</h1><div class="muted">Invoice / Receipt #${bill.BillId} - ${esc(fmt(bill.CreatedAt))}</div>
    <h2>Patient</h2><div>${esc(bill.PatientName)} (No. ${bill.PatientId})</div>
    <h2>Charges</h2>
    <table><tr><th>Type</th><th>Description</th><th class="right">Amount</th></tr>
      ${items.map((i) => `<tr><td>${esc(i.ItemType)}</td><td>${esc(i.Description)}</td><td class="right">${money(i.Amount)}</td></tr>`).join('')}
      <tr><th colspan="2">Total</th><th class="right">${money(bill.TotalAmount)}</th></tr></table>
    <h2>Payments</h2>
    <table><tr><th>Date</th><th>Method</th><th class="right">Amount</th></tr>
      ${payments.map((p) => `<tr><td>${esc(fmt(p.PaidAt))}</td><td>${esc(p.Method)}</td><td class="right">${money(p.Amount)}</td></tr>`).join('') || '<tr><td colspan="3">No payments yet</td></tr>'}
      <tr><th colspan="2">Balance due</th><th class="right">${money(bill.Balance)}</th></tr></table>
    <p class="muted">Status: ${esc(bill.Status)}</p>`);

  return (
    <Modal title={`Bill #${bill.BillId} - ${bill.PatientName}`} onClose={onClose} wide>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap" style={{ marginBottom: 12 }}>
        <table>
          <thead><tr><th>Type</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((i) => <tr key={i.BillItemId}><td>{i.ItemType}</td><td>{i.Description}</td><td>{money(i.Amount)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p>Total <b>{money(bill.TotalAmount)}</b> &nbsp; Paid <b>{money(bill.PaidAmount)}</b> &nbsp;
        Balance <b>{money(bill.Balance)}</b> &nbsp; <span className={`badge ${bill.Status}`}>{bill.Status}</span></p>

      {payments.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table>
            <thead><tr><th>Payment date</th><th>Method</th><th>Amount</th><th>Received by</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.PaymentId}><td>{fmt(p.PaidAt)}</td><td>{p.Method}</td><td>{money(p.Amount)}</td><td>{p.ReceivedBy}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {Number(bill.Balance) > 0 && (
        <form onSubmit={pay} className="toolbar">
          <div className="item"><label>Amount to receive</label>
            <input type="number" min="0.01" step="0.01" max={bill.Balance} required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="item"><label>Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
          <button className="primary">Receive payment</button>
          <button type="button" onClick={() => setAmount(String(bill.Balance))}>Full balance</button>
        </form>
      )}
      <div className="form-actions"><button onClick={print}>Print receipt</button></div>
    </Modal>
  );
}
