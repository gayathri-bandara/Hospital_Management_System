// Reports: each report is one SQL query with @from and @to dates.
const express = require('express');
const { query } = require('../db');
const { asyncHandler, httpError } = require('../utils/helpers');

const router = express.Router();

const REPORTS = {
  patients: {
    roles: ['Receptionist', 'Doctor'],
    sql: `SELECT PatientId, FullName, Gender, Phone, CAST(CreatedAt AS DATE) AS RegisteredOn
          FROM Patients WHERE CAST(CreatedAt AS DATE) BETWEEN @from AND @to ORDER BY CreatedAt DESC`,
  },
  appointments: {
    roles: ['Receptionist', 'Doctor'],
    sql: `SELECT d.FullName AS Doctor, a.Status, COUNT(*) AS Total
          FROM Appointments a JOIN Doctors d ON d.DoctorId = a.DoctorId
          WHERE a.AppointmentDate BETWEEN @from AND @to
          GROUP BY d.FullName, a.Status ORDER BY d.FullName, a.Status`,
  },
  revenue: {
    roles: ['Accountant'],
    sql: `SELECT CAST(PaidAt AS DATE) AS PayDate, Method, COUNT(*) AS Payments, SUM(Amount) AS Total
          FROM Payments WHERE CAST(PaidAt AS DATE) BETWEEN @from AND @to
          GROUP BY CAST(PaidAt AS DATE), Method ORDER BY PayDate, Method`,
  },
  pharmacy: {
    roles: ['Pharmacist'],
    sql: `SELECT m.MedicineName, SUM(x.Quantity) AS QuantitySold, SUM(x.TotalPrice) AS Revenue
          FROM PharmacyDispenses x JOIN Medicines m ON m.MedicineId = x.MedicineId
          WHERE CAST(x.DispensedAt AS DATE) BETWEEN @from AND @to
          GROUP BY m.MedicineName ORDER BY Revenue DESC`,
  },
  laboratory: {
    roles: ['LabStaff', 'Doctor'],
    sql: `SELECT t.TestName, r.Status, COUNT(*) AS Total
          FROM LabRequests r JOIN LabTests t ON t.TestId = r.TestId
          WHERE CAST(r.RequestedAt AS DATE) BETWEEN @from AND @to
          GROUP BY t.TestName, r.Status ORDER BY t.TestName`,
  },
  staff: {
    roles: [],
    sql: `SELECT e.FullName AS Employee, e.Position, a.Status, COUNT(*) AS Days
          FROM Attendance a JOIN Employees e ON e.EmployeeId = a.EmployeeId
          WHERE a.AttendanceDate BETWEEN @from AND @to
          GROUP BY e.FullName, e.Position, a.Status ORDER BY e.FullName`,
  },
};

router.get('/:type', asyncHandler(async (req, res) => {
  const report = REPORTS[req.params.type];
  if (!report) throw httpError(404, 'Unknown report.');
  if (req.user.role !== 'Admin' && !report.roles.includes(req.user.role)) {
    throw httpError(403, 'You do not have permission to view this report.');
  }
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const from = req.query.from || monthAgo;
  const to = req.query.to || today;
  res.json(await query(report.sql, { from, to }));
}));

module.exports = router;
