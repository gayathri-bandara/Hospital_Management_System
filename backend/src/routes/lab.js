const crud = require('../utils/crud');
const { query, exec } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');

const router = crud({
  table: 'LabRequests', idColumn: 'RequestId', idExpr: 'r.RequestId',
  selectSql: `SELECT r.RequestId, r.PatientId, p.FullName AS PatientName, r.DoctorId, d.FullName AS DoctorName,
                     r.TestId, t.TestName, t.Price, r.Status, r.RequestedAt, r.SampleCollectedAt,
                     r.Result, r.ResultAt, r.Notes
              FROM LabRequests r
              JOIN Patients p ON p.PatientId = r.PatientId
              JOIN LabTests t ON t.TestId = r.TestId
              LEFT JOIN Doctors d ON d.DoctorId = r.DoctorId`,
  fields: ['PatientId', 'DoctorId', 'TestId', 'Notes'],
  searchExprs: ['p.FullName', 't.TestName'],
  filterMap: { Status: 'r.Status', PatientId: 'r.PatientId' },
  readRoles: ['Doctor', 'Nurse', 'LabStaff'],
  writeRoles: ['Doctor', 'Nurse'],
});

// Step 2: sample collected
router.post('/:id/collect', authorize('Nurse', 'LabStaff'), asyncHandler(async (req, res) => {
  const r = await exec(
    `UPDATE LabRequests SET Status = 'Sample Collected', SampleCollectedAt = SYSUTCDATETIME()
     WHERE RequestId = @id AND Status = 'Requested'`, { id: toId(req.params.id) });
  if (!r.rowsAffected[0]) throw httpError(400, 'Sample was already collected or the request does not exist.');
  res.json({ message: 'Sample marked as collected.' });
}));

// Step 3: result entry
router.post('/:id/result', authorize('LabStaff'), asyncHandler(async (req, res) => {
  const result = (req.body.Result || '').trim();
  if (!result) throw httpError(400, 'Enter the result.');
  const r = await exec(
    `UPDATE LabRequests SET Result = @res, Status = 'Completed', ResultAt = SYSUTCDATETIME()
     WHERE RequestId = @id AND Status IN ('Sample Collected', 'Completed')`,
    { res: result, id: toId(req.params.id) });
  if (!r.rowsAffected[0]) throw httpError(400, 'Collect the sample first.');
  res.json({ message: 'Result saved.' });
}));

module.exports = router;
