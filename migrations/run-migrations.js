const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const migrationFile = path.join(__dirname, '001_create_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
