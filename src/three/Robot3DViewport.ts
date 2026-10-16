import * as THREE from 'three';
import { RobotPose } from '../robot/DifferentialDriveChassis';

export class Robot3DViewport {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private robotGroup: THREE.Group;
  private leftFrontWheel: THREE.Mesh;
  private leftRearWheel: THREE.Mesh;
  private rightFrontWheel: THREE.Mesh;
  private rightRearWheel: THREE.Mesh;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 0.8;
  private cameraAzimuth = 0.8;
  private cameraElevation = 0.5;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1117');

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
    this.updateCameraPosition();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 40, 0x00f0ff, 0x1f2937);
    grid.position.y = 0;
    this.scene.add(grid);

    // Floor Plane
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f141c, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Robot Geometry
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);

    // Wheels
    const { lf, lr, rf, rr } = this.buildRobotGeometry();
    this.leftFrontWheel = lf;
    this.leftRearWheel = lr;
    this.rightFrontWheel = rf;
    this.rightRearWheel = rr;

    this.setupOrbitControls();
    window.addEventListener('resize', this.onResize);
  }

  private buildRobotGeometry() {
    // 1. Chassis PCB Base (Matte Black FR4)
    const chassisGeo = new THREE.BoxGeometry(0.12, 0.015, 0.18);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.2 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.035;
    chassis.castShadow = true;
    this.robotGroup.add(chassis);

    // 2. Battery Pack on Chassis
    const battGeo = new THREE.BoxGeometry(0.06, 0.02, 0.08);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const batt = new THREE.Mesh(battGeo, battMat);
    batt.position.set(0, 0.05, -0.02);
    batt.castShadow = true;
    this.robotGroup.add(batt);

    // 3. ESP32 DevKit Module
    const espGeo = new THREE.BoxGeometry(0.035, 0.008, 0.06);
    const espMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const esp = new THREE.Mesh(espGeo, espMat);
    esp.position.set(0, 0.045, 0.04);
    this.robotGroup.add(esp);

    // ESP32 Metal RF Shield
    const shieldGeo = new THREE.BoxGeometry(0.022, 0.005, 0.025);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(0, 0.05, 0.035);
    this.robotGroup.add(shield);

    // 4. TB6612FNG Driver Module
    const tbGeo = new THREE.BoxGeometry(0.025, 0.006, 0.025);
    const tbMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const tb = new THREE.Mesh(tbGeo, tbMat);
    tb.position.set(0.035, 0.045, -0.04);
    this.robotGroup.add(tb);

    // 5. Four Wheels (Cyan Hub + Black Rubber Tire)
    const wheelRadius = 0.032;
    const wheelWidth = 0.016;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });

    const createWheel = (x: number, z: number) => {
      const mesh = new THREE.Mesh(wheelGeo, tireMat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(x, wheelRadius, z);
      mesh.castShadow = true;
      this.robotGroup.add(mesh);
      return mesh;
    };

    const halfTrack = 0.07;
    const halfBase = 0.055;

    const lf = createWheel(-halfTrack, halfBase);
    const lr = createWheel(-halfTrack, -halfBase);
    const rf = createWheel(halfTrack, halfBase);
    const rr = createWheel(halfTrack, -halfBase);

    return { lf, lr, rf, rr };
  }

  public updateRobot(pose: RobotPose, leftAngleRad: number, rightAngleRad: number) {
    this.robotGroup.position.set(pose.x, 0, pose.z);
    this.robotGroup.rotation.y = pose.yawRad;

    // Rotate wheels
    this.leftFrontWheel.rotation.x = leftAngleRad;
    this.leftRearWheel.rotation.x = leftAngleRad;
    this.rightFrontWheel.rotation.x = rightAngleRad;
    this.rightRearWheel.rotation.x = rightAngleRad;
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resetCamera() {
    this.cameraDistance = 0.8;
    this.cameraAzimuth = 0.8;
    this.cameraElevation = 0.5;
    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    const x = this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    const target = this.robotGroup ? this.robotGroup.position : new THREE.Vector3(0, 0.05, 0);
    this.camera.position.set(target.x + x, target.y + y, target.z + z);
    this.camera.lookAt(target.x, target.y + 0.04, target.z);
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

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
