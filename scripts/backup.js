const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

async function getDB() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    return {
      query: (sql, params) => pool.query(sql, params),
      close: () => pool.end()
    };
  } else {
    const dbDir = path.join(__dirname, '../data/pglite');
    const pglite = new PGlite(dbDir);
    await pglite.waitReady;
    return {
      query: async (sql, params = []) => {
        const res = await pglite.query(sql, params);
        return { rows: res.rows };
      },
      close: () => pglite.close ? pglite.close() : Promise.resolve()
    };
  }
}

async function exportBackup() {
  const db = await getDB();
  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Export exercises (custom + all)
    const customExercisesRes = await db.query('SELECT * FROM exercises WHERE is_standard = FALSE ORDER BY created_at ASC');
    const allExercisesRes = await db.query('SELECT * FROM exercises ORDER BY created_at ASC');
    const plansRes = await db.query('SELECT * FROM plans ORDER BY created_at ASC');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save custom exercises specifically (most important)
    const customExercisesFile = path.join(backupDir, `exercises_custom_${timestamp}.json`);
    const latestCustomFile = path.join(backupDir, 'exercises_custom_latest.json');
    
    // Save full database dump (all exercises + plans)
    const fullBackupFile = path.join(backupDir, `full_backup_${timestamp}.json`);
    const latestFullFile = path.join(backupDir, 'full_backup_latest.json');

    const customData = JSON.stringify(customExercisesRes.rows, null, 2);
    const fullData = JSON.stringify({
      exported_at: new Date().toISOString(),
      custom_exercises: customExercisesRes.rows,
      all_exercises: allExercisesRes.rows,
      plans: plansRes.rows
    }, null, 2);

    fs.writeFileSync(customExercisesFile, customData, 'utf8');
    fs.writeFileSync(latestCustomFile, customData, 'utf8');
    fs.writeFileSync(fullBackupFile, fullData, 'utf8');
    fs.writeFileSync(latestFullFile, fullData, 'utf8');

    console.log(`\n✅ Backup completato con successo!`);
    console.log(`📦 Esercizi personalizzati esportati: ${customExercisesRes.rows.length}`);
    console.log(`📄 File salvati in: ${backupDir}`);
    console.log(`   - ${path.basename(customExercisesFile)} (e ${path.basename(latestCustomFile)})`);
    console.log(`   - ${path.basename(fullBackupFile)} (e ${path.basename(latestFullFile)})\n`);
  } catch (err) {
    console.error('❌ Errore durante il backup:', err);
  } finally {
    await db.close();
  }
}

exportBackup();
