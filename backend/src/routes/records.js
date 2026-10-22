const crud = require('../utils/crud');
module.exports = crud({
  table: 'MedicalRecords', idColumn: 'RecordId', idExpr: 'r.RecordId',
  selectSql: `SELECT r.RecordId, r.PatientId, p.FullName AS PatientName, r.DoctorId, d.FullName AS DoctorName,
                     r.VisitDate, r.Diagnosis, r.Prescription, r.Treatment, r.Notes
              FROM MedicalRecords r
              JOIN Patients p ON p.PatientId = r.PatientId
              JOIN Doctors d ON d.DoctorId = r.DoctorId`,
  fields: ['PatientId', 'DoctorId', 'VisitDate', 'Diagnosis', 'Prescription', 'Treatment', 'Notes'],
  searchExprs: ['p.FullName', 'r.Diagnosis', 'd.FullName'],
  filterMap: { PatientId: 'r.PatientId' },
  orderBy: 'r.VisitDate DESC, r.RecordId DESC',
  readRoles: ['Doctor', 'Nurse'],
  writeRoles: ['Doctor'],
});
