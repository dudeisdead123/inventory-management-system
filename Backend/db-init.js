const fs = require('fs');
const path = require('path');
const { pool, connectToDb } = require('./db');

const initSchema = async () => {
  try {
    await connectToDb();
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema initialized successfully!');
    
    // Check if tables exist
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Created tables:', res.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  } finally {
    await pool.end();
  }
};

initSchema();
