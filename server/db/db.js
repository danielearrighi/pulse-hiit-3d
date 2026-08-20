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
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';");
    await pool.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele';");
    
    const seedCheck = await pool.query('SELECT seeded FROM system_seed LIMIT 1');
    if (seedCheck.rows.length === 0) {
      await seedStandardExercises({ query: (sql, params) => pool.query(sql, params) });
      await pool.query('INSERT INTO system_seed (seeded) VALUES (TRUE)');
    }
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
    await pgliteInstance.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';");
    await pgliteInstance.exec("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele';");
    
    const seedCheck = await pgliteInstance.query('SELECT seeded FROM system_seed LIMIT 1');
    if (seedCheck.rows.length === 0) {
      await seedStandardExercises({
        query: async (sql, params = []) => {
          const res = await pgliteInstance.query(sql, params);
          return { rows: res.rows };
        }
      });
      await pgliteInstance.query('INSERT INTO system_seed (seeded) VALUES (TRUE)');
    }
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
