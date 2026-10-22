// All the "table + form" screens. Each one is only a configuration of <ResourcePage />.
import { Link } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage';
import api, { errorText } from '../api';
import { esc, fmt, money, patientLabel, printHtml } from '../utils';

const patientLookup = { type: 'lookup', endpoint: '/patients', valueKey: 'PatientId', labelFn: patientLabel };
const doctorLookup = { type: 'lookup', endpoint: '/doctors', valueKey: 'DoctorId', labelKey: 'FullName' };
const deptLookup = { type: 'lookup', endpoint: '/departments', valueKey: 'DepartmentId', labelKey: 'DepartmentName' };
const employeeLookup = { type: 'lookup', endpoint: '/employees', valueKey: 'EmployeeId', labelKey: 'FullName' };

/* ---------------- Patients ---------------- */
export const Patients = () => (
  <ResourcePage
    title="Patients" endpoint="/patients" idKey="PatientId" addLabel="Register patient"
    searchPlaceholder="Search by name, phone, email or patient number"
    writeRoles={['Receptionist', 'Nurse']}
    columns={[
      { key: 'PatientId', label: 'No.' }, { key: 'FullName', label: 'Name' }, { key: 'Gender', label: 'Gender' },
      { key: 'DateOfBirth', label: 'Date of birth' }, { key: 'Phone', label: 'Phone' }, { key: 'BloodGroup', label: 'Blood' },
    ]}
    fields={[
      { name: 'FullName', label: 'Full name', required: true },
      { name: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { name: 'DateOfBirth', label: 'Date of birth', type: 'date' },
      { name: 'Phone', label: 'Phone' },
      { name: 'Email', label: 'Email', type: 'email' },
      { name: 'BloodGroup', label: 'Blood group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      { name: 'EmergencyContact', label: 'Emergency contact' },
      { name: 'Address', label: 'Address', type: 'textarea' },
    ]}
    rowActions={(r, reload, user) =>
      ['Admin', 'Doctor', 'Nurse'].includes(user.role) ? <Link to={`/patients/${r.PatientId}`}><button>History</button></Link> : null}
  />
);

/* ---------------- Doctors ---------------- */
export const Doctors = () => (
  <ResourcePage
    title="Doctors" endpoint="/doctors" idKey="DoctorId" addLabel="Add doctor"
    searchPlaceholder="Search by name, specialization or department"
    columns={[
      { key: 'FullName', label: 'Name' }, { key: 'Specialization', label: 'Specialization' },
      { key: 'DepartmentName', label: 'Department' }, { key: 'Phone', label: 'Phone' },
      { key: 'ConsultationFee', label: 'Fee', render: (r) => money(r.ConsultationFee) },
      { key: 'Schedule', label: 'Schedule' }, { key: 'IsActive', label: 'Active' },
    ]}
    fields={[
      { name: 'FullName', label: 'Full name', required: true },
      { name: 'Specialization', label: 'Specialization' },
      { ...deptLookup, name: 'DepartmentId', label: 'Department' },
      { name: 'Phone', label: 'Phone' },
      { name: 'Email', label: 'Email', type: 'email' },
      { name: 'ConsultationFee', label: 'Consultation fee', type: 'number', default: 0 },
      { name: 'Schedule', label: 'Schedule (example: Mon-Fri 09:00-13:00)', full: true },
      { name: 'IsActive', label: 'Active', type: 'checkbox' },
    ]}
  />
);

/* ---------------- Departments ---------------- */
export const Departments = () => (
  <ResourcePage
    title="Departments" endpoint="/departments" idKey="DepartmentId" addLabel="Add department"
    columns={[{ key: 'DepartmentName', label: 'Department' }, { key: 'Description', label: 'Description' }]}
    fields={[
      { name: 'DepartmentName', label: 'Department name', required: true },
      { name: 'Description', label: 'Description', type: 'textarea' },
    ]}
  />
);

/* ---------------- Appointments ---------------- */
const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No Show'];
export const Appointments = () => (
  <ResourcePage
    title="Appointments" endpoint="/appointments" idKey="AppointmentId" addLabel="Book appointment"
    writeRoles={['Receptionist']}
    searchPlaceholder="Search by patient, doctor or reason"
    filters={[
      { name: 'AppointmentDate', label: 'Date', type: 'date' },
      { ...doctorLookup, name: 'DoctorId', label: 'Doctor' },
      { name: 'Status', label: 'Status', type: 'select', options: STATUSES },
    ]}
    columns={[
      { key: 'AppointmentDate', label: 'Date' }, { key: 'AppointmentTime', label: 'Time' },
      { key: 'PatientName', label: 'Patient' }, { key: 'DoctorName', label: 'Doctor' },
      { key: 'Reason', label: 'Reason' }, { key: 'Status', label: 'Status', badge: true },
    ]}
    fields={[
      { ...patientLookup, name: 'PatientId', label: 'Patient', required: true },
      { ...doctorLookup, name: 'DoctorId', label: 'Doctor', required: true },
      { name: 'AppointmentDate', label: 'Date', type: 'date', required: true },
      { name: 'AppointmentTime', label: 'Time', type: 'time', required: true },
      { name: 'Reason', label: 'Reason', type: 'textarea' },
    ]}
    rowActions={(r, reload, user, ok, fail) => {
      const set = async (Status) => {
        try { await api.post(`/appointments/${r.AppointmentId}/status`, { Status }); ok(`Marked as ${Status}.`); reload(); }
        catch (err) { fail(errorText(err)); }
      };
      if (r.Status !== 'Scheduled') return <button onClick={() => set('Scheduled')}>Reopen</button>;
      return (
        <>
          <button onClick={() => set('Completed')}>Complete</button>
          <button onClick={() => set('Cancelled')}>Cancel</button>
          <button onClick={() => set('No Show')}>No show</button>
        </>
      );
    }}
  />
);

/* ---------------- Admissions ---------------- */
export const Admissions = () => (
  <ResourcePage
    title="Admissions (inpatients)" endpoint="/admissions" idKey="AdmissionId" addLabel="Admit patient"
    writeRoles={['Doctor', 'Nurse', 'Receptionist']}
    filters={[{ name: 'Status', label: 'Status', type: 'select', options: ['Admitted', 'Discharged'] }]}
    columns={[
      { key: 'PatientName', label: 'Patient' }, { key: 'DoctorName', label: 'Doctor' }, { key: 'RoomNo', label: 'Room' },
      { key: 'AdmitDate', label: 'Admitted' }, { key: 'DischargeDate', label: 'Discharged' },
      { key: 'DailyCharge', label: 'Daily charge', render: (r) => money(r.DailyCharge) },
      { key: 'Status', label: 'Status', badge: true },
    ]}
    fields={[
      { ...patientLookup, name: 'PatientId', label: 'Patient', required: true },
      { ...doctorLookup, name: 'DoctorId', label: 'Doctor' },
      { name: 'RoomNo', label: 'Room / bed number', required: true },
      { name: 'AdmitDate', label: 'Admit date', type: 'date', required: true },
      { name: 'DailyCharge', label: 'Daily room charge', type: 'number', default: 0 },
      { name: 'Notes', label: 'Notes', type: 'textarea' },
    ]}
    rowActions={(r, reload, user, ok, fail) =>
      r.Status === 'Admitted' && ['Admin', 'Doctor', 'Nurse', 'Receptionist'].includes(user.role) ? (
        <button onClick={async () => {
          if (!window.confirm('Discharge this patient?')) return;
          try {
            const { data } = await api.post(`/admissions/${r.AdmissionId}/discharge`);
            ok(`Discharged. ${data.days} day(s) x room charge = ${money(data.amount)}. Add this amount to the patient's bill.`);
            reload();
          } catch (err) { fail(errorText(err)); }
        }}>Discharge</button>
      ) : null}
  />
);

/* ---------------- Medical records ---------------- */
const printRecord = (r) => printHtml('Medical report', `
  <h1>Medical report</h1><div class="muted">Visit date: ${esc(fmt(r.VisitDate))}</div>
  <h2>Patient</h2><div>${esc(r.PatientName)} (No. ${esc(r.PatientId)})</div>
  <h2>Doctor</h2><div>${esc(r.DoctorName)}</div>
  <h2>Diagnosis</h2><div>${esc(r.Diagnosis)}</div>
  <h2>Prescription</h2><div>${esc(r.Prescription || '-')}</div>
  <h2>Treatment</h2><div>${esc(r.Treatment || '-')}</div>
  <h2>Notes</h2><div>${esc(r.Notes || '-')}</div>`);

export const Records = () => (
  <ResourcePage
    title="Medical records" endpoint="/records" idKey="RecordId" addLabel="New record"
    writeRoles={['Doctor']} searchPlaceholder="Search by patient, doctor or diagnosis"
    columns={[
      { key: 'VisitDate', label: 'Visit' }, { key: 'PatientName', label: 'Patient' }, { key: 'DoctorName', label: 'Doctor' },
      { key: 'Diagnosis', label: 'Diagnosis' }, { key: 'Prescription', label: 'Prescription' },
    ]}
    fields={[
      { ...patientLookup, name: 'PatientId', label: 'Patient', required: true },
      { ...doctorLookup, name: 'DoctorId', label: 'Doctor', required: true },
      { name: 'VisitDate', label: 'Visit date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
      { name: 'Diagnosis', label: 'Diagnosis', type: 'textarea', required: true },
      { name: 'Prescription', label: 'Prescription', type: 'textarea' },
      { name: 'Treatment', label: 'Treatment', type: 'textarea' },
      { name: 'Notes', label: 'Notes', type: 'textarea' },
    ]}
    rowActions={(r) => <button onClick={() => printRecord(r)}>Print</button>}
  />
);

/* ---------------- Laboratory ---------------- */
const printLab = (r) => printHtml('Lab report', `
  <h1>Laboratory report</h1>
  <div class="muted">Requested: ${esc(fmt(r.RequestedAt))} &nbsp; Completed: ${esc(fmt(r.ResultAt))}</div>
  <h2>Patient</h2><div>${esc(r.PatientName)} (No. ${esc(r.PatientId)})</div>
  <h2>Test</h2><div>${esc(r.TestName)}</div>
  <h2>Result</h2><div style="white-space:pre-wrap">${esc(r.Result)}</div>`);

export const LabRequests = () => (
  <ResourcePage
    title="Laboratory requests" endpoint="/lab-requests" idKey="RequestId" addLabel="New test request"
    writeRoles={['Doctor', 'Nurse']} searchPlaceholder="Search by patient or test"
    filters={[{ name: 'Status', label: 'Status', type: 'select', options: ['Requested', 'Sample Collected', 'Completed'] }]}
    columns={[
      { key: 'RequestId', label: 'No.' }, { key: 'RequestedAt', label: 'Requested' }, { key: 'PatientName', label: 'Patient' },
      { key: 'TestName', label: 'Test' }, { key: 'Status', label: 'Status', badge: true }, { key: 'Result', label: 'Result' },
    ]}
    fields={[
      { ...patientLookup, name: 'PatientId', label: 'Patient', required: true },
      { ...doctorLookup, name: 'DoctorId', label: 'Requesting doctor' },
      { type: 'lookup', endpoint: '/lab-tests', valueKey: 'TestId', labelKey: 'TestName', name: 'TestId', label: 'Test', required: true },
      { name: 'Notes', label: 'Notes', type: 'textarea' },
    ]}
    rowActions={(r, reload, user, ok, fail) => (
      <>
        {r.Status === 'Requested' && ['Admin', 'Nurse', 'LabStaff'].includes(user.role) && (
          <button onClick={async () => {
            try { await api.post(`/lab-requests/${r.RequestId}/collect`); ok('Sample marked as collected.'); reload(); }
            catch (err) { fail(errorText(err)); }
          }}>Sample collected</button>
        )}
        {r.Status !== 'Requested' && ['Admin', 'LabStaff'].includes(user.role) && (
          <button onClick={async () => {
            const Result = window.prompt('Enter the test result:', r.Result || '');
            if (!Result) return;
            try { await api.post(`/lab-requests/${r.RequestId}/result`, { Result }); ok('Result saved.'); reload(); }
            catch (err) { fail(errorText(err)); }
          }}>{r.Status === 'Completed' ? 'Edit result' : 'Enter result'}</button>
        )}
        {r.Status === 'Completed' && <button onClick={() => printLab(r)}>Print report</button>}
      </>
    )}
  />
);

export const LabTests = () => (
  <ResourcePage
    title="Laboratory test list" endpoint="/lab-tests" idKey="TestId" addLabel="Add test"
    writeRoles={['LabStaff']}
    columns={[{ key: 'TestName', label: 'Test' }, { key: 'Price', label: 'Price', render: (r) => money(r.Price) }]}
    fields={[
      { name: 'TestName', label: 'Test name', required: true },
      { name: 'Price', label: 'Price', type: 'number', required: true, default: 0 },
    ]}
  />
);

/* ---------------- Medicine stock ---------------- */
export const Medicines = () => (
  <ResourcePage
    title="Medicine stock" endpoint="/medicines" idKey="MedicineId" addLabel="Add medicine"
    writeRoles={['Pharmacist']} searchPlaceholder="Search by medicine or category"
    columns={[
      { key: 'MedicineName', label: 'Medicine' }, { key: 'Category', label: 'Category' },
      { key: 'UnitPrice', label: 'Unit price', render: (r) => money(r.UnitPrice) },
      { key: 'StockQty', label: 'In stock', render: (r) => (
        <span className={r.StockQty <= r.ReorderLevel ? 'badge Unpaid' : ''}>{r.StockQty}</span>) },
      { key: 'ReorderLevel', label: 'Reorder at' }, { key: 'ExpiryDate', label: 'Expiry' },
    ]}
    fields={[
      { name: 'MedicineName', label: 'Medicine name', required: true },
      { name: 'Category', label: 'Category' },
      { name: 'UnitPrice', label: 'Unit price', type: 'number', required: true, default: 0 },
      { name: 'StockQty', label: 'Stock quantity', type: 'number', required: true, default: 0 },
      { name: 'ReorderLevel', label: 'Reorder level', type: 'number', default: 10 },
      { name: 'ExpiryDate', label: 'Expiry date', type: 'date' },
    ]}
  />
);

/* ---------------- Staff ---------------- */
export const Staff = () => (
  <ResourcePage
    title="Staff (employees)" endpoint="/employees" idKey="EmployeeId" addLabel="Register employee"
    searchPlaceholder="Search by name, position or department"
    columns={[
      { key: 'FullName', label: 'Name' }, { key: 'Position', label: 'Position' }, { key: 'DepartmentName', label: 'Department' },
      { key: 'Phone', label: 'Phone' }, { key: 'JoinDate', label: 'Joined' }, { key: 'IsActive', label: 'Active' },
    ]}
    fields={[
      { name: 'FullName', label: 'Full name', required: true },
      { name: 'Position', label: 'Position / job title', required: true },
      { ...deptLookup, name: 'DepartmentId', label: 'Department' },
      { name: 'Phone', label: 'Phone' },
      { name: 'Email', label: 'Email', type: 'email' },
      { name: 'JoinDate', label: 'Join date', type: 'date' },
      { name: 'IsActive', label: 'Active', type: 'checkbox' },
    ]}
  />
);

export const Attendance = () => (
  <ResourcePage
    title="Attendance" endpoint="/attendance" idKey="AttendanceId" addLabel="Record attendance"
    filters={[{ name: 'AttendanceDate', label: 'Date', type: 'date' }]}
    columns={[
      { key: 'AttendanceDate', label: 'Date' }, { key: 'EmployeeName', label: 'Employee' },
      { key: 'Status', label: 'Status', badge: true },
    ]}
    fields={[
      { ...employeeLookup, name: 'EmployeeId', label: 'Employee', required: true },
      { name: 'AttendanceDate', label: 'Date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
      { name: 'Status', label: 'Status', type: 'select', options: ['Present', 'Absent', 'Late', 'On Leave'], required: true },
    ]}
  />
);

export const Leaves = () => (
  <ResourcePage
    title="Leave records" endpoint="/leaves" idKey="LeaveId" addLabel="Add leave"
    filters={[{ name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] }]}
    columns={[
      { key: 'EmployeeName', label: 'Employee' }, { key: 'FromDate', label: 'From' }, { key: 'ToDate', label: 'To' },
      { key: 'Reason', label: 'Reason' }, { key: 'Status', label: 'Status', badge: true },
    ]}
    fields={[
      { ...employeeLookup, name: 'EmployeeId', label: 'Employee', required: true },
      { name: 'FromDate', label: 'From', type: 'date', required: true },
      { name: 'ToDate', label: 'To', type: 'date', required: true },
      { name: 'Status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'], default: 'Pending', required: true },
      { name: 'Reason', label: 'Reason', type: 'textarea' },
    ]}
  />
);

/* ---------------- Users (Admin) ---------------- */
export const Users = () => (
  <ResourcePage
    title="User accounts" endpoint="/users" idKey="UserId" addLabel="Create user"
    columns={[
      { key: 'Username', label: 'Username' }, { key: 'FullName', label: 'Full name' },
      { key: 'RoleName', label: 'Role' }, { key: 'IsActive', label: 'Active' }, { key: 'CreatedAt', label: 'Created' },
    ]}
    fields={[
      { name: 'Username', label: 'Username', required: true, createOnly: true },
      { name: 'Password', label: 'Password (min 8 characters; leave empty to keep)', type: 'password', required: true },
      { name: 'FullName', label: 'Full name', required: true },
      { type: 'lookup', endpoint: '/users/roles', valueKey: 'RoleId', labelKey: 'RoleName', name: 'RoleId', label: 'Role', required: true },
      { name: 'IsActive', label: 'Active', type: 'checkbox' },
    ]}
  />
);

export const AuditLogs = () => (
  <ResourcePage
    title="Audit log" endpoint="/audit-logs" idKey="LogId" fields={[]} canDelete={false}
    searchPlaceholder="Search by user or action"
    columns={[
      { key: 'CreatedAt', label: 'When' }, { key: 'Username', label: 'User' },
      { key: 'Action', label: 'Action' }, { key: 'Details', label: 'Details' },
    ]}
  />
);
