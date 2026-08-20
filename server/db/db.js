const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
const { seedStandardExercises } = require('./seed');

let pool = null;
let pgliteInstance = null;

async function initDB() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (process.env.DATABASE_URL) {
    console.log('[DB] Connecting to PostgreSQL instance via DATABASE_URL...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    // Execute schema
    await pool.query(schemaSql);
    await seedStandardExercises({ query: (sql, params) => pool.query(sql, params) });
    console.log('[DB] PostgreSQL connected & initialized.');
  } else {
    console.log('[DB] No DATABASE_URL found. Initializing embedded PostgreSQL (PGlite)...');
    const dbDir = path.join(__dirname, '../../data/pglite');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dbDir);
    await pgliteInstance.waitReady;
    
    // Execute schema
    await pgliteInstance.exec(schemaSql);
    await seedStandardExercises({
      query: async (sql, params = []) => {
        // Convert $1, $2 to pglite param array syntax
        const res = await pgliteInstance.query(sql, params);
        return { rows: res.rows };
      }
    });
    console.log('[DB] Embedded PostgreSQL (PGlite) initialized.');
  }
}

async function query(text, params = []) {
  if (pool) {
    return await pool.query(text, params);
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query(text, params);
    return { rows: res.rows };
  } else {
    throw new Error('Database not initialized. Call initDB() first.');
  }
}

module.exports = {
  initDB,
  query
};
