const { pool } = require('./db');
(async () => {
  try {
    const res = await pool.query("SELECT id,email,role FROM users WHERE email = $1", ['admin@example.com']);
    console.log('Rows:', res.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
})();
