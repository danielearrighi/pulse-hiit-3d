require('dotenv').config();
const { Pool } = require('pg');

const sqlQuery = process.argv[2];

if (!sqlQuery) {
  console.log('📌 Uso: node scripts/query.js "<QUERY_SQL>"');
  console.log('💡 Esempio: node scripts/query.js "SELECT id, username, email, role FROM users;"');
  process.exit(1);
}

const { getDbConfig } = require('../server/db/db');

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
