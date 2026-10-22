const crud = require('../utils/crud');
const { query } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');

const router = crud({
  table: 'Appointments', idColumn: 'AppointmentId', idExpr: 'a.AppointmentId',
  selectSql: `SELECT a.AppointmentId, a.PatientId, p.FullName AS PatientName, a.DoctorId, d.FullName AS DoctorName,
                     a.AppointmentDate, a.AppointmentTime, a.Reason, a.Status
              FROM Appointments a
              JOIN Patients p ON p.PatientId = a.PatientId
              JOIN Doctors d ON d.DoctorId = a.DoctorId`,
  fields: ['PatientId', 'DoctorId', 'AppointmentDate', 'AppointmentTime', 'Reason'],
  searchExprs: ['p.FullName', 'd.FullName', 'a.Reason'],
  filterMap: { AppointmentDate: 'a.AppointmentDate', DoctorId: 'a.DoctorId', Status: 'a.Status' },
  orderBy: 'a.AppointmentDate DESC, a.AppointmentTime',
  readRoles: ['Doctor', 'Nurse', 'Receptionist'],
  writeRoles: ['Receptionist'],
  // A doctor cannot have two active appointments at the same date and time.
  validate: async (data, id) => {
    if (!data.DoctorId || !data.AppointmentDate || !data.AppointmentTime) return;
    const rows = await query(
      `SELECT COUNT(*) AS c FROM Appointments
       WHERE DoctorId = @d AND AppointmentDate = @date AND AppointmentTime = @t
         AND Status <> 'Cancelled' AND AppointmentId <> @id`,
      { d: data.DoctorId, date: data.AppointmentDate, t: data.AppointmentTime, id: id || 0 }
    );
    if (rows[0].c > 0) throw httpError(409, 'This doctor already has an appointment at that date and time.');
  },
});

// Change status: Scheduled / Completed / Cancelled / No Show
router.post('/:id/status', authorize('Doctor', 'Nurse', 'Receptionist'), asyncHandler(async (req, res) => {
  const { Status } = req.body;
  if (!['Scheduled', 'Completed', 'Cancelled', 'No Show'].includes(Status)) throw httpError(400, 'Invalid status.');
  await query('UPDATE Appointments SET Status = @s WHERE AppointmentId = @id', { s: Status, id: toId(req.params.id) });
  res.json({ message: 'Status updated.' });
}));

module.exports = router;
