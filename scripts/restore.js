const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

const backupFileName = process.argv[2] || 'exercises_custom_latest.json';

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

async function restoreBackup() {
  const backupDir = path.join(__dirname, '../backups');
  let filePath = path.isAbsolute(backupFileName) ? backupFileName : path.join(backupDir, backupFileName);
  
  if (!fs.existsSync(filePath)) {
    // Try in current working directory
    filePath = path.resolve(backupFileName);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File di backup non trovato: ${backupFileName}`);
      process.exit(1);
    }
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let exercises = [];
  try {
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      exercises = parsed;
    } else if (parsed.custom_exercises && Array.isArray(parsed.custom_exercises)) {
      exercises = parsed.custom_exercises;
    } else if (parsed.all_exercises && Array.isArray(parsed.all_exercises)) {
      exercises = parsed.all_exercises;
    }
  } catch (err) {
    console.error('❌ Formato JSON non valido:', err.message);
    process.exit(1);
  }

  const db = await getDB();
  try {
    let restoredCount = 0;
    for (const ex of exercises) {
      const keyframesJson = typeof ex.keyframes === 'string' ? ex.keyframes : JSON.stringify(ex.keyframes);
      
      // Upsert by ID or insert
      await db.query(`
        INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          keyframes = EXCLUDED.keyframes,
          is_private = EXCLUDED.is_private,
          is_standard = EXCLUDED.is_standard;
      `, [
        ex.id,
        ex.user_id,
        ex.name,
        ex.category,
        ex.is_standard || false,
        ex.is_private || false,
        keyframesJson,
        ex.created_at || new Date().toISOString()
      ]);
      restoredCount++;
    }

    console.log(`\n✅ Ripristino completato! ${restoredCount} esercizi sincronizzati/ripristinati nel database da ${path.basename(filePath)}.\n`);
  } catch (err) {
    console.error('❌ Errore durante il ripristino:', err);
  } finally {
    await db.close();
  }
}

restoreBackup();
