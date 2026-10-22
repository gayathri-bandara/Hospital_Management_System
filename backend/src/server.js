require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { authenticate, auditMiddleware } = require('./middleware/auth');
const { getPool } = require('./db');
const simple = require('./routes/simpleCrud');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('ERROR: set a long JWT_SECRET in the .env file.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// Public routes (no login needed)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));

// Everything below needs a valid login token, and changes are written to the audit log
app.use('/api', authenticate, auditMiddleware);

app.use('/api/users', require('./routes/users'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));

app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', simple.doctors);
app.use('/api/departments', simple.departments);
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/records', require('./routes/records'));
app.use('/api/lab-tests', simple.labTests);
app.use('/api/lab-requests', require('./routes/lab'));
app.use('/api/medicines', simple.medicines);
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/employees', simple.employees);
app.use('/api/attendance', simple.attendance);
app.use('/api/leaves', simple.leaves);

app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

// One place that turns errors into friendly messages
app.use((err, req, res, next) => {
  const n = err.number || (err.originalError && err.originalError.info && err.originalError.info.number);
  let status = err.status || 500;
  let message = err.status ? err.message : 'Server error. Please try again.';

  if (n === 2627 || n === 2601) { status = 409; message = 'This record already exists (duplicate value).'; }
  else if (n === 547) { status = 409; message = 'This action is not allowed: the record is linked to other data, or a chosen value is not valid.'; }
  else if (n === 515) { status = 400; message = 'A required field is missing.'; }
  else if (n === 8152) { status = 400; message = 'One of the values is too long.'; }
  else if ([241, 242, 245, 8114, 8115].includes(n)) { status = 400; message = 'A date, time or number is not valid.'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'File is too large (max 5 MB).'; }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
getPool()
  .then(() => {
    console.log('Connected to SQL Server database.');
    app.listen(PORT, () => console.log(`HMS API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to SQL Server:', err.message);
    process.exit(1);
  });
