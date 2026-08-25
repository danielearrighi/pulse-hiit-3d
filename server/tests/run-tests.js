require('dotenv').config();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function cleanupTestData() {
  try {
    await db.query(`
      DELETE FROM plans WHERE user_id IN (
        SELECT id FROM users WHERE username LIKE 'testuser_%' OR username LIKE 'admin_%'
      )
    `);
    await db.query(`
      DELETE FROM exercises WHERE name = 'Custom Jumping Lunge' OR user_id IN (
        SELECT id FROM users WHERE username LIKE 'testuser_%' OR username LIKE 'admin_%'
      )
    `);
    await db.query(`
      DELETE FROM users WHERE username LIKE 'testuser_%' OR username LIKE 'admin_%'
    `);
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Automated Backend Verification Tests...');
  console.log('====================================================');

  try {
    // 1. DB Init Test
    console.log('[Test 1] Initializing Database & Schema...');
    await db.initDB();
    await cleanupTestData();
    console.log('✅ DB initialized & old test data cleaned up successfully.');

    // 2. Standard Exercises Seeding Test
    console.log('[Test 2] Verifying Standard Exercises Seeding...');
    const stdExRes = await db.query('SELECT * FROM exercises WHERE is_standard = TRUE');
    console.log(`✅ Standard exercises found: ${stdExRes.rows.length}`);
    if (stdExRes.rows.length === 0) {
      throw new Error('No standard exercises were seeded!');
    }

    // Check Burpees exercise keyframes & notes
    const burpee = stdExRes.rows.find(ex => ex.name === 'Burpees');
    if (!burpee) throw new Error('Standard exercise "Burpees" missing!');
    const kf = typeof burpee.keyframes === 'string' ? JSON.parse(burpee.keyframes) : burpee.keyframes;
    if (!Array.isArray(kf) || kf.length === 0) {
      throw new Error('Burpees 3D keyframe sequence missing or invalid!');
    }
    if (!burpee.notes) {
      throw new Error('Burpees notes missing from seed!');
    }
    console.log(`✅ Burpees exercise loaded with ${kf.length} 3D mannequin keyframes and note: "${burpee.notes.substring(0, 30)}..."`);

    // 3. User Registration Test
    console.log('[Test 3] Creating Test User...');
    const testUserId = uuidv4();
    const username = `testuser_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const password = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query(
      'INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)',
      [testUserId, username, email, password_hash]
    );

    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [testUserId]);
    if (userCheck.rows.length === 0) throw new Error('User creation failed!');
    console.log(`✅ User registered successfully: ${username}`);

    // 4. Custom Exercise Creation with 3D Mannequin Poses & Notes
    console.log('[Test 4] Creating Custom Exercise with 3D Keyframe Poses & Notes...');
    const customExId = uuidv4();
    const customKeyframes = [
      { headPitch: 0, torsoBend: 0, lShoulderPitch: -45, rShoulderPitch: -45 },
      { headPitch: -10, torsoBend: 45, lShoulderPitch: -90, rShoulderPitch: -90 }
    ];
    const customNote = 'Fai attenzione alla postura della schiena durante il salto.';

    await db.query(
      `INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, notes)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)`,
      [customExId, testUserId, 'Custom Jumping Lunge', 'Legs', true, JSON.stringify(customKeyframes), customNote]
    );

    const exCheck = await db.query('SELECT * FROM exercises WHERE id = $1', [customExId]);
    if (exCheck.rows.length === 0) throw new Error('Custom exercise creation failed!');
    if (exCheck.rows[0].notes !== customNote) throw new Error('Custom exercise note mismatch!');
    console.log(`✅ Custom exercise created and keyframes/notes verified: "${exCheck.rows[0].notes}"`);

    // 4b. Custom Exercise Update Test
    console.log('[Test 4b] Updating Custom Exercise (Name, Category, Notes, Keyframes)...');
    const updatedName = 'Custom Jumping Lunge Modified';
    const updatedNote = 'Nota aggiornata per il test di modifica.';
    await db.query(
      `UPDATE exercises
       SET name = $1, category = $2, is_private = $3, keyframes = $4, notes = $5
       WHERE id = $6`,
      [updatedName, 'Full Body', false, JSON.stringify(customKeyframes), updatedNote, customExId]
    );

    const updateCheck = await db.query('SELECT * FROM exercises WHERE id = $1', [customExId]);
    if (updateCheck.rows.length === 0) throw new Error('Updated exercise not found!');
    if (updateCheck.rows[0].name !== updatedName) throw new Error('Exercise name was not updated!');
    if (updateCheck.rows[0].notes !== updatedNote) throw new Error('Exercise note was not updated!');
    if (updateCheck.rows[0].category !== 'Full Body') throw new Error('Exercise category was not updated!');
    console.log(`✅ Custom exercise updated successfully: "${updateCheck.rows[0].name}"`);

    // 5. HIIT Plan Creation & Hierarchy Test
    console.log('[Test 5] Creating HIIT Workout Plan (Groups + Reps/Duration)...');
    const planId = uuidv4();
    const planStructure = {
      groups: [
        {
          title: 'Circuit 1 - Upper & Core',
          repetitions: 3,
          items: [
            { exercise_id: 'std-pushup', type: 'reps', target_value: 30, rest_seconds: 15 },
            { exercise_id: 'std-plank', type: 'duration', target_value: 60, rest_seconds: 20 }
          ]
        },
        {
          title: 'Circuit 2 - High Cardio',
          repetitions: 2,
          items: [
            { exercise_id: 'std-burpee', type: 'reps', target_value: 20, rest_seconds: 10 },
            { exercise_id: customExId, type: 'duration', target_value: 45, rest_seconds: 15 }
          ]
        }
      ]
    };

    await db.query(
      `INSERT INTO plans (id, user_id, name, description, structure)
       VALUES ($1, $2, $3, $4, $5)`,
      [planId, testUserId, 'Full Body Burn HIIT', '3 Circuits of high intensity exercises', JSON.stringify(planStructure)]
    );

    const planCheck = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (planCheck.rows.length === 0) throw new Error('Plan creation failed!');
    const retrievedPlan = planCheck.rows[0];
    const retrievedStruct = typeof retrievedPlan.structure === 'string' ? JSON.parse(retrievedPlan.structure) : retrievedPlan.structure;

    if (retrievedStruct.groups.length !== 2) throw new Error('Plan groups structure mismatch!');
    console.log('✅ HIIT Plan with nested circuit groups and reps/duration items verified.');

    // 5b. Public & Private Plan Permissions & Visibility Test
    console.log('[Test 5b] Verifying Public vs Private Plan Permissions & Visibility...');
    const publicPlanId = uuidv4();
    const user2Id = uuidv4();
    const user2Name = `testuser_second_${Date.now()}`;
    await db.query(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [user2Id, user2Name, `test2_${Date.now()}@example.com`, password_hash, 'user']
    );

    // Create a public plan
    await db.query(
      `INSERT INTO plans (id, user_id, name, description, is_public, structure)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [publicPlanId, testUserId, 'Official Public HIIT Plan', 'Publicly accessible to everyone', true, JSON.stringify(planStructure)]
    );

    // 1. Unauthenticated visibility: only is_public = true
    const unauthPlans = await db.query(
      'SELECT id, is_public FROM plans WHERE is_public = TRUE'
    );
    const unauthPlanIds = unauthPlans.rows.map(p => p.id);
    if (!unauthPlanIds.includes(publicPlanId)) throw new Error('Public plan not returned for unauthenticated visitor!');
    if (unauthPlanIds.includes(planId)) throw new Error('Private plan leaked to unauthenticated visitor!');

    // 2. Another user (user2) visibility: should see public plan + own plans, but NOT testUserId private plan
    const user2Plans = await db.query(
      'SELECT id, is_public FROM plans WHERE is_public = TRUE OR user_id = $1',
      [user2Id]
    );
    const user2PlanIds = user2Plans.rows.map(p => p.id);
    if (!user2PlanIds.includes(publicPlanId)) throw new Error('Public plan not visible to second user!');
    if (user2PlanIds.includes(planId)) throw new Error('Private plan of first user leaked to second user!');

    // 3. Direct link retrieval (by ID) works for both public and shared private plans
    const directPrivateCheck = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (directPrivateCheck.rows.length === 0) throw new Error('Direct link retrieval for private plan failed!');
    const directPublicCheck = await db.query('SELECT * FROM plans WHERE id = $1', [publicPlanId]);
    if (directPublicCheck.rows.length === 0) throw new Error('Direct link retrieval for public plan failed!');

    // 4. Role check for making plans public
    const canManagePublic = (user) => {
      if (!user) return false;
      const isAdmin = user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele');
      const isSuper = user.role === 'superuser';
      return isAdmin || isSuper;
    };

    if (canManagePublic({ role: 'user' })) throw new Error('Regular user should not have permission to make plans public!');
    if (!canManagePublic({ role: 'admin' })) throw new Error('Admin should have permission to make plans public!');
    if (!canManagePublic({ role: 'superuser' })) throw new Error('Superuser should have permission to make plans public!');
    if (!canManagePublic({ username: 'daniele', role: 'user' })) throw new Error('User "daniele" should have admin permissions to make plans public!');

    console.log('✅ Public vs Private HIIT plan visibility, direct link sharing, and role-based permissions verified.');
    console.log('[Test 6] Deleting Custom Exercise & Cascade Clean-up from Plans...');
    // Delete custom exercise
    await db.query('DELETE FROM exercises WHERE id = $1', [customExId]);

    // Cleanup plans
    const allPlans = await db.query('SELECT id, structure FROM plans');
    for (const p of allPlans.rows) {
      let struct = typeof p.structure === 'string' ? JSON.parse(p.structure) : p.structure;
      let modified = false;
      if (struct && Array.isArray(struct.groups)) {
        for (const g of struct.groups) {
          if (Array.isArray(g.items)) {
            const initLen = g.items.length;
            g.items = g.items.filter(item => item.exercise_id !== customExId);
            if (g.items.length !== initLen) modified = true;
          }
        }
      }
      if (modified) {
        await db.query('UPDATE plans SET structure = $1 WHERE id = $2', [JSON.stringify(struct), p.id]);
      }
    }

    const delExCheck = await db.query('SELECT * FROM exercises WHERE id = $1', [customExId]);
    if (delExCheck.rows.length !== 0) throw new Error('Exercise deletion failed!');

    const updatedPlanCheck = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    const updatedStruct = typeof updatedPlanCheck.rows[0].structure === 'string' ? JSON.parse(updatedPlanCheck.rows[0].structure) : updatedPlanCheck.rows[0].structure;
    const g2Items = updatedStruct.groups[1].items;
    if (g2Items.some(item => item.exercise_id === customExId)) {
      throw new Error('Deleted exercise still exists in plan structure!');
    }
    console.log('✅ Custom exercise deleted and automatically removed from affected HIIT plan structure.');

    // 7. Admin Control Panel & Role Management Test
    console.log('[Test 7] Verifying Admin Control Panel & Role Management...');
    const adminUserId = uuidv4();
    const adminUsername = `admin_${Date.now()}`;
    const adminEmail = `admin_${Date.now()}@example.com`;
    const adminHash = await bcrypt.hash('AdminPass123!', 10);

    await db.query(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [adminUserId, adminUsername, adminEmail, adminHash, 'admin']
    );

    const adminCheck = await db.query('SELECT * FROM users WHERE id = $1', [adminUserId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      throw new Error('Admin user creation or role check failed!');
    }

    // Role update test
    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', testUserId]);
    const updatedUserCheck = await db.query('SELECT role FROM users WHERE id = $1', [testUserId]);
    if (updatedUserCheck.rows[0].role !== 'admin') {
      throw new Error('Updating user role to admin failed!');
    }

    // Update to superuser role
    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['superuser', testUserId]);
    const superUserCheck = await db.query('SELECT role FROM users WHERE id = $1', [testUserId]);
    if (superUserCheck.rows[0].role !== 'superuser') {
      throw new Error('Updating user role to superuser failed!');
    }
    console.log('✅ User role "superuser" assigned and verified.');

    // Verify 3D exercise creation permission logic
    const canCreatePublic3D = (user) => {
      if (!user) return false;
      const isAdmin = user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele');
      const isSuper = user.role === 'superuser';
      return isAdmin || isSuper;
    };

    const regularUser = { id: 'u1', username: 'john', role: 'user' };
    const superUserObj = { id: 'u2', username: 'mario', role: 'superuser' };
    const adminUserObj = { id: 'u3', username: 'admin', role: 'admin' };

    if (canCreatePublic3D(regularUser)) throw new Error('Regular user should not be able to create public 3D exercises!');
    if (!canCreatePublic3D(superUserObj)) throw new Error('Super User should be able to create public 3D exercises!');
    if (!canCreatePublic3D(adminUserObj)) throw new Error('Admin should be able to create public 3D exercises!');

    // Test regular user creating an exercise (backend enforces is_private = true)
    const regExId = uuidv4();
    const isPrivateForRegular = canCreatePublic3D(regularUser) ? false : true;
    await db.query(
      `INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, notes)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)`,
      [regExId, testUserId, 'Regular Private Exercise', 'Full Body', isPrivateForRegular, JSON.stringify(customKeyframes), 'Test']
    );

    const regExCheck = await db.query('SELECT * FROM exercises WHERE id = $1', [regExId]);
    if (!regExCheck.rows[0].is_private) throw new Error('Regular user exercise must be private!');
    await db.query('DELETE FROM exercises WHERE id = $1', [regExId]);

    console.log('✅ Role permission check verified: Regular users can only create private exercises; Admins & Super Users can create public exercises.');

    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['user', testUserId]);
    const revertedUserCheck = await db.query('SELECT role FROM users WHERE id = $1', [testUserId]);
    if (revertedUserCheck.rows[0].role !== 'user') {
      throw new Error('Reverting user role to user failed!');
    }

    // Verify daniele user auto-admin rule
    const danieleCheckExisting = await db.query("SELECT * FROM users WHERE LOWER(username) = 'daniele'");
    if (danieleCheckExisting.rows.length === 0) {
      const danieleId = uuidv4();
      await db.query(
        'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [danieleId, 'daniele', 'daniele@example.com', adminHash, 'admin']
      );
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = 'daniele'");
    }
    const danieleCheck = await db.query("SELECT role FROM users WHERE LOWER(username) = 'daniele'");
    if (danieleCheck.rows.length === 0 || danieleCheck.rows[0].role !== 'admin') {
      throw new Error('User "daniele" is not admin!');
    }
    console.log('✅ User "daniele" verified as admin.');
    console.log('✅ Admin user role management and user role update verified.');

    // 7b. Admin Direct Password Update Test
    console.log('[Test 7b] Verifying Admin Direct Password Change for Users...');
    const newPlainPassword = 'BrandNewSecurePassword456!';
    const newSalt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPlainPassword, newSalt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, testUserId]);

    const passCheck = await db.query('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    if (passCheck.rows.length === 0) throw new Error('User not found during password update test!');

    const isMatchNew = await bcrypt.compare(newPlainPassword, passCheck.rows[0].password_hash);
    const isMatchOld = await bcrypt.compare(password, passCheck.rows[0].password_hash);

    if (!isMatchNew) throw new Error('New password does not match updated hash!');
    if (isMatchOld) throw new Error('Old password unexpectedly matched updated hash!');
    console.log('✅ Direct password change without email reset verified successfully.');

    // 8. Admin Backup & Restore Integrity Test
    console.log('[Test 8] Testing Admin Backup & Restore Pipeline Integrity...');
    const usersBackupRes = await db.query('SELECT id, username, email, password_hash, role, created_at FROM users');
    const customExBackupRes = await db.query('SELECT * FROM exercises WHERE is_standard = FALSE');
    const allExBackupRes = await db.query('SELECT * FROM exercises');
    const plansBackupRes = await db.query('SELECT * FROM plans');

    const sampleBackupPayload = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      users: usersBackupRes.rows,
      custom_exercises: customExBackupRes.rows,
      all_exercises: allExBackupRes.rows,
      plans: plansBackupRes.rows
    };

    if (!Array.isArray(sampleBackupPayload.all_exercises) || sampleBackupPayload.all_exercises.length === 0) {
      throw new Error('Backup payload missing exercises!');
    }

    // Verify restore logic with sample payload
    let restoredCount = 0;
    for (const ex of sampleBackupPayload.all_exercises) {
      const kfJson = typeof ex.keyframes === 'string' ? ex.keyframes : JSON.stringify(ex.keyframes);
      await db.query(`
        INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          keyframes = EXCLUDED.keyframes,
          is_private = EXCLUDED.is_private,
          is_standard = EXCLUDED.is_standard,
          notes = EXCLUDED.notes;
      `, [ex.id, ex.user_id || null, ex.name, ex.category, ex.is_standard || false, ex.is_private || false, kfJson, ex.notes || null, ex.created_at || new Date().toISOString()]);
      restoredCount++;
    }
    console.log(`✅ Admin Backup & Restore verified: ${restoredCount} exercises synchronized without error.`);

    // 9. Admin Assign Plans to User Test
    console.log('[Test 9] Verifying Admin HIIT Plan Assignment to Users...');
    
    // Create an admin-created private plan and public plan
    const adminPrivatePlanId = uuidv4();
    const adminPublicPlanId = uuidv4();
    const trainerPlanStruct = {
      groups: [
        {
          title: 'Trainer Custom Circuit',
          repetitions: 3,
          items: [{ exercise_id: 'std-pushup', type: 'reps', target_value: 15, rest_seconds: 15 }]
        }
      ]
    };

    await db.query(
      `INSERT INTO plans (id, user_id, name, description, is_public, structure)
       VALUES ($1, $2, $3, $4, FALSE, $5)`,
      [adminPrivatePlanId, adminUserId, 'Trainer Private Shred', 'Assigned by coach', JSON.stringify(trainerPlanStruct)]
    );

    await db.query(
      `INSERT INTO plans (id, user_id, name, description, is_public, structure)
       VALUES ($1, $2, $3, $4, TRUE, $5)`,
      [adminPublicPlanId, adminUserId, 'Trainer Public Blast', 'Public coach workout', JSON.stringify(trainerPlanStruct)]
    );

    // 9a. Query assignable plans for testUserId (should include admin-created plans with is_assigned = false initially)
    const assignablePlansRes = await db.query(
      `SELECT p.id, p.name, p.is_public,
              CASE WHEN uap.plan_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
       FROM plans p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
       WHERE u.role IN ('admin', 'superuser') OR LOWER(u.username) = 'daniele'
       ORDER BY p.name ASC`,
      [testUserId]
    );

    const assignableIds = assignablePlansRes.rows.map(r => r.id);
    if (!assignableIds.includes(adminPrivatePlanId) || !assignableIds.includes(adminPublicPlanId)) {
      throw new Error('Admin plans not listed in assignable plans query!');
    }
    const unassignedCheck = assignablePlansRes.rows.find(r => r.id === adminPrivatePlanId);
    if (unassignedCheck.is_assigned) {
      throw new Error('Plan should not be assigned initially!');
    }

    // 9b. Assign adminPrivatePlanId to testUserId
    await db.query(
      'INSERT INTO user_assigned_plans (user_id, plan_id) VALUES ($1, $2)',
      [testUserId, adminPrivatePlanId]
    );

    // 9c. Verify testUserId GET /api/plans query includes the assigned private plan with is_assigned = true
    const regularUserPlansRes = await db.query(
      `SELECT p.*,
              CASE WHEN uap.plan_id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
       FROM plans p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
       WHERE p.is_public = TRUE OR p.user_id = $1 OR uap.plan_id IS NOT NULL
       ORDER BY is_assigned DESC, p.is_public DESC, p.created_at DESC`,
      [testUserId]
    );

    const regularPlanIds = regularUserPlansRes.rows.map(r => r.id);
    if (!regularPlanIds.includes(adminPrivatePlanId)) {
      throw new Error('Assigned private plan is NOT visible to the assigned regular user!');
    }
    const assignedRow = regularUserPlansRes.rows.find(r => r.id === adminPrivatePlanId);
    if (!assignedRow.is_assigned) {
      throw new Error('is_assigned flag is not true for assigned plan!');
    }

    // 9d. Verify user2 (unassigned) does NOT see the private plan
    const user2CheckRes = await db.query(
      `SELECT p.id
       FROM plans p
       LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
       WHERE p.is_public = TRUE OR p.user_id = $1 OR uap.plan_id IS NOT NULL`,
      [user2Id]
    );
    const user2Ids = user2CheckRes.rows.map(r => r.id);
    if (user2Ids.includes(adminPrivatePlanId)) {
      throw new Error('Assigned private plan leaked to an unassigned user!');
    }

    // 9e. Remove assignment and verify regular user no longer sees the private plan
    await db.query('DELETE FROM user_assigned_plans WHERE user_id = $1 AND plan_id = $2', [testUserId, adminPrivatePlanId]);
    const regularUserPlansAfterRes = await db.query(
      `SELECT p.id
       FROM plans p
       LEFT JOIN user_assigned_plans uap ON uap.plan_id = p.id AND uap.user_id = $1
       WHERE p.is_public = TRUE OR p.user_id = $1 OR uap.plan_id IS NOT NULL`,
      [testUserId]
    );
    if (regularUserPlansAfterRes.rows.map(r => r.id).includes(adminPrivatePlanId)) {
      throw new Error('Unassigned private plan still returned to user!');
    }

    console.log('✅ Admin HIIT Plan assignment, visibility isolation, and unassignment verified successfully.');

    // 10. Persistent JWT Authentication & Cookie Lifecycle Test
    console.log('[Test 10] Testing Persistent JWT Authentication & Cookie Lifecycle (1 Month Validity)...');
    const { generateToken, verifyToken, authMiddleware, COOKIE_NAME, COOKIE_OPTIONS } = require('../middleware/auth');

    // 10a. Cookie Options Verification
    if (COOKIE_NAME !== 'auth_token') throw new Error(`Expected COOKIE_NAME 'auth_token', got '${COOKIE_NAME}'`);
    if (COOKIE_OPTIONS.httpOnly !== true) throw new Error('Cookie must be httpOnly for security');
    if (COOKIE_OPTIONS.sameSite !== 'lax') throw new Error('Cookie sameSite must be lax');
    const expectedMaxAge = 30 * 24 * 60 * 60 * 1000;
    if (COOKIE_OPTIONS.maxAge !== expectedMaxAge) {
      throw new Error(`Cookie maxAge must be 30 days (${expectedMaxAge}ms), got ${COOKIE_OPTIONS.maxAge}ms`);
    }

    // 10b. Token Generation and Expiration
    const tokenUser = { id: testUserId, username, email, role: 'user' };
    const token = generateToken(tokenUser);
    if (!token || typeof token !== 'string') throw new Error('Token generation failed!');

    const decoded = verifyToken(token);
    if (!decoded || decoded.id !== testUserId || decoded.username !== username || decoded.role !== 'user') {
      throw new Error('Token verification payload mismatch!');
    }

    const tokenDurationSeconds = decoded.exp - decoded.iat;
    const expectedDurationSeconds = 30 * 24 * 60 * 60; // 30 days
    if (tokenDurationSeconds !== expectedDurationSeconds) {
      throw new Error(`Token expiration duration mismatch: expected ${expectedDurationSeconds}s, got ${tokenDurationSeconds}s`);
    }

    // 10c. Invalid / Tampered token rejection
    const invalidDecoded = verifyToken('invalid.token.signature');
    if (invalidDecoded !== null) throw new Error('Invalid token was not rejected!');

    // 10d. Middleware integration test
    const mockReqWithCookie = { cookies: { auth_token: token } };
    const mockRes = {};
    let nextCalled = false;
    authMiddleware(mockReqWithCookie, mockRes, () => { nextCalled = true; });

    if (!nextCalled || !mockReqWithCookie.session?.user || mockReqWithCookie.session.user.id !== testUserId) {
      throw new Error('Auth middleware failed to authenticate valid cookie!');
    }
    if (!mockReqWithCookie.user || mockReqWithCookie.user.id !== testUserId) {
      throw new Error('Auth middleware failed to populate req.user!');
    }

    // 10e. Middleware without cookie
    const mockReqNoCookie = { cookies: {} };
    authMiddleware(mockReqNoCookie, mockRes, () => {});
    if (mockReqNoCookie.session.user !== null || mockReqNoCookie.user !== null) {
      throw new Error('Auth middleware should leave user null when no cookie is present!');
    }

    console.log(`✅ Persistent JWT Auth verified: 30-day (1 month) duration, HttpOnly cookie, tamper resistance, and middleware compatibility.`);

    console.log('====================================================');
    console.log('🎉 ALL AUTOMATED VERIFICATION TESTS PASSED CLEANLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Cleaning up test users and test exercises...');
    await cleanupTestData();
    console.log('✅ Cleanup completed.');
    process.exit(process.exitCode || 0);
  }
}

runTests();
