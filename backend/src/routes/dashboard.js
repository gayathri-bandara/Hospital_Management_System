const express = require('express');
const { query } = require('../db');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const role = req.user.role;
  const [totals] = await query(`
    SELECT
      (SELECT COUNT(*) FROM Patients) AS TotalPatients,
      (SELECT COUNT(*) FROM Appointments WHERE AppointmentDate = CAST(GETDATE() AS DATE) AND Status <> 'Cancelled') AS TodaysAppointments,
      (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE CAST(PaidAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE)) AS RevenueToday,
      (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE YEAR(PaidAt) = YEAR(SYSUTCDATETIME()) AND MONTH(PaidAt) = MONTH(SYSUTCDATETIME())) AS RevenueThisMonth,
      (SELECT COUNT(*) FROM LabRequests WHERE Status <> 'Completed') AS PendingLabRequests,
      (SELECT COUNT(*) FROM Medicines WHERE StockQty <= ReorderLevel OR ExpiryDate <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))) AS PharmacyAlerts,
      (SELECT COUNT(*) FROM Admissions WHERE Status = 'Admitted') AS AdmittedPatients,
      (SELECT COUNT(*) FROM Bills WHERE Status <> 'Paid') AS UnpaidBills`);

  // Hide money figures from roles that should not see them
  if (!['Admin', 'Accountant'].includes(role)) { delete totals.RevenueToday; delete totals.RevenueThisMonth; }

  const todays = ['Admin', 'Doctor', 'Nurse', 'Receptionist'].includes(role)
    ? await query(`SELECT TOP 10 a.AppointmentId, a.AppointmentTime, p.FullName AS PatientName, d.FullName AS DoctorName, a.Status
                   FROM Appointments a JOIN Patients p ON p.PatientId = a.PatientId
                   JOIN Doctors d ON d.DoctorId = a.DoctorId
                   WHERE a.AppointmentDate = CAST(GETDATE() AS DATE) AND a.Status <> 'Cancelled'
                   ORDER BY a.AppointmentTime`)
    : [];
  res.json({ totals, todaysAppointments: todays });
}));

module.exports = router;
