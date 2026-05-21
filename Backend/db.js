const { Pool } = require('pg');

const useDatabaseUrl = Boolean(process.env.DATABASE_URL);
const needsSsl =
  process.env.PGSSL === 'true' ||
  (process.env.DATABASE_URL && /sslmode=require/i.test(process.env.DATABASE_URL));

const pool = useDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'ims_db',
      password: process.env.PGPASSWORD || 'postgres',
      port: Number(process.env.PGPORT || 5432),
    });

const connectToDb = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL at:', res.rows[0].now);
  } catch (error) {
    console.error('PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  connectToDb,
};
