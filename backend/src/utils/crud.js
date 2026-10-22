// A reusable "CRUD" router: builds list / get / create / update / delete
// for one table. This avoids writing the same code again and again.
const express = require('express');
const { query, exec } = require('../db');
const { authorize } = require('../middleware/auth');
const { asyncHandler, clean, toId } = require('./helpers');

module.exports = function crudRouter(cfg) {
  const {
    table,            // table name, example 'Patients'
    idColumn,         // primary key column, example 'PatientId'
    idExpr,           // id used in SELECT (with alias), example 'p.PatientId'
    fields,           // columns that may be written, example ['FullName','Phone']
    selectSql,        // SELECT used for reading (can contain JOINs)
    orderBy,          // ORDER BY text
    searchExprs = [], // columns searched by ?q=
    filterMap = {},   // ?Name=value filters:  { Name: 'alias.Column' }
    readRoles,        // roles that may read
    writeRoles,       // roles that may create / edit / delete
    validate,         // optional async (data, id) => throws an error if invalid
  } = cfg;

  const router = express.Router();
  const base = selectSql || `SELECT * FROM ${table}`;
  const selectId = idExpr || idColumn;

  // Take only allowed fields from the request body.
  const pick = (body, dropNull) => {
    const data = {};
    for (const f of fields) {
      if (body[f] === undefined) continue;
      const v = clean(body[f]);
      if (dropNull && v === null) continue; // let SQL defaults work on insert
      data[f] = v;
    }
    return data;
  };

  // LIST (+ search + filters)
  router.get('/', authorize(...readRoles), asyncHandler(async (req, res) => {
    const params = {};
    const where = [];
    if (req.query.q && searchExprs.length) {
      params.q = `%${req.query.q}%`;
      where.push('(' + searchExprs.map((e) => `${e} LIKE @q`).join(' OR ') + ')');
    }
    for (const [key, expr] of Object.entries(filterMap)) {
      const v = req.query[key];
      if (v !== undefined && v !== '') {
        params['f_' + key] = v;
        where.push(`${expr} = @f_${key}`);
      }
    }
    const sqlText = `${base} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy || selectId + ' DESC'}`;
    res.json(await query(sqlText, params));
  }));

  // GET ONE
  router.get('/:id', authorize(...readRoles), asyncHandler(async (req, res) => {
    const rows = await query(`${base} WHERE ${selectId} = @id`, { id: toId(req.params.id) });
    if (!rows.length) return res.status(404).json({ message: 'Record not found.' });
    res.json(rows[0]);
  }));

  // CREATE
  router.post('/', authorize(...writeRoles), asyncHandler(async (req, res) => {
    const data = pick(req.body, true);
    const cols = Object.keys(data);
    if (!cols.length) return res.status(400).json({ message: 'No data received.' });
    if (validate) await validate(data, null);
    const rows = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) OUTPUT INSERTED.${idColumn} AS id
       VALUES (${cols.map((c) => '@' + c).join(', ')})`,
      data
    );
    res.status(201).json({ id: rows[0].id, message: 'Saved successfully.' });
  }));

  // UPDATE
  router.put('/:id', authorize(...writeRoles), asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const data = pick(req.body, false);
    const cols = Object.keys(data);
    if (!cols.length) return res.status(400).json({ message: 'No data received.' });
    if (validate) await validate(data, id);
    const result = await exec(
      `UPDATE ${table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE ${idColumn} = @id__`,
      { ...data, id__: id }
    );
    if (!result.rowsAffected[0]) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Updated successfully.' });
  }));

  // DELETE
  router.delete('/:id', authorize(...writeRoles), asyncHandler(async (req, res) => {
    const result = await exec(
      `DELETE FROM ${table} WHERE ${idColumn} = @id`, { id: toId(req.params.id) }
    );
    if (!result.rowsAffected[0]) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Deleted successfully.' });
  }));

  return router;
};
