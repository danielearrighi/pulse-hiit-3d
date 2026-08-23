const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { seedStandardExercises } = require('./seed');

let pool = null;

function getDbConfig() {
  const isSsl = process.env.DATABASE_SSL === 'true' || 
    (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('render.com')));

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isSsl ? { rejectUnauthorized: false } : false
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'exercise_planner',
    ssl: isSsl ? { rejectUnauthorized: false } : false
  };
}

function getPool() {
  if (!pool) {
    const config = getDbConfig();
    pool = new Pool(config);
    
    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });
  }
  return pool;
}

async function waitForConnection(maxRetries = 10, delayMs = 1500) {
  const p = getPool();
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await p.connect();
      const res = await client.query('SELECT version();');
      client.release();
      console.log(`[DB] Connected to PostgreSQL. Server version: ${res.rows[0].version.split(',')[0]}`);
      return;
    } catch (err) {
      console.warn(`[DB] Connection attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in ${delayMs}ms...`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to PostgreSQL after ${maxRetries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function initDB() {
  console.log('[DB] Initializing PostgreSQL database connection...');
  await waitForConnection();

  const p = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute base schema
  await p.query(schemaSql);

  // Idempotent column & table migrations
  await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';");
  await p.query("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS notes TEXT;");
  await p.query("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
  await p.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;");
  await p.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
  await p.query(`
    CREATE TABLE IF NOT EXISTS user_assigned_plans (
      user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
      plan_id VARCHAR(36) REFERENCES plans(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, plan_id)
    );
  `);
  await p.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele';");

  // Seed standard exercises
  await seedStandardExercises({ query: (sql, params) => p.query(sql, params) });
  await p.query('INSERT INTO system_seed (seeded) VALUES (TRUE) ON CONFLICT (seeded) DO NOTHING');

  console.log('[DB] PostgreSQL schema & standard exercises initialized successfully.');
}

async function query(text, params = []) {
  const p = getPool();
  return await p.query(text, params);
}

async function closeDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDB,
  query,
  getPool,
  closeDB
};
