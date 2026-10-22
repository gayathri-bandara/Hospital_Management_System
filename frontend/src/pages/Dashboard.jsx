import { useEffect, useState } from 'react';
import api, { errorText } from '../api';
import { useAuth } from '../AuthContext';
import { fmt, money } from '../utils';

const CARDS = [
  { key: 'TotalPatients', label: 'Total patients' },
  { key: 'TodaysAppointments', label: "Today's appointments" },
  { key: 'AdmittedPatients', label: 'Patients admitted now' },
  { key: 'PendingLabRequests', label: 'Laboratory requests pending' },
  { key: 'PharmacyAlerts', label: 'Pharmacy alerts', alert: true },
  { key: 'UnpaidBills', label: 'Bills not fully paid', alert: true },
  { key: 'RevenueToday', label: 'Revenue today', money: true },
  { key: 'RevenueThisMonth', label: 'Revenue this month', money: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch((e) => setError(errorText(e)));
  }, []);

  return (
    <div>
      <div className="page-head"><h1>Welcome, {user.name}</h1></div>
      {error && <div className="error">{error}</div>}
      {data && (
        <>
          <div className="stats">
            {CARDS.filter((c) => data.totals[c.key] !== undefined).map((c) => (
              <div key={c.key} className={`stat ${c.alert && data.totals[c.key] > 0 ? 'alert' : ''}`}>
                <div className="num">{c.money ? money(data.totals[c.key]) : data.totals[c.key]}</div>
                <div className="lbl">{c.label}</div>
              </div>
            ))}
          </div>
          {data.todaysAppointments.length > 0 && (
            <>
              <h2 style={{ marginBottom: 10 }}>Today's appointments</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.todaysAppointments.map((a) => (
                      <tr key={a.AppointmentId}>
                        <td>{fmt(a.AppointmentTime)}</td><td>{a.PatientName}</td><td>{a.DoctorName}</td>
                        <td><span className={`badge ${a.Status.replace(' ', '')}`}>{a.Status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
