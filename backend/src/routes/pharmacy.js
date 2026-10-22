// Pharmacy: dispense medicine (reduces stock), history, and alerts.
const express = require('express');
const { query, transaction } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../utils/helpers');

const router = express.Router();

router.post('/dispense', authorize('Pharmacist'), asyncHandler(async (req, res) => {
  const PatientId = Number(req.body.PatientId);
  const MedicineId = Number(req.body.MedicineId);
  const Quantity = Number(req.body.Quantity);
  if (!PatientId || !MedicineId || !Number.isInteger(Quantity) || Quantity < 1) {
    throw httpError(400, 'Choose patient, medicine and a valid quantity.');
  }
  const total = await transaction(async (run) => {
    const [med] = await run(
      `SELECT MedicineName, UnitPrice, StockQty, ExpiryDate FROM Medicines WITH (UPDLOCK)
       WHERE MedicineId = @id`, { id: MedicineId });
    if (!med) throw httpError(404, 'Medicine not found.');
    if (med.ExpiryDate && new Date(med.ExpiryDate) < new Date(new Date().toDateString())) {
      throw httpError(400, 'This medicine is expired.');
    }
    if (med.StockQty < Quantity) throw httpError(400, `Only ${med.StockQty} in stock.`);
    const totalPrice = Quantity * Number(med.UnitPrice);
    await run('UPDATE Medicines SET StockQty = StockQty - @q WHERE MedicineId = @id', { q: Quantity, id: MedicineId });
    await run(
      `INSERT INTO PharmacyDispenses (PatientId, MedicineId, Quantity, TotalPrice, DispensedBy)
       VALUES (@p, @m, @q, @t, @u)`,
      { p: PatientId, m: MedicineId, q: Quantity, t: totalPrice, u: req.user.username });
    return totalPrice;
  });
  res.status(201).json({ message: 'Medicine dispensed.', total });
}));

router.get('/dispenses', authorize('Pharmacist'), asyncHandler(async (req, res) => {
  res.json(await query(
    `SELECT TOP 200 x.DispenseId, p.FullName AS PatientName, m.MedicineName, x.Quantity, x.TotalPrice,
            x.DispensedBy, x.DispensedAt
     FROM PharmacyDispenses x JOIN Patients p ON p.PatientId = x.PatientId
     JOIN Medicines m ON m.MedicineId = x.MedicineId ORDER BY x.DispenseId DESC`));
}));

// Expiry monitoring + low stock alerts
router.get('/alerts', authorize('Doctor', 'Nurse', 'Pharmacist'), asyncHandler(async (req, res) => {
  const [lowStock, expiringSoon, expired] = await Promise.all([
    query(`SELECT MedicineId, MedicineName, StockQty, ReorderLevel FROM Medicines
           WHERE StockQty <= ReorderLevel ORDER BY StockQty`),
    query(`SELECT MedicineId, MedicineName, StockQty, ExpiryDate FROM Medicines
           WHERE ExpiryDate >= CAST(GETDATE() AS DATE) AND ExpiryDate <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
           ORDER BY ExpiryDate`),
    query(`SELECT MedicineId, MedicineName, StockQty, ExpiryDate FROM Medicines
           WHERE ExpiryDate < CAST(GETDATE() AS DATE) ORDER BY ExpiryDate`),
  ]);
  res.json({ lowStock, expiringSoon, expired });
}));

module.exports = router;
