// Show database values nicely in tables.
export function fmt(v) {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    if (v.startsWith('1970-01-01T')) return v.slice(11, 16);        // TIME column
    if (v.endsWith('T00:00:00.000Z')) return v.slice(0, 10);        // DATE column
    return new Date(v).toLocaleString();                             // DATETIME column
  }
  return String(v);
}

// Convert a database value into the format an <input> needs.
export function toInput(type, v) {
  if (v === null || v === undefined) return type === 'checkbox' ? true : '';
  if (type === 'date') return String(v).slice(0, 10);
  if (type === 'time') return String(v).includes('T') ? String(v).slice(11, 16) : String(v).slice(0, 5);
  if (type === 'checkbox') return !!v;
  return v;
}

export const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Open a clean page and print it (used for receipts and reports).
export function printHtml(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { alert('Allow pop-ups to print.'); return; }
  w.document.write(`<html><head><title>${esc(title)}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#111}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;font-size:13px}
      .muted{color:#555;font-size:13px} .right{text-align:right}
    </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const line = (r) => cols.map((c) => `"${String(fmt(r[c]) === '-' ? '' : fmt(r[c])).replace(/"/g, '""')}"`).join(',');
  const csv = [cols.join(','), ...rows.map(line)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const patientLabel = (p) => `#${p.PatientId} - ${p.FullName}`;
