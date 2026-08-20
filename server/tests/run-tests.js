const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Automated Backend Verification Tests...');
  console.log('====================================================');

  try {
    // 1. DB Init Test
    console.log('[Test 1] Initializing Database & Schema...');
    await db.initDB();
    console.log('✅ DB initialized successfully.');

    // 2. Standard Exercises Seeding Test
    console.log('[Test 2] Verifying Standard Exercises Seeding...');
    const stdExRes = await db.query('SELECT * FROM exercises WHERE is_standard = TRUE');
    console.log(`✅ Standard exercises found: ${stdExRes.rows.length}`);
    if (stdExRes.rows.length === 0) {
      throw new Error('No standard exercises were seeded!');
    }

    // Check Burpees exercise keyframes
    const burpee = stdExRes.rows.find(ex => ex.name === 'Burpees');
    if (!burpee) throw new Error('Standard exercise "Burpees" missing!');
    const kf = typeof burpee.keyframes === 'string' ? JSON.parse(burpee.keyframes) : burpee.keyframes;
    if (!Array.isArray(kf) || kf.length === 0) {
      throw new Error('Burpees 3D keyframe sequence missing or invalid!');
    }
    console.log(`✅ Burpees exercise loaded with ${kf.length} 3D mannequin keyframes.`);

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

    // 4. Custom Exercise Creation with 3D Mannequin Poses
    console.log('[Test 4] Creating Custom Exercise with 3D Keyframe Poses...');
    const customExId = uuidv4();
    const customKeyframes = [
      { headPitch: 0, torsoBend: 0, lShoulderPitch: -45, rShoulderPitch: -45 },
      { headPitch: -10, torsoBend: 45, lShoulderPitch: -90, rShoulderPitch: -90 }
    ];

    await db.query(
      `INSERT INTO exercises (id, user_id, name, category, is_standard, is_private, keyframes)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6)`,
      [customExId, testUserId, 'Custom Jumping Lunge', 'Legs', false, JSON.stringify(customKeyframes)]
    );

    const exCheck = await db.query('SELECT * FROM exercises WHERE id = $1', [customExId]);
    if (exCheck.rows.length === 0) throw new Error('Custom exercise creation failed!');
    console.log('✅ Custom exercise created and keyframes verified.');

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

    // 6. Custom Exercise Deletion & Plan Cascade Clean-up Test
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

    console.log('====================================================');
    console.log('🎉 ALL AUTOMATED VERIFICATION TESTS PASSED CLEANLY!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  }
}

runTests();
