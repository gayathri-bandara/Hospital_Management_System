const jwt = require('jsonwebtoken');
const { query } = require('../db');

// 1) Check the login token on every request.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

// 2) Check that the user's role is allowed. Admin is always allowed.
function authorize(...roles) {
  return (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || roles.includes(req.user.role))) return next();
    return res.status(403).json({ message: 'You do not have permission to do this.' });
  };
}

// 3) Audit log: write one row for every successful change (POST/PUT/DELETE).
function auditMiddleware(req, res, next) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode < 400 && req.user) {
      const details = `${req.method} ${req.originalUrl} -> ${res.statusCode}`.slice(0, 500);
      query(
        'INSERT INTO AuditLogs (UserId, Username, Action, Details) VALUES (@u, @n, @a, @d)',
        { u: req.user.id, n: req.user.username, a: req.method, d: details }
      ).catch(() => {});
    }
  });
  next();
}

module.exports = { authenticate, authorize, auditMiddleware };
