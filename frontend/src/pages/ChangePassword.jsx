import { useState } from 'react';
import api, { errorText } from '../api';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    if (form.newPassword !== form.confirm) return setError('The two new passwords do not match.');
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setOk('Password changed.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setError(errorText(err)); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="panel" style={{ maxWidth: 420 }}>
      <h1 style={{ marginBottom: 12 }}>Change password</h1>
      {error && <div className="error">{error}</div>}
      {ok && <div className="success">{ok}</div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}><label>Current password</label>
          <input type="password" value={form.currentPassword} onChange={set('currentPassword')} required /></div>
        <div style={{ marginBottom: 12 }}><label>New password (at least 8 characters)</label>
          <input type="password" value={form.newPassword} onChange={set('newPassword')} required minLength={8} /></div>
        <div style={{ marginBottom: 12 }}><label>Repeat new password</label>
          <input type="password" value={form.confirm} onChange={set('confirm')} required /></div>
        <button className="primary">Save new password</button>
      </form>
    </div>
  );
}
