const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../utils/helpers');

const router = express.Router();

// Max 10 login tries per 15 minutes from one computer (stops password guessing).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
});

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw httpError(400, 'Enter username and password.');

  const rows = await query(
    `SELECT u.UserId, u.Username, u.PasswordHash, u.FullName, u.IsActive, r.RoleName
     FROM Users u JOIN Roles r ON r.RoleId = u.RoleId WHERE u.Username = @username`,
    { username }
  );
  const user = rows[0];
  const ok = user && user.IsActive && (await bcrypt.compare(password, user.PasswordHash));
  if (!ok) throw httpError(401, 'Wrong username or password.');

  const payload = { id: user.UserId, username: user.Username, name: user.FullName, role: user.RoleName };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '30m' });
  await query(
    'INSERT INTO AuditLogs (UserId, Username, Action, Details) VALUES (@u, @n, @a, @d)',
    { u: user.UserId, n: user.Username, a: 'LOGIN', d: 'User logged in' }
  );
  res.json({ token, user: payload });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await query(
    'INSERT INTO AuditLogs (UserId, Username, Action, Details) VALUES (@u, @n, @a, @d)',
    { u: req.user.id, n: req.user.username, a: 'LOGOUT', d: 'User logged out' }
  );
  res.json({ message: 'Logged out.' });
}));

router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw httpError(400, 'New password must be at least 8 characters.');
  const rows = await query('SELECT PasswordHash FROM Users WHERE UserId = @id', { id: req.user.id });
  if (!rows.length || !(await bcrypt.compare(currentPassword || '', rows[0].PasswordHash))) {
    throw httpError(400, 'Current password is wrong.');
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE Users SET PasswordHash = @h WHERE UserId = @id', { h: hash, id: req.user.id });
  res.json({ message: 'Password changed.' });
}));

module.exports = router;
