require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const { seedStandardExercises } = require('../server/db/seed');

const backupFileName = process.argv[2] || 'full_backup_latest.json';

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

async function restoreBackup() {
  const backupDir = path.join(__dirname, '../backups');
  let filePath = path.isAbsolute(backupFileName) ? backupFileName : path.join(backupDir, backupFileName);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(backupFileName);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File di backup non trovato: ${backupFileName}`);
      process.exit(1);
    }
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let users = [];
  let exercises = [];
  let plans = [];

  try {
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      exercises = parsed;
    } else {
      if (parsed.users && Array.isArray(parsed.users)) {
        users = parsed.users;
      }
      if (parsed.all_exercises && Array.isArray(parsed.all_exercises)) {
        exercises = parsed.all_exercises;
      } else if (parsed.custom_exercises && Array.isArray(parsed.custom_exercises)) {
        exercises = parsed.custom_exercises;
      }
      if (parsed.plans && Array.isArray(parsed.plans)) {
        plans = parsed.plans;
      }
    }
  } catch (err) {
    console.error('❌ Formato JSON non valido:', err.message);
    process.exit(1);
  }

  const pool = new Pool(getDbConfig());
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 0. Complete Wipe of existing database (full non-incremental restore)
    await client.query('DELETE FROM plans');
    await client.query('DELETE FROM exercises');
    await client.query('DELETE FROM users');

    // 1. Restore Users
    let restoredUsersCount = 0;
    for (const u of users) {
      if (u.id && u.username) {
        await client.query(`
          INSERT INTO users (id, username, email, password_hash, role, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          u.id,
          u.username,
          u.email || `${u.username}@example.com`,
          u.password_hash || '$2a$10$defaultplaceholderhash',
          u.role || 'user',
          u.created_at || new Date().toISOString()
        ]);
        restoredUsersCount++;
      }
    }

    // Always ensure user 'daniele' has admin role
    await client.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele'");

    // Get valid users
    const usersRes = await client.query('SELECT id, username FROM users');
    const validUserIds = new Set(usersRes.rows.map(u => u.id));
    const danieleUser = usersRes.rows.find(u => u.username && u.username.toLowerCase() === 'daniele');
    const defaultUserId = danieleUser ? danieleUser.id : (usersRes.rows[0] ? usersRes.rows[0].id : null);

    // 2. Restore Exercises
    for (const ex of exercises) {
      if (!ex.id || !ex.name) continue;
      const keyframesJson = typeof ex.keyframes === 'string' ? ex.keyframes : JSON.stringify(ex.keyframes);
      let targetUserId = ex.user_id;
      if (ex.is_standard) {
        targetUserId = null;
      } else if (!targetUserId || !validUserIds.has(targetUserId)) {
        targetUserId = defaultUserId;
      }
      
      await client.query(`
        INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          keyframes = EXCLUDED.keyframes,
          is_private = EXCLUDED.is_private,
          is_standard = EXCLUDED.is_standard,
          notes = EXCLUDED.notes
      `, [
        ex.id,
        targetUserId,
        ex.name,
        ex.category || 'Full Body',
        Boolean(ex.is_standard),
        Boolean(ex.is_private),
        keyframesJson,
        ex.notes || null,
        ex.created_at || new Date().toISOString()
      ]);
    }

    // Ensure standard exercises are always present
    await seedStandardExercises(client);

    const countExRes = await client.query('SELECT COUNT(*) FROM exercises');
    const restoredExCount = parseInt(countExRes.rows[0].count, 10);

    // 3. Restore Plans
    let restoredPlanCount = 0;
    for (const p of plans) {
      if (!p.id || !p.name || !p.structure) continue;
      const structureJson = typeof p.structure === 'string' ? p.structure : JSON.stringify(p.structure);
      let targetUserId = p.user_id;
      if (!targetUserId || !validUserIds.has(targetUserId)) {
        targetUserId = defaultUserId;
      }

      await client.query(`
        INSERT INTO plans (id, user_id, name, description, is_public, structure, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_public = EXCLUDED.is_public,
          structure = EXCLUDED.structure
      `, [
        p.id,
        targetUserId,
        p.name,
        p.description || null,
        Boolean(p.is_public),
        structureJson,
        p.created_at || new Date().toISOString()
      ]);
      restoredPlanCount++;
    }

    await client.query('COMMIT');
    client.release();

    console.log(`\n✅ Ripristino completo PostgreSQL completato con successo!`);
    console.log(`👤 Utenti ripristinati: ${restoredUsersCount}`);
    console.log(`📦 Esercizi ripristinati (inclusi standard): ${restoredExCount}`);
    console.log(`📋 Schede di allenamento ripristinate: ${restoredPlanCount}`);
    console.log(`📄 Origine dati: ${path.basename(filePath)}\n`);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    client.release();
    console.error('❌ Errore durante il ripristino su PostgreSQL:', err);
  } finally {
    await pool.end();
  }
}

restoreBackup();
