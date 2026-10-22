// A reusable page: search box + filters + table + add/edit form + delete.
// Every simple module (patients, doctors, ...) is just a configuration of this page.
import { useCallback, useEffect, useState } from 'react';
import api, { errorText } from '../api';
import { useAuth } from '../AuthContext';
import { fmt, toInput } from '../utils';
import Modal from './Modal';

export default function ResourcePage({
  title, endpoint, idKey, columns, fields,
  writeRoles = [], canDelete = true, rowActions, filters = [],
  searchPlaceholder = 'Search...', addLabel = 'Add new', noSearch = false,
}) {
  const { user } = useAuth();
  const canWrite = user.role === 'Admin' || writeRoles.includes(user.role);

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lookups, setLookups] = useState({});
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = editing && editing[idKey] !== undefined;

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get(endpoint, { params: { q, ...filterVals } });
      setRows(data);
    } catch (err) {
      setError(errorText(err, 'Could not load data.'));
    }
  }, [endpoint, q, filterVals]);

  // Reload (with a short delay while typing in the search box)
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Load the choices for drop-downs ("lookup" fields) once.
  useEffect(() => {
    [...fields, ...filters].filter((f) => f.type === 'lookup').forEach(async (f) => {
      try {
        const { data } = await api.get(f.endpoint);
        setLookups((old) => ({ ...old, [f.endpoint]: data }));
      } catch (_) { /* the user may not be allowed to read it */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (row) => {
    const init = {};
    fields.forEach((f) => {
      init[f.name] = row ? toInput(f.type, row[f.name]) : (f.default ?? (f.type === 'checkbox' ? true : ''));
    });
    setForm(init);
    setFormError('');
    setEditing(row || {});
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {};
    fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === 'number') v = v === '' ? null : Number(v);
      if (f.type === 'password' && !v) return; // empty password on edit = keep old one
      payload[f.name] = v;
    });
    try {
      if (isEdit) await api.put(`${endpoint}/${editing[idKey]}`, payload);
      else await api.post(endpoint, payload);
      setEditing(null);
      setMessage('Saved successfully.');
      load();
    } catch (err) {
      setFormError(errorText(err));
    }
    setSaving(false);
  };

  const remove = async (row) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`${endpoint}/${row[idKey]}`);
      setMessage('Deleted.');
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const renderInput = (f) => {
    const common = {
      id: f.name,
      value: form[f.name] ?? '',
      onChange: (e) => setForm({ ...form, [f.name]: e.target.value }),
      required: f.required && !(f.type === 'password' && isEdit),
      disabled: f.createOnly && isEdit,
    };
    if (f.type === 'textarea') return <textarea rows={3} {...common} />;
    if (f.type === 'checkbox') {
      return <input type="checkbox" id={f.name} checked={!!form[f.name]}
        onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />;
    }
    if (f.type === 'select') {
      return (
        <select {...common}>
          <option value="">-- Select --</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'lookup') {
      return (
        <select {...common}>
          <option value="">-- Select --</option>
          {(lookups[f.endpoint] || []).map((o) => (
            <option key={o[f.valueKey]} value={o[f.valueKey]}>{f.labelFn ? f.labelFn(o) : o[f.labelKey]}</option>
          ))}
        </select>
      );
    }
    return <input type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined}
      autoComplete={f.type === 'password' ? 'new-password' : 'off'} {...common} />;
  };

  const renderCell = (c, r) => {
    if (c.render) return c.render(r);
    if (c.badge) return r[c.key] ? <span className={`badge ${String(r[c.key]).replace(' ', '')}`}>{r[c.key]}</span> : '-';
    return fmt(r[c.key]);
  };

  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
        {canWrite && fields.length > 0 && <button className="primary" onClick={() => openForm(null)}>{addLabel}</button>}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success" onClick={() => setMessage('')}>{message}</div>}

      <div className="toolbar">
        {!noSearch && (
          <div className="grow">
            <label htmlFor="search">Search</label>
            <input id="search" placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        {filters.map((f) => (
          <div className="item" key={f.name}>
            <label>{f.label}</label>
            {f.type === 'date' && (
              <input type="date" value={filterVals[f.name] || ''}
                onChange={(e) => setFilterVals({ ...filterVals, [f.name]: e.target.value })} />
            )}
            {f.type === 'select' && (
              <select value={filterVals[f.name] || ''}
                onChange={(e) => setFilterVals({ ...filterVals, [f.name]: e.target.value })}>
                <option value="">All</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {f.type === 'lookup' && (
              <select value={filterVals[f.name] || ''}
                onChange={(e) => setFilterVals({ ...filterVals, [f.name]: e.target.value })}>
                <option value="">All</option>
                {(lookups[f.endpoint] || []).map((o) => (
                  <option key={o[f.valueKey]} value={o[f.valueKey]}>{f.labelFn ? f.labelFn(o) : o[f.labelKey]}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[idKey]}>
                {columns.map((c) => <td key={c.key}>{renderCell(c, r)}</td>)}
                <td className="actions">
                  {rowActions && rowActions(r, load, user, setMessage, setError)}
                  {canWrite && fields.length > 0 && <button onClick={() => openForm(r)}>Edit</button>}
                  {canWrite && canDelete && <button className="danger" onClick={() => remove(r)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">No records found.</div>}
      </div>

      {editing && (
        <Modal title={isEdit ? `Edit ${title}` : addLabel} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            {formError && <div className="error">{formError}</div>}
            <div className="form-grid">
              {fields.map((f) => (
                <div key={f.name} className={f.full || f.type === 'textarea' ? 'full' : ''}>
                  <label htmlFor={f.name}>{f.label}{f.required ? ' *' : ''}</label>
                  {renderInput(f)}
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
