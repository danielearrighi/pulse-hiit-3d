/**
 * 3D Stylized Line-Art Mannequin Engine
 * Direct Joint Distance-Preserving Kinematics
 * - Standing mannequin is 100% upright and anatomically correct
 * - Dragging a joint sphere (e.g. Knee, Elbow, Wrist, Ankle) moves THAT SPHERE around its parent at exact fixed bone distance
 * - Bone distances (Hip-to-Knee = 0.40m, Knee-to-Ankle = 0.38m, Shoulder-to-Elbow = 0.30m, Elbow-to-Wrist = 0.28m, etc.) are 100% IMMUTABLE
 * - Other unrelated spheres DO NOT MOVE!
 */

class Mannequin {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.enableAnchors = options.enableAnchors !== false;
    this.onPoseChange = options.onPoseChange || null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d14);

    const width = this.canvas.clientWidth || 600;
    const height = this.canvas.clientHeight || 450;

    // Orbit Camera Setup
    this.cameraDistance = 3.8;
    this.cameraAngleX = 0.25;
    this.cameraAngleY = 0.15;
    this.cameraTarget = new THREE.Vector3(0, 0.85, 0);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.setupLighting();
    this.buildSkeletonNodesAndLines();
    this.buildFloorGrid();

    if (this.enableAnchors) {
      this.setupAxisGizmo();
      this.setupInteractionEvents();
    }

    // Default neutral pose
    this.currentPose = this.getDefaultPose();
    this.applyPose(this.currentPose);

    // Animation state
    this.keyframes = [];
    this.isAnimating = false;
    this.animTime = 0;
    this.animSpeed = 1.2;
    this.clock = new THREE.Clock();

    // Resize listener
    window.addEventListener('resize', () => this.onResize());

    // Render loop
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  updateCameraPosition() {
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraAngleY);
    const z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
    keyLight.position.set(3, 6, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff2a5f, 0.8);
    fillLight.position.set(-4, 3, -4);
    this.scene.add(fillLight);
  }

  buildFloorGrid() {
    const grid = new THREE.GridHelper(10, 20, 0x00f2fe, 0x1c273c);
    grid.position.y = 0.0;
    this.scene.add(grid);

    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    shadowGeo.rotateX(-Math.PI / 2);
    shadowGeo.translate(0, 0.001, 0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4
    });
    this.floorShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.floorShadowMesh);
  }

  getDefaultPose() {
    return {
      pelvis: { x: 0, y: 0, z: 0 },
      chest: { x: 0, y: 0, z: 0 },
      head: { x: 0, y: 0, z: 0 },
      lShoulder: { x: 0, y: 0, z: 0 },
      rShoulder: { x: 0, y: 0, z: 0 },
      lElbow: { x: 0, y: 0, z: 0 },
      rElbow: { x: 0, y: 0, z: 0 },
      lWrist: { x: 0, y: 0, z: 0 },
      rWrist: { x: 0, y: 0, z: 0 },
      lHip: { x: 0, y: 0, z: 0 },
      rHip: { x: 0, y: 0, z: 0 },
      lKnee: { x: 0, y: 0, z: 0 },
      rKnee: { x: 0, y: 0, z: 0 },
      lAnkle: { x: 0, y: 0, z: 0 },
      rAnkle: { x: 0, y: 0, z: 0 }
    };
  }

  // --- BUILD SKELETON SPHERES & CONNECTING LINES ---
  buildSkeletonNodesAndLines() {
    this.nodesGroup = new THREE.Group();
    this.scene.add(this.nodesGroup);

    // Parent mapping for fixed-length distance constraints
    this.jointParentMap = {
      chest: 'pelvis',
      head: 'chest',
      lShoulder: 'chest',
      rShoulder: 'chest',
      lElbow: 'lShoulder',
      lWrist: 'lElbow',
      rElbow: 'rShoulder',
      rWrist: 'rElbow',
      lHip: 'pelvis',
      rHip: 'pelvis',
      lKnee: 'lHip',
      lAnkle: 'lKnee',
      rKnee: 'rHip',
      rAnkle: 'rKnee'
    };

    // Child descendant tree map
    this.nodeDescendantsMap = {
      pelvis: ['chest', 'head', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow', 'lWrist', 'rWrist', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle'],
      chest: ['head', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow', 'lWrist', 'rWrist'],
      head: [],
      lShoulder: ['lElbow', 'lWrist'],
      rShoulder: ['rElbow', 'rWrist'],
      lElbow: ['lWrist'],
      rElbow: ['rWrist'],
      lWrist: [],
      lHip: ['lKnee', 'lAnkle'],
      rHip: ['rKnee', 'rAnkle'],
      lKnee: ['lAnkle'],
      rKnee: ['rAnkle'],
      lAnkle: [],
      rAnkle: []
    };

    // Upright Default Base Standing Positions
    this.baseNodePositions = {
      pelvis: new THREE.Vector3(0, 0.86, 0),
      chest: new THREE.Vector3(0, 1.32, 0),     // UP (+Y) from pelvis (0.46m)
      head: new THREE.Vector3(0, 1.55, 0),      // UP (+Y) from chest (0.23m)
      lShoulder: new THREE.Vector3(0.24, 1.30, 0),
      rShoulder: new THREE.Vector3(-0.24, 1.30, 0),
      lElbow: new THREE.Vector3(0.32, 1.00, 0),   // DOWN (-Y) from lShoulder (0.30m)
      rElbow: new THREE.Vector3(-0.32, 1.00, 0),   // DOWN (-Y) from rShoulder (0.30m)
      lWrist: new THREE.Vector3(0.35, 0.72, 0),   // DOWN (-Y) from lElbow (0.28m)
      rWrist: new THREE.Vector3(-0.35, 0.72, 0),   // DOWN (-Y) from rElbow (0.28m)
      lHip: new THREE.Vector3(0.14, 0.80, 0),
      rHip: new THREE.Vector3(-0.14, 0.80, 0),
      lKnee: new THREE.Vector3(0.14, 0.40, 0),    // DOWN (-Y) from lHip (0.40m)
      rKnee: new THREE.Vector3(-0.14, 0.40, 0),    // DOWN (-Y) from rHip (0.40m)
      lAnkle: new THREE.Vector3(0.14, 0.02, 0),   // DOWN (-Y) from lKnee (0.38m)
      rAnkle: new THREE.Vector3(-0.14, 0.02, 0)    // DOWN (-Y) from rKnee (0.38m)
    };

    // Calculate fixed rest bone lengths between connected parent-child joints
    this.boneRestLengths = {};
    Object.keys(this.jointParentMap).forEach(child => {
      const parent = this.jointParentMap[child];
      const p1 = this.baseNodePositions[parent];
      const p2 = this.baseNodePositions[child];
      this.boneRestLengths[`${parent}-${child}`] = p1.distanceTo(p2);
    });

    // Node Materials
    this.matNodeNormal = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    this.matNodeSelected = new THREE.MeshStandardMaterial({
      color: 0xffc107,
      emissive: 0xffc107,
      emissiveIntensity: 1.0,
      roughness: 0.1
    });

    this.matNodeHead = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });

    this.nodeMeshes = {};
    const geoNormal = new THREE.SphereGeometry(0.05, 16, 16);
    const geoHead = new THREE.SphereGeometry(0.11, 18, 18);

    Object.keys(this.baseNodePositions).forEach(nodeName => {
      const isHead = (nodeName === 'head');
      const geo = isHead ? geoHead : geoNormal;
      const mat = isHead ? this.matNodeHead : this.matNodeNormal;
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.userData = { nodeName: nodeName };
      mesh.position.copy(this.baseNodePositions[nodeName]);
      this.nodesGroup.add(mesh);
      this.nodeMeshes[nodeName] = mesh;
    });

    // Line Materials
    this.matSpineLine = new THREE.LineBasicMaterial({ color: 0xff2a5f, linewidth: 3 });
    this.matFrontLine = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 3 });
    this.matLimbLine = new THREE.LineBasicMaterial({ color: 0xe2e8f0, linewidth: 2 });

    this.linesGroup = new THREE.Group();
    this.scene.add(this.linesGroup);

    this.lineSegmentPairs = [
      { from: 'pelvis', to: 'chest', mat: this.matSpineLine },
      { from: 'chest', to: 'head', mat: this.matFrontLine },
      { from: 'chest', to: 'lShoulder', mat: this.matFrontLine },
      { from: 'chest', to: 'rShoulder', mat: this.matFrontLine },
      { from: 'lShoulder', to: 'lElbow', mat: this.matLimbLine },
      { from: 'lElbow', to: 'lWrist', mat: this.matLimbLine },
      { from: 'rShoulder', to: 'rElbow', mat: this.matLimbLine },
      { from: 'rElbow', to: 'rWrist', mat: this.matLimbLine },
      { from: 'pelvis', to: 'lHip', mat: this.matSpineLine },
      { from: 'pelvis', to: 'rHip', mat: this.matSpineLine },
      { from: 'lHip', to: 'lKnee', mat: this.matLimbLine },
      { from: 'lKnee', to: 'lAnkle', mat: this.matLimbLine },
      { from: 'rHip', to: 'rKnee', mat: this.matLimbLine },
      { from: 'rKnee', to: 'rAnkle', mat: this.matLimbLine }
    ];

    this.lineObjects = [];
    this.lineSegmentPairs.forEach(pair => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.Line(geo, pair.mat);
      line.userData = { fromName: pair.from, toName: pair.to };
      this.linesGroup.add(line);
      this.lineObjects.push(line);
    });
  }

  updateLinePositions() {
    if (!this.lineObjects) return;
    this.lineObjects.forEach(line => {
      const fromName = line.userData.fromName;
      const toName = line.userData.toName;

      const fromMesh = this.nodeMeshes[fromName];
      const toMesh = this.nodeMeshes[toName];

      if (fromMesh && toMesh) {
        const posAttr = line.geometry.attributes.position;
        posAttr.setXYZ(0, fromMesh.position.x, fromMesh.position.y, fromMesh.position.z);
        posAttr.setXYZ(1, toMesh.position.x, toMesh.position.y, toMesh.position.z);
        posAttr.needsUpdate = true;
      }
    });

    if (this.floorShadowMesh && this.nodeMeshes.pelvis) {
      this.floorShadowMesh.position.x = this.nodeMeshes.pelvis.position.x;
      this.floorShadowMesh.position.z = this.nodeMeshes.pelvis.position.z;
    }
  }

  // --- COMPACT SLEEK 3D AXIS ARROW TRANSFORM GIZMO ---
  setupAxisGizmo() {
    this.gizmoGroup = new THREE.Group();
    this.gizmoGroup.visible = false;
    this.scene.add(this.gizmoGroup);

    const createAxisArrow = (axisName, colorHex, rotationEuler, positionVector) => {
      const arrowGroup = new THREE.Group();
      arrowGroup.userData = { axis: axisName };

      const mat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });

      // Sleek compact shaft cylinder
      const shaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12);
      shaftGeo.rotateX(rotationEuler.x);
      shaftGeo.rotateY(rotationEuler.y);
      shaftGeo.rotateZ(rotationEuler.z);
      const shaftMesh = new THREE.Mesh(shaftGeo, mat);
      shaftMesh.userData = { axis: axisName };

      // Sleek compact tip cone
      const coneGeo = new THREE.ConeGeometry(0.025, 0.06, 12);
      coneGeo.rotateX(rotationEuler.x);
      coneGeo.rotateY(rotationEuler.y);
      coneGeo.rotateZ(rotationEuler.z);
      coneGeo.translate(positionVector.x, positionVector.y, positionVector.z);
      const coneMesh = new THREE.Mesh(coneGeo, mat);
      coneMesh.userData = { axis: axisName };

      arrowGroup.add(shaftMesh);
      arrowGroup.add(coneMesh);
      this.gizmoGroup.add(arrowGroup);
    };

    // Red X Arrow (Points Right +X)
    createAxisArrow('x', 0xff3b30, new THREE.Euler(0, 0, -Math.PI / 2), new THREE.Vector3(0.10, 0, 0));

    // Green Y Arrow (Points Up +Y)
    createAxisArrow('y', 0x00e676, new THREE.Euler(0, 0, 0), new THREE.Vector3(0, 0.10, 0));

    // Blue Z Arrow (Points Forward +Z)
    createAxisArrow('z', 0x00f2fe, new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(0, 0, 0.10));
  }

  setupInteractionEvents() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.selectedNodeName = null;
    this.draggedAxis = null;
    this.dragStartCoords = { x: 0, y: 0 };
    this.initialNodePositionsOnDrag = null;

    this.isOrbiting = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e));
    window.addEventListener('mouseup', (e) => this.onPointerUp(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.onPointerUp(e));

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(1.8, Math.min(7.0, this.cameraDistance + e.deltaY * 0.004));
      this.updateCameraPosition();
    }, { passive: false });
  }

  getCanvasRelativeCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
      rawX: clientX,
      rawY: clientY
    };
  }

  onPointerDown(e) {
    const coords = this.getCanvasRelativeCoords(e);
    this.mouse.x = coords.x;
    this.mouse.y = coords.y;

    if (e.button === 2) {
      this.isOrbiting = true;
      this.previousMousePosition = { x: coords.rawX, y: coords.rawY };
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check if clicking on an active 3D Axis Arrow (Red X, Green Y, Blue Z)
    if (this.gizmoGroup.visible) {
      this.gizmoGroup.updateMatrixWorld(true);
      const gizmoHits = this.raycaster.intersectObject(this.gizmoGroup, true);
      if (gizmoHits.length > 0) {
        let hitObj = gizmoHits[0].object;
        let axis = hitObj.userData.axis || (hitObj.parent && hitObj.parent.userData.axis);
        if (axis) {
          this.draggedAxis = axis;
          this.dragStartCoords = { x: coords.rawX, y: coords.rawY };
          
          // Record initial 3D positions for target node AND all descendant child nodes
          this.initialNodePositionsOnDrag = {};
          const nodesToStore = [this.selectedNodeName, ...(this.nodeDescendantsMap[this.selectedNodeName] || [])];
          nodesToStore.forEach(name => {
            if (this.nodeMeshes[name]) {
              this.initialNodePositionsOnDrag[name] = this.nodeMeshes[name].position.clone();
            }
          });

          this.stopAnimation();
          return;
        }
      }
    }

    // 2. Check if clicking on a Joint Sphere to SELECT it
    const nodeMeshList = Object.values(this.nodeMeshes);
    const nodeHits = this.raycaster.intersectObjects(nodeMeshList);

    if (nodeHits.length > 0) {
      const hitMesh = nodeHits[0].object;
      const clickedName = hitMesh.userData.nodeName;

      // Deselect previous
      if (this.selectedNodeName && this.nodeMeshes[this.selectedNodeName]) {
        const prevMesh = this.nodeMeshes[this.selectedNodeName];
        prevMesh.material.color.setHex(this.selectedNodeName === 'head' ? 0xffffff : 0x00f2fe);
      }

      this.selectedNodeName = clickedName;
      hitMesh.material.color.setHex(0xffc107); // Highlight selected sphere in bright gold

      // Position 3D Axis Gizmo at selected sphere's exact 3D position
      this.gizmoGroup.position.copy(hitMesh.position);
      this.gizmoGroup.visible = true;
      this.gizmoGroup.updateMatrixWorld(true);

      this.stopAnimation();
      return;
    }

    // 3. Clicked empty background -> Orbit camera
    this.isOrbiting = true;
    this.previousMousePosition = { x: coords.rawX, y: coords.rawY };
  }

  onTouchStart(e) {
    if (e.touches.length >= 2) {
      e.preventDefault();
      this.isOrbiting = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return;
    }
    const fakeEvent = {
      button: 0,
      touches: e.touches,
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY
    };
    this.onPointerDown(fakeEvent);
  }

  onPointerMove(e) {
    const coords = this.getCanvasRelativeCoords(e);

    if (this.isOrbiting) {
      const deltaX = coords.rawX - this.previousMousePosition.x;
      const deltaY = coords.rawY - this.previousMousePosition.y;

      this.cameraAngleX -= deltaX * 0.008;
      this.cameraAngleY = Math.max(-0.4, Math.min(1.2, this.cameraAngleY + deltaY * 0.008));

      this.previousMousePosition = { x: coords.rawX, y: coords.rawY };
      this.updateCameraPosition();
      return;
    }

    // Dragging active Axis Arrow -> Moves Target Sphere around Parent at IMMUTABLE Bone Length!
    if (this.draggedAxis && this.selectedNodeName && this.initialNodePositionsOnDrag) {
      const deltaScreenX = coords.rawX - this.dragStartCoords.x;
      const deltaScreenY = coords.rawY - this.dragStartCoords.y;

      const cosCam = Math.cos(this.cameraAngleX);
      const sinCam = Math.sin(this.cameraAngleX);

      const sens = 0.003;
      const dragDisp = new THREE.Vector3(0, 0, 0);

      if (this.draggedAxis === 'x') {
        const dx = deltaScreenX * cosCam - deltaScreenY * sinCam * 0.3;
        dragDisp.x = dx * sens;
      }
      else if (this.draggedAxis === 'y') {
        dragDisp.y = -deltaScreenY * sens;
      }
      else if (this.draggedAxis === 'z') {
        const dz = deltaScreenY * cosCam + deltaScreenX * sinCam;
        dragDisp.z = -dz * sens;
      }

      const initTargetPos = this.initialNodePositionsOnDrag[this.selectedNodeName];
      const parentName = this.jointParentMap[this.selectedNodeName];

      if (this.selectedNodeName === 'pelvis' || !parentName) {
        // Pelvis (Root): Translates entire skeleton as a rigid body
        const nodesToMove = [this.selectedNodeName, ...(this.nodeDescendantsMap[this.selectedNodeName] || [])];
        nodesToMove.forEach(nodeName => {
          const initPos = this.initialNodePositionsOnDrag[nodeName];
          const mesh = this.nodeMeshes[nodeName];
          if (initPos && mesh) {
            const newPos = initPos.clone().add(dragDisp);
            mesh.position.copy(newPos);

            const basePos = this.baseNodePositions[nodeName];
            this.currentPose[nodeName] = {
              x: Math.round((newPos.x - basePos.x) * 1000) / 1000,
              y: Math.round((newPos.y - basePos.y) * 1000) / 1000,
              z: Math.round((newPos.z - basePos.z) * 1000) / 1000
            };
          }
        });
      } else {
        // Target Sphere rotates around Parent at EXACT 100% IMMUTABLE Bone Length!
        const parentMesh = this.nodeMeshes[parentName];
        const parentPos = parentMesh.position.clone();
        const boneKey = `${parentName}-${this.selectedNodeName}`;
        const restLength = this.boneRestLengths[boneKey] || 0.40;

        // Unconstrained trial position
        const trialPos = initTargetPos.clone().add(dragDisp);

        // Constrain distance between Parent and Target Sphere to EXACT restLength
        const dir = trialPos.clone().sub(parentPos);
        if (dir.lengthSq() < 0.0001) dir.set(0, -1, 0);
        dir.normalize();

        const constrainedTargetPos = parentPos.clone().add(dir.multiplyScalar(restLength));
        this.nodeMeshes[this.selectedNodeName].position.copy(constrainedTargetPos);

        const baseTargetPos = this.baseNodePositions[this.selectedNodeName];
        this.currentPose[this.selectedNodeName] = {
          x: Math.round((constrainedTargetPos.x - baseTargetPos.x) * 1000) / 1000,
          y: Math.round((constrainedTargetPos.y - baseTargetPos.y) * 1000) / 1000,
          z: Math.round((constrainedTargetPos.z - baseTargetPos.z) * 1000) / 1000
        };

        // Shift child descendant spheres by the exact same rotation delta
        const rotDisp = constrainedTargetPos.clone().sub(initTargetPos);
        const childNodes = this.nodeDescendantsMap[this.selectedNodeName] || [];

        childNodes.forEach(childName => {
          const initChildPos = this.initialNodePositionsOnDrag[childName];
          const childMesh = this.nodeMeshes[childName];
          if (initChildPos && childMesh) {
            const newChildPos = initChildPos.clone().add(rotDisp);
            childMesh.position.copy(newChildPos);

            const baseChildPos = this.baseNodePositions[childName];
            this.currentPose[childName] = {
              x: Math.round((newChildPos.x - baseChildPos.x) * 1000) / 1000,
              y: Math.round((newChildPos.y - baseChildPos.y) * 1000) / 1000,
              z: Math.round((newChildPos.z - baseChildPos.z) * 1000) / 1000
            };
          }
        });
      }

      // Gizmo stays attached to the dragged sphere
      if (this.nodeMeshes[this.selectedNodeName]) {
        this.gizmoGroup.position.copy(this.nodeMeshes[this.selectedNodeName].position);
      }

      this.updateLinePositions();

      if (typeof this.onPoseChange === 'function') {
        this.onPoseChange(this.currentPose);
      }
    }
  }

  onTouchMove(e) {
    if (this.isOrbiting && e.touches.length >= 2) {
      e.preventDefault();
      const coords = { rawX: e.touches[0].clientX, rawY: e.touches[0].clientY };
      const deltaX = coords.rawX - this.previousMousePosition.x;
      const deltaY = coords.rawY - this.previousMousePosition.y;

      this.cameraAngleX -= deltaX * 0.008;
      this.cameraAngleY = Math.max(-0.4, Math.min(1.2, this.cameraAngleY + deltaY * 0.008));

      this.previousMousePosition = coords;
      this.updateCameraPosition();
      return;
    }

    const fakeEvent = {
      touches: e.touches,
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY
    };
    this.onPointerMove(fakeEvent);
  }

  onPointerUp() {
    this.draggedAxis = null;
    this.isOrbiting = false;
  }

  applyPose(pose) {
    this.currentPose = { ...pose };

    // Set base positions + offset for each node
    Object.keys(this.baseNodePositions).forEach(nodeName => {
      const mesh = this.nodeMeshes[nodeName];
      if (!mesh) return;

      const basePos = this.baseNodePositions[nodeName];
      const offset = pose[nodeName] || { x: 0, y: 0, z: 0 };

      mesh.position.set(
        basePos.x + (offset.x || 0),
        basePos.y + (offset.y || 0),
        basePos.z + (offset.z || 0)
      );
    });

    if (this.gizmoGroup && this.selectedNodeName && this.nodeMeshes[this.selectedNodeName]) {
      this.gizmoGroup.position.copy(this.nodeMeshes[this.selectedNodeName].position);
    }

    this.updateLinePositions();
  }

  setKeyframes(keyframesList) {
    this.keyframes = keyframesList || [];
    this.animTime = 0;
  }

  playAnimation() {
    if (this.keyframes && this.keyframes.length > 0) {
      this.isAnimating = true;
      this.animTime = 0;
      this.clock.start();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  interpolatePoses(p1, p2, t) {
    const smoothT = t * t * (3 - 2 * t);
    const interp = {};
    const nodes = Object.keys(this.baseNodePositions);

    nodes.forEach(n => {
      const o1 = p1[n] || { x: 0, y: 0, z: 0 };
      const o2 = p2[n] || { x: 0, y: 0, z: 0 };
      interp[n] = {
        x: (o1.x || 0) + ((o2.x || 0) - (o1.x || 0)) * smoothT,
        y: (o1.y || 0) + ((o2.y || 0) - (o1.y || 0)) * smoothT,
        z: (o1.z || 0) + ((o2.z || 0) - (o1.z || 0)) * smoothT
      };
    });
    return interp;
  }

  updateAnimation(delta) {
    if (!this.isAnimating || !this.keyframes || this.keyframes.length === 0) return;

    if (this.keyframes.length === 1) {
      this.applyPose(this.keyframes[0]);
      return;
    }

    this.animTime += delta;
    const numFrames = this.keyframes.length;
    const totalDuration = numFrames * this.animSpeed;
    const cycleTime = this.animTime % totalDuration;

    const segmentDuration = this.animSpeed;
    const segmentIndex = Math.floor(cycleTime / segmentDuration);
    const nextSegmentIndex = (segmentIndex + 1) % numFrames;
    const segmentProgress = (cycleTime % segmentDuration) / segmentDuration;

    const pose1 = this.keyframes[segmentIndex];
    const pose2 = this.keyframes[nextSegmentIndex];

    const currentInterpolatedPose = this.interpolatePoses(pose1, pose2, segmentProgress);
    this.applyPose(currentInterpolatedPose);
  }

  onResize() {
    const width = this.canvas.parentElement.clientWidth || 600;
    const height = this.canvas.parentElement.clientHeight || 450;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    requestAnimationFrame(this.render);

    const delta = this.clock.getDelta();
    if (this.isAnimating) {
      this.updateAnimation(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Mannequin = Mannequin;
