import * as THREE from 'three';
import { RobotPose } from '../robot/DifferentialDriveChassis';

export class Robot3DViewport {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private robotGroup: THREE.Group;
  private leftFrontWheel!: THREE.Mesh;
  private leftRearWheel!: THREE.Mesh;
  private rightFrontWheel!: THREE.Mesh;
  private rightRearWheel!: THREE.Mesh;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 0.85;
  private cameraAzimuth = 0.75;
  private cameraElevation = 0.45;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = Math.max(container.clientWidth || 320, 100);
    const height = Math.max(container.clientHeight || 240, 100);

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0d14');

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
    this.updateCameraPosition();

    // 3. Renderer with antialiasing and PCF soft shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.75);
    this.scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Cyan Fill / Rim Light
    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.45);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    // 5. Floor Grid and Plane
    const grid = new THREE.GridHelper(10, 40, 0x00f0ff, 0x1a2333);
    grid.position.y = 0;
    this.scene.add(grid);

    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c1017, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 6. Robot Geometry Assembly
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);
    this.buildRobotGeometry();

    this.setupOrbitControls();

    // Responsive container resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private buildRobotGeometry() {
    // 1. Dual-Deck Robotics Chassis (Carbon Fiber FR4 + Aluminum Standoffs)
    const lowerChassisGeo = new THREE.BoxGeometry(0.13, 0.008, 0.18);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.4, metalness: 0.3 });
    const lowerChassis = new THREE.Mesh(lowerChassisGeo, chassisMat);
    lowerChassis.position.y = 0.028;
    lowerChassis.castShadow = true;
    lowerChassis.receiveShadow = true;
    this.robotGroup.add(lowerChassis);

    // Aluminum Standoffs between decks
    const standoffGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.016, 12);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.2 });
    const standoffPositions = [
      [-0.045, 0.040, -0.065],
      [0.045, 0.040, -0.065],
      [-0.045, 0.040, 0.065],
      [0.045, 0.040, 0.065],
    ];
    standoffPositions.forEach(([x, y, z]) => {
      const post = new THREE.Mesh(standoffGeo, metalMat);
      post.position.set(x, y, z);
      this.robotGroup.add(post);
    });

    const upperChassisGeo = new THREE.BoxGeometry(0.11, 0.004, 0.15);
    const upperChassis = new THREE.Mesh(upperChassisGeo, chassisMat);
    upperChassis.position.y = 0.050;
    upperChassis.castShadow = true;
    this.robotGroup.add(upperChassis);

    // 2. Battery Pack (2S 7.4V LiPo Pack with End Caps & Silicone Leads)
    const battGroup = new THREE.Group();
    battGroup.position.set(0, 0.038, -0.015);

    const battBodyGeo = new THREE.BoxGeometry(0.042, 0.016, 0.072);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.15 });
    const battBody = new THREE.Mesh(battBodyGeo, battMat);
    battBody.castShadow = true;
    battGroup.add(battBody);

    // Battery end caps
    const capGeo = new THREE.BoxGeometry(0.043, 0.017, 0.006);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const frontCap = new THREE.Mesh(capGeo, capMat);
    frontCap.position.z = 0.036;
    battGroup.add(frontCap);
    const rearCap = new THREE.Mesh(capGeo, capMat);
    rearCap.position.z = -0.036;
    battGroup.add(rearCap);

    // Silicone power wires with connector
    const wireGeo = new THREE.CylinderGeometry(0.001, 0.001, 0.015, 8);
    const redWireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const blackWireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
    const redWire = new THREE.Mesh(wireGeo, redWireMat);
    redWire.position.set(0.008, 0.008, 0.042);
    redWire.rotation.x = Math.PI / 4;
    battGroup.add(redWire);
    const blackWire = new THREE.Mesh(wireGeo, blackWireMat);
    blackWire.position.set(-0.008, 0.008, 0.042);
    blackWire.rotation.x = Math.PI / 4;
    battGroup.add(blackWire);

    this.robotGroup.add(battGroup);

    // 3. ESP32 DevKit V1 Module (Dark PCB, RF Shield, Antenna, USB, Dual Header Pins, Tactile Buttons)
    const espGroup = new THREE.Group();
    espGroup.position.set(-0.012, 0.054, 0.030);

    // Dark FR4 PCB
    const espPcbGeo = new THREE.BoxGeometry(0.028, 0.002, 0.054);
    const espPcbMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.4 });
    const espPcb = new THREE.Mesh(espPcbGeo, espPcbMat);
    espPcb.castShadow = true;
    espGroup.add(espPcb);

    // Silver ESP-WROOM-32 Nickel RF Shield
    const rfShieldGeo = new THREE.BoxGeometry(0.018, 0.0035, 0.024);
    const rfShieldMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.15 });
    const rfShield = new THREE.Mesh(rfShieldGeo, rfShieldMat);
    rfShield.position.set(0, 0.0025, 0.002);
    rfShield.castShadow = true;
    espGroup.add(rfShield);

    // Gold/Copper PCB Antenna Trace Zone at Rear
    const antennaGeo = new THREE.BoxGeometry(0.016, 0.0006, 0.009);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.3 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, 0.0012, -0.020);
    espGroup.add(antenna);

    // Micro-USB Port at Front Edge
    const usbGeo = new THREE.BoxGeometry(0.008, 0.0035, 0.006);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.15 });
    const usb = new THREE.Mesh(usbGeo, usbMat);
    usb.position.set(0, 0.002, 0.027);
    espGroup.add(usb);

    // Dual Black Header Pin Strips along edges
    const headerGeo = new THREE.BoxGeometry(0.0025, 0.004, 0.046);
    const headerMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const leftHeader = new THREE.Mesh(headerGeo, headerMat);
    leftHeader.position.set(-0.0125, -0.002, 0);
    espGroup.add(leftHeader);
    const rightHeader = new THREE.Mesh(headerGeo, headerMat);
    rightHeader.position.set(0.0125, -0.002, 0);
    espGroup.add(rightHeader);

    // Tactile Buttons (EN & BOOT)
    const btnGeo = new THREE.BoxGeometry(0.003, 0.0015, 0.003);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 });
    const enBtn = new THREE.Mesh(btnGeo, btnMat);
    enBtn.position.set(-0.008, 0.0018, 0.020);
    espGroup.add(enBtn);
    const bootBtn = new THREE.Mesh(btnGeo, btnMat);
    bootBtn.position.set(0.008, 0.0018, 0.020);
    espGroup.add(bootBtn);

    // Power & Status LEDs
    const redLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const blueLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ledGeo = new THREE.BoxGeometry(0.0015, 0.001, 0.002);
    const pwrLed = new THREE.Mesh(ledGeo, redLedMat);
    pwrLed.position.set(-0.005, 0.0018, 0.014);
    espGroup.add(pwrLed);
    const statusLed = new THREE.Mesh(ledGeo, blueLedMat);
    statusLed.position.set(0.005, 0.0018, 0.014);
    espGroup.add(statusLed);

    this.robotGroup.add(espGroup);

    // 4. TB6612FNG Dual Driver Breakout (Red Solder Mask, SSOP-24 IC, Header Pins)
    const tbGroup = new THREE.Group();
    tbGroup.position.set(0.028, 0.054, -0.035);

    // Red Breakout PCB
    const tbPcbGeo = new THREE.BoxGeometry(0.022, 0.002, 0.024);
    const tbPcbMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 });
    const tbPcb = new THREE.Mesh(tbPcbGeo, tbPcbMat);
    tbPcb.castShadow = true;
    tbGroup.add(tbPcb);

    // SSOP-24 Driver IC in center
    const tbIcGeo = new THREE.BoxGeometry(0.008, 0.002, 0.014);
    const tbIcMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const tbIc = new THREE.Mesh(tbIcGeo, tbIcMat);
    tbIc.position.set(0, 0.0015, 0);
    tbGroup.add(tbIc);

    // Header Pins on Left and Right sides of breakout
    const tbHdrGeo = new THREE.BoxGeometry(0.0025, 0.004, 0.020);
    const tbLeftHdr = new THREE.Mesh(tbHdrGeo, headerMat);
    tbLeftHdr.position.set(-0.009, -0.002, 0);
    tbGroup.add(tbLeftHdr);
    const tbRightHdr = new THREE.Mesh(tbHdrGeo, headerMat);
    tbRightHdr.position.set(0.009, -0.002, 0);
    tbGroup.add(tbRightHdr);

    this.robotGroup.add(tbGroup);

    // 5. N20 Micro Gear Motors (Brass Gearbox, Steel Cylindrical Can, D-Shaft, L-Brackets)
    const createN20MotorAssembly = (xPos: number, zPos: number, isRight: boolean) => {
      const motorGroup = new THREE.Group();
      motorGroup.position.set(xPos, 0.028, zPos);

      // Brass Micro Gearbox
      const gearboxGeo = new THREE.BoxGeometry(0.012, 0.010, 0.014);
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
      const gearbox = new THREE.Mesh(gearboxGeo, brassMat);
      gearbox.castShadow = true;
      motorGroup.add(gearbox);

      // Cylindrical Steel DC Motor Can
      const motorCanGeo = new THREE.CylinderGeometry(0.0058, 0.0058, 0.016, 16);
      const motorCan = new THREE.Mesh(motorCanGeo, metalMat);
      motorCan.rotation.x = Math.PI / 2;
      motorCan.position.z = isRight ? 0.014 : -0.014;
      motorCan.castShadow = true;
      motorGroup.add(motorCan);

      // Output D-Shaft extending to wheel
      const shaftGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.014, 12);
      const shaft = new THREE.Mesh(shaftGeo, brassMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = isRight ? 0.011 : -0.011;
      motorGroup.add(shaft);

      // Steel L-Mounting Bracket to Chassis
      const bracketGeo = new THREE.BoxGeometry(0.004, 0.012, 0.012);
      const bracket = new THREE.Mesh(bracketGeo, metalMat);
      bracket.position.set(isRight ? -0.006 : 0.006, 0.002, 0);
      motorGroup.add(bracket);

      this.robotGroup.add(motorGroup);
    };

    // Mount logical N20 motors adjacent to drive axles
    createN20MotorAssembly(-0.046, -0.020, false);
    createN20MotorAssembly(0.046, -0.020, true);

    // 6. 4 Wheels with Cyan Anodized Rim Hub, Center Hex Nut, and Rubber Treaded Tires
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

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      const nut = new THREE.Mesh(nutGeo, nutMat);
      nut.rotation.z = Math.PI / 2;
      wheelGroup.add(nut);

      this.robotGroup.add(wheelGroup);
      return tire;
    };

    const halfTrack = 0.07;
    const halfBase = 0.055;

    this.leftFrontWheel = createWheel(-halfTrack, halfBase);
    this.leftRearWheel = createWheel(-halfTrack, -halfBase);
    this.rightFrontWheel = createWheel(halfTrack, halfBase);
    this.rightRearWheel = createWheel(halfTrack, -halfBase);
  }

  public updateRobot(pose: RobotPose, leftAngleRad: number, rightAngleRad: number) {
    this.robotGroup.position.set(pose.x, 0, pose.z);
    this.robotGroup.rotation.y = pose.yawRad;

    // Rotate wheel meshes
    this.leftFrontWheel.rotation.x = leftAngleRad;
    this.leftRearWheel.rotation.x = leftAngleRad;
    this.rightFrontWheel.rotation.x = rightAngleRad;
    this.rightRearWheel.rotation.x = rightAngleRad;
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resetCamera() {
    this.cameraDistance = 0.85;
    this.cameraAzimuth = 0.75;
    this.cameraElevation = 0.45;
    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    const x = this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    const target = this.robotGroup ? this.robotGroup.position : new THREE.Vector3(0, 0.035, 0);
    this.camera.position.set(target.x + x, target.y + y, target.z + z);
    this.camera.lookAt(target.x, target.y + 0.035, target.z);
  }

  private setupOrbitControls() {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraAzimuth -= deltaX * 0.01;
      this.cameraElevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraElevation + deltaY * 0.01));

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(0.2, Math.min(4.0, this.cameraDistance + e.deltaY * 0.001));
      this.updateCameraPosition();
    });
  }

  public handleResize() {
    if (!this.container) return;
    const width = Math.max(this.container.clientWidth || 320, 100);
    const height = Math.max(this.container.clientHeight || 240, 100);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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
