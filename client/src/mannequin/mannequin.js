/**
 * 3D Mannequin Kinematic Engine & Rigging System
 * Re-implemented directly from HIIT RIG (ref/hiit-rig_1.html)
 * - 17-Joint Anatomical Skeleton with Distance Constraints & Closed-Form Analytical 2-Bone IK
 * - Exact Bone Length Preservation (Zero Limb Elasticity) & Head Axis Alignment
 * - Direct Screen-Space Joint Picking & Dragging with Natural Arm/Leg Solving & Torso Tilting
 * - Hierarchical Direction Slerp Blending with Foot Ground Locking
 * - Complete Pose Presets (Stand, Supine, Prone) & Exercise Presets (Squat, Jack, Lunge, Burpee)
 * - Full Undo / Redo History Stack, Symmetry, Onion Skin Ghost, Autosave
 */

import * as THREE from 'three';
  'use strict';

  const V3 = THREE.Vector3;

  // Joint definitions: [name, x, y, z, group]
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
  const NAME = JOINT_DEFS.map(d => d[0]);
  const GROUP = JOINT_DEFS.map(d => d[4]);
  const IDX = {};
  NAME.forEach((n, i) => { IDX[n] = i; });

  const BONES = [
    ['hips', 'spine'], ['spine', 'chest'], ['chest', 'neck'], ['neck', 'head'],
    ['chest', 'shoulderL'], ['shoulderL', 'elbowL'], ['elbowL', 'handL'],
    ['chest', 'shoulderR'], ['shoulderR', 'elbowR'], ['elbowR', 'handR'],
    ['hips', 'hipL'], ['hipL', 'kneeL'], ['kneeL', 'footL'],
    ['hips', 'hipR'], ['hipR', 'kneeR'], ['kneeR', 'footR']
  ].map(b => ({ a: IDX[b[0]], b: IDX[b[1]] }));

  const STIFF = [
    ['shoulderL', 'shoulderR'], ['hipL', 'hipR'],
    ['chest', 'hipL'], ['chest', 'hipR'], ['hips', 'shoulderL'], ['hips', 'shoulderR'],
    ['neck', 'shoulderL'], ['neck', 'shoulderR'], ['spine', 'hipL'], ['spine', 'hipR']
  ].map(b => ({ a: IDX[b[0]], b: IDX[b[1]] }));

  const MIRROR = new Int8Array(N).fill(-1);
  NAME.forEach((n, i) => {
    if (n.endsWith('L')) MIRROR[i] = IDX[n.slice(0, -1) + 'R'];
    if (n.endsWith('R')) MIRROR[i] = IDX[n.slice(0, -1) + 'L'];
  });

  const BASE_VECTORS = JOINT_DEFS.map(d => new V3(d[1], d[2], d[3]));

  const CONSTRAINTS = [];
  BONES.forEach(b => CONSTRAINTS.push({ a: b.a, b: b.b, len: BASE_VECTORS[b.a].distanceTo(BASE_VECTORS[b.b]), k: 1.0 }));
  STIFF.forEach(b => CONSTRAINTS.push({ a: b.a, b: b.b, len: BASE_VECTORS[b.a].distanceTo(BASE_VECTORS[b.b]), k: 0.75 }));
  const BONE_LEN = BONES.map(b => BASE_VECTORS[b.a].distanceTo(BASE_VECTORS[b.b]));

  const FLOOR_Y = [];
  for (let i = 0; i < N; i++) FLOOR_Y.push(GROUP[i] === 'foot' ? 0.055 : 0.05);

  const HEAD_BONE = BONES.findIndex(b => b.b === IDX.head);

  function makeChain(rootN, midN, tipN, poleSign) {
    const r = IDX[rootN], m = IDX[midN], t = IDX[tipN];
    return {
      root: r, mid: m, tip: t, poleSign,
      L1: BASE_VECTORS[r].distanceTo(BASE_VECTORS[m]),
      L2: BASE_VECTORS[m].distanceTo(BASE_VECTORS[t])
    };
  }

  const CHAINS = [
    makeChain('shoulderL', 'elbowL', 'handL', -1),
    makeChain('shoulderR', 'elbowR', 'handR', -1),
    makeChain('hipL', 'kneeL', 'footL', 1),
    makeChain('hipR', 'kneeR', 'footR', 1)
  ];
  const CHAIN_TIP = {}, CHAIN_MID = {};
  CHAINS.forEach(c => { CHAIN_TIP[c.tip] = c; CHAIN_MID[c.mid] = c; });

  const BASE_POSES = {
    stand: {},
    supine: {
      hips: [0, 0.15, -0.30], spine: [0, 0.15, -0.10], chest: [0, 0.14, 0.10], neck: [0, 0.18, 0.24], head: [0, 0.22, 0.43],
      shoulderL: [-0.19, 0.15, 0.18], elbowL: [-0.26, 0.13, -0.09], handL: [-0.30, 0.11, -0.34],
      shoulderR: [0.19, 0.15, 0.18],  elbowR: [0.26, 0.13, -0.09],  handR: [0.30, 0.11, -0.34],
      hipL: [-0.11, 0.14, -0.32], kneeL: [-0.12, 0.13, -0.74], footL: [-0.12, 0.055, -1.20],
      hipR: [0.11, 0.14, -0.32],  kneeR: [0.12, 0.13, -0.74],  footR: [0.12, 0.055, -1.20]
    },
    prone: {
      hips: [0, 0.15, -0.30], spine: [0, 0.14, -0.10], chest: [0, 0.13, 0.10], neck: [0, 0.17, 0.25], head: [0, 0.22, 0.42],
      shoulderL: [0.19, 0.15, 0.18],  elbowL: [0.31, 0.14, -0.07],  handL: [0.26, 0.12, 0.18],
      shoulderR: [-0.19, 0.15, 0.18], elbowR: [-0.31, 0.14, -0.07], handR: [-0.26, 0.12, 0.18],
      hipL: [0.11, 0.14, -0.32],  kneeL: [0.12, 0.13, -0.74],  footL: [0.12, 0.055, -1.20],
      hipR: [-0.11, 0.14, -0.32], kneeR: [-0.12, 0.13, -0.74], footR: [-0.12, 0.055, -1.20]
    },
    side_right: {
      hips: [0, 0.20, -0.30], spine: [0, 0.20, -0.10], chest: [0, 0.20, 0.10], neck: [0, 0.22, 0.24], head: [0, 0.22, 0.43],
      shoulderR: [0.00, 0.08, 0.18], elbowR: [0.15, 0.08, 0.36], handR: [0.00, 0.12, 0.50],
      shoulderL: [0.00, 0.34, 0.18], elbowL: [0.14, 0.24, 0.00], handL: [0.12, 0.16, -0.22],
      hipR: [0.00, 0.10, -0.32], kneeR: [0.00, 0.09, -0.74], footR: [0.00, 0.055, -1.20],
      hipL: [0.00, 0.30, -0.32], kneeL: [0.00, 0.29, -0.74], footL: [0.00, 0.18, -1.20]
    },
    side_left: {
      hips: [0, 0.20, -0.30], spine: [0, 0.20, -0.10], chest: [0, 0.20, 0.10], neck: [0, 0.22, 0.24], head: [0, 0.22, 0.43],
      shoulderL: [0.00, 0.08, 0.18], elbowL: [-0.15, 0.08, 0.36], handL: [0.00, 0.12, 0.50],
      shoulderR: [0.00, 0.34, 0.18], elbowR: [-0.14, 0.24, 0.00], handR: [-0.12, 0.16, -0.22],
      hipL: [0.00, 0.10, -0.32], kneeL: [0.00, 0.09, -0.74], footL: [0.00, 0.055, -1.20],
      hipR: [0.00, 0.30, -0.32], kneeR: [0.00, 0.29, -0.74], footR: [0.00, 0.18, -1.20]
    }
  };

  const PRESETS = {
    squat: [
      {},
      {
        hips: [0, 0.60, -0.09], spine: [0, 0.80, -0.04], chest: [0, 1.00, 0.03], neck: [0, 1.14, 0.08], head: [0, 1.32, 0.12],
        shoulderL: [0.19, 1.08, 0.05], elbowL: [0.29, 0.96, 0.26], handL: [0.24, 1.02, 0.50],
        shoulderR: [-0.19, 1.08, 0.05], elbowR: [-0.29, 0.96, 0.26], handR: [-0.24, 1.02, 0.50],
        hipL: [0.13, 0.57, -0.09], kneeL: [0.17, 0.33, 0.20], footL: [0.15, 0.06, 0.00],
        hipR: [-0.13, 0.57, -0.09], kneeR: [-0.17, 0.33, 0.20], footR: [-0.15, 0.06, 0.00]
      }
    ],
    jack: [
      {
        hipL: [0.09, 0.94, 0], kneeL: [0.07, 0.52, 0], footL: [0.06, 0.06, 0],
        hipR: [-0.09, 0.94, 0], kneeR: [-0.07, 0.52, 0], footR: [-0.06, 0.06, 0],
        elbowL: [0.23, 1.18, 0], handL: [0.25, 0.92, 0], elbowR: [-0.23, 1.18, 0], handR: [-0.25, 0.92, 0]
      },
      {
        hips: [0, 0.90, 0], spine: [0, 1.10, 0], chest: [0, 1.30, 0], neck: [0, 1.44, 0], head: [0, 1.63, 0],
        shoulderL: [0.19, 1.38, 0], elbowL: [0.36, 1.62, 0], handL: [0.44, 1.90, 0],
        shoulderR: [-0.19, 1.38, 0], elbowR: [-0.36, 1.62, 0], handR: [-0.44, 1.90, 0],
        hipL: [0.12, 0.86, 0], kneeL: [0.30, 0.48, 0], footL: [0.46, 0.06, 0],
        hipR: [-0.12, 0.86, 0], kneeR: [-0.30, 0.48, 0], footR: [-0.46, 0.06, 0]
      }
    ],
    lunge: [
      {},
      {
        hips: [0, 0.72, -0.02], spine: [0, 0.92, 0], chest: [0, 1.12, 0.01], neck: [0, 1.26, 0.02], head: [0, 1.45, 0.03],
        shoulderL: [0.19, 1.20, 0.01], elbowL: [0.22, 0.95, -0.06], handL: [0.24, 0.72, 0.02],
        shoulderR: [-0.19, 1.20, 0.01], elbowR: [-0.22, 0.95, -0.06], handR: [-0.24, 0.72, 0.02],
        hipL: [0.11, 0.70, -0.02], kneeL: [0.13, 0.36, 0.34], footL: [0.13, 0.06, 0.42],
        hipR: [-0.11, 0.70, -0.02], kneeR: [-0.13, 0.16, -0.28], footR: [-0.13, 0.08, -0.55]
      }
    ],
    burpee: [
      {},
      {
        hips: [0, 0.52, -0.06], spine: [0, 0.70, 0.02], chest: [0, 0.86, 0.12], neck: [0, 0.96, 0.22], head: [0, 1.06, 0.36],
        shoulderL: [0.19, 0.92, 0.16], elbowL: [0.21, 0.62, 0.34], handL: [0.22, 0.06, 0.44],
        shoulderR: [-0.19, 0.92, 0.16], elbowR: [-0.21, 0.62, 0.34], handR: [-0.22, 0.06, 0.44],
        hipL: [0.12, 0.50, -0.06], kneeL: [0.14, 0.30, 0.16], footL: [0.14, 0.06, -0.02],
        hipR: [-0.12, 0.50, -0.06], kneeR: [-0.14, 0.30, 0.16], footR: [-0.14, 0.06, -0.02]
      },
      {
        hips: [0, 0.34, -0.44], spine: [0, 0.38, -0.24], chest: [0, 0.42, -0.04], neck: [0, 0.44, 0.10], head: [0, 0.46, 0.28],
        shoulderL: [0.19, 0.42, 0.06], elbowL: [0.22, 0.24, 0.24], handL: [0.24, 0.06, 0.42],
        shoulderR: [-0.19, 0.42, 0.06], elbowR: [-0.22, 0.24, 0.24], handR: [-0.24, 0.06, 0.42],
        hipL: [0.12, 0.34, -0.44], kneeL: [0.13, 0.22, -0.82], footL: [0.13, 0.08, -1.16],
        hipR: [-0.12, 0.34, -0.44], kneeR: [-0.13, 0.22, -0.82], footR: [-0.13, 0.08, -1.16]
      },
      {
        hips: [0, 1.24, 0], spine: [0, 1.44, 0], chest: [0, 1.64, 0], neck: [0, 1.78, 0], head: [0, 1.97, 0],
        shoulderL: [0.19, 1.72, 0], elbowL: [0.32, 1.96, 0], handL: [0.38, 2.24, 0],
        shoulderR: [-0.19, 1.72, 0], elbowR: [-0.32, 1.96, 0], handR: [-0.38, 2.24, 0],
        hipL: [0.11, 1.20, 0], kneeL: [0.13, 0.82, 0.06], footL: [0.13, 0.46, 0.02],
        hipR: [-0.11, 1.20, 0], kneeR: [-0.13, 0.82, 0.06], footR: [-0.13, 0.46, 0.02]
      }
    ]
  };

  const PRESET_DUR = { squat: 0.8, jack: 0.45, lunge: 0.9, burpee: 0.5 };

  // Easing function
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Slerp helper
  const _slerpA = new V3(), _slerpB = new V3(), _slerpO = new V3();
  function slerpDir(ax, ay, az, bx, by, bz, t, out) {
    _slerpA.set(ax, ay, az);
    _slerpB.set(bx, by, bz);
    let dot = THREE.MathUtils.clamp(_slerpA.dot(_slerpB), -1, 1);
    if (dot > 0.9995) {
      out.copy(_slerpA).lerp(_slerpB, t).normalize();
      return out;
    }
    if (dot < -0.9995) {
      _slerpO.set(-_slerpA.y, _slerpA.x, _slerpA.z);
      if (_slerpO.lengthSq() < 1e-6) _slerpO.set(0, 0, 1);
      _slerpO.addScaledVector(_slerpA, -_slerpA.dot(_slerpO)).normalize();
    } else {
      _slerpO.copy(_slerpB).addScaledVector(_slerpA, -dot).normalize();
    }
    const th = Math.acos(dot) * t;
    return out.copy(_slerpA).multiplyScalar(Math.cos(th)).addScaledVector(_slerpO, Math.sin(th));
  }

  function toRig(pose) {
    if (!pose || pose.length < N * 3) {
      return null;
    }
    const dirs = new Float32Array(BONES.length * 3);
    const t = new V3();
    for (let i = 0; i < BONES.length; i++) {
      const a = BONES[i].a, b = BONES[i].b;
      t.set(pose[b * 3] - pose[a * 3], pose[b * 3 + 1] - pose[a * 3 + 1], pose[b * 3 + 2] - pose[a * 3 + 2]);
      if (t.lengthSq() < 1e-10) t.set(0, 1, 0);
      t.normalize();
      dirs[i * 3] = t.x;
      dirs[i * 3 + 1] = t.y;
      dirs[i * 3 + 2] = t.z;
    }
    const grounded = Math.min(pose[IDX.footL * 3 + 1], pose[IDX.footR * 3 + 1]) < 0.10;
    return {
      root: [pose[IDX.hips * 3], pose[IDX.hips * 3 + 1], pose[IDX.hips * 3 + 2]],
      dirs,
      pose,
      grounded
    };
  }

  /**
   * Mannequin Class
   */
  class Mannequin {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.options = options;
      this.enableAnchors = options.enableAnchors !== false && options.isEditor !== false;
      this.isEditor = !!this.enableAnchors;
      this.onPoseChange = options.onPoseChange || null;
      this.onKeyframeChange = options.onKeyframeChange || null;
      this.onPlaybackStep = options.onPlaybackStep || null;
      this.onToast = options.onToast || null;

      // Internal positions
      this.P = JOINT_DEFS.map(d => new V3(d[1], d[2], d[3]));
      this.BASE = this.P.map(v => v.clone());

      // Scratch vectors
      this._d = new V3();
      this._dir = new V3();
      this._up = new V3(0, 1, 0);
      this._q = new THREE.Quaternion();
      this._xA = new V3(); this._yA = new V3(); this._zA = new V3(); this._m4 = new THREE.Matrix4();
      this._right = new V3(); this._fwd = new V3(); this._seg = new V3(); this._spine = new V3();
      this._ab = new V3(); this._u = new V3(); this._cc = new V3(); this._perp = new V3(); this._hold = new V3();
      this._hit = new V3(); this._tgt = new V3(); this._mir = new V3();
      this._delta = new V3(); this._keepL = new V3(); this._keepR = new V3();
      this._rt = new V3(); this._ut = new V3();

      // State Flags
      const rawFlags = {
        symmetry: options.symmetry !== undefined ? options.symmetry : true,
        lockFeet: options.lockFeet !== undefined ? options.lockFeet : true,
        onion: options.onion !== undefined ? options.onion : true,
        autosave: options.autosave !== undefined ? options.autosave : true
      };
      this.flags = new Proxy(rawFlags, {
        set: (target, prop, value) => {
          target[prop] = value;
          if (prop === 'onion') {
            this.updateBodyTransparency();
          }
          return true;
        }
      });

      // Keyframes & Playback
      this.keys = [];
      this.current = 0;
      this.playing = false;
      this.playPos = 0;
      this.reps = 0;
      this.duration = options.duration || 0.8;
      this.seq = [];

      // History stack (Undo / Redo)
      this.history = { undo: [], redo: [], pending: null, limit: 80 };

      // Camera parameters
      this.cam = { target: new V3(0, 0.92, 0), theta: 0.42, phi: 1.28, radius: 4.3 };
      this.HOME = { theta: 0.42, phi: 1.28, radius: 4.3, ty: 0.92 };

      // Interaction pointers
      this.pointers = new Map();
      this.mode = null;
      this.dragging = -1;
      this.hovered = -1;
      this.dragPlane = new THREE.Plane();
      this.dragOffset = new V3();
      this.raycaster = new THREE.Raycaster();
      this.last = { x: 0, y: 0 };
      this.pinchDist = 0;
      this.pinchMid = { x: 0, y: 0 };

      this.initScene();
      this.initMeshes();

      if (this.isEditor) {
        this.initInteraction();
      } else {
        this.initViewerControls();
      }

      this.resize();
      this.boundResize = () => this.resize();
      window.addEventListener('resize', this.boundResize);

      // Default to squat preset if empty
      this.loadPreset('squat');
      this.resetView();

      this.prevT = performance.now();
      this.tick = this.tick.bind(this);
      this.animFrameId = requestAnimationFrame(this.tick);
    }

    /* ---- Kinematics Solver ---- */
    solve(iterations, pinned) {
      for (let it = 0; it < iterations; it++) {
        for (let c = 0; c < CONSTRAINTS.length; c++) {
          const con = CONSTRAINTS[c], A = this.P[con.a], B = this.P[con.b];
          const wa = pinned && pinned.has(con.a) ? 0 : 1;
          const wb = pinned && pinned.has(con.b) ? 0 : 1;
          const tw = wa + wb;
          if (!tw) continue;
          this._d.subVectors(B, A);
          let len = this._d.length();
          if (len < 1e-6) { this._d.set(0, 1e-6, 0); len = 1e-6; }
          const f = ((len - con.len) / len) * con.k;
          A.addScaledVector(this._d, f * (wa / tw));
          B.addScaledVector(this._d, -f * (wb / tw));
        }
        for (let i = 0; i < N; i++) {
          if (this.P[i].y < FLOOR_Y[i]) this.P[i].y = FLOOR_Y[i];
        }
      }
    }

    alignHead() {
      this._d.subVectors(this.P[IDX.neck], this.P[IDX.chest]);
      let l = this._d.length();
      if (l < 1e-6) { this._d.set(0, 1, 0); l = 1; }
      this.P[IDX.head].copy(this.P[IDX.neck]).addScaledVector(this._d, BONE_LEN[HEAD_BONE] / l);
    }

    rectify() {
      for (let i = 0; i < BONES.length; i++) {
        const a = BONES[i].a, b = BONES[i].b;
        this._d.subVectors(this.P[b], this.P[a]);
        let l = this._d.length();
        if (l < 1e-6) { this._d.set(0, 1, 0); l = 1; }
        this.P[b].copy(this.P[a]).addScaledVector(this._d, BONE_LEN[i] / l);
      }
      this.alignHead();
    }

    capture() {
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        a[i * 3]     = Math.round(this.P[i].x * 1000) / 1000;
        a[i * 3 + 1] = Math.round(this.P[i].y * 1000) / 1000;
        a[i * 3 + 2] = Math.round(this.P[i].z * 1000) / 1000;
      }
      return a;
    }

    apply(a) {
      if (!a) return;
      if (Array.isArray(a) || a instanceof Float32Array) {
        if (a.length >= N * 3) {
          for (let i = 0; i < N; i++) {
            this.P[i].set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
          }
          return;
        }
      }
      // If object with joint keys
      if (typeof a === 'object') {
        for (let i = 0; i < N; i++) {
          const key = NAME[i];
          if (a[key]) {
            if (Array.isArray(a[key])) {
              this.P[i].set(a[key][0], a[key][1], a[key][2]);
            } else if (typeof a[key] === 'object') {
              this.P[i].set(a[key].x || 0, a[key].y || 0, a[key].z || 0);
            }
          }
        }
      }
    }

    poseFrom(map, pinFeet) {
      for (let i = 0; i < N; i++) this.P[i].copy(this.BASE[i]);
      for (const k in map) {
        if (IDX[k] !== undefined) {
          const val = map[k];
          if (Array.isArray(val)) this.P[IDX[k]].fromArray(val);
          else if (val && typeof val === 'object') this.P[IDX[k]].set(val.x || 0, val.y || 0, val.z || 0);
        }
      }
      const pinned = new Set();
      if (pinFeet) { pinned.add(IDX.footL); pinned.add(IDX.footR); }
      this.solve(60, pinned);
      this.rectify();
      return this.capture();
    }

    makeKey(pose) {
      if (!pose) {
        const captured = this.capture();
        return { pose: captured, rig: toRig(captured) };
      }
      let arr;
      if (pose instanceof Float32Array && pose.length >= N * 3) {
        arr = pose;
      } else if (Array.isArray(pose)) {
        if (pose.length >= N * 3) {
          arr = new Float32Array(pose);
        } else if (pose.length > 0 && (Array.isArray(pose[0]) || typeof pose[0] === 'object')) {
          const flat = [];
          for (let i = 0; i < N; i++) {
            const p = pose[i] || [0, 0, 0];
            flat.push(p[0] !== undefined ? p[0] : (p.x || 0));
            flat.push(p[1] !== undefined ? p[1] : (p.y || 0));
            flat.push(p[2] !== undefined ? p[2] : (p.z || 0));
          }
          arr = new Float32Array(flat);
        } else {
          arr = this.capture();
        }
      } else if (typeof pose === 'object') {
        if (pose.pose) {
          return this.makeKey(pose.pose);
        } else if (pose[0] !== undefined || pose['0'] !== undefined) {
          const flat = [];
          for (let i = 0; i < N * 3; i++) {
            flat.push(pose[i] !== undefined ? Number(pose[i]) : 0);
          }
          arr = new Float32Array(flat);
        } else {
          const pArr = this.poseFrom(pose, false);
          arr = (pArr instanceof Float32Array) ? pArr : new Float32Array(pArr);
        }
      } else {
        arr = this.capture();
      }
      return { pose: arr, rig: toRig(arr) };
    }

    blend(rigA, rigB, t) {
      if (!rigA || !rigB || !rigA.root || !rigB.root || !rigA.dirs || !rigB.dirs) {
        return;
      }
      this.P[IDX.hips].set(
        rigA.root[0] + (rigB.root[0] - rigA.root[0]) * t,
        rigA.root[1] + (rigB.root[1] - rigA.root[1]) * t,
        rigA.root[2] + (rigB.root[2] - rigA.root[2]) * t
      );
      for (let i = 0; i < BONES.length; i++) {
        slerpDir(
          rigA.dirs[i * 3], rigA.dirs[i * 3 + 1], rigA.dirs[i * 3 + 2],
          rigB.dirs[i * 3], rigB.dirs[i * 3 + 1], rigB.dirs[i * 3 + 2],
          t, this._dir
        );
        this.P[BONES[i].b].copy(this.P[BONES[i].a]).addScaledVector(this._dir, BONE_LEN[i]);
      }
      this.alignHead();

      if (this.flags.lockFeet && rigA.grounded && rigB.grounded) {
        const low = Math.min(this.P[IDX.footL].y, this.P[IDX.footR].y);
        const dy = FLOOR_Y[IDX.footL] - low;
        if (Math.abs(dy) > 1e-4) {
          for (let i = 0; i < N; i++) this.P[i].y += dy;
        }
      } else {
        let low = Infinity;
        for (let i = 0; i < N; i++) {
          const y = this.P[i].y;
          const fy = FLOOR_Y[i];
          if (y < fy) low = Math.min(low, y - fy);
        }
        if (low < 0) {
          for (let i = 0; i < N; i++) this.P[i].y -= low;
        }
      }
      this.refresh();
    }

    /* ---- 3D Scene Initialization ---- */
    initScene() {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

      // Studio Ambient & Hemisphere Lighting (-20% balanced)
      this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.88);
      this.scene.add(this.ambientLight);

      this.hemiLight = new THREE.HemisphereLight(0xE0F2FE, 0x475569, 0.88);
      this.scene.add(this.hemiLight);

      // Key Light (Front-Right Main Sunlight)
      this.keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.75);
      this.keyLight.position.set(3.0, 5.5, 4.0);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 14;
      this.keyLight.shadow.camera.left = -3;
      this.keyLight.shadow.camera.right = 3;
      this.keyLight.shadow.camera.top = 4;
      this.keyLight.shadow.camera.bottom = -1;
      this.keyLight.shadow.bias = -0.0012;
      this.scene.add(this.keyLight);

      // Fill Light (Front-Left Soft Fill)
      this.fillLight = new THREE.DirectionalLight(0xBAE6FD, 0.95);
      this.fillLight.position.set(-3.0, 3.5, 3.5);
      this.scene.add(this.fillLight);

      // Front Direct Light (Direct viewer illumination)
      this.frontLight = new THREE.DirectionalLight(0xFFFFFF, 0.55);
      this.frontLight.position.set(0, 2.5, 5.0);
      this.scene.add(this.frontLight);

      // Rim Light (Back-Left Cyan Studio Accent)
      this.rimLight = new THREE.DirectionalLight(0x38BDF8, 1.05);
      this.rimLight.position.set(-3.0, 4.0, -3.5);
      this.scene.add(this.rimLight);

      // Floor & shadow
      this.floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: 0.35 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);

      this.grid = new THREE.GridHelper(12, 24, 0x49C6E5, 0x2A3B44);
      this.grid.material.transparent = true;
      this.grid.material.opacity = 0.3;
      this.scene.add(this.grid);

      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.66, 64),
        new THREE.MeshBasicMaterial({ color: 0x49C6E5, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.y = 0.002;
      this.scene.add(this.ring);
    }

    initMeshes() {
      this.matBone = new THREE.MeshStandardMaterial({ color: 0xF1F5F9, roughness: 0.32, metalness: 0.08 });
      this.matCore = new THREE.MeshStandardMaterial({ color: 0xDCE3EA, roughness: 0.36, metalness: 0.06 });
      this.HCOL = { arm: 0x49C6E5, leg: 0xF5A524, foot: 0xF5A524, core: 0xB08CFF, head: 0xB08CFF };

      this.rigGroup = new THREE.Group();
      this.scene.add(this.rigGroup);

      const boneGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
      boneGeo.translate(0, 0.5, 0);

      this.boneMeshes = BONES.map(b => {
        const thin = (NAME[b.b] === 'handL' || NAME[b.b] === 'handR' || NAME[b.b] === 'footL' || NAME[b.b] === 'footR');
        const m = new THREE.Mesh(boneGeo, this.matBone);
        m.userData.r = thin ? 0.032 : 0.042;
        m.castShadow = true;
        this.rigGroup.add(m);
        return m;
      });

      this.torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.matCore);
      this.torso.castShadow = true;
      this.rigGroup.add(this.torso);

      this.pelvis = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.matCore);
      this.pelvis.castShadow = true;
      this.rigGroup.add(this.pelvis);

      this.head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 18), this.matCore);
      this.head.castShadow = true;
      this.head.scale.set(1, 1.12, 1.02);
      this.rigGroup.add(this.head);

      this.visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.045, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x38BDF8, emissive: 0x0284C7, emissiveIntensity: 0.95, roughness: 0.20 })
      );
      this.rigGroup.add(this.visor);

      this.feet = [0, 1].map(() => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.06, 0.23), this.matBone);
        m.castShadow = true;
        this.rigGroup.add(m);
        return m;
      });

      // Joint handle spheres
      const handleGeo = new THREE.SphereGeometry(1, 18, 14);
      this.handles = [];
      for (let i = 0; i < N; i++) {
        const col = this.HCOL[GROUP[i]] || 0xEDEAE3;
        const m = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({
          color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.30, metalness: 0.1
        }));
        m.userData.base = (NAME[i] === 'hips') ? 0.062 : (GROUP[i] === 'core' ? 0.045 : 0.052);
        if (!this.isEditor) m.visible = false;
        this.rigGroup.add(m);
        this.handles.push(m);
      }

      // Ghost line segments (Onion Skin)
      this.ghostGeo = new THREE.BufferGeometry();
      this.ghostGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BONES.length * 6), 3));
      this.ghost = new THREE.LineSegments(
        this.ghostGeo,
        new THREE.LineBasicMaterial({ color: 0x49C6E5, transparent: true, opacity: 0.6 })
      );
      this.ghost.visible = false;
      this.scene.add(this.ghost);

      this.updateBodyTransparency();
    }

    updateBodyTransparency() {
      // Ensure mannequin meshes remain solid and cleanly illuminated
      if (this.matBone && (this.matBone.transparent || this.matBone.opacity !== 1.0)) {
        this.matBone.transparent = false;
        this.matBone.opacity = 1.0;
        this.matBone.depthWrite = true;
        this.matBone.needsUpdate = true;
      }
      if (this.matCore && (this.matCore.transparent || this.matCore.opacity !== 1.0)) {
        this.matCore.transparent = false;
        this.matCore.opacity = 1.0;
        this.matCore.depthWrite = true;
        this.matCore.needsUpdate = true;
      }
    }

    /* ---- Mesh Orientation & Placement Helpers ---- */
    segment(mesh, a, b, radius) {
      this._seg.subVectors(b, a);
      const len = this._seg.length() || 1e-4;
      mesh.position.copy(a);
      mesh.quaternion.setFromUnitVectors(this._up, this._seg.divideScalar(len));
      mesh.scale.set(radius, len, radius);
    }

    orient(a, b, refRight) {
      this._yA.subVectors(b, a);
      const len = this._yA.length() || 1e-4;
      this._yA.divideScalar(len);
      this._xA.copy(refRight).addScaledVector(this._yA, -refRight.dot(this._yA));
      if (this._xA.lengthSq() < 1e-8) this._xA.set(this._yA.y, -this._yA.x, 0);
      if (this._xA.lengthSq() < 1e-8) this._xA.set(1, 0, 0);
      this._xA.normalize();
      this._zA.crossVectors(this._xA, this._yA).normalize();
      this._m4.makeBasis(this._xA, this._yA, this._zA);
      this._q.setFromRotationMatrix(this._m4);
      return len;
    }

    bodyAxes() {
      this._spine.subVectors(this.P[IDX.neck], this.P[IDX.hips]);
      if (this._spine.lengthSq() < 1e-8) this._spine.set(0, 1, 0); else this._spine.normalize();
      this._right.subVectors(this.P[IDX.shoulderL], this.P[IDX.shoulderR]);
      this._right.addScaledVector(this._spine, -this._right.dot(this._spine));
      if (this._right.lengthSq() < 1e-8) this._right.set(1, 0, 0);
      this._right.normalize();
      this._fwd.crossVectors(this._right, this._spine).normalize();
    }

    refresh() {
      this.bodyAxes();
      for (let i = 0; i < BONES.length; i++) {
        this.segment(this.boneMeshes[i], this.P[BONES[i].a], this.P[BONES[i].b], this.boneMeshes[i].userData.r);
      }

      let len = this.orient(this.P[IDX.hips], this.P[IDX.neck], this._right);
      this.torso.quaternion.copy(this._q);
      this.torso.position.copy(this.P[IDX.hips]).addScaledVector(this._yA, len * 0.5);
      this.torso.scale.set(0.30, len, 0.19);

      len = this.orient(this.P[IDX.hipR], this.P[IDX.hipL], this._fwd);
      this.pelvis.quaternion.copy(this._q);
      this.pelvis.position.copy(this.P[IDX.hipR]).addScaledVector(this._yA, len * 0.5);
      this.pelvis.scale.set(0.15, len, 0.17);

      this.orient(this.P[IDX.neck], this.P[IDX.head], this._right);
      this.head.quaternion.copy(this._q);
      this.head.position.copy(this.P[IDX.head]);
      this.visor.quaternion.copy(this._q);
      this.visor.position.copy(this.P[IDX.head]).addScaledVector(this._zA, 0.112).addScaledVector(this._yA, 0.015);

      const ankle = [[IDX.footL, IDX.kneeL], [IDX.footR, IDX.kneeR]];
      for (let f = 0; f < 2; f++) {
        this.orient(this.P[ankle[f][0]], this.P[ankle[f][1]], this._right);
        this.feet[f].quaternion.copy(this._q);
        this.feet[f].position.copy(this.P[ankle[f][0]]).addScaledVector(this._zA, 0.06).addScaledVector(this._yA, -0.015);
      }

      const s = THREE.MathUtils.clamp(this.camera.position.distanceTo(this.P[IDX.hips]) / 4.2, 0.7, 1.9);
      if (this.isEditor) {
        for (let i = 0; i < N; i++) {
          const hot = (i === this.hovered || i === this.dragging);
          this.handles[i].position.copy(this.P[i]);
          this.handles[i].scale.setScalar(this.handles[i].userData.base * s * (hot ? 1.5 : 1));
          this.handles[i].material.emissiveIntensity = hot ? 0.95 : 0.35;
        }
      }

      this.ring.position.set((this.P[IDX.footL].x + this.P[IDX.footR].x) / 2, 0.002, (this.P[IDX.footL].z + this.P[IDX.footR].z) / 2);
      this.ring.material.opacity = 0.28 * Math.max(0, this._spine.y);
    }

    refreshGhost() {
      this.updateBodyTransparency();
      if (!this.flags.onion || this.keys.length < 2 || this.playing || !this.isEditor) {
        this.ghost.visible = false;
        return;
      }
      const nxt = this.keys[(this.current + 1) % this.keys.length].pose;
      const arr = this.ghostGeo.attributes.position.array;
      for (let i = 0; i < BONES.length; i++) {
        const a = BONES[i].a * 3, b = BONES[i].b * 3;
        arr[i * 6]     = nxt[a];     arr[i * 6 + 1] = nxt[a + 1]; arr[i * 6 + 2] = nxt[a + 2];
        arr[i * 6 + 3] = nxt[b];     arr[i * 6 + 4] = nxt[b + 1]; arr[i * 6 + 5] = nxt[b + 2];
      }
      this.ghostGeo.attributes.position.needsUpdate = true;
      this.ghost.visible = true;
    }

    /* ---- Camera & View ---- */
    updateCamera() {
      this.cam.phi = THREE.MathUtils.clamp(this.cam.phi, 0.18, 1.62);
      this.cam.radius = THREE.MathUtils.clamp(this.cam.radius, 1.3, 12);
      this.cam.target.y = THREE.MathUtils.clamp(this.cam.target.y, -0.5, 3);
      const sp = Math.sin(this.cam.phi);
      this.camera.position.set(
        this.cam.target.x + this.cam.radius * sp * Math.sin(this.cam.theta),
        this.cam.target.y + this.cam.radius * Math.cos(this.cam.phi),
        this.cam.target.z + this.cam.radius * sp * Math.cos(this.cam.theta)
      );
      this.camera.lookAt(this.cam.target);
    }

    resetView() {
      const aspect = this.W / Math.max(this.H, 1);
      const portrait = aspect < 1.0;
      this.cam.theta = this.HOME.theta;
      this.cam.phi = portrait ? 1.32 : this.HOME.phi;
      
      let r = this.HOME.radius;
      if (aspect < 1.0) {
        // Proportional radius scaling on portrait / narrow screens so mannequin and handles fit cleanly
        r = this.HOME.radius * (1.12 / Math.max(aspect, 0.45));
      }
      this.cam.radius = THREE.MathUtils.clamp(r, 3.8, 8.5);
      this.cam.target.set(0, portrait ? 0.88 : this.HOME.ty, 0);
      this.updateCamera();
    }

    resetCamera() {
      this.resetView();
    }

    resize() {
      this.W = this.canvas.clientWidth || 600;
      this.H = this.canvas.clientHeight || 450;
      this.renderer.setSize(this.W, this.H, false);
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.updateCamera();
    }

    onResize() {
      this.resize();
    }

    panBy(dx, dy) {
      const f = 2 * this.cam.radius * Math.tan((this.camera.fov * Math.PI / 180) / 2) / this.H;
      this._rt.setFromMatrixColumn(this.camera.matrix, 0);
      this._ut.setFromMatrixColumn(this.camera.matrix, 1);
      this.cam.target.addScaledVector(this._rt, -dx * f).addScaledVector(this._ut, dy * f);
    }

    /* ---- 2-Bone Analytical IK & Manipulation ---- */
    poleSolve(c, ref) {
      const A = this.P[c.root], B = this.P[c.tip];
      this._ab.subVectors(B, A);
      let d = this._ab.length();
      const dmin = Math.abs(c.L1 - c.L2) + 1e-3;
      if (d < dmin) {
        if (d < 1e-6) this._ab.copy(this._fwd).multiplyScalar(c.poleSign).addScaledVector(this._up, -0.5);
        this._u.copy(this._ab).normalize();
        B.copy(A).addScaledVector(this._u, dmin);
        d = dmin;
      } else {
        this._u.copy(this._ab).divideScalar(d);
      }
      if (d >= c.L1 + c.L2) {
        this.P[c.mid].copy(A).addScaledVector(this._u, c.L1);
        B.copy(A).addScaledVector(this._u, c.L1 + c.L2);
        return;
      }
      const x = (d * d + c.L1 * c.L1 - c.L2 * c.L2) / (2 * d);
      const h = Math.sqrt(Math.max(0, c.L1 * c.L1 - x * x));
      this._cc.copy(A).addScaledVector(this._u, x);
      this._perp.subVectors(ref, this._cc);
      this._perp.addScaledVector(this._u, -this._perp.dot(this._u));
      if (this._perp.lengthSq() < 4e-4) {
        this._perp.copy(this._fwd).multiplyScalar(c.poleSign);
        this._perp.addScaledVector(this._u, -this._perp.dot(this._u));
        if (this._perp.lengthSq() < 1e-8) {
          this._perp.set(this._u.y, -this._u.x, 0);
          if (this._perp.lengthSq() < 1e-8) this._perp.set(0, 0, 1);
          this._perp.addScaledVector(this._u, -this._perp.dot(this._u));
        }
      }
      this._perp.normalize();
      this.P[c.mid].copy(this._cc).addScaledVector(this._perp, h);
    }

    ikTip(c, target) {
      this.P[c.tip].copy(target);
      this.poleSolve(c, this.P[c.mid]);
    }

    ikMid(c, target) {
      if (this.flags.lockFeet && c.poleSign > 0) {
        this.poleSolve(c, target);
        return;
      }
      this._hold.subVectors(this.P[c.tip], this.P[c.mid]);
      this._ab.subVectors(target, this.P[c.root]);
      const d = this._ab.length() || 1e-6;
      this.P[c.mid].copy(this.P[c.root]).addScaledVector(this._ab, c.L1 / d);
      this.P[c.tip].copy(this.P[c.mid]).add(this._hold);
    }

    torsoDrag(target, mirror) {
      this._keepL.copy(this.P[IDX.footL]);
      this._keepR.copy(this.P[IDX.footR]);
      const pinned = new Set([this.dragging]);
      if (NAME[this.dragging] === 'hips') {
        this._delta.subVectors(target, this.P[IDX.hips]);
        for (let i = 0; i < N; i++) this.P[i].add(this._delta);
        if (this.flags.lockFeet) {
          this.P[IDX.footL].copy(this._keepL);
          this.P[IDX.footR].copy(this._keepR);
        }
      } else {
        this.P[this.dragging].copy(target);
        if (mirror >= 0) {
          this.P[mirror].copy(this._mir);
          pinned.add(mirror);
        }
      }
      if (this.flags.lockFeet) {
        pinned.add(IDX.footL);
        pinned.add(IDX.footR);
      }
      this.solve(18, pinned);
      this.rectify();
      if (this.flags.lockFeet) {
        this.P[IDX.footL].copy(this._keepL);
        this.poleSolve(CHAIN_TIP[IDX.footL], this.P[IDX.kneeL]);
        this.P[IDX.footR].copy(this._keepR);
        this.poleSolve(CHAIN_TIP[IDX.footR], this.P[IDX.kneeR]);
      }
    }

    localXY(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    screenPos(v) {
      const pv = v.clone().project(this.camera);
      return { x: (pv.x * 0.5 + 0.5) * this.W, y: (-pv.y * 0.5 + 0.5) * this.H, z: pv.z };
    }

    pickJoint(px, py, tol) {
      let best = -1, bestD = tol;
      for (let i = 0; i < N; i++) {
        const s = this.screenPos(this.P[i]);
        if (s.z > 1) continue;
        const d = Math.hypot(s.x - px, s.y - py);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    rayToPlane(px, py, out) {
      this.raycaster.setFromCamera({ x: (px / this.W) * 2 - 1, y: -(py / this.H) * 2 + 1 }, this.camera);
      return this.raycaster.ray.intersectPlane(this.dragPlane, out);
    }

    beginDrag(i, px, py) {
      this.dragging = i;
      this.history.pending = this.snapState();
      const nrm = this.camera.getWorldDirection(new V3()).negate();
      this.dragPlane.setFromNormalAndCoplanarPoint(nrm, this.P[i]);
      const hit = this.rayToPlane(px, py, new V3());
      this.dragOffset.set(0, 0, 0);
      if (hit) this.dragOffset.subVectors(this.P[i], hit);
      this.canvas.classList.add('dragging');
    }

    moveDrag(px, py) {
      if (!this.rayToPlane(px, py, this._hit)) return;
      this._tgt.copy(this._hit).add(this.dragOffset);
      if (this._tgt.y < FLOOR_Y[this.dragging]) this._tgt.y = FLOOR_Y[this.dragging];

      const m = (this.flags.symmetry && MIRROR[this.dragging] >= 0) ? MIRROR[this.dragging] : -1;
      if (m >= 0) { this._mir.copy(this._tgt); this._mir.x *= -1; }

      if (CHAIN_TIP[this.dragging]) {
        this.ikTip(CHAIN_TIP[this.dragging], this._tgt);
        if (m >= 0) this.ikTip(CHAIN_TIP[m], this._mir);
      } else if (CHAIN_MID[this.dragging]) {
        this.ikMid(CHAIN_MID[this.dragging], this._tgt);
        if (m >= 0) this.ikMid(CHAIN_MID[m], this._mir);
      } else {
        this.torsoDrag(this._tgt, m);
      }

      if (typeof this.onPoseChange === 'function') {
        this.onPoseChange(this.capture());
      }
    }

    endDrag() {
      if (this.dragging >= 0) {
        if (this.history.pending && this.poseDiffers(this.history.pending.live)) {
          this.pushUndo(this.history.pending);
        }
        if (this.flags.autosave) this.saveCurrent(true);
      }
      this.history.pending = null;
      this.dragging = -1;
      this.canvas.classList.remove('dragging');
    }

    poseDiffers(ref) {
      const now = this.capture();
      for (let i = 0; i < now.length; i++) {
        if (Math.abs(now[i] - ref[i]) > 1e-5) return true;
      }
      return false;
    }

    /* ---- Interaction & Pointer Events ---- */
    initInteraction() {
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());

      // Prevent mobile touch scroll gestures when interacting with the canvas
      this.canvas.addEventListener('touchstart', e => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      this.canvas.addEventListener('touchmove', e => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      this.canvas.addEventListener('pointerdown', e => {
        if (e.cancelable) e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        const p = this.localXY(e);
        this.pointers.set(e.pointerId, p);

        if (this.pointers.size === 2) {
          const pts = [...this.pointers.values()];
          this.mode = 'pinch';
          this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          this.pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          if (this.dragging >= 0) this.endDrag();
          return;
        }
        if (this.pointers.size > 2) return;

        this.last = p;
        const wantPan = (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey);
        if (wantPan) { this.mode = 'pan'; return; }

        const tol = (e.pointerType === 'touch') ? 40 : 22;
        const j = this.pickJoint(p.x, p.y, tol);
        if (j >= 0) {
          if (this.playing) {
            this.stop();
            const L = Math.max(this.seq.length, 1);
            const pos = ((this.playPos % L) + L) % L;
            this.loadKey(this.seq[Math.round(pos) % L]);
            this.notifyToast('In pausa su K' + (this.current + 1));
            this.mode = null;
            return;
          }
          this.mode = 'drag';
          this.beginDrag(j, p.x, p.y);
        } else {
          this.mode = 'orbit';
        }
      });

      this.canvas.addEventListener('pointermove', e => {
        if (e.cancelable && this.pointers.has(e.pointerId)) e.preventDefault();
        const p = this.localXY(e);
        if (!this.pointers.has(e.pointerId)) {
          if (e.pointerType !== 'touch') {
            const j = this.pickJoint(p.x, p.y, 22);
            if (j !== this.hovered) {
              this.hovered = j;
              this.canvas.classList.toggle('overjoint', j >= 0);
            }
          }
          return;
        }
        this.pointers.set(e.pointerId, p);

        if (this.mode === 'pinch' && this.pointers.size >= 2) {
          const pts = [...this.pointers.values()];
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          if (this.pinchDist > 0) {
            this.cam.radius *= THREE.MathUtils.clamp(this.pinchDist / Math.max(d, 1), 0.5, 2);
          }
          this.panBy(mid.x - this.pinchMid.x, mid.y - this.pinchMid.y);
          this.pinchDist = d;
          this.pinchMid = mid;
          this.updateCamera();
          return;
        }

        const dx = p.x - this.last.x, dy = p.y - this.last.y;
        this.last = p;

        if (this.mode === 'drag') {
          this.moveDrag(p.x, p.y);
        } else if (this.mode === 'orbit') {
          this.cam.theta -= dx * 0.0075;
          this.cam.phi   -= dy * 0.0075;
          this.updateCamera();
        } else if (this.mode === 'pan') {
          this.panBy(dx, dy);
          this.updateCamera();
        }
      });

      const onPointerEnd = e => {
        this.pointers.delete(e.pointerId);
        if (this.mode === 'drag') this.endDrag();
        if (this.pointers.size === 1) {
          this.mode = 'orbit';
          this.last = [...this.pointers.values()][0];
        } else if (this.pointers.size === 0) {
          this.mode = null;
        }
      };

      this.canvas.addEventListener('pointerup', onPointerEnd);
      this.canvas.addEventListener('pointercancel', onPointerEnd);
      this.canvas.addEventListener('lostpointercapture', onPointerEnd);

      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        this.cam.radius *= Math.exp(e.deltaY * 0.0011);
        this.updateCamera();
      }, { passive: false });
    }

    initViewerControls() {
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());

      this.canvas.addEventListener('touchstart', e => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      this.canvas.addEventListener('touchmove', e => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      this.canvas.addEventListener('pointerdown', e => {
        if (e.cancelable) e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        const p = this.localXY(e);
        this.pointers.set(e.pointerId, p);
        this.last = p;
        this.mode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit';
      });

      this.canvas.addEventListener('pointermove', e => {
        if (!this.pointers.has(e.pointerId)) return;
        const p = this.localXY(e);
        this.pointers.set(e.pointerId, p);
        const dx = p.x - this.last.x, dy = p.y - this.last.y;
        this.last = p;
        if (this.mode === 'orbit') {
          this.cam.theta -= dx * 0.0075;
          this.cam.phi   -= dy * 0.0075;
          this.updateCamera();
        } else if (this.mode === 'pan') {
          this.panBy(dx, dy);
          this.updateCamera();
        }
      });

      const onEnd = e => {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size === 0) this.mode = null;
      };
      this.canvas.addEventListener('pointerup', onEnd);
      this.canvas.addEventListener('pointercancel', onEnd);
      this.canvas.addEventListener('lostpointercapture', onEnd);

      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        this.cam.radius *= Math.exp(e.deltaY * 0.0011);
        this.updateCamera();
      }, { passive: false });
    }

    /* ---- Keyframes & State Management ---- */
    snapState() {
      return {
        keys: this.keys.map(k => k.pose.slice()),
        current: this.current,
        live: this.capture(),
        dur: this.duration
      };
    }

    restoreState(st) {
      if (!st) return;
      this.keys = st.keys.map(pose => this.makeKey(pose.slice()));
      this.current = THREE.MathUtils.clamp(st.current, 0, Math.max(0, this.keys.length - 1));
      this.apply(st.live);
      this.duration = st.dur || 0.8;
      this.buildSeq();
      this.playPos = this.seqIndexOf(this.current);
      this.refreshGhost();

      if (typeof this.onKeyframeChange === 'function') {
        this.onKeyframeChange();
      }
    }

    pushUndo(state) {
      this.history.undo.push(state || this.snapState());
      if (this.history.undo.length > this.history.limit) this.history.undo.shift();
      this.history.redo.length = 0;
      this.updateHistoryUI();
    }

    undo() {
      if (!this.history.undo.length) return;
      this.stop();
      this.history.redo.push(this.snapState());
      this.restoreState(this.history.undo.pop());
      this.updateHistoryUI();
      this.notifyToast('Annullato');
    }

    redo() {
      if (!this.history.redo.length) return;
      this.stop();
      this.history.undo.push(this.snapState());
      this.restoreState(this.history.redo.pop());
      this.updateHistoryUI();
      this.notifyToast('Ripetuto');
    }

    updateHistoryUI() {
      const u = document.getElementById('undoBtn');
      const r = document.getElementById('redoBtn');
      if (u) u.disabled = !this.history.undo.length;
      if (r) r.disabled = !this.history.redo.length;
    }

    notifyToast(msg) {
      if (typeof this.onToast === 'function') {
        this.onToast(msg);
      }
    }

    saveCurrent(silent) {
      if (!this.keys.length) return;
      const pose = this.capture();
      this.keys[this.current] = this.makeKey(pose);
      if (!silent) this.notifyToast('Posa salvata in K' + (this.current + 1));
      this.refreshGhost();
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    loadKey(i) {
      if (!this.keys.length) return;
      this.current = THREE.MathUtils.clamp(i, 0, this.keys.length - 1);
      this.apply(this.keys[this.current].pose);
      this.playPos = this.seqIndexOf(this.current);
      this.refreshGhost();
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    get curKey() {
      return this.current;
    }

    set curKey(val) {
      this.current = val;
    }

    selectKey(i) {
      this.stop();
      if (i !== this.current) this.pushUndo();
      this.loadKey(i);
    }

    addKey() {
      this.stop();
      this.pushUndo();
      this.keys.splice(this.current + 1, 0, this.makeKey(this.capture()));
      this.current++;
      this.buildSeq();
      this.refreshGhost();
      this.notifyToast('Keyframe K' + (this.current + 1) + ' aggiunto');
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    cloneKey() {
      if (!this.keys.length) return;
      this.stop();
      this.pushUndo();
      this.keys.push(this.makeKey(this.keys[this.current].pose.slice()));
      this.current = this.keys.length - 1;
      this.apply(this.keys[this.current].pose);
      this.buildSeq();
      this.playPos = this.seqIndexOf(this.current);
      this.refreshGhost();
      this.notifyToast('Clonato in K' + this.keys.length);
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    dupKey(idx) {
      const i = (idx !== undefined && idx >= 0 && idx < this.keys.length) ? idx : this.current;
      if (!this.keys.length || i < 0 || i >= this.keys.length) return;
      this.stop();
      this.pushUndo();
      const sourcePose = this.keys[i].pose.slice();
      this.keys.splice(i + 1, 0, this.makeKey(sourcePose));
      this.current = i + 1;
      this.apply(this.keys[this.current].pose);
      this.buildSeq();
      this.playPos = this.seqIndexOf(this.current);
      this.refreshGhost();
      this.notifyToast('Fotogramma K' + (i + 1) + ' duplicato in K' + (this.current + 1));
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    delKey(i) {
      this.deleteKey(i);
    }

    deleteKey(i) {
      if (this.keys.length <= 2) {
        this.notifyToast('Servono almeno 2 keyframe');
        return;
      }
      this.stop();
      this.pushUndo();
      this.keys.splice(i, 1);
      if (this.current >= this.keys.length) this.current = this.keys.length - 1;
      this.apply(this.keys[this.current].pose);
      this.buildSeq();
      this.refreshGhost();
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    reorderKeys(from, to) {
      this.pushUndo();
      const sel = this.keys[this.current];
      this.keys.splice(to, 0, this.keys.splice(from, 1)[0]);
      this.current = this.keys.indexOf(sel);
      this.buildSeq();
      this.playPos = this.seqIndexOf(this.current);
      this.refreshGhost();
      this.notifyToast('Spostato in K' + (to + 1));
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    /* ---- Sequence & Playback ---- */
    buildSeq() {
      const n = this.keys.length;
      this.seq = [];
      for (let i = 0; i < n; i++) this.seq.push(i);
      for (let i = n - 2; i > 0; i--) this.seq.push(i);
      if (this.seq.length < 2) this.seq = [0, 0];
    }

    seqIndexOf(k) {
      const i = this.seq.indexOf(k);
      return i < 0 ? 0 : i;
    }

    sampleAt(pos) {
      const L = this.seq.length;
      if (L < 2 || !this.keys.length) return { i: 0, t: 0, p: 0 };
      let p = ((pos % L) + L) % L;
      const i = Math.floor(p), t = p - i;
      let A = this.keys[this.seq[i]], B = this.keys[this.seq[(i + 1) % L]];
      if (A && (!A.rig || !A.rig.root)) {
        A = this.keys[this.seq[i]] = this.makeKey(A.pose || A);
      }
      if (B && (!B.rig || !B.rig.root)) {
        B = this.keys[this.seq[(i + 1) % L]] = this.makeKey(B.pose || B);
      }
      if (A && B && A.rig && B.rig) {
        this.blend(A.rig, B.rig, ease(t));
      }
      return { i, t, p };
    }

    stepPlayback(dt) {
      if (!this.playing || this.keys.length < 2) return;
      const prev = this.playPos;
      this.playPos += dt / Math.max(this.duration, 0.05);
      const L = this.seq.length;
      if (Math.floor(this.playPos / L) > Math.floor(prev / L)) {
        this.reps++;
        const repEl = document.getElementById('repCount');
        if (repEl) repEl.textContent = this.reps;
      }
      const s = this.sampleAt(this.playPos);
      const poseVal = document.getElementById('poseVal');
      if (poseVal && this.seq[s.i] !== undefined) {
        poseVal.textContent = 'K' + (this.seq[s.i] + 1);
      }

      if (typeof this.onPlaybackStep === 'function') {
        this.onPlaybackStep(this.playPos, L, s);
      }
    }

    play() {
      this.buildSeq();
      if (this.keys.length < 2) {
        if (this.isEditor) {
          this.notifyToast('Aggiungi un secondo keyframe');
        }
        if (this.keys[0]) this.apply(this.keys[0].pose);
        return;
      }
      this.playing = true;
      this.ghost.visible = false;
      const btn = document.getElementById('playBtn');
      if (btn) btn.classList.add('on');
      const icon = document.getElementById('playIcon');
      if (icon) icon.textContent = 'pause';
      const label = document.getElementById('playLabel');
      if (label) label.textContent = 'Pausa';
    }

    playAnimation() {
      this.play();
    }

    stop() {
      if (!this.playing) return;
      this.playing = false;
      const btn = document.getElementById('playBtn');
      if (btn) btn.classList.remove('on');
      const icon = document.getElementById('playIcon');
      if (icon) icon.textContent = 'play_arrow';
      const label = document.getElementById('playLabel');
      if (label) label.textContent = 'Play';
      this.refreshGhost();
    }

    stopAnimation() {
      this.stop();
    }

    togglePlay() {
      if (this.playing) this.stop();
      else this.play();
    }

    setKeyframes(keyframesList, duration) {
      if (!keyframesList || !keyframesList.length) return;
      this.keys = keyframesList.map(item => this.makeKey(item));
      if (duration) this.duration = duration;
      this.current = 0;
      this.playPos = 0;
      this.reps = 0;
      if (this.keys[0] && this.keys[0].pose) this.apply(this.keys[0].pose);
      this.buildSeq();
      this.refreshGhost();
    }

    getKeyframes() {
      return this.keys.map(k => Array.from(k.pose));
    }

    applyPose(pose) {
      this.apply(pose);
    }

    applyBase(id) {
      this.stop();
      this.pushUndo();
      this.poseFrom(BASE_POSES[id] || {}, id === 'stand');
      if (this.flags.autosave) this.saveCurrent(true);
      this.refreshGhost();
      const labels = {
        stand: 'In piedi',
        supine: 'Pancia in su',
        prone: 'Pancia in giù',
        side_right: 'Laterale destro',
        side_left: 'Laterale sinistro'
      };
      const label = labels[id] || 'Posa base';
      this.notifyToast(label + (this.flags.autosave ? ' → K' + (this.current + 1) : ''));
      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    loadPreset(id) {
      this.stop();
      if (this.keys.length) this.pushUndo();
      const list = PRESETS[id] || PRESETS.squat;
      this.keys = list.map(m => this.makeKey(this.poseFrom(m, id === 'squat' || id === 'lunge')));
      this.current = 0;
      this.playPos = 0;
      this.reps = 0;
      this.duration = PRESET_DUR[id] || 0.8;
      this.apply(this.keys[0].pose);
      this.buildSeq();
      this.refreshGhost();
      this.updateHistoryUI();

      const durEl = document.getElementById('dur');
      if (durEl) durEl.value = this.duration;
      const durValEl = document.getElementById('durVal');
      if (durValEl) durValEl.textContent = this.duration.toFixed(2) + 's';
      const tempoValEl = document.getElementById('tempoVal');
      if (tempoValEl) tempoValEl.textContent = Math.round(60 / (this.duration * 2));
      const repEl = document.getElementById('repCount');
      if (repEl) repEl.textContent = '0';

      if (typeof this.onKeyframeChange === 'function') this.onKeyframeChange();
    }

    tick(now) {
      const dt = Math.min((now - this.prevT) / 1000, 0.05);
      this.prevT = now;
      this.stepPlayback(dt);
      this.refresh();
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.tick);
    }

    destroy() {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (this.boundResize) window.removeEventListener('resize', this.boundResize);
    }
  }

  // Export
  export { Mannequin, JOINT_DEFS, PRESETS, BASE_POSES };
export default Mannequin;
