const express = require('express');
const { query } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.get('/', authorize(), asyncHandler(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(await query(
    `SELECT TOP 300 LogId, Username, Action, Details, CreatedAt FROM AuditLogs
     WHERE Username LIKE @q OR Details LIKE @q OR Action LIKE @q ORDER BY LogId DESC`, { q }));
}));
module.exports = router;
