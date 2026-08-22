require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

async function exportBackup() {
  const pool = new Pool(getDbConfig());
  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Export all critical entities: users, custom exercises, all exercises, and plans
    const usersRes = await pool.query('SELECT id, username, email, password_hash, role, created_at FROM users ORDER BY created_at ASC');
    const customExercisesRes = await pool.query('SELECT * FROM exercises WHERE is_standard = FALSE ORDER BY created_at ASC');
    const allExercisesRes = await pool.query('SELECT * FROM exercises ORDER BY created_at ASC');
    const plansRes = await pool.query('SELECT * FROM plans ORDER BY created_at ASC');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save custom exercises specifically
    const customExercisesFile = path.join(backupDir, `exercises_custom_${timestamp}.json`);
    const latestCustomFile = path.join(backupDir, 'exercises_custom_latest.json');
    
    // Save full database dump (users + all exercises + custom exercises + plans)
    const fullBackupFile = path.join(backupDir, `full_backup_${timestamp}.json`);
    const latestFullFile = path.join(backupDir, 'full_backup_latest.json');

    const customData = JSON.stringify(customExercisesRes.rows, null, 2);
    const fullData = JSON.stringify({
      exported_at: new Date().toISOString(),
      users: usersRes.rows,
      custom_exercises: customExercisesRes.rows,
      all_exercises: allExercisesRes.rows,
      plans: plansRes.rows
    }, null, 2);

    fs.writeFileSync(customExercisesFile, customData, 'utf8');
    fs.writeFileSync(latestCustomFile, customData, 'utf8');
    fs.writeFileSync(fullBackupFile, fullData, 'utf8');
    fs.writeFileSync(latestFullFile, fullData, 'utf8');

    console.log(`\n✅ Backup PostgreSQL completato con successo!`);
    console.log(`👤 Utenti esportati: ${usersRes.rows.length}`);
    console.log(`📦 Esercizi personalizzati esportati: ${customExercisesRes.rows.length}`);
    console.log(`📋 Schede di allenamento esportate: ${plansRes.rows.length}`);
    console.log(`📄 File salvati in: ${backupDir}`);
    console.log(`   - ${path.basename(customExercisesFile)} (e ${path.basename(latestCustomFile)})`);
    console.log(`   - ${path.basename(fullBackupFile)} (e ${path.basename(latestFullFile)})\n`);
  } catch (err) {
    console.error('❌ Errore durante il backup PostgreSQL:', err);
  } finally {
    await pool.end();
  }
}

exportBackup();
