import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorText } from '../api';
import { useAuth } from '../AuthContext';
import { fmt } from '../utils';

function Section({ title, rows, columns }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.key}>{fmt(r[c.key])}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">Nothing recorded yet.</div>}
      </div>
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [h, setH] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [file, setFile] = useState(null);

  const load = useCallback(() => {
    api.get(`/patients/${id}/history`).then((r) => setH(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);
  useEffect(load, [load]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      await api.post(`/patients/${id}/documents`, body);
      setMsg('Document uploaded.'); setFile(null); e.target.reset(); load();
    } catch (err) { setError(errorText(err)); }
  };

  const download = async (d) => {
    try {
      const res = await api.get(`/patients/documents/${d.DocumentId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = d.OriginalName; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError('Could not download the file.'); }
  };

  const removeDoc = async (d) => {
    if (!window.confirm('Delete this document?')) return;
    try { await api.delete(`/patients/documents/${d.DocumentId}`); load(); }
    catch (err) { setError(errorText(err)); }
  };

  if (error && !h) return <div className="error">{error}</div>;
  if (!h) return <p>Loading...</p>;
  const p = h.patient;

  return (
    <div>
      <div className="page-head">
        <h1>{p.FullName} (No. {p.PatientId})</h1>
        <Link to="/patients"><button>Back to patients</button></Link>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="panel">
        <dl className="kv">
          <dt>Gender</dt><dd>{p.Gender}</dd>
          <dt>Date of birth</dt><dd>{fmt(p.DateOfBirth)}</dd>
          <dt>Blood group</dt><dd>{fmt(p.BloodGroup)}</dd>
          <dt>Phone</dt><dd>{fmt(p.Phone)}</dd>
          <dt>Email</dt><dd>{fmt(p.Email)}</dd>
          <dt>Address</dt><dd>{fmt(p.Address)}</dd>
          <dt>Emergency contact</dt><dd>{fmt(p.EmergencyContact)}</dd>
        </dl>
      </div>

      <Section title="Medical records" rows={h.records} columns={[
        { key: 'VisitDate', label: 'Visit' }, { key: 'DoctorName', label: 'Doctor' }, { key: 'Diagnosis', label: 'Diagnosis' },
        { key: 'Prescription', label: 'Prescription' }, { key: 'Treatment', label: 'Treatment' }]} />
      <Section title="Appointments" rows={h.appointments} columns={[
        { key: 'AppointmentDate', label: 'Date' }, { key: 'AppointmentTime', label: 'Time' },
        { key: 'DoctorName', label: 'Doctor' }, { key: 'Reason', label: 'Reason' }, { key: 'Status', label: 'Status' }]} />
      <Section title="Laboratory" rows={h.labs} columns={[
        { key: 'RequestedAt', label: 'Requested' }, { key: 'TestName', label: 'Test' },
        { key: 'Status', label: 'Status' }, { key: 'Result', label: 'Result' }]} />
      <Section title="Admissions" rows={h.admissions} columns={[
        { key: 'RoomNo', label: 'Room' }, { key: 'AdmitDate', label: 'Admitted' },
        { key: 'DischargeDate', label: 'Discharged' }, { key: 'Status', label: 'Status' }]} />

      <h2 style={{ marginBottom: 8 }}>Documents</h2>
      <div className="panel">
        {['Admin', 'Doctor', 'Nurse'].includes(user.role) && (
          <form onSubmit={upload} className="toolbar">
            <div className="grow">
              <label htmlFor="file">Upload a PDF, image or Word file (max 5 MB)</label>
              <input id="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <button className="primary" disabled={!file}>Upload</button>
          </form>
        )}
        {h.documents.map((d) => (
          <div key={d.DocumentId} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ flex: 1 }}>{d.OriginalName} <small>({fmt(d.UploadedAt)} by {d.UploadedBy})</small></span>
            <button onClick={() => download(d)}>Download</button>
            <button className="danger" onClick={() => removeDoc(d)}>Delete</button>
          </div>
        ))}
        {!h.documents.length && <div className="empty">No documents uploaded.</div>}
      </div>
    </div>
  );
}
