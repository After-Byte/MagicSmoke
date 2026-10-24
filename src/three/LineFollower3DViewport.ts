import * as THREE from 'three';
import { RobotPose } from '../robot/DifferentialDriveChassis';
import { TrackEnvironment, SensorArrayReadings, TrackPoint } from '../robot/TrackEnvironment';

export class LineFollower3DViewport {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private robotGroup: THREE.Group;
  private leftFrontWheel!: THREE.Group;
  private leftRearWheel!: THREE.Group;
  private rightFrontWheel!: THREE.Group;
  private rightRearWheel!: THREE.Group;

  // 8 Optical Sensor Visual Indicators
  private sensorLeds: THREE.Mesh[] = [];
  private sensorRays: THREE.Mesh[] = [];
  private sensorLedMaterials: THREE.MeshStandardMaterial[] = [];
  private sensorRayMaterials: THREE.MeshBasicMaterial[] = [];

  // Track & Trajectory Meshes
  private trackMesh: THREE.Mesh | null = null;
  private trackBorderMesh: THREE.LineSegments | null = null;
  private startLineMesh: THREE.Mesh | null = null;
  private trajectoryLine: THREE.Line | null = null;
  private trajectoryPoints: THREE.Vector3[] = [];
  private readonly maxTrajectoryPoints = 600;

  // Camera & Orbit Controls
  private isDragging = false;
  private isRightDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 0.95;
  private cameraAzimuth = 0.78;
  private cameraElevation = 0.52;
  private cameraTarget = new THREE.Vector3(0, 0.035, 0);
  private followRobot = true;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, track?: TrackEnvironment) {
    this.container = container;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || container.clientWidth || 320, 100);
    const height = Math.max(rect.height || container.clientHeight || 240, 100);

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07090e');

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
    this.updateCameraPosition();

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.outline = 'none';
    this.container.appendChild(this.renderer.domElement);

    // 4. Industrial Technical Lighting
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 4.5, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.8);
    cyanRim.position.set(-3.0, 2.5, -2.5);
    this.scene.add(cyanRim);

    // 5. High-Contrast Arena Floor
    this.buildArenaFloor();

    // 6. Build Initial Track Ribbon
    if (track) {
      this.rebuildTrack(track);
    }

    // 7. Trajectory Line
    this.buildTrajectoryMesh();

    // 8. Robot Assembly with Arduino Uno & 8-CH Sensor Array
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);
    this.buildRobotGeometry();

    this.setupOrbitControls();

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    this.render();
  }

  private buildArenaFloor() {
    // Large engineering floor mat (clean white/gray test arena)
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // High contrast white test mat area (3.6m x 3.6m) where track resides
    const matGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const matMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Bright engineering white test surface
      roughness: 0.5,
      metalness: 0.05,
    });
    const whiteMat = new THREE.Mesh(matGeo, matMaterial);
    whiteMat.rotation.x = -Math.PI / 2;
    whiteMat.position.y = 0.001;
    whiteMat.receiveShadow = true;
    this.scene.add(whiteMat);

    // Coordinate grid over background
    const grid = new THREE.GridHelper(12, 24, 0x00f0ff, 0x27354a);
    grid.position.y = 0.0015;
    this.scene.add(grid);

    // Subtle arena perimeter boundary
    const borderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.8, 0.002, -1.8),
      new THREE.Vector3(1.8, 0.002, -1.8),
      new THREE.Vector3(1.8, 0.002, 1.8),
      new THREE.Vector3(-1.8, 0.002, 1.8),
      new THREE.Vector3(-1.8, 0.002, -1.8),
    ]);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const arenaBorder = new THREE.Line(borderGeo, borderMat);
    this.scene.add(arenaBorder);
  }

  /**
   * Generates a 3D flat ribbon mesh along the polyline of the track
   */
  public rebuildTrack(track: TrackEnvironment) {
    try {
      if (this.trackMesh) {
        this.scene.remove(this.trackMesh);
        this.trackMesh.geometry.dispose();
        (this.trackMesh.material as THREE.Material).dispose();
        this.trackMesh = null;
      }
      if (this.trackBorderMesh) {
        this.scene.remove(this.trackBorderMesh);
        this.trackBorderMesh.geometry.dispose();
        (this.trackBorderMesh.material as THREE.Material).dispose();
        this.trackBorderMesh = null;
      }
      if (this.startLineMesh) {
        this.scene.remove(this.startLineMesh);
        this.startLineMesh.geometry.dispose();
        (this.startLineMesh.material as THREE.Material).dispose();
        this.startLineMesh = null;
      }

      const polyline = track.getTrackPolyline();
      if (!polyline || polyline.length < 2) {
        this.render();
        return;
      }

      // Filter and sanitize polyline points (remove non-finite and redundant consecutive points)
      const sanitizedPoints: TrackPoint[] = [];
      for (const p of polyline) {
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
        if (sanitizedPoints.length > 0) {
          const last = sanitizedPoints[sanitizedPoints.length - 1];
          if (Math.hypot(p.x - last.x, p.z - last.z) < 1e-4) continue;
        }
        sanitizedPoints.push({ x: p.x, z: p.z });
      }

      if (sanitizedPoints.length < 2) {
        this.render();
        return;
      }

      const rawWidth = track.getLineWidth();
      const lineWidth = Number.isFinite(rawWidth) && rawWidth > 0.005 ? rawWidth : 0.024;
      const halfWidth = lineWidth / 2.0;
      const isClosed = track.isTrackClosed();

      const vertices: number[] = [];
      const indices: number[] = [];
      const numPoints = sanitizedPoints.length;

      for (let i = 0; i < numPoints; i++) {
        const curr = sanitizedPoints[i];
        let prev: TrackPoint;
        let next: TrackPoint;

        if (i === 0) {
          prev = isClosed ? sanitizedPoints[numPoints - 1] : sanitizedPoints[0];
          next = sanitizedPoints[1];
        } else if (i === numPoints - 1) {
          prev = sanitizedPoints[i - 1];
          next = isClosed ? sanitizedPoints[0] : sanitizedPoints[i];
        } else {
          prev = sanitizedPoints[i - 1];
          next = sanitizedPoints[i + 1];
        }

        // Tangent vector
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.hypot(dx, dz) || 1;
        const tx = dx / len;
        const tz = dz / len;

        // Normal vector perpendicular to tangent on floor plane
        const nx = -tz;
        const nz = tx;

        // Left and right vertices for track ribbon (v0 = left, v1 = right)
        const yElev = 0.0028; // comfortably above floor mat
        const leftX = curr.x + nx * halfWidth;
        const leftZ = curr.z + nz * halfWidth;
        const rightX = curr.x - nx * halfWidth;
        const rightZ = curr.z - nz * halfWidth;

        vertices.push(leftX, yElev, leftZ);
        vertices.push(rightX, yElev, rightZ);

        if (i < numPoints - 1) {
          const v0 = i * 2;
          const v1 = i * 2 + 1;
          const v2 = (i + 1) * 2;
          const v3 = (i + 1) * 2 + 1;

          // Counter-clockwise winding: normals point UP (+Y)
          indices.push(v0, v2, v1);
          indices.push(v1, v2, v3);
        }
      }

      if (isClosed && numPoints > 2) {
        const v0 = (numPoints - 1) * 2;
        const v1 = (numPoints - 1) * 2 + 1;
        const v2 = 0;
        const v3 = 1;
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }

      const trackGeo = new THREE.BufferGeometry();
      trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      trackGeo.setIndex(indices);
      trackGeo.computeVertexNormals();

      const trackMat = new THREE.MeshStandardMaterial({
        color: 0x090d16, // Pitch black reflectance tape
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -4.0,
      });

      this.trackMesh = new THREE.Mesh(trackGeo, trackMat);
      this.trackMesh.receiveShadow = true;
      this.scene.add(this.trackMesh);

      // High visibility start line indicator strip at track startPose
      const startPose = track.getStartPose();
      const sx = Number.isFinite(startPose.x) ? startPose.x : 0;
      const sz = Number.isFinite(startPose.z) ? startPose.z : 0;
      const syaw = Number.isFinite(startPose.yawRad) ? startPose.yawRad : 0;

      const startLineGeo = new THREE.PlaneGeometry(lineWidth * 1.8, 0.016);
      const startLineMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
      this.startLineMesh = new THREE.Mesh(startLineGeo, startLineMat);
      this.startLineMesh.rotation.x = -Math.PI / 2;
      this.startLineMesh.rotation.z = -syaw;
      this.startLineMesh.position.set(sx, 0.0032, sz);
      this.scene.add(this.startLineMesh);

      this.render();
    } catch (err) {
      console.error('[VIEWPORT_3D] Error rebuilding track geometry:', err);
      this.render();
    }
  }

  private buildTrajectoryMesh() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrajectoryPoints * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
    });

    this.trajectoryLine = new THREE.Line(geo, mat);
    this.scene.add(this.trajectoryLine);
  }

  public clearTrajectory() {
    this.trajectoryPoints = [];
    if (this.trajectoryLine) {
      this.trajectoryLine.geometry.setDrawRange(0, 0);
      this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    }
    this.render();
  }

  private appendTrajectoryPoint(point: THREE.Vector3) {
    if (!this.trajectoryLine) return;

    if (this.trajectoryPoints.length > 0) {
      const last = this.trajectoryPoints[this.trajectoryPoints.length - 1];
      if (last.distanceTo(point) < 0.015) {
        return; // Don't add redundant points when stationary
      }
    }

    this.trajectoryPoints.push(point.clone());
    if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
      this.trajectoryPoints.shift();
    }

    const posAttr = this.trajectoryLine.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < this.trajectoryPoints.length; i++) {
      const pt = this.trajectoryPoints[i];
      array[i * 3] = pt.x;
      array[i * 3 + 1] = pt.y;
      array[i * 3 + 2] = pt.z;
    }

    this.trajectoryLine.geometry.setDrawRange(0, this.trajectoryPoints.length);
    posAttr.needsUpdate = true;
  }

  private buildRobotGeometry() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.2 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.4, metalness: 0.3 });

    // 1. Lower Chassis Deck (FR4 Carbon / Fiberglass)
    const lowerChassisGeo = new THREE.BoxGeometry(0.13, 0.006, 0.18);
    const lowerChassis = new THREE.Mesh(lowerChassisGeo, chassisMat);
    lowerChassis.position.y = 0.026;
    lowerChassis.castShadow = true;
    lowerChassis.receiveShadow = true;
    this.robotGroup.add(lowerChassis);

    // Standoffs
    const standoffGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.018, 12);
    const standoffPositions = [
      [-0.045, 0.038, -0.065],
      [0.045, 0.038, -0.065],
      [-0.045, 0.038, 0.065],
      [0.045, 0.038, 0.065],
    ];
    standoffPositions.forEach(([x, y, z]) => {
      const post = new THREE.Mesh(standoffGeo, metalMat);
      post.position.set(x, y, z);
      this.robotGroup.add(post);
    });

    // Upper Chassis Deck
    const upperChassisGeo = new THREE.BoxGeometry(0.12, 0.004, 0.16);
    const upperChassis = new THREE.Mesh(upperChassisGeo, chassisMat);
    upperChassis.position.y = 0.048;
    upperChassis.castShadow = true;
    this.robotGroup.add(upperChassis);

    // 2. Battery Pack (LiPo 7.4V 2S) mounted centrally between decks
    const battGroup = new THREE.Group();
    battGroup.position.set(0, 0.036, -0.015);
    const battBodyGeo = new THREE.BoxGeometry(0.042, 0.015, 0.072);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.15 });
    const battBody = new THREE.Mesh(battBodyGeo, battMat);
    battBody.castShadow = true;
    battGroup.add(battBody);
    this.robotGroup.add(battGroup);

    // 3. Arduino Uno R3 on Top Deck
    const unoGroup = new THREE.Group();
    unoGroup.position.set(-0.010, 0.052, 0.015);

    // Classic Teal Solder Mask PCB
    const unoPcbGeo = new THREE.BoxGeometry(0.053, 0.002, 0.068);
    const unoPcbMat = new THREE.MeshStandardMaterial({ color: 0x008184, roughness: 0.35, metalness: 0.1 });
    const unoPcb = new THREE.Mesh(unoPcbGeo, unoPcbMat);
    unoPcb.castShadow = true;
    unoGroup.add(unoPcb);

    // ATmega328P DIP-28 IC Socket & Chip
    const dipGeo = new THREE.BoxGeometry(0.010, 0.0035, 0.035);
    const icMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const dipIc = new THREE.Mesh(dipGeo, icMat);
    dipIc.position.set(0.006, 0.0025, 0.002);
    dipIc.castShadow = true;
    unoGroup.add(dipIc);

    // USB Type-B Metal Jack at Rear Edge
    const usbBGeo = new THREE.BoxGeometry(0.012, 0.011, 0.016);
    const usbB = new THREE.Mesh(usbBGeo, metalMat);
    usbB.position.set(-0.016, 0.0065, -0.030);
    usbB.castShadow = true;
    unoGroup.add(usbB);

    // Black 2.1mm DC Power Barrel Jack
    const barrelGeo = new THREE.BoxGeometry(0.009, 0.011, 0.014);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const barrelJack = new THREE.Mesh(barrelGeo, barrelMat);
    barrelJack.position.set(0.017, 0.0065, -0.031);
    unoGroup.add(barrelJack);

    // Red Tactile Reset Button
    const btnGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.003, 10);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const resetBtn = new THREE.Mesh(btnGeo, btnMat);
    resetBtn.position.set(-0.020, 0.0025, 0.027);
    unoGroup.add(resetBtn);

    // Female Pin Header Strips along both edges
    const hdrMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const leftHdrGeo = new THREE.BoxGeometry(0.0025, 0.008, 0.052);
    const leftHdr = new THREE.Mesh(leftHdrGeo, hdrMat);
    leftHdr.position.set(-0.024, 0.0045, 0.003);
    unoGroup.add(leftHdr);

    const rightHdrGeo = new THREE.BoxGeometry(0.0025, 0.008, 0.052);
    const rightHdr = new THREE.Mesh(rightHdrGeo, hdrMat);
    rightHdr.position.set(0.024, 0.0045, 0.003);
    unoGroup.add(rightHdr);

    this.robotGroup.add(unoGroup);

    // 4. TB6612FNG Driver Breakout at Rear Top Deck
    const tbGroup = new THREE.Group();
    tbGroup.position.set(0.028, 0.052, -0.045);
    const tbPcbGeo = new THREE.BoxGeometry(0.020, 0.002, 0.022);
    const tbPcbMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 });
    const tbPcb = new THREE.Mesh(tbPcbGeo, tbPcbMat);
    tbPcb.castShadow = true;
    tbGroup.add(tbPcb);

    const tbIcGeo = new THREE.BoxGeometry(0.007, 0.002, 0.012);
    const tbIc = new THREE.Mesh(tbIcGeo, icMat);
    tbIc.position.set(0, 0.0015, 0);
    tbGroup.add(tbIc);
    this.robotGroup.add(tbGroup);

    // 5. 8-Channel Optical Reflectance Sensor Bar at Front Bumper (z = +0.092)
    const sensorBarGroup = new THREE.Group();
    sensorBarGroup.position.set(0, 0.018, 0.092);

    // Black Sensor Bar PCB (width 80mm, depth 14mm, height 2mm)
    const barPcbGeo = new THREE.BoxGeometry(0.082, 0.002, 0.014);
    const barPcbMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5 });
    const barPcb = new THREE.Mesh(barPcbGeo, barPcbMat);
    barPcb.castShadow = true;
    sensorBarGroup.add(barPcb);

    // Aluminum mounting brackets connecting sensor bar to front chassis
    const barMountGeo = new THREE.BoxGeometry(0.004, 0.010, 0.014);
    const leftMount = new THREE.Mesh(barMountGeo, metalMat);
    leftMount.position.set(-0.035, 0.004, -0.007);
    sensorBarGroup.add(leftMount);
    const rightMount = new THREE.Mesh(barMountGeo, metalMat);
    rightMount.position.set(0.035, 0.004, -0.007);
    sensorBarGroup.add(rightMount);

    // 8 Discrete Optical Sensors with Indicator LEDs and Downward Ray Beams
    // Sensor offsets: -35mm, -25mm, -15mm, -5mm, +5mm, +15mm, +25mm, +35mm
    const sensorPitch = 0.010;
    const startX = -3.5 * sensorPitch; // -0.035m

    this.sensorLeds = [];
    this.sensorRays = [];
    this.sensorLedMaterials = [];
    this.sensorRayMaterials = [];

    const ledGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0012, 10);
    const optoGeo = new THREE.BoxGeometry(0.0035, 0.002, 0.004);
    const rayGeo = new THREE.CylinderGeometry(0.0015, 0.0035, 0.016, 8);

    for (let i = 0; i < 8; i++) {
      const sx = startX + i * sensorPitch;

      // Downward Phototransistor Optical Package
      const optoPkg = new THREE.Mesh(optoGeo, icMat);
      optoPkg.position.set(sx, -0.0015, 0);
      sensorBarGroup.add(optoPkg);

      // Top-mounted Status Indicator LED
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // Inactive dim slate
        roughness: 0.4,
        emissive: 0x000000,
      });
      this.sensorLedMaterials.push(ledMat);

      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(sx, 0.0015, 0);
      sensorBarGroup.add(ledMesh);
      this.sensorLeds.push(ledMesh);

      // Downward Optical Sensing Ray (visualizing active IR reflectance cone)
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.0, // Hidden until active
        depthWrite: false,
      });
      this.sensorRayMaterials.push(rayMat);

      const rayMesh = new THREE.Mesh(rayGeo, rayMat);
      rayMesh.position.set(sx, -0.009, 0);
      sensorBarGroup.add(rayMesh);
      this.sensorRays.push(rayMesh);
    }

    this.robotGroup.add(sensorBarGroup);

    // 6. Motors and Wheels
    const createN20MotorAssembly = (xPos: number, zPos: number, isRight: boolean) => {
      const motorGroup = new THREE.Group();
      motorGroup.position.set(xPos, 0.026, zPos);

      const gearboxGeo = new THREE.BoxGeometry(0.012, 0.010, 0.014);
      const gearbox = new THREE.Mesh(gearboxGeo, brassMat);
      gearbox.castShadow = true;
      motorGroup.add(gearbox);

      const motorCanGeo = new THREE.CylinderGeometry(0.0058, 0.0058, 0.016, 16);
      const motorCan = new THREE.Mesh(motorCanGeo, metalMat);
      motorCan.rotation.x = Math.PI / 2;
      motorCan.position.z = isRight ? 0.014 : -0.014;
      motorCan.castShadow = true;
      motorGroup.add(motorCan);

      this.robotGroup.add(motorGroup);
    };

    createN20MotorAssembly(-0.046, -0.020, false);
    createN20MotorAssembly(0.046, -0.020, true);

    // Wheels with Anodized Cyan Rim and Black Rubber Tread
    const wheelRadius = 0.032;
    const wheelWidth = 0.016;
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.85 });

    const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelWidth + 0.002, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.7, roughness: 0.25 });

    const nutGeo = new THREE.CylinderGeometry(0.004, 0.004, wheelWidth + 0.004, 6);
    const nutMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });

    const createWheel = (x: number, z: number) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, wheelRadius, z);

      const spinner = new THREE.Group();
      wheelGroup.add(spinner);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      spinner.add(tire);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      spinner.add(hub);

      const nut = new THREE.Mesh(nutGeo, nutMat);
      nut.rotation.z = Math.PI / 2;
      spinner.add(nut);

      this.robotGroup.add(wheelGroup);
      return spinner;
    };

    const halfTrack = 0.07;
    const halfBase = 0.055;

    this.leftFrontWheel = createWheel(-halfTrack, halfBase);
    this.leftRearWheel = createWheel(-halfTrack, -halfBase);
    this.rightFrontWheel = createWheel(halfTrack, halfBase);
    this.rightRearWheel = createWheel(halfTrack, -halfBase);
  }

  /**
   * Update dynamic robot pose, wheel rotations, optical sensor feedback, and trajectory
   */
  public updateRobot(
    pose: RobotPose,
    leftAngleRad: number,
    rightAngleRad: number,
    sensorReadings?: SensorArrayReadings
  ) {
    this.robotGroup.position.set(pose.x, 0, pose.z);
    this.robotGroup.rotation.y = pose.yawRad;

    // Rotate wheel meshes
    this.leftFrontWheel.rotation.x = leftAngleRad;
    this.leftRearWheel.rotation.x = leftAngleRad;
    this.rightFrontWheel.rotation.x = rightAngleRad;
    this.rightRearWheel.rotation.x = rightAngleRad;

    // Record trajectory point
    this.appendTrajectoryPoint(new THREE.Vector3(pose.x, 0.003, pose.z));

    // Update 8 IR Sensor Visuals (glowing green when detecting track)
    if (sensorReadings && sensorReadings.digitalChannels) {
      for (let i = 0; i < 8; i++) {
        const isActive = sensorReadings.digitalChannels[i] === 1;
        const ledMat = this.sensorLedMaterials[i];
        const rayMat = this.sensorRayMaterials[i];

        if (isActive) {
          ledMat.color.setHex(0x10b981); // Bright green
          ledMat.emissive.setHex(0x059669);
          rayMat.opacity = 0.65;
        } else {
          ledMat.color.setHex(0x334155); // Dim dark slate
          ledMat.emissive.setHex(0x000000);
          rayMat.opacity = 0.0;
        }
      }
    }

    if (this.followRobot) {
      this.cameraTarget.set(pose.x, 0.035, pose.z);
    }
    this.updateCameraPosition();
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public setFollowMode(enabled: boolean) {
    this.followRobot = enabled;
  }

  public isFollowMode(): boolean {
    return this.followRobot;
  }

  public resetCamera() {
    this.cameraDistance = 0.95;
    this.cameraAzimuth = 0.78;
    this.cameraElevation = 0.52;
    this.cameraTarget.set(this.robotGroup.position.x, 0.035, this.robotGroup.position.z);
    this.updateCameraPosition();
    this.render();
  }

  private updateCameraPosition() {
    const x = this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    this.camera.position.set(this.cameraTarget.x + x, this.cameraTarget.y + y, this.cameraTarget.z + z);
    this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y + 0.02, this.cameraTarget.z);
  }

  private setupOrbitControls() {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
      } else if (e.button === 2) {
        this.isRightDragging = true;
        this.followRobot = false; // Detach auto-follow on manual pan
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isRightDragging = false;
    });

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousemove', (e) => {
      if (!this.isDragging && !this.isRightDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.isDragging) {
        // Orbit rotation
        this.cameraAzimuth -= deltaX * 0.009;
        this.cameraElevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraElevation + deltaY * 0.009));
      } else if (this.isRightDragging) {
        // Pan
        const panFactor = 0.0015 * this.cameraDistance;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        this.cameraTarget.addScaledVector(right, -deltaX * panFactor);
        this.cameraTarget.y += deltaY * panFactor;
      }

      this.updateCameraPosition();
      this.render();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(0.2, Math.min(5.0, this.cameraDistance + e.deltaY * 0.0012));
      this.updateCameraPosition();
      this.render();
    });
  }

  public isAttached(container?: HTMLElement): boolean {
    const target = container ?? this.container;
    return Boolean(
      target &&
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
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    this.handleResize();
  }

  public handleResize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(rect.width || this.container.clientWidth || 320, 100);
    const height = Math.max(rect.height || this.container.clientHeight || 240, 100);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  }

  public destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
