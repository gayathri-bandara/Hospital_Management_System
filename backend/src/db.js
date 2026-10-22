// Connection to SQL Server. One shared "pool" is used by the whole app.
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'HMS_DB',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,               // set true if your SQL Server uses SSL (Azure needs true)
    trustServerCertificate: true, // fine for local development
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null; // try again next time
      throw err;
    });
  }
  return poolPromise;
}

// Run a SELECT/INSERT/UPDATE with named parameters. Returns the whole result.
async function exec(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) request.input(key, value);
  return request.query(text);
}

// Same as exec but returns only the rows.
async function query(text, params = {}) {
  const result = await exec(text, params);
  return result.recordset || [];
}

// Run several statements as ONE unit. If any fails, everything is rolled back.
async function transaction(work) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const run = async (text, params = {}) => {
    const request = new sql.Request(tx);
    for (const [key, value] of Object.entries(params)) request.input(key, value);
    const result = await request.query(text);
    return result.recordset || [];
  };
  try {
    const out = await work(run);
    await tx.commit();
    return out;
  } catch (err) {
    try { await tx.rollback(); } catch (_) { /* ignore */ }
    throw err;
  }
}

module.exports = { sql, getPool, exec, query, transaction };
