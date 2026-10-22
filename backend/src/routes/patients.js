// Patients: basic CRUD + full medical history + document upload/download.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { query } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');
const { ALL, CLINICAL } = require('../config/roles');
const { patients } = require('./simpleCrud');

const router = patients; // start from the CRUD router, then add extra routes

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : httpError(400, 'Only PDF, image or Word files are allowed.'), ok);
  },
});

// Full history of one patient
router.get('/:id/history', authorize(...CLINICAL), asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [patient] = await query('SELECT * FROM Patients WHERE PatientId = @id', { id });
  if (!patient) throw httpError(404, 'Patient not found.');
  const [appointments, records, labs, admissions, documents] = await Promise.all([
    query(`SELECT a.AppointmentId, a.AppointmentDate, a.AppointmentTime, d.FullName AS DoctorName, a.Reason, a.Status
           FROM Appointments a JOIN Doctors d ON d.DoctorId = a.DoctorId
           WHERE a.PatientId = @id ORDER BY a.AppointmentDate DESC`, { id }),
    query(`SELECT r.RecordId, r.VisitDate, d.FullName AS DoctorName, r.Diagnosis, r.Prescription, r.Treatment, r.Notes
           FROM MedicalRecords r JOIN Doctors d ON d.DoctorId = r.DoctorId
           WHERE r.PatientId = @id ORDER BY r.VisitDate DESC, r.RecordId DESC`, { id }),
    query(`SELECT l.RequestId, t.TestName, l.Status, l.RequestedAt, l.Result
           FROM LabRequests l JOIN LabTests t ON t.TestId = l.TestId
           WHERE l.PatientId = @id ORDER BY l.RequestId DESC`, { id }),
    query(`SELECT AdmissionId, RoomNo, AdmitDate, DischargeDate, Status
           FROM Admissions WHERE PatientId = @id ORDER BY AdmitDate DESC`, { id }),
    query(`SELECT DocumentId, OriginalName, UploadedBy, UploadedAt
           FROM PatientDocuments WHERE PatientId = @id ORDER BY DocumentId DESC`, { id }),
  ]);
  res.json({ patient, appointments, records, labs, admissions, documents });
}));

// Upload a document
router.post('/:id/documents', authorize('Receptionist', 'Doctor', 'Nurse', 'LabStaff'),
  upload.single('file'), asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    if (!req.file) throw httpError(400, 'Choose a file.');
    await query(
      `INSERT INTO PatientDocuments (PatientId, OriginalName, StoredName, UploadedBy)
       VALUES (@id, @o, @s, @u)`,
      { id, o: req.file.originalname, s: req.file.filename, u: req.user.username }
    );
    res.status(201).json({ message: 'Document uploaded.' });
  }));

// Download a document
router.get('/documents/:docId/download', authorize(...CLINICAL, 'Receptionist'),
  asyncHandler(async (req, res) => {
    const [doc] = await query('SELECT OriginalName, StoredName FROM PatientDocuments WHERE DocumentId = @id',
      { id: toId(req.params.docId) });
    if (!doc) throw httpError(404, 'Document not found.');
    res.download(path.join(uploadDir, doc.StoredName), doc.OriginalName);
  }));

// Delete a document
router.delete('/documents/:docId', authorize('Receptionist', 'Doctor', 'Nurse'),
  asyncHandler(async (req, res) => {
    const id = toId(req.params.docId);
    const [doc] = await query('SELECT StoredName FROM PatientDocuments WHERE DocumentId = @id', { id });
    if (!doc) throw httpError(404, 'Document not found.');
    await query('DELETE FROM PatientDocuments WHERE DocumentId = @id', { id });
    fs.unlink(path.join(uploadDir, doc.StoredName), () => {});
    res.json({ message: 'Document deleted.' });
  }));

module.exports = router;
