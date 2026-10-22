// Billing: create bills with items, record payments, view full bill.
const express = require('express');
const { query, transaction } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError, toId } = require('../utils/helpers');

const router = express.Router();
const ROLES = ['Receptionist', 'Accountant'];
const ITEM_TYPES = ['Consultation', 'Laboratory', 'Pharmacy', 'Admission', 'Other'];
const METHODS = ['Cash', 'Card', 'Online', 'Insurance'];

router.get('/', authorize(...ROLES), asyncHandler(async (req, res) => {
  const params = { q: `%${req.query.q || ''}%` };
  let where = `(p.FullName LIKE @q OR CAST(b.BillId AS NVARCHAR(20)) LIKE @q)`;
  if (req.query.Status) { where += ' AND b.Status = @status'; params.status = req.query.Status; }
  res.json(await query(
    `SELECT b.BillId, b.PatientId, p.FullName AS PatientName, b.TotalAmount, b.PaidAmount,
            b.TotalAmount - b.PaidAmount AS Balance, b.Status, b.CreatedAt
     FROM Bills b JOIN Patients p ON p.PatientId = b.PatientId
     WHERE ${where} ORDER BY b.BillId DESC`, params));
}));

router.get('/:id', authorize(...ROLES), asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [bill] = await query(
    `SELECT b.BillId, b.PatientId, p.FullName AS PatientName, p.Phone, b.TotalAmount, b.PaidAmount,
            b.TotalAmount - b.PaidAmount AS Balance, b.Status, b.CreatedAt, b.CreatedBy
     FROM Bills b JOIN Patients p ON p.PatientId = b.PatientId WHERE b.BillId = @id`, { id });
  if (!bill) throw httpError(404, 'Bill not found.');
  const items = await query('SELECT BillItemId, ItemType, Description, Amount FROM BillItems WHERE BillId = @id', { id });
  const payments = await query(
    'SELECT PaymentId, Amount, Method, ReceivedBy, PaidAt FROM Payments WHERE BillId = @id ORDER BY PaymentId', { id });
  res.json({ bill, items, payments });
}));

// Create a bill. The total is calculated on the SERVER (never trust the browser).
router.post('/', authorize(...ROLES), asyncHandler(async (req, res) => {
  const PatientId = Number(req.body.PatientId);
  const items = Array.isArray(req.body.Items) ? req.body.Items : [];
  if (!PatientId) throw httpError(400, 'Choose a patient.');
  if (!items.length) throw httpError(400, 'Add at least one bill item.');
  for (const it of items) {
    if (!ITEM_TYPES.includes(it.ItemType)) throw httpError(400, 'Invalid item type.');
    if (!it.Description || !(Number(it.Amount) > 0)) throw httpError(400, 'Each item needs a description and an amount above 0.');
  }
  const total = items.reduce((sum, it) => sum + Number(it.Amount), 0);
  const billId = await transaction(async (run) => {
    const [row] = await run(
      `INSERT INTO Bills (PatientId, TotalAmount, CreatedBy) OUTPUT INSERTED.BillId AS id VALUES (@p, @t, @u)`,
      { p: PatientId, t: total, u: req.user.username });
    for (const it of items) {
      await run('INSERT INTO BillItems (BillId, ItemType, Description, Amount) VALUES (@b, @type, @d, @a)',
        { b: row.id, type: it.ItemType, d: it.Description, a: Number(it.Amount) });
    }
    return row.id;
  });
  res.status(201).json({ id: billId, message: 'Invoice created.' });
}));

// Record a payment
router.post('/:id/payments', authorize(...ROLES), asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const amount = Number(req.body.Amount);
  const method = req.body.Method;
  if (!(amount > 0)) throw httpError(400, 'Enter an amount above 0.');
  if (!METHODS.includes(method)) throw httpError(400, 'Choose a payment method.');
  await transaction(async (run) => {
    const [bill] = await run('SELECT TotalAmount, PaidAmount FROM Bills WITH (UPDLOCK) WHERE BillId = @id', { id });
    if (!bill) throw httpError(404, 'Bill not found.');
    const balance = Number(bill.TotalAmount) - Number(bill.PaidAmount);
    if (amount > balance + 0.0001) throw httpError(400, `Payment is more than the balance (${balance.toFixed(2)}).`);
    const newPaid = Number(bill.PaidAmount) + amount;
    const status = newPaid >= Number(bill.TotalAmount) - 0.0001 ? 'Paid' : 'Partial';
    await run('INSERT INTO Payments (BillId, Amount, Method, ReceivedBy) VALUES (@id, @a, @m, @u)',
      { id, a: amount, m: method, u: req.user.username });
    await run('UPDATE Bills SET PaidAmount = @p, Status = @s WHERE BillId = @id', { p: newPaid, s: status, id });
  });
  res.status(201).json({ message: 'Payment recorded.' });
}));

module.exports = router;
