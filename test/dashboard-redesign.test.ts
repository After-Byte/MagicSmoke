import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getAllStoredProjects,
  saveStoredProject,
  createNewBlankCircuit,
  duplicateStoredProject,
  deleteStoredProject,
  renameStoredProject,
  getStoredProject,
} from '../src/project/projectStorage';
import { validateProjectDocument } from '../src/project/types';

// Mock localStorage in Vitest
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => {
    mockStorage[k] = v;
  },
  removeItem: (k: string) => {
    delete mockStorage[k];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

describe('MagicSmoke Premium Dashboard Redesign Test Suite', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('strictly validates that zero Autodesk, Tinkercad, or Tinktober strings exist in src/dashboard', () => {
    const dashboardDir = path.resolve(__dirname, '../src/dashboard');
    const files = fs.readdirSync(dashboardDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    expect(files.length).toBeGreaterThanOrEqual(6);

    const bannedKeywords = ['tinkercad', 'autodesk', 'tinktober', 'tinker this'];

    for (const file of files) {
      const content = fs.readFileSync(path.join(dashboardDir, file), 'utf-8').toLowerCase();
      for (const banned of bannedKeywords) {
        expect(content).not.toContain(banned);
      }
    }
  });

  it('verifies MagicSmoke emblem file exists in public/ and is accessible', () => {
    const publicEmblem = path.resolve(__dirname, '../public/magicsmoke-emblem.jpg');
    expect(fs.existsSync(publicEmblem)).toBe(true);
    const stats = fs.statSync(publicEmblem);
    expect(stats.size).toBeGreaterThan(10000);
  });

  it('correctly partitions starter templates and custom designs for the dashboard recent carousel', () => {
    const initial = getAllStoredProjects();
    const starters = initial.filter((p) => p.isStarter);
    expect(starters.length).toBeGreaterThanOrEqual(3);

    // Initial state: 0 custom projects
    let customProjects = initial.filter((p) => !p.isStarter);
    expect(customProjects.length).toBe(0);

    // Create a new custom circuit
    const newCircuit = createNewBlankCircuit();
    expect(newCircuit.id).toBeDefined();

    // Now 1 custom project exists
    const afterCreate = getAllStoredProjects();
    customProjects = afterCreate.filter((p) => !p.isStarter);
    expect(customProjects.length).toBe(1);
    expect(customProjects[0].id).toBe(newCircuit.id);

    // Duplicate custom project
    const dup = duplicateStoredProject(newCircuit.id);
    expect(dup).not.toBeNull();
    const afterDup = getAllStoredProjects().filter((p) => !p.isStarter);
    expect(afterDup.length).toBe(2);

    // Delete custom project
    deleteStoredProject(newCircuit.id);
    const afterDelete = getAllStoredProjects().filter((p) => !p.isStarter);
    expect(afterDelete.length).toBe(1);
  });

  it('validates canonical project documents stored in projectStorage', () => {
    const projects = getAllStoredProjects();
    for (const proj of projects) {
      const validation = validateProjectDocument(proj.document);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(proj.document.components.length).toBeGreaterThan(0);
      expect(Array.isArray(proj.document.wires)).toBe(true);
    }
  });

  it('preserves line follower lab project document structure for 3D simulation', () => {
    const projects = getAllStoredProjects();
    const lf = projects.find(
      (p) =>
        p.id === 'starter_line_follower_robot' ||
        p.id === 'starter_line_follower' ||
        p.name.includes('Line Follower')
    );
    expect(lf).toBeDefined();
    expect(lf?.document.board).toBe('arduino-uno-r3');
    expect(lf?.document.components.some((c) => c.type === 'IR_SENSOR_ARRAY_8CH')).toBe(true);
    expect(lf?.document.components.some((c) => c.type === 'TB6612FNG')).toBe(true);
  });

  it('verifies retro-futuristic cyberpunk tokens and atmospheric background component exist', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('--ms-electric-yellow: #fff000');
    expect(cssContent).toContain('--ms-bg-base: #07081e');
    expect(cssContent).toContain('shadow-hard-yellow');

    const texturePath = path.resolve(__dirname, '../src/dashboard/textures/AtmosphericBackground.tsx');
    expect(fs.existsSync(texturePath)).toBe(true);
    const textureContent = fs.readFileSync(texturePath, 'utf-8');
    expect(textureContent).toContain('ms-analog-noise');
    expect(textureContent).toContain('feTurbulence');
  });

  it('verifies DashboardWhatsNewCarousel contains all 5 target technical illustrations from Image 2', () => {
    const carouselPath = path.resolve(__dirname, '../src/dashboard/DashboardWhatsNewCarousel.tsx');
    const content = fs.readFileSync(carouselPath, 'utf-8');
    expect(content).toContain('// SIGNAL LOG');
    expect(content).toContain('servo-robot-arm');
    expect(content).toContain('line-follower');
    expect(content).toContain('motor-kinematics');
    expect(content).toContain('TRA811PNG');
    expect(content).toContain('track-editor');
    expect(content).toContain('mcu-simulation');
  });

  it('verifies DashboardHeroBanner includes Featured System 04 and simulation telemetry labels', () => {
    const heroPath = path.resolve(__dirname, '../src/dashboard/DashboardHeroBanner.tsx');
    const content = fs.readFileSync(heroPath, 'utf-8');
    expect(content).toContain('FEATURED SYSTEM / 04');
    expect(content).toContain('RS-LAD-SAZ');
    expect(content).toContain('Autonomous line follower robotics lab.');
    expect(content).toContain('Simulation ready');
    expect(content).toContain('60 FPS');
    expect(content).toContain('CLOSED LOOP / ACTIVE');
    expect(content).toContain('PID-8CH');
  });
});
