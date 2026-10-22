import { useEffect, useState } from 'react';
import api, { errorText } from '../api';
import { fmt, money, patientLabel } from '../utils';

export default function Pharmacy() {
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringSoon: [], expired: [] });
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ PatientId: '', MedicineId: '', Quantity: 1 });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const loadAll = async () => {
    try {
      const [p, m, a, h] = await Promise.all([
        api.get('/patients'), api.get('/medicines'), api.get('/pharmacy/alerts'), api.get('/pharmacy/dispenses'),
      ]);
      setPatients(p.data); setMedicines(m.data); setAlerts(a.data); setHistory(h.data);
    } catch (err) { setError(errorText(err)); }
  };
  useEffect(() => { loadAll(); }, []);

  const dispense = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    try {
      const { data } = await api.post('/pharmacy/dispense', form);
      setOk(`Dispensed. Total price: ${money(data.total)}. Add it to the patient's bill in Billing.`);
      setForm({ ...form, Quantity: 1 });
      loadAll();
    } catch (err) { setError(errorText(err)); }
  };

  const chosen = medicines.find((m) => String(m.MedicineId) === String(form.MedicineId));

  return (
    <div>
      <div className="page-head"><h1>Pharmacy</h1></div>
      {error && <div className="error">{error}</div>}
      {ok && <div className="success">{ok}</div>}

      <div className="panel">
        <h2 style={{ marginBottom: 10 }}>Dispense medicine</h2>
        <form onSubmit={dispense}>
          <div className="form-grid">
            <div><label>Patient</label>
              <select required value={form.PatientId} onChange={(e) => setForm({ ...form, PatientId: e.target.value })}>
                <option value="">-- Select --</option>
                {patients.map((p) => <option key={p.PatientId} value={p.PatientId}>{patientLabel(p)}</option>)}
              </select></div>
            <div><label>Medicine</label>
              <select required value={form.MedicineId} onChange={(e) => setForm({ ...form, MedicineId: e.target.value })}>
                <option value="">-- Select --</option>
                {medicines.map((m) => <option key={m.MedicineId} value={m.MedicineId}>{m.MedicineName} (stock {m.StockQty})</option>)}
              </select></div>
            <div><label>Quantity</label>
              <input type="number" min="1" step="1" required value={form.Quantity}
                onChange={(e) => setForm({ ...form, Quantity: e.target.value })} /></div>
            <div><label>Price</label>
              <input readOnly value={chosen ? money(chosen.UnitPrice * (Number(form.Quantity) || 0)) : ''} /></div>
          </div>
          <div className="form-actions"><button className="primary">Dispense</button></div>
        </form>
      </div>

      <div className="stats">
        <div className={`stat ${alerts.lowStock.length ? 'alert' : ''}`}>
          <div className="num">{alerts.lowStock.length}</div><div className="lbl">Low stock</div></div>
        <div className={`stat ${alerts.expiringSoon.length ? 'alert' : ''}`}>
          <div className="num">{alerts.expiringSoon.length}</div><div className="lbl">Expiring in 30 days</div></div>
        <div className={`stat ${alerts.expired.length ? 'alert' : ''}`}>
          <div className="num">{alerts.expired.length}</div><div className="lbl">Expired</div></div>
      </div>

      {[['Low stock', alerts.lowStock, 'StockQty'], ['Expiring soon', alerts.expiringSoon, 'ExpiryDate'], ['Expired', alerts.expired, 'ExpiryDate']]
        .filter(([, rows]) => rows.length).map(([title, rows, key]) => (
          <div key={title} style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 6 }}>{title}</h2>
            <div className="table-wrap"><table><tbody>
              {rows.map((r) => (
                <tr key={r.MedicineId}><td>{r.MedicineName}</td><td>{key === 'StockQty' ? `Stock ${r.StockQty} (reorder at ${r.ReorderLevel})` : `Expiry ${fmt(r.ExpiryDate)}, stock ${r.StockQty}`}</td></tr>
              ))}
            </tbody></table></div>
          </div>
        ))}

      <h2 style={{ margin: '18px 0 8px' }}>Recent dispensing</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Patient</th><th>Medicine</th><th>Qty</th><th>Total</th><th>By</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.DispenseId}><td>{fmt(h.DispensedAt)}</td><td>{h.PatientName}</td><td>{h.MedicineName}</td>
                <td>{h.Quantity}</td><td>{money(h.TotalPrice)}</td><td>{h.DispensedBy}</td></tr>
            ))}
          </tbody>
        </table>
        {!history.length && <div className="empty">No medicine dispensed yet.</div>}
      </div>
      <p style={{ marginTop: 12 }}>To add or edit medicines, open <b>Medicine stock</b> in the menu.</p>
    </div>
  );
}
