import * as THREE from 'three';
import {
  RobotArmJointAngles,
  RobotArmDimensions,
  DEFAULT_ARM_DIMENSIONS,
  DEFAULT_JOINT_LIMITS,
  JointLimit,
  ForwardKinematicsResult,
  calculateForwardKinematics,
} from '../robot/arm/RobotArmModel';

export class RobotArm3DViewport {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Hierarchical Transformation Tree Groups
  private rootArmGroup: THREE.Group;
  private baseTurntableGroup!: THREE.Group;
  private shoulderJointGroup!: THREE.Group;
  private upperArmGroup!: THREE.Group;
  private elbowJointGroup!: THREE.Group;
  private forearmGroup!: THREE.Group;
  private wristJointGroup!: THREE.Group;
  private handGroup!: THREE.Group;
  private leftJawMesh!: THREE.Mesh;
  private rightJawMesh!: THREE.Mesh;
  private endEffectorTip!: THREE.Object3D;

  // Joint Highlight Materials
  private jointMeshes: Map<keyof RobotArmJointAngles, THREE.Mesh[]> = new Map();
  private selectedJoint: keyof RobotArmJointAngles | null = null;

  // Mechanical Dimensions
  private dimensions: RobotArmDimensions;
  private jointLimits: Record<keyof RobotArmJointAngles, JointLimit>;

  // Kinematic state
  private currentAngles: RobotArmJointAngles;
  private targetAngles: RobotArmJointAngles;

  // Controls & Camera
  private isDragging = false;
  private isPanning = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 0.65;
  private cameraAzimuth = 0.8;
  private cameraElevation = 0.5;
  private cameraTarget = new THREE.Vector3(0, 0.16, 0);

  // Lifecycle
  private animFrameId: number | null = null;
  private lastTime = 0;
  private resizeObserver: ResizeObserver | null = null;
  private onAnglesChangedCallback?: (angles: RobotArmJointAngles) => void;

  // Event Handlers for Orbit Navigation
  private onPointerDownHandler?: (e: MouseEvent) => void;
  private onPointerMoveHandler?: (e: MouseEvent) => void;
  private onPointerUpHandler?: () => void;
  private onWheelHandler?: (e: WheelEvent) => void;
  private onContextMenuHandler?: (e: MouseEvent) => void;
  private onTouchStartHandler?: (e: TouchEvent) => void;
  private onTouchMoveHandler?: (e: TouchEvent) => void;
  private onTouchEndHandler?: () => void;
  private initialTouchDist = 0;

  constructor(
    container: HTMLElement,
    dimensions: RobotArmDimensions = DEFAULT_ARM_DIMENSIONS,
    jointLimits: Record<keyof RobotArmJointAngles, JointLimit> = DEFAULT_JOINT_LIMITS,
    initialAngles?: RobotArmJointAngles
  ) {
    this.container = container;
    this.dimensions = { ...dimensions };
    this.jointLimits = { ...jointLimits };
    this.currentAngles = initialAngles
      ? { ...initialAngles }
      : { base: 90, shoulder: 60, elbow: 75, wrist: 90, gripper: 20 };
    this.targetAngles = { ...this.currentAngles };

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || container.clientWidth || 400, 100);
    const height = Math.max(rect.height || container.clientHeight || 300, 100);

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0d14');

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.02, 30);
    this.updateCameraPosition();

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.outline = 'none';
    this.renderer.domElement.tabIndex = 0;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Ground Plane and Precision Engineering Grid
    this.setupGround();

    // 6. Build Hierarchical Articulated Robot Arm
    this.rootArmGroup = new THREE.Group();
    this.rootArmGroup.name = 'RobotArm_Root';
    this.scene.add(this.rootArmGroup);
    this.buildRobotArmHierarchy();

    // Apply initial angles to the hierarchy
    this.applyJointAnglesToScene(this.currentAngles);

    // 7. Event Listeners & Orbit Navigation
    this.setupOrbitControls();

    // 8. Resize Observer
    this.setupResizeObserver();

    // 9. Start Render / Animation Loop
    this.startLoop();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1.5, 3.0, 2.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0003;
    this.scene.add(keyLight);

    // Cyan Rim / Back Light
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    rimLight.position.set(-2.0, 1.5, -1.8);
    this.scene.add(rimLight);

    // Soft Warm Fill Light
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    fillLight.position.set(0, -1.0, 2.0);
    this.scene.add(fillLight);
  }

  private setupGround() {
    // Floor circular reference grid
    const grid = new THREE.GridHelper(1.2, 24, 0x00f0ff, 0x1f2b3e);
    grid.position.y = 0.0005;
    this.scene.add(grid);

    // Ground circular work-table
    const floorGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.015, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111624,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.0075;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Origin coordinate axes marker (RGB)
    const axesHelper = new THREE.AxesHelper(0.08);
    axesHelper.position.set(0, 0.001, 0);
    this.scene.add(axesHelper);
  }

  /**
   * Constructs the articulated 5-axis kinematic tree using Three.js Group objects.
   * Scales: Internal math uses meters (1 mm = 0.001 m).
   */
  private buildRobotArmHierarchy() {
    const scale = 0.001; // mm to meters
    const baseH = this.dimensions.baseHeight * scale;
    const upperL = this.dimensions.upperArmLength * scale;
    const foreL = this.dimensions.forearmLength * scale;
    const wristL = this.dimensions.wristLength * scale;

    // Common Materials
    const metalBracketMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const anodizedAluminumMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // MagicSmoke Cyan/Blue
      metalness: 0.7,
      roughness: 0.35,
    });
    const servoCaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.3,
      roughness: 0.6,
    });
    const brassHardwareMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });
    const gripperFingerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });

    // -------------------------------------------------------------
    // LINK 0: STATIONARY BASE MOUNT (Fixed to ground)
    // -------------------------------------------------------------
    const basePlateGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.012, 32);
    const basePlate = new THREE.Mesh(basePlateGeo, metalBracketMat);
    basePlate.position.y = 0.006;
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    this.rootArmGroup.add(basePlate);

    // Rubber mounting feet
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const footGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16);
      const foot = new THREE.Mesh(footGeo, servoCaseMat);
      foot.position.set(0.05 * Math.cos(angle), 0.002, 0.05 * Math.sin(angle));
      this.rootArmGroup.add(foot);
    }

    // -------------------------------------------------------------
    // LINK 1: BASE TURNTABLE GROUP (Rotates around Y - Pan/Yaw)
    // -------------------------------------------------------------
    this.baseTurntableGroup = new THREE.Group();
    this.baseTurntableGroup.name = 'Joint_Base';
    this.baseTurntableGroup.position.set(0, 0.012, 0);
    this.rootArmGroup.add(this.baseTurntableGroup);

    // Turntable rotating disc
    const turntableGeo = new THREE.CylinderGeometry(0.052, 0.055, 0.014, 32);
    const turntableMesh = new THREE.Mesh(turntableGeo, anodizedAluminumMat);
    turntableMesh.position.y = 0.007;
    turntableMesh.castShadow = true;
    this.baseTurntableGroup.add(turntableMesh);
    this.registerJointMesh('base', turntableMesh);

    // MG996R Base Servo Box inside base
    const baseServoGeo = new THREE.BoxGeometry(0.042, 0.022, 0.042);
    const baseServo = new THREE.Mesh(baseServoGeo, servoCaseMat);
    baseServo.position.y = 0.024;
    baseServo.castShadow = true;
    this.baseTurntableGroup.add(baseServo);

    // Shoulder support bracket uprights (two vertical horns reaching up to baseH)
    const hornHeight = baseH - 0.012;
    const uprightGeo = new THREE.BoxGeometry(0.008, hornHeight, 0.038);

    const leftUpright = new THREE.Mesh(uprightGeo, anodizedAluminumMat);
    leftUpright.position.set(-0.024, hornHeight / 2, 0);
    leftUpright.castShadow = true;
    this.baseTurntableGroup.add(leftUpright);

    const rightUpright = new THREE.Mesh(uprightGeo, anodizedAluminumMat);
    rightUpright.position.set(0.024, hornHeight / 2, 0);
    rightUpright.castShadow = true;
    this.baseTurntableGroup.add(rightUpright);

    // -------------------------------------------------------------
    // LINK 2: SHOULDER JOINT GROUP (Pivot at y = baseH, Pitch around Z)
    // -------------------------------------------------------------
    this.shoulderJointGroup = new THREE.Group();
    this.shoulderJointGroup.name = 'Joint_Shoulder';
    this.shoulderJointGroup.position.set(0, baseH, 0);
    this.baseTurntableGroup.add(this.shoulderJointGroup);

    // Shoulder bearing brass cap
    const shoulderBearingGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.056, 24);
    const shoulderBearing = new THREE.Mesh(shoulderBearingGeo, brassHardwareMat);
    shoulderBearing.rotation.x = Math.PI / 2;
    shoulderBearing.castShadow = true;
    this.shoulderJointGroup.add(shoulderBearing);
    this.registerJointMesh('shoulder', shoulderBearing);

    // -------------------------------------------------------------
    // LINK 3: UPPER ARM ASSEMBLY (Length L1 = upperL)
    // -------------------------------------------------------------
    this.upperArmGroup = new THREE.Group();
    this.upperArmGroup.name = 'Link_UpperArm';
    this.shoulderJointGroup.add(this.upperArmGroup);

    // Two parallel aluminum extrusion side-struts for upper arm
    const strutGeo = new THREE.BoxGeometry(0.006, upperL, 0.022);

    const leftStrut = new THREE.Mesh(strutGeo, anodizedAluminumMat);
    leftStrut.position.set(-0.018, upperL / 2, 0);
    leftStrut.castShadow = true;
    this.upperArmGroup.add(leftStrut);
    this.registerJointMesh('shoulder', leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, anodizedAluminumMat);
    rightStrut.position.set(0.018, upperL / 2, 0);
    rightStrut.castShadow = true;
    this.upperArmGroup.add(rightStrut);
    this.registerJointMesh('shoulder', rightStrut);

    // Stiffener crossbars
    const crossbarGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.038, 12);
    const crossbar1 = new THREE.Mesh(crossbarGeo, brassHardwareMat);
    crossbar1.rotation.z = Math.PI / 2;
    crossbar1.position.set(0, upperL * 0.35, 0);
    this.upperArmGroup.add(crossbar1);

    const crossbar2 = new THREE.Mesh(crossbarGeo, brassHardwareMat);
    crossbar2.rotation.z = Math.PI / 2;
    crossbar2.position.set(0, upperL * 0.7, 0);
    this.upperArmGroup.add(crossbar2);

    // Shoulder Servo housing attached to upper arm
    const upperServo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.04), servoCaseMat);
    upperServo.position.set(0, upperL * 0.2, 0);
    upperServo.castShadow = true;
    this.upperArmGroup.add(upperServo);

    // -------------------------------------------------------------
    // LINK 4: ELBOW JOINT GROUP (Pivot at y = upperL, Pitch around Z)
    // -------------------------------------------------------------
    this.elbowJointGroup = new THREE.Group();
    this.elbowJointGroup.name = 'Joint_Elbow';
    this.elbowJointGroup.position.set(0, upperL, 0);
    this.upperArmGroup.add(this.elbowJointGroup);

    // Elbow pivot axle
    const elbowAxleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.048, 20);
    const elbowAxle = new THREE.Mesh(elbowAxleGeo, brassHardwareMat);
    elbowAxle.rotation.x = Math.PI / 2;
    elbowAxle.castShadow = true;
    this.elbowJointGroup.add(elbowAxle);
    this.registerJointMesh('elbow', elbowAxle);

    // -------------------------------------------------------------
    // LINK 5: FOREARM ASSEMBLY (Length L2 = foreL)
    // -------------------------------------------------------------
    this.forearmGroup = new THREE.Group();
    this.forearmGroup.name = 'Link_Forearm';
    this.elbowJointGroup.add(this.forearmGroup);

    // Forearm central aluminum beam
    const forearmBeamGeo = new THREE.BoxGeometry(0.018, foreL, 0.018);
    const forearmBeam = new THREE.Mesh(forearmBeamGeo, anodizedAluminumMat);
    forearmBeam.position.set(0, foreL / 2, 0);
    forearmBeam.castShadow = true;
    this.forearmGroup.add(forearmBeam);
    this.registerJointMesh('elbow', forearmBeam);

    // Elbow Servo mounted on forearm
    const elbowServo = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.02, 0.038), servoCaseMat);
    elbowServo.position.set(0, foreL * 0.25, 0);
    elbowServo.castShadow = true;
    this.forearmGroup.add(elbowServo);

    // Wrist Servo mounted near forearm end
    const wristServo = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.024), servoCaseMat);
    wristServo.position.set(0, foreL * 0.85, 0.012);
    wristServo.castShadow = true;
    this.forearmGroup.add(wristServo);

    // -------------------------------------------------------------
    // LINK 6: WRIST JOINT GROUP (Pivot at y = foreL, Pitch around Z)
    // -------------------------------------------------------------
    this.wristJointGroup = new THREE.Group();
    this.wristJointGroup.name = 'Joint_Wrist';
    this.wristJointGroup.position.set(0, foreL, 0);
    this.forearmGroup.add(this.wristJointGroup);

    const wristAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.032, 16), brassHardwareMat);
    wristAxle.rotation.x = Math.PI / 2;
    wristAxle.castShadow = true;
    this.wristJointGroup.add(wristAxle);
    this.registerJointMesh('wrist', wristAxle);

    // -------------------------------------------------------------
    // LINK 7: HAND & GRIPPER CARRIAGE (Length L3 = wristL)
    // -------------------------------------------------------------
    this.handGroup = new THREE.Group();
    this.handGroup.name = 'Link_Hand';
    this.wristJointGroup.add(this.handGroup);

    // Wrist extension neck
    const handNeck = new THREE.Mesh(new THREE.BoxGeometry(0.014, wristL * 0.5, 0.014), metalBracketMat);
    handNeck.position.set(0, (wristL * 0.5) / 2, 0);
    handNeck.castShadow = true;
    this.handGroup.add(handNeck);
    this.registerJointMesh('wrist', handNeck);

    // Gripper palm base plate
    const palmGeo = new THREE.BoxGeometry(0.046, 0.01, 0.022);
    const palm = new THREE.Mesh(palmGeo, anodizedAluminumMat);
    palm.position.set(0, wristL * 0.5, 0);
    palm.castShadow = true;
    this.handGroup.add(palm);
    this.registerJointMesh('gripper', palm);

    // Left Gripper Jaw (Translates along -X)
    const jawLength = wristL * 0.5;
    const jawGeo = new THREE.BoxGeometry(0.006, jawLength, 0.016);

    this.leftJawMesh = new THREE.Mesh(jawGeo, gripperFingerMat);
    this.leftJawMesh.position.set(-0.01, wristL * 0.5 + jawLength / 2, 0);
    this.leftJawMesh.castShadow = true;
    this.handGroup.add(this.leftJawMesh);
    this.registerJointMesh('gripper', this.leftJawMesh);

    // Soft silicone pad on left inner jaw
    const leftPad = new THREE.Mesh(new THREE.BoxGeometry(0.002, jawLength * 0.8, 0.014), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    leftPad.position.set(0.0035, 0, 0);
    this.leftJawMesh.add(leftPad);

    // Right Gripper Jaw (Translates along +X)
    this.rightJawMesh = new THREE.Mesh(jawGeo, gripperFingerMat);
    this.rightJawMesh.position.set(0.01, wristL * 0.5 + jawLength / 2, 0);
    this.rightJawMesh.castShadow = true;
    this.handGroup.add(this.rightJawMesh);
    this.registerJointMesh('gripper', this.rightJawMesh);

    // Soft silicone pad on right inner jaw
    const rightPad = new THREE.Mesh(new THREE.BoxGeometry(0.002, jawLength * 0.8, 0.014), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    rightPad.position.set(-0.0035, 0, 0);
    this.rightJawMesh.add(rightPad);

    // -------------------------------------------------------------
    // END-EFFECTOR TIP DUMMY OBJECT (For world coordinate measurement)
    // -------------------------------------------------------------
    this.endEffectorTip = new THREE.Object3D();
    this.endEffectorTip.name = 'EndEffector_Tip';
    this.endEffectorTip.position.set(0, wristL, 0);
    this.handGroup.add(this.endEffectorTip);

    // Tip marker visual sphere (subtle glowing dot)
    const tipMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.003, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    this.endEffectorTip.add(tipMarker);
  }

  private registerJointMesh(joint: keyof RobotArmJointAngles, mesh: THREE.Mesh) {
    if (!this.jointMeshes.has(joint)) {
      this.jointMeshes.set(joint, []);
    }
    this.jointMeshes.get(joint)!.push(mesh);
  }

  /**
   * Applies the current angles to the Three.js transformation tree.
   * Ensures child links inherit parent transformations cleanly.
   */
  private applyJointAnglesToScene(angles: RobotArmJointAngles) {
    const deg2rad = Math.PI / 180;

    // 1. Base Pan: Rotates around Y axis
    // 90° = forward (rotation.y = 0), 0° = right (-90°), 180° = left (+90°)
    const baseYaw = (angles.base - 90) * deg2rad;
    this.baseTurntableGroup.rotation.y = -baseYaw;

    // 2. Shoulder Pitch: Rotates around local Z axis
    // 0° = horizontal forward (+X local), 90° = vertical up (+Y local)
    // Three.js natural geometry is oriented along +Y, so pitch relative to +Y:
    // angle 90° -> pitch = 0 (upright)
    // angle 0° -> pitch = -90° (horizontal forward)
    const shoulderPitch = (angles.shoulder - 90) * deg2rad;
    this.shoulderJointGroup.rotation.z = -shoulderPitch;

    // 3. Elbow Pitch: Rotates around local Z axis relative to upper arm
    // 90° = perpendicular to upper arm
    const elbowPitch = (angles.elbow - 90) * deg2rad;
    this.elbowJointGroup.rotation.z = -elbowPitch;

    // 4. Wrist Pitch: Rotates around local Z axis relative to forearm
    const wristPitch = (angles.wrist - 90) * deg2rad;
    this.wristJointGroup.rotation.z = -wristPitch;

    // 5. Gripper Jaws: Move symmetrically along local X axis
    // Opening distance in meters (0 to 0.040m)
    const halfOpening = (angles.gripper / 2) * 0.001;
    this.leftJawMesh.position.x = -halfOpening;
    this.rightJawMesh.position.x = halfOpening;
  }

  /**
   * Smoothly interpolates currentAngles towards targetAngles respecting speed limits.
   */
  public update(dtSeconds: number) {
    let hasChanged = false;

    for (const key of Object.keys(this.jointLimits) as Array<keyof RobotArmJointAngles>) {
      const current = this.currentAngles[key];
      const target = this.targetAngles[key];
      const limit = this.jointLimits[key];

      if (Math.abs(current - target) > 0.01) {
        const maxStep = limit.speedLimit * dtSeconds;
        const diff = target - current;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);

        this.currentAngles[key] = current + step;
        hasChanged = true;
      } else {
        this.currentAngles[key] = target;
      }
    }

    if (hasChanged) {
      this.applyJointAnglesToScene(this.currentAngles);
      if (this.onAnglesChangedCallback) {
        this.onAnglesChangedCallback({ ...this.currentAngles });
      }
    }
  }

  public setTargetAngles(angles: Partial<RobotArmJointAngles>, immediate = false) {
    for (const key of Object.keys(angles) as Array<keyof RobotArmJointAngles>) {
      if (typeof angles[key] === 'number') {
        const lim = this.jointLimits[key];
        const clamped = Math.max(lim.min, Math.min(lim.max, angles[key]!));
        this.targetAngles[key] = clamped;
        if (immediate) {
          this.currentAngles[key] = clamped;
        }
      }
    }

    if (immediate) {
      this.applyJointAnglesToScene(this.currentAngles);
      if (this.onAnglesChangedCallback) {
        this.onAnglesChangedCallback({ ...this.currentAngles });
      }
    }
  }

  public getCurrentAngles(): RobotArmJointAngles {
    return { ...this.currentAngles };
  }

  public getTargetAngles(): RobotArmJointAngles {
    return { ...this.targetAngles };
  }

  /**
   * Retrieves world Cartesian coordinates of the physical end-effector tip in millimeters.
   */
  public getEndEffectorWorldCoordinates(): { x: number; y: number; z: number } {
    this.rootArmGroup.updateWorldMatrix(true, true);
    const worldPos = new THREE.Vector3();
    this.endEffectorTip.getWorldPosition(worldPos);

    return {
      x: Math.round(worldPos.x * 1000 * 10) / 10,
      y: Math.round(worldPos.y * 1000 * 10) / 10,
      z: Math.round(worldPos.z * 1000 * 10) / 10,
    };
  }

  public getKinematics(): ForwardKinematicsResult {
    return calculateForwardKinematics(this.currentAngles, this.dimensions);
  }

  public setSelectedJoint(joint: keyof RobotArmJointAngles | null) {
    this.selectedJoint = joint;
    // Highlight effect
    this.jointMeshes.forEach((meshes, key) => {
      const isSelected = key === joint;
      meshes.forEach((mesh) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          if (isSelected) {
            mesh.material.emissive = new THREE.Color(0x00f0ff);
            mesh.material.emissiveIntensity = 0.45;
          } else {
            mesh.material.emissive = new THREE.Color(0x000000);
            mesh.material.emissiveIntensity = 0;
          }
        }
      });
    });
  }

  public onAnglesChange(cb: (angles: RobotArmJointAngles) => void) {
    this.onAnglesChangedCallback = cb;
  }

  // -------------------------------------------------------------
  // ORBIT NAVIGATION CONTROLS
  // -------------------------------------------------------------
  private setupOrbitControls() {
    const dom = this.renderer.domElement;

    this.onPointerDownHandler = (e: MouseEvent) => {
      e.preventDefault();
      dom.focus();
      this.isDragging = e.button === 0;
      this.isPanning = e.button === 2;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    this.onPointerMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging && !this.isPanning) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      if (this.isDragging) {
        this.cameraAzimuth -= deltaX * 0.007;
        this.cameraElevation = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, this.cameraElevation + deltaY * 0.007)
        );
      } else if (this.isPanning) {
        // Pan camera target
        const panSpeed = 0.0008 * this.cameraDistance;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

        this.cameraTarget.addScaledVector(right, -deltaX * panSpeed);
        this.cameraTarget.y += deltaY * panSpeed;
      }

      this.updateCameraPosition();
    };

    this.onPointerUpHandler = () => {
      this.isDragging = false;
      this.isPanning = false;
    };

    this.onWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance = Math.max(0.2, Math.min(2.5, this.cameraDistance + e.deltaY * 0.001));
      this.updateCameraPosition();
    };

    this.onContextMenuHandler = (e: MouseEvent) => e.preventDefault();

    dom.addEventListener('mousedown', this.onPointerDownHandler);
    window.addEventListener('mousemove', this.onPointerMoveHandler);
    window.addEventListener('mouseup', this.onPointerUpHandler);
    dom.addEventListener('wheel', this.onWheelHandler, { passive: false });
    dom.addEventListener('contextmenu', this.onContextMenuHandler);

    // Touch support for mobile/tablets
    this.onTouchStartHandler = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialTouchDist = Math.hypot(dx, dy);
      }
    };

    this.onTouchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        this.cameraAzimuth -= deltaX * 0.007;
        this.cameraElevation = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, this.cameraElevation + deltaY * 0.007)
        );
        this.updateCameraPosition();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = (this.initialTouchDist - dist) * 0.002;
        this.initialTouchDist = dist;
        this.cameraDistance = Math.max(0.2, Math.min(2.5, this.cameraDistance + delta));
        this.updateCameraPosition();
      }
    };

    this.onTouchEndHandler = () => {
      this.isDragging = false;
    };

    dom.addEventListener('touchstart', this.onTouchStartHandler, { passive: true });
    window.addEventListener('touchmove', this.onTouchMoveHandler, { passive: true });
    window.addEventListener('touchend', this.onTouchEndHandler);
  }

  private updateCameraPosition() {
    const x =
      this.cameraTarget.x +
      this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraElevation);
    const z =
      this.cameraTarget.z +
      this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  public resetCamera() {
    this.cameraDistance = 0.65;
    this.cameraAzimuth = 0.8;
    this.cameraElevation = 0.5;
    this.cameraTarget.set(0, 0.16, 0);
    this.updateCameraPosition();
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height, false);
          this.render();
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  public isAttached(container?: HTMLElement): boolean {
    const target = container ?? this.container;
    return Boolean(
      target &&
      typeof document !== 'undefined' &&
      document.body &&
      document.body.contains(target) &&
      this.renderer &&
      this.renderer.domElement &&
      this.renderer.domElement.parentElement === target
    );
  }

  public attachTo(container: HTMLElement) {
    this.container = container;
    if (this.renderer && this.renderer.domElement) {
      if (this.renderer.domElement.parentElement !== container) {
        if (this.renderer.domElement.parentElement) {
          this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
        container.appendChild(this.renderer.domElement);
      }
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.setupResizeObserver();
    }
    this.handleResize();
    this.resumeLoop();
    this.render();
  }

  public handleResize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(rect.width || this.container.clientWidth || 400, 100);
    const height = Math.max(rect.height || this.container.clientHeight || 300, 100);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public pauseLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resumeLoop() {
    if (this.animFrameId !== null) return;
    this.lastTime = 0;
    this.startLoop();
  }

  public isLoopRunning(): boolean {
    return this.animFrameId !== null;
  }

  public getDimensions(): { width: number; height: number } {
    if (!this.container) return { width: 0, height: 0 };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private startLoop() {
    if (this.animFrameId !== null) return;
    const render = (time: number) => {
      if (!this.lastTime) this.lastTime = time;
      const dtSeconds = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.update(dtSeconds);
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up all DOM and window event listeners
    const dom = this.renderer.domElement;
    if (this.onPointerDownHandler && dom) {
      dom.removeEventListener('mousedown', this.onPointerDownHandler);
    }
    if (this.onPointerMoveHandler) {
      window.removeEventListener('mousemove', this.onPointerMoveHandler);
    }
    if (this.onPointerUpHandler) {
      window.removeEventListener('mouseup', this.onPointerUpHandler);
    }
    if (this.onWheelHandler && dom) {
      dom.removeEventListener('wheel', this.onWheelHandler);
    }
    if (this.onContextMenuHandler && dom) {
      dom.removeEventListener('contextmenu', this.onContextMenuHandler);
    }
    if (this.onTouchStartHandler && dom) {
      dom.removeEventListener('touchstart', this.onTouchStartHandler);
    }
    if (this.onTouchMoveHandler) {
      window.removeEventListener('touchmove', this.onTouchMoveHandler);
    }
    if (this.onTouchEndHandler) {
      window.removeEventListener('touchend', this.onTouchEndHandler);
    }

    // Traverse and dispose all geometries and materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
