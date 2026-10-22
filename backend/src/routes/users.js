// User management - Admin only.
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');

const router = express.Router();
router.use(authorize()); // empty list = Admin only

const SELECT = `SELECT u.UserId, u.Username, u.FullName, u.RoleId, r.RoleName, u.IsActive, u.CreatedAt
                FROM Users u JOIN Roles r ON r.RoleId = u.RoleId`;

router.get('/roles', asyncHandler(async (req, res) => {
  res.json(await query('SELECT RoleId, RoleName FROM Roles ORDER BY RoleName'));
}));

router.get('/', asyncHandler(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(await query(`${SELECT} WHERE u.Username LIKE @q OR u.FullName LIKE @q ORDER BY u.UserId DESC`, { q }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { Username, Password, FullName, RoleId, IsActive } = req.body;
  if (!Username || !Password || !FullName || !RoleId) throw httpError(400, 'Fill all required fields.');
  if (Password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  const hash = await bcrypt.hash(Password, 10);
  const rows = await query(
    `INSERT INTO Users (Username, PasswordHash, FullName, RoleId, IsActive)
     OUTPUT INSERTED.UserId AS id VALUES (@Username, @hash, @FullName, @RoleId, @IsActive)`,
    { Username, hash, FullName, RoleId, IsActive: IsActive === false ? 0 : 1 }
  );
  res.status(201).json({ id: rows[0].id, message: 'User created.' });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const { Password, FullName, RoleId, IsActive } = req.body;
  if (id === req.user.id && IsActive === false) throw httpError(400, 'You cannot deactivate your own account.');
  const sets = ['FullName = @FullName', 'RoleId = @RoleId', 'IsActive = @IsActive'];
  const params = { id, FullName, RoleId, IsActive: IsActive === false ? 0 : 1 };
  if (Password) {
    if (Password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
    sets.push('PasswordHash = @hash');
    params.hash = await bcrypt.hash(Password, 10);
  }
  await query(`UPDATE Users SET ${sets.join(', ')} WHERE UserId = @id`, params);
  res.json({ message: 'User updated.' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  if (id === req.user.id) throw httpError(400, 'You cannot delete your own account.');
  await query('DELETE FROM Users WHERE UserId = @id', { id });
  res.json({ message: 'User deleted.' });
}));

module.exports = router;
