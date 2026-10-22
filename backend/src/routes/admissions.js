const crud = require('../utils/crud');
const { query } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');

const router = crud({
  table: 'Admissions', idColumn: 'AdmissionId', idExpr: 'ad.AdmissionId',
  selectSql: `SELECT ad.AdmissionId, ad.PatientId, p.FullName AS PatientName, ad.DoctorId, d.FullName AS DoctorName,
                     ad.RoomNo, ad.AdmitDate, ad.DischargeDate, ad.DailyCharge, ad.Status, ad.Notes
              FROM Admissions ad
              JOIN Patients p ON p.PatientId = ad.PatientId
              LEFT JOIN Doctors d ON d.DoctorId = ad.DoctorId`,
  fields: ['PatientId', 'DoctorId', 'RoomNo', 'AdmitDate', 'DailyCharge', 'Notes'],
  searchExprs: ['p.FullName', 'ad.RoomNo'],
  filterMap: { Status: 'ad.Status' },
  readRoles: ['Doctor', 'Nurse', 'Receptionist', 'Accountant'],
  writeRoles: ['Doctor', 'Nurse', 'Receptionist'],
});

// Discharge a patient and calculate the room charge (add it to a bill afterwards)
router.post('/:id/discharge', authorize('Doctor', 'Nurse', 'Receptionist'), asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [adm] = await query('SELECT AdmitDate, DailyCharge, Status FROM Admissions WHERE AdmissionId = @id', { id });
  if (!adm) throw httpError(404, 'Admission not found.');
  if (adm.Status === 'Discharged') throw httpError(400, 'Patient is already discharged.');
  await query(`UPDATE Admissions SET DischargeDate = CAST(GETDATE() AS DATE), Status = 'Discharged'
               WHERE AdmissionId = @id`, { id });
  const [calc] = await query(
    `SELECT CASE WHEN DATEDIFF(DAY, AdmitDate, DischargeDate) < 1 THEN 1 ELSE DATEDIFF(DAY, AdmitDate, DischargeDate) END AS Days,
            DailyCharge FROM Admissions WHERE AdmissionId = @id`, { id });
  res.json({ message: 'Patient discharged.', days: calc.Days, amount: calc.Days * Number(calc.DailyCharge) });
}));

module.exports = router;
