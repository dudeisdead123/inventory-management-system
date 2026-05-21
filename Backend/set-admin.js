/**
 * One-time utility: create or update an admin user.
 * Edit email/password below, then: node set-admin.js
 * Requires DATABASE_URL (or PG* vars) in Backend/.env
 */
require('dotenv').config();
const { pool } = require('./db');
const bcrypt = require('bcryptjs');

const TARGET_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

(async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    await pool.query(
      `INSERT INTO users (name, email, password, role, location)
       VALUES ('Admin', $1, $2, 'admin', 'All')
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name`,
      [TARGET_EMAIL, hash]
    );
    console.log('Admin credentials set for:', TARGET_EMAIL);
  } catch (err) {
    console.error('Error updating admin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
