const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const sqlQuery = process.argv[2];

if (!sqlQuery) {
  console.log('📌 Uso: node scripts/query.js "<QUERY_SQL>"');
  console.log('💡 Esempio: node scripts/query.js "SELECT id, username, email, role FROM users;"');
  process.exit(1);
}

async function runQuery() {
  const dbDir = path.join(__dirname, '../data/pglite');
  const db = new PGlite(dbDir);
  await db.waitReady;

  try {
    const res = await db.query(sqlQuery);
    if (res.rows && res.rows.length > 0) {
      console.log(`\n✅ Risultati (${res.rows.length} righe):\n`);
      console.table(res.rows);
    } else {
      console.log('\n✅ Query eseguita con successo. Nessuna riga restituita (o 0 risultati).');
    }
  } catch (err) {
    console.error('\n❌ Errore query:', err.message);
  }
}

runQuery();
