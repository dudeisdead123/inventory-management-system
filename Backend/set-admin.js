const { pool } = require('./db');
const bcrypt = require('bcryptjs');

// Change these constants to the credentials you want
const TARGET_EMAIL    = 'ansumanaheer8@gmail.com';   // email you log in with
const NEW_PASSWORD    = 'Kash@5612'; // desired password

(async () => {
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    // Upsert the admin row – will INSERT if missing, UPDATE if present
    const upsertQuery = `
      INSERT INTO users (name, email, password, role, location)
      VALUES ('Admin', $1, $2, 'admin', 'All')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name;
    `;
    const res = await pool.query(upsertQuery, [TARGET_EMAIL, hash]);
    console.log('✅ Admin credentials set →', TARGET_EMAIL, NEW_PASSWORD);
  } catch (err) {
    console.error('❌ Error updating admin:', err);
  } finally {
    process.exit();
  }
})();
