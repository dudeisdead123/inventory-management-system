const { pool } = require('./db');
const bcrypt = require('bcryptjs');

const NEW_EMAIL = 'ansumanaheer8@gmailcom';
const NEW_PASSWORD = 'Kash@5612'; // change as desired

(async () => {
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    // Upsert admin user
    const upsertQuery = `
      INSERT INTO users (name, email, password, role, location)
      VALUES ('Admin', $1, $2, 'admin', 'All')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name;
    `;
    await pool.query(upsertQuery, [NEW_EMAIL, hash]);
    console.log('Admin credentials reset to', NEW_EMAIL, NEW_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin:', err);
    process.exit(1);
  }
})();
