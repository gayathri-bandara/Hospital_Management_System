// Creates the first Admin user.   Run:  npm run create-admin
// Optional:  node scripts/createAdmin.js myname MyPassword123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, getPool } = require('../src/db');

(async () => {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'Admin@12345';
  const hash = await bcrypt.hash(password, 10);

  const exists = await query('SELECT UserId FROM Users WHERE Username = @u', { u: username });
  if (exists.length) {
    await query('UPDATE Users SET PasswordHash = @h, IsActive = 1 WHERE Username = @u', { h: hash, u: username });
    console.log(`User "${username}" already existed. Password was reset.`);
  } else {
    await query(
      `INSERT INTO Users (Username, PasswordHash, FullName, RoleId)
       VALUES (@u, @h, 'System Administrator', (SELECT RoleId FROM Roles WHERE RoleName = 'Admin'))`,
      { u: username, h: hash }
    );
    console.log(`Admin user created.  Username: ${username}   Password: ${password}`);
  }
  console.log('Log in, then change this password from the top-right menu.');
  (await getPool()).close();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
