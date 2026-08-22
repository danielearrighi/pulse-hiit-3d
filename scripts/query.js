require('dotenv').config();
const { Pool } = require('pg');

const sqlQuery = process.argv[2];

if (!sqlQuery) {
  console.log('📌 Uso: node scripts/query.js "<QUERY_SQL>"');
  console.log('💡 Esempio: node scripts/query.js "SELECT id, username, email, role FROM users;"');
  process.exit(1);
}

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

async function runQuery() {
  const pool = new Pool(getDbConfig());
  try {
    const res = await pool.query(sqlQuery);
    if (res.rows && res.rows.length > 0) {
      console.log(`\n✅ Risultati (${res.rows.length} righe):\n`);
      console.table(res.rows);
    } else {
      console.log('\n✅ Query eseguita con successo. Nessuna riga restituita (o 0 risultati).');
      if (res.rowCount !== null && res.rowCount !== undefined) {
        console.log(`ℹ️ Righe modificate/interessate: ${res.rowCount}`);
      }
    }
  } catch (err) {
    console.error('\n❌ Errore query:', err.message);
  } finally {
    await pool.end();
  }
}

runQuery();
