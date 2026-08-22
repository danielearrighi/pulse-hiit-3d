class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  fromArray(arr) { this.x = arr[0]; this.y = arr[1]; this.z = arr[2]; return this; }
}

const JOINT_DEFS = [
  ['hips',       0.00, 0.98,  0.00, 'core'],
  ['spine',      0.00, 1.18,  0.00, 'core'],
  ['chest',      0.00, 1.38,  0.00, 'core'],
  ['neck',       0.00, 1.52,  0.00, 'core'],
  ['head',       0.00, 1.71,  0.00, 'head'],
  ['shoulderL',  0.19, 1.46,  0.00, 'arm'],
  ['elbowL',     0.24, 1.18, -0.03, 'arm'],
  ['handL',      0.27, 0.92,  0.03, 'arm'],
  ['shoulderR', -0.19, 1.46,  0.00, 'arm'],
  ['elbowR',    -0.24, 1.18, -0.03, 'arm'],
  ['handR',     -0.27, 0.92,  0.03, 'arm'],
  ['hipL',       0.11, 0.94,  0.00, 'leg'],
  ['kneeL',      0.12, 0.52,  0.05, 'leg'],
  ['footL',      0.12, 0.06,  0.00, 'foot'],
  ['hipR',      -0.11, 0.94,  0.00, 'leg'],
  ['kneeR',     -0.12, 0.52,  0.05, 'leg'],
  ['footR',     -0.12, 0.06,  0.00, 'foot']
];
const N = JOINT_DEFS.length;
const IDX = {};
JOINT_DEFS.forEach((d, i) => { IDX[d[0]] = i; });

const BONES = [
  ['hips','spine'],['spine','chest'],['chest','neck'],['neck','head'],
  ['chest','shoulderL'],['shoulderL','elbowL'],['elbowL','handL'],
  ['chest','shoulderR'],['shoulderR','elbowR'],['elbowR','handR'],
  ['hips','hipL'],['hipL','kneeL'],['kneeL','footL'],
  ['hips','hipR'],['hipR','kneeR'],['kneeR','footR']
].map(b => ({ a: IDX[b[0]], b: IDX[b[1]] }));

const STIFF = [
  ['shoulderL','shoulderR'],['hipL','hipR'],
  ['chest','hipL'],['chest','hipR'],['hips','shoulderL'],['hips','shoulderR'],
  ['neck','shoulderL'],['neck','shoulderR'],['spine','hipL'],['spine','hipR']
].map(b => ({ a: IDX[b[0]], b: IDX[b[1]] }));

const BASE = JOINT_DEFS.map(d => new Vec3(d[1], d[2], d[3]));
const CONSTRAINTS = [];
BONES.forEach(b => CONSTRAINTS.push({ a: b.a, b: b.b, len: BASE[b.a].distanceTo(BASE[b.b]), k: 1.0 }));
STIFF.forEach(b => CONSTRAINTS.push({ a: b.a, b: b.b, len: BASE[b.a].distanceTo(BASE[b.b]), k: 0.75 }));
const BONE_LEN = BONES.map(b => BASE[b.a].distanceTo(BASE[b.b]));
const FLOOR_Y = JOINT_DEFS.map(d => (d[4] === 'foot' ? 0.055 : 0.05));
const HEAD_BONE = BONES.findIndex(b => b.b === IDX.head);

function solveConstraints(P, iterations, pinned) {
  const _d = new Vec3();
  for (let it = 0; it < iterations; it++) {
    for (let c = 0; c < CONSTRAINTS.length; c++) {
      const con = CONSTRAINTS[c], A = P[con.a], B = P[con.b];
      const wa = pinned && pinned.has(con.a) ? 0 : 1;
      const wb = pinned && pinned.has(con.b) ? 0 : 1;
      const tw = wa + wb;
      if (!tw) continue;
      _d.subVectors(B, A);
      let len = _d.length();
      if (len < 1e-6) { _d.set(0, 1e-6, 0); len = 1e-6; }
      const f = ((len - con.len) / len) * con.k;
      A.addScaledVector(_d, f * (wa / tw));
      B.addScaledVector(_d, -f * (wb / tw));
    }
    for (let i = 0; i < N; i++) {
      if (P[i].y < FLOOR_Y[i]) P[i].y = FLOOR_Y[i];
    }
  }
}

function rectifyPose(P) {
  const _d = new Vec3();
  for (let i = 0; i < BONES.length; i++) {
    const a = BONES[i].a, b = BONES[i].b;
    _d.subVectors(P[b], P[a]);
    let l = _d.length();
    if (l < 1e-6) { _d.set(0, 1, 0); l = 1; }
    P[b].copy(P[a]).addScaledVector(_d, BONE_LEN[i] / l);
  }
  _d.subVectors(P[IDX.neck], P[IDX.chest]);
  let l = _d.length();
  if (l < 1e-6) { _d.set(0, 1, 0); l = 1; }
  P[IDX.head].copy(P[IDX.neck]).addScaledVector(_d, BONE_LEN[HEAD_BONE] / l);
}

function computePose(map, pinFeet) {
  const P = BASE.map(v => v.clone());
  for (const k in map) {
    if (IDX[k] !== undefined) P[IDX[k]].fromArray(map[k]);
  }
  const pinned = new Set();
  if (pinFeet) { pinned.add(IDX.footL); pinned.add(IDX.footR); }
  solveConstraints(P, 60, pinned);
  rectifyPose(P);
  const arr = [];
  for (let i = 0; i < N; i++) {
    arr.push(Math.round(P[i].x * 1000) / 1000);
    arr.push(Math.round(P[i].y * 1000) / 1000);
    arr.push(Math.round(P[i].z * 1000) / 1000);
  }
  return arr;
}

const RAW_PRESETS = {
  squat: [
    {},
    { hips:[0,0.60,-0.09], spine:[0,0.80,-0.04], chest:[0,1.00,0.03], neck:[0,1.14,0.08], head:[0,1.32,0.12],
      shoulderL:[0.19,1.08,0.05], elbowL:[0.29,0.96,0.26], handL:[0.24,1.02,0.50],
      shoulderR:[-0.19,1.08,0.05], elbowR:[-0.29,0.96,0.26], handR:[-0.24,1.02,0.50],
      hipL:[0.13,0.57,-0.09], kneeL:[0.17,0.33,0.20], footL:[0.15,0.06,0.00],
      hipR:[-0.13,0.57,-0.09], kneeR:[-0.17,0.33,0.20], footR:[-0.15,0.06,0.00] }
  ],
  jack: [
    { hipL:[0.09,0.94,0], kneeL:[0.07,0.52,0], footL:[0.06,0.06,0],
      hipR:[-0.09,0.94,0], kneeR:[-0.07,0.52,0], footR:[-0.06,0.06,0],
      elbowL:[0.23,1.18,0], handL:[0.25,0.92,0], elbowR:[-0.23,1.18,0], handR:[-0.25,0.92,0] },
    { hips:[0,0.90,0], spine:[0,1.10,0], chest:[0,1.30,0], neck:[0,1.44,0], head:[0,1.63,0],
      shoulderL:[0.19,1.38,0], elbowL:[0.36,1.62,0], handL:[0.44,1.90,0],
      shoulderR:[-0.19,1.38,0], elbowR:[-0.36,1.62,0], handR:[-0.44,1.90,0],
      hipL:[0.12,0.86,0], kneeL:[0.30,0.48,0], footL:[0.46,0.06,0],
      hipR:[-0.12,0.86,0], kneeR:[-0.30,0.48,0], footR:[-0.46,0.06,0] }
  ],
  lunge: [
    {},
    { hips:[0,0.72,-0.02], spine:[0,0.92,0], chest:[0,1.12,0.01], neck:[0,1.26,0.02], head:[0,1.45,0.03],
      shoulderL:[0.19,1.20,0.01], elbowL:[0.22,0.95,-0.06], handL:[0.24,0.72,0.02],
      shoulderR:[-0.19,1.20,0.01], elbowR:[-0.22,0.95,-0.06], handR:[-0.24,0.72,0.02],
      hipL:[0.11,0.70,-0.02], kneeL:[0.13,0.36,0.34], footL:[0.13,0.06,0.42],
      hipR:[-0.11,0.70,-0.02], kneeR:[-0.13,0.16,-0.28], footR:[-0.13,0.08,-0.55] }
  ],
  burpee: [
    {},
    { hips:[0,0.52,-0.06], spine:[0,0.70,0.02], chest:[0,0.86,0.12], neck:[0,0.96,0.22], head:[0,1.06,0.36],
      shoulderL:[0.19,0.92,0.16], elbowL:[0.21,0.62,0.34], handL:[0.22,0.06,0.44],
      shoulderR:[-0.19,0.92,0.16], elbowR:[-0.21,0.62,0.34], handR:[-0.22,0.06,0.44],
      hipL:[0.12,0.50,-0.06], kneeL:[0.14,0.30,0.16], footL:[0.14,0.06,-0.02],
      hipR:[-0.12,0.50,-0.06], kneeR:[-0.14,0.30,0.16], footR:[-0.14,0.06,-0.02] },
    { hips:[0,0.34,-0.44], spine:[0,0.38,-0.24], chest:[0,0.42,-0.04], neck:[0,0.44,0.10], head:[0,0.46,0.28],
      shoulderL:[0.19,0.42,0.06], elbowL:[0.22,0.24,0.24], handL:[0.24,0.06,0.42],
      shoulderR:[-0.19,0.42,0.06], elbowR:[-0.22,0.24,0.24], handR:[-0.24,0.06,0.42],
      hipL:[0.12,0.34,-0.44], kneeL:[0.13,0.22,-0.82], footL:[0.13,0.08,-1.16],
      hipR:[-0.12,0.34,-0.44], kneeR:[-0.13,0.22,-0.82], footR:[-0.13,0.08,-1.16] },
    { hips:[0,1.24,0], spine:[0,1.44,0], chest:[0,1.64,0], neck:[0,1.78,0], head:[0,1.97,0],
      shoulderL:[0.19,1.72,0], elbowL:[0.32,1.96,0], handL:[0.38,2.24,0],
      shoulderR:[-0.19,1.72,0], elbowR:[-0.32,1.96,0], handR:[-0.38,2.24,0],
      hipL:[0.11,1.20,0], kneeL:[0.13,0.82,0.06], footL:[0.13,0.46,0.02],
      hipR:[-0.11,1.20,0], kneeR:[-0.13,0.82,0.06], footR:[-0.13,0.46,0.02] }
  ],
  pushup: [
    { hips:[0,0.34,-0.44], spine:[0,0.38,-0.24], chest:[0,0.42,-0.04], neck:[0,0.44,0.10], head:[0,0.46,0.28],
      shoulderL:[0.19,0.42,0.06], elbowL:[0.22,0.24,0.24], handL:[0.24,0.06,0.42],
      shoulderR:[-0.19,0.42,0.06], elbowR:[-0.22,0.24,0.24], handR:[-0.24,0.06,0.42],
      hipL:[0.12,0.34,-0.44], kneeL:[0.13,0.22,-0.82], footL:[0.13,0.08,-1.16],
      hipR:[-0.12,0.34,-0.44], kneeR:[-0.13,0.22,-0.82], footR:[-0.13,0.08,-1.16] },
    { hips:[0,0.20,-0.44], spine:[0,0.20,-0.24], chest:[0,0.20,-0.04], neck:[0,0.22,0.10], head:[0,0.25,0.28],
      shoulderL:[0.19,0.20,0.06], elbowL:[0.35,0.20,0.15], handL:[0.24,0.06,0.42],
      shoulderR:[-0.19,0.20,0.06], elbowR:[-0.35,0.20,0.15], handR:[-0.24,0.06,0.42],
      hipL:[0.12,0.20,-0.44], kneeL:[0.13,0.14,-0.82], footL:[0.13,0.08,-1.16],
      hipR:[-0.12,0.20,-0.44], kneeR:[-0.13,0.14,-0.82], footR:[-0.13,0.08,-1.16] }
  ],
  plank: [
    { hips:[0,0.25,-0.44], spine:[0,0.25,-0.24], chest:[0,0.25,-0.04], neck:[0,0.27,0.10], head:[0,0.30,0.28],
      shoulderL:[0.19,0.25,0.06], elbowL:[0.19,0.06,0.20], handL:[0.10,0.06,0.45],
      shoulderR:[-0.19,0.25,0.06], elbowR:[-0.19,0.06,0.20], handR:[-0.10,0.06,0.45],
      hipL:[0.12,0.25,-0.44], kneeL:[0.13,0.18,-0.82], footL:[0.13,0.08,-1.16],
      hipR:[-0.12,0.25,-0.44], kneeR:[-0.13,0.18,-0.82], footR:[-0.13,0.08,-1.16] }
  ],
  highknees: [
    { hips:[0,0.96,0], spine:[0,1.16,0], chest:[0,1.36,0], neck:[0,1.50,0], head:[0,1.69,0],
      shoulderL:[0.19,1.44,0], elbowL:[0.22,1.20,0.20], handL:[0.22,1.30,0.45],
      shoulderR:[-0.19,1.44,0], elbowR:[-0.22,1.20,-0.20], handR:[-0.22,1.10,-0.40],
      hipL:[0.11,0.92,0], kneeL:[0.12,0.90,0.38], footL:[0.12,0.50,0.35],
      hipR:[-0.11,0.92,0], kneeR:[-0.12,0.52,0.05], footR:[-0.12,0.06,0.00] },
    { hips:[0,0.96,0], spine:[0,1.16,0], chest:[0,1.36,0], neck:[0,1.50,0], head:[0,1.69,0],
      shoulderL:[0.19,1.44,0], elbowL:[0.22,1.20,-0.20], handL:[0.22,1.10,-0.40],
      shoulderR:[-0.19,1.44,0], elbowR:[-0.22,1.20,0.20], handR:[-0.22,1.30,0.45],
      hipL:[0.11,0.92,0], kneeL:[0.12,0.52,0.05], footL:[0.12,0.06,0.00],
      hipR:[-0.11,0.92,0], kneeR:[-0.12,0.90,0.38], footR:[-0.12,0.50,0.35] }
  ],
  pause: [
    {}
  ]
};

const STANDARD_EXERCISES = [
  {
    id: 'std-squat',
    name: 'Squat',
    category: 'Legs',
    is_standard: true,
    is_private: false,
    notes: 'Mantieni la schiena dritta, talloni ben saldi a terra e ginocchia allineate con le punte dei piedi.',
    keyframes: RAW_PRESETS.squat.map(m => computePose(m, true))
  },
  {
    id: 'std-burpee',
    name: 'Burpees',
    category: 'Full Body',
    is_standard: true,
    is_private: false,
    notes: 'Movimento dinamico: scendi in squat, appoggia le mani, slancia i piedi indietro in plank, torna e salta in alto.',
    keyframes: RAW_PRESETS.burpee.map(m => computePose(m, false))
  },
  {
    id: 'std-pushup',
    name: 'Push-ups',
    category: 'Arms',
    is_standard: true,
    is_private: false,
    notes: 'Corpo allineato in asse, addome attivo, gomiti a circa 45° rispetto al busto durante la discesa.',
    keyframes: RAW_PRESETS.pushup.map(m => computePose(m, false))
  },
  {
    id: 'std-plank',
    name: 'Plank',
    category: 'Abs',
    is_standard: true,
    is_private: false,
    notes: 'Mantieni il corpo rigido e dritto dalla testa ai talloni, contraendo glutei e addominali. Non inarcare la schiena.',
    keyframes: RAW_PRESETS.plank.map(m => computePose(m, false))
  },
  {
    id: 'std-jumping-jacks',
    name: 'Jumping Jacks',
    category: 'Cardio',
    is_standard: true,
    is_private: false,
    notes: 'Atterra morbidamente sulle punte dei piedi ammortizzando l\'impatto, aprendo e chiudendo braccia e gambe in sincronia.',
    keyframes: RAW_PRESETS.jack.map(m => computePose(m, false))
  },
  {
    id: 'std-lunges',
    name: 'Lunges',
    category: 'Legs',
    is_standard: true,
    is_private: false,
    notes: 'Fai un passo ampio in avanti, piega entrambe le ginocchia a circa 90° evitando che il ginocchio anteriore superi la punta del piede.',
    keyframes: RAW_PRESETS.lunge.map(m => computePose(m, true))
  },
  {
    id: 'std-high-knees',
    name: 'High Knees',
    category: 'Cardio',
    is_standard: true,
    is_private: false,
    notes: 'Corsa sul posto portando le ginocchia all\'altezza del bacino a ritmo rapido e coordinato.',
    keyframes: RAW_PRESETS.highknees.map(m => computePose(m, false))
  },
  {
    id: 'std-pause',
    name: 'Pause / Rest',
    category: 'Rest',
    is_standard: true,
    is_private: false,
    notes: 'Recupero attivo: respira profondamente, bevi un sorso d\'acqua e sciogli i muscoli prima del prossimo esercizio.',
    keyframes: RAW_PRESETS.pause.map(m => computePose(m, true))
  }
];

async function seedStandardExercises(db) {
  for (const ex of STANDARD_EXERCISES) {
    await db.query(
      `INSERT INTO exercises (id, name, category, is_standard, is_private, keyframes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, category = EXCLUDED.category, keyframes = EXCLUDED.keyframes, notes = EXCLUDED.notes`,
      [ex.id, ex.name, ex.category, ex.is_standard, ex.is_private, JSON.stringify(ex.keyframes), ex.notes || null]
    );
  }
}

module.exports = { seedStandardExercises, STANDARD_EXERCISES };

