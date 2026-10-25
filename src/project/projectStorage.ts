import { ProjectDocument, validateProjectDocument } from './types';
import { createDefaultProject, DEFAULT_SKETCH, CANONICAL_PIN_MAPPING } from './defaultProject';
import { createStarterLineFollower } from './lineFollowerProject';
import { createStarterRobotArm } from './robotArmProject';
import { createESP32DevKit, createTB6612FNG, createBatteryPack, createN20Motor } from '../circuit/components';
import { WireConnection } from '../circuit/types';

export { createStarterLineFollower } from './lineFollowerProject';
export { createStarterRobotArm } from './robotArmProject';

export interface StoredProject {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isStarter?: boolean;
  document: ProjectDocument;
}

const STORAGE_KEY = 'magicsmoke_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'magicsmoke_active_project_id';

/**
 * Canonical Starter 1: Fully Wired Differential Drive ESP32 Robot
 */
export function createStarter2WDRobot(): StoredProject {
  const doc = createDefaultProject();
  return {
    id: 'starter_2wd_robot',
    name: 'ESP32 2WD Robot with TB6612FNG',
    description: 'Autonomous 2-wheel differential drive robotics platform with dual N20 motors and TB6612FNG driver.',
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
    isStarter: true,
    document: doc,
  };
}

/**
 * Canonical Starter 2: Dual Motor Driver Test Bench
 */
export function createStarterDualMotorBench(): StoredProject {
  const components = [
    createTB6612FNG('tb6612_1', { x: 260, y: 70 }),
    createBatteryPack('batt_1', { x: 260, y: 395 }),
    createN20Motor('motor_left', 'Left N20 Motor', { x: 540, y: 60 }),
    createN20Motor('motor_right', 'Right N20 Motor', { x: 540, y: 220 }),
  ];

  const wires: WireConnection[] = [
    { id: 'w_vm', fromComponentId: 'batt_1', fromPinId: 'POS', toComponentId: 'tb6612_1', toPinId: 'VM', color: '#f59e0b' },
    { id: 'w_gnd_batt', fromComponentId: 'batt_1', fromPinId: 'NEG', toComponentId: 'tb6612_1', toPinId: 'GND', color: '#64748b' },
    { id: 'w_ao1', fromComponentId: 'tb6612_1', fromPinId: 'AO1', toComponentId: 'motor_left', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_ao2', fromComponentId: 'tb6612_1', fromPinId: 'AO2', toComponentId: 'motor_left', toPinId: 'M_NEG', color: '#1e293b' },
    { id: 'w_bo1', fromComponentId: 'tb6612_1', fromPinId: 'BO1', toComponentId: 'motor_right', toPinId: 'M_POS', color: '#ef4444' },
    { id: 'w_bo2', fromComponentId: 'tb6612_1', fromPinId: 'BO2', toComponentId: 'motor_right', toPinId: 'M_NEG', color: '#1e293b' },
  ];

  const doc: ProjectDocument = {
    schemaVersion: '1.0.0',
    name: 'Dual Motor Driver Test Bench',
    board: 'esp32-devkit-v1',
    code: `// MagicSmoke — Motor Driver Test Bench
// Add an ESP32 or microcontroller to generate PWM and direction signals for TB6612FNG.

void setup() {
  Serial.begin(115200);
  Serial.println("Motor Test Bench Ready. Connect logic control pins to begin.");
}

void loop() {
  delay(1000);
}
`,
    components,
    wires,
    simulationConfig: {
      nominalVoltage: 7.4,
      maxRPM: 300,
    },
  };

  return {
    id: 'starter_dual_motor_bench',
    name: 'Dual Motor Driver Test Bench',
    description: 'TB6612FNG connected to 7.4V battery and two N20 gearmotors. Ready for custom MCU wiring.',
    createdAt: 1718000100000,
    updatedAt: 1718000100000,
    isStarter: true,
    document: doc,
  };
}

/**
 * Canonical Starter 3: Standalone ESP32 DevKit V1
 */
export function createStarterMinimalESP32(): StoredProject {
  const components = [
    createESP32DevKit('esp32_1', { x: 120, y: 70 }),
  ];

  const doc: ProjectDocument = {
    schemaVersion: '1.0.0',
    name: 'Minimal ESP32 DevKit V1',
    board: 'esp32-devkit-v1',
    code: `// MagicSmoke — Minimal ESP32 Firmware Template
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 DevKit V1 booted.");
}

void loop() {
  Serial.println("Heartbeat pulse...");
  delay(1000);
}
`,
    components,
    wires: [],
  };

  return {
    id: 'starter_minimal_esp32',
    name: 'Minimal ESP32 DevKit V1',
    description: 'Clean starter with an unrouted ESP32 DevKit V1 board and serial heartbeat sketch.',
    createdAt: 1718000200000,
    updatedAt: 1718000200000,
    isStarter: true,
    document: doc,
  };
}

/**
 * Retrieve all stored projects from localStorage. Initializes starters if empty.
 */
export function getAllStoredProjects(): StoredProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [
        createStarterLineFollower(),
        createStarterRobotArm(),
        createStarter2WDRobot(),
        createStarterDualMotorBench(),
        createStarterMinimalESP32(),
      ];
      saveAllStoredProjects(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [
        createStarterLineFollower(),
        createStarterRobotArm(),
        createStarter2WDRobot(),
        createStarterDualMotorBench(),
        createStarterMinimalESP32(),
      ];
      saveAllStoredProjects(initial);
      return initial;
    }
    let modified = false;
    if (!parsed.some((p: StoredProject) => p.id === 'starter_line_follower_robot')) {
      parsed.unshift(createStarterLineFollower());
      modified = true;
    }
    if (!parsed.some((p: StoredProject) => p.id === 'starter_servo_robot_arm')) {
      const idx = parsed.findIndex((p: StoredProject) => p.id === 'starter_line_follower_robot');
      parsed.splice(idx >= 0 ? idx + 1 : 0, 0, createStarterRobotArm());
      modified = true;
    }
    if (modified) {
      saveAllStoredProjects(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('[PROJECT_STORAGE] Failed to load projects from localStorage:', e);
    return [createStarter2WDRobot()];
  }
}

function saveAllStoredProjects(projects: StoredProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('[PROJECT_STORAGE] Failed to write projects to localStorage:', e);
  }
}

export function getStoredProject(id: string): StoredProject | null {
  const all = getAllStoredProjects();
  return all.find((p) => p.id === id) || null;
}

export function saveStoredProject(doc: ProjectDocument, existingId?: string): StoredProject {
  const all = getAllStoredProjects();
  const now = Date.now();

  if (existingId) {
    const index = all.findIndex((p) => p.id === existingId);
    if (index !== -1) {
      const updated: StoredProject = {
        ...all[index],
        name: doc.name || all[index].name,
        updatedAt: now,
        document: { ...doc, name: doc.name || all[index].name },
      };
      all[index] = updated;
      saveAllStoredProjects(all);
      setActiveProjectId(updated.id);
      return updated;
    }
  }

  // Create new project
  const newId = `proj_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const newProject: StoredProject = {
    id: newId,
    name: doc.name || 'Untitled Circuit',
    description: 'Custom MagicSmoke circuit design',
    createdAt: now,
    updatedAt: now,
    isStarter: false,
    document: { ...doc, name: doc.name || 'Untitled Circuit' },
  };

  all.unshift(newProject);
  saveAllStoredProjects(all);
  setActiveProjectId(newId);
  return newProject;
}

export function duplicateStoredProject(id: string): StoredProject | null {
  const original = getStoredProject(id);
  if (!original) return null;

  const now = Date.now();
  const copyId = `proj_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const clonedDoc: ProjectDocument = JSON.parse(JSON.stringify(original.document));
  clonedDoc.name = `${original.name} (Copy)`;

  const clonedProject: StoredProject = {
    id: copyId,
    name: clonedDoc.name,
    description: original.description ? `Copy of ${original.name}` : undefined,
    createdAt: now,
    updatedAt: now,
    isStarter: false,
    document: clonedDoc,
  };

  const all = getAllStoredProjects();
  all.unshift(clonedProject);
  saveAllStoredProjects(all);
  return clonedProject;
}

export function deleteStoredProject(id: string): boolean {
  const all = getAllStoredProjects();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;

  saveAllStoredProjects(filtered);
  if (getActiveProjectId() === id) {
    localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
  }
  return true;
}

export function renameStoredProject(id: string, newName: string): StoredProject | null {
  const trimmed = newName.trim();
  if (!trimmed) return null;

  const all = getAllStoredProjects();
  const project = all.find((p) => p.id === id);
  if (!project) return null;

  project.name = trimmed;
  project.document.name = trimmed;
  project.updatedAt = Date.now();
  saveAllStoredProjects(all);
  return project;
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
}

export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
}

export function createNewBlankCircuit(): StoredProject {
  const emptyDoc: ProjectDocument = {
    schemaVersion: '1.0.0',
    name: 'New Circuit',
    board: 'esp32-devkit-v1',
    code: DEFAULT_SKETCH,
    components: [
      createESP32DevKit('esp32_1', { x: 80, y: 80 }),
    ],
    wires: [],
  };
  return saveStoredProject(emptyDoc);
}
