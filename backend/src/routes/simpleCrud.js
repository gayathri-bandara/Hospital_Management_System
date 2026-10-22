// Patients, Doctors, Departments, Employees, Attendance, Leave, Medicines, Lab tests.
// Each one is only a small settings object for the CRUD factory.
const crud = require('../utils/crud');
const { ALL, CLINICAL } = require('../config/roles');

const patients = crud({
  table: 'Patients', idColumn: 'PatientId',
  fields: ['FullName', 'Gender', 'DateOfBirth', 'Phone', 'Email', 'Address', 'BloodGroup', 'EmergencyContact'],
  searchExprs: ['FullName', 'Phone', 'Email', 'CAST(PatientId AS NVARCHAR(20))'],
  readRoles: ALL, writeRoles: ['Receptionist', 'Nurse'],
});

const doctors = crud({
  table: 'Doctors', idColumn: 'DoctorId', idExpr: 'd.DoctorId',
  selectSql: `SELECT d.*, dep.DepartmentName FROM Doctors d LEFT JOIN Departments dep ON dep.DepartmentId = d.DepartmentId`,
  fields: ['FullName', 'Specialization', 'Phone', 'Email', 'DepartmentId', 'ConsultationFee', 'Schedule', 'IsActive'],
  searchExprs: ['d.FullName', 'd.Specialization', 'dep.DepartmentName'],
  filterMap: { DepartmentId: 'd.DepartmentId' },
  readRoles: ALL, writeRoles: [],
});

const departments = crud({
  table: 'Departments', idColumn: 'DepartmentId',
  fields: ['DepartmentName', 'Description'],
  searchExprs: ['DepartmentName'], orderBy: 'DepartmentName',
  readRoles: ALL, writeRoles: [],
});

const employees = crud({
  table: 'Employees', idColumn: 'EmployeeId', idExpr: 'e.EmployeeId',
  selectSql: `SELECT e.*, dep.DepartmentName FROM Employees e LEFT JOIN Departments dep ON dep.DepartmentId = e.DepartmentId`,
  fields: ['FullName', 'Position', 'DepartmentId', 'Phone', 'Email', 'JoinDate', 'IsActive'],
  searchExprs: ['e.FullName', 'e.Position', 'dep.DepartmentName'],
  readRoles: [], writeRoles: [],
});

const attendance = crud({
  table: 'Attendance', idColumn: 'AttendanceId', idExpr: 'a.AttendanceId',
  selectSql: `SELECT a.AttendanceId, a.EmployeeId, e.FullName AS EmployeeName, a.AttendanceDate, a.Status
              FROM Attendance a JOIN Employees e ON e.EmployeeId = a.EmployeeId`,
  fields: ['EmployeeId', 'AttendanceDate', 'Status'],
  searchExprs: ['e.FullName'], filterMap: { AttendanceDate: 'a.AttendanceDate' },
  orderBy: 'a.AttendanceDate DESC, e.FullName',
  readRoles: [], writeRoles: [],
});

const leaves = crud({
  table: 'LeaveRecords', idColumn: 'LeaveId', idExpr: 'l.LeaveId',
  selectSql: `SELECT l.LeaveId, l.EmployeeId, e.FullName AS EmployeeName, l.FromDate, l.ToDate, l.Reason, l.Status
              FROM LeaveRecords l JOIN Employees e ON e.EmployeeId = l.EmployeeId`,
  fields: ['EmployeeId', 'FromDate', 'ToDate', 'Reason', 'Status'],
  searchExprs: ['e.FullName'], filterMap: { Status: 'l.Status' },
  readRoles: [], writeRoles: [],
});

const medicines = crud({
  table: 'Medicines', idColumn: 'MedicineId',
  fields: ['MedicineName', 'Category', 'UnitPrice', 'StockQty', 'ReorderLevel', 'ExpiryDate'],
  searchExprs: ['MedicineName', 'Category'], orderBy: 'MedicineName',
  readRoles: ['Doctor', 'Nurse', 'Pharmacist'], writeRoles: ['Pharmacist'],
});

const labTests = crud({
  table: 'LabTests', idColumn: 'TestId',
  fields: ['TestName', 'Price'],
  searchExprs: ['TestName'], orderBy: 'TestName',
  readRoles: [...CLINICAL, 'LabStaff', 'Receptionist'], writeRoles: ['LabStaff'],
});

module.exports = { patients, doctors, departments, employees, attendance, leaves, medicines, labTests };
