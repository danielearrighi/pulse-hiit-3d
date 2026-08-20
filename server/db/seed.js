const { v4: uuidv4 } = require('uuid');

const STANDARD_EXERCISES = [
  {
    id: 'std-squat',
    name: 'Squat',
    category: 'Legs',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: -45, lShoulderRoll: 0, lElbowBend: 20,
        rShoulderPitch: -45, rShoulderRoll: 0, rElbowBend: 20,
        lHipPitch: 0, lHipRoll: 10, lKneeBend: 0,
        rHipPitch: 0, rHipRoll: -10, rKneeBend: 0
      },
      {
        bodyTilt: 0, rootY: 0.50,
        headPitch: -10, headYaw: 0, torsoBend: 30, torsoTwist: 0,
        lShoulderPitch: -80, lShoulderRoll: 0, lElbowBend: 30,
        rShoulderPitch: -80, rShoulderRoll: 0, rElbowBend: 30,
        lHipPitch: 80, lHipRoll: 10, lKneeBend: 90,
        rHipPitch: 80, rHipRoll: -10, rKneeBend: 90
      }
    ]
  },
  {
    id: 'std-burpee',
    name: 'Burpees',
    category: 'Full Body',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: -160, lShoulderRoll: 20, lElbowBend: 10,
        rShoulderPitch: -160, rShoulderRoll: -20, rElbowBend: 10,
        lHipPitch: -10, lHipRoll: 5, lKneeBend: 10,
        rHipPitch: -10, rHipRoll: -5, rKneeBend: 10
      },
      {
        bodyTilt: 85, rootY: 0.25,
        headPitch: -20, headYaw: 0, torsoBend: 20, torsoTwist: 0,
        lShoulderPitch: 30, lShoulderRoll: 0, lElbowBend: 60,
        rShoulderPitch: 30, rShoulderRoll: 0, rElbowBend: 60,
        lHipPitch: 10, lHipRoll: 5, lKneeBend: 10,
        rHipPitch: 10, rHipRoll: -5, rKneeBend: 10
      }
    ]
  },
  {
    id: 'std-pushup',
    name: 'Push-ups',
    category: 'Arms',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 85, rootY: 0.35,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: 0, lShoulderRoll: 30, lElbowBend: 10,
        rShoulderPitch: 0, rShoulderRoll: -30, rElbowBend: 10,
        lHipPitch: 0, lHipRoll: 0, lKneeBend: 0,
        rHipPitch: 0, rHipRoll: 0, rKneeBend: 0
      },
      {
        bodyTilt: 85, rootY: 0.20,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: 0, lShoulderRoll: 50, lElbowBend: 90,
        rShoulderPitch: 0, rShoulderRoll: -50, rElbowBend: 90,
        lHipPitch: 0, lHipRoll: 0, lKneeBend: 0,
        rHipPitch: 0, rHipRoll: 0, rKneeBend: 0
      }
    ]
  },
  {
    id: 'std-plank',
    name: 'Plank',
    category: 'Abs',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 85, rootY: 0.22,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: 0, lShoulderRoll: 0, lElbowBend: 90,
        rShoulderPitch: 0, rShoulderRoll: 0, rElbowBend: 90,
        lHipPitch: 0, lHipRoll: 0, lKneeBend: 0,
        rHipPitch: 0, rHipRoll: 0, rKneeBend: 0
      }
    ]
  },
  {
    id: 'std-jumping-jacks',
    name: 'Jumping Jacks',
    category: 'Cardio',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: 0, lShoulderRoll: 10, lElbowBend: 0,
        rShoulderPitch: 0, rShoulderRoll: -10, rElbowBend: 0,
        lHipPitch: 0, lHipRoll: 5, lKneeBend: 0,
        rHipPitch: 0, rHipRoll: -5, rKneeBend: 0
      },
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 0, torsoTwist: 0,
        lShoulderPitch: -160, lShoulderRoll: 45, lElbowBend: 10,
        rShoulderPitch: -160, rShoulderRoll: -45, rElbowBend: 10,
        lHipPitch: 0, lHipRoll: 30, lKneeBend: 15,
        rHipPitch: 0, rHipRoll: -30, rKneeBend: 15
      }
    ]
  },
  {
    id: 'std-high-knees',
    name: 'High Knees',
    category: 'Cardio',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 10, torsoTwist: 0,
        lShoulderPitch: -45, lShoulderRoll: 0, lElbowBend: 90,
        rShoulderPitch: 45, rShoulderRoll: 0, rElbowBend: 90,
        lHipPitch: 90, lHipRoll: 0, lKneeBend: 90,
        rHipPitch: -10, rHipRoll: 0, rKneeBend: 10
      },
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 0, headYaw: 0, torsoBend: 10, torsoTwist: 0,
        lShoulderPitch: 45, lShoulderRoll: 0, lElbowBend: 90,
        rShoulderPitch: -45, rShoulderRoll: 0, rElbowBend: 90,
        lHipPitch: -10, lHipRoll: 0, lKneeBend: 10,
        rHipPitch: 90, rHipRoll: 0, rKneeBend: 90
      }
    ]
  },
  {
    id: 'std-pause',
    name: 'Pause / Rest',
    category: 'Rest',
    is_standard: true,
    is_private: false,
    keyframes: [
      {
        bodyTilt: 0, rootY: 0.86,
        headPitch: 15, headYaw: 0, torsoBend: 5, torsoTwist: 0,
        lShoulderPitch: 0, lShoulderRoll: 10, lElbowBend: 10,
        rShoulderPitch: 0, rShoulderRoll: -10, rElbowBend: 10,
        lHipPitch: 0, lHipRoll: 10, lKneeBend: 5,
        rHipPitch: 0, rHipRoll: -10, rKneeBend: 5
      }
    ]
  }
];

async function seedStandardExercises(db) {
  for (const ex of STANDARD_EXERCISES) {
    await db.query(
      `INSERT INTO exercises (id, name, category, is_standard, is_private, keyframes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, category = EXCLUDED.category, keyframes = EXCLUDED.keyframes`,
      [ex.id, ex.name, ex.category, ex.is_standard, ex.is_private, JSON.stringify(ex.keyframes)]
    );
  }
}

module.exports = { seedStandardExercises, STANDARD_EXERCISES };
