import { ComponentInstance, WireConnection } from '../circuit/types';
import { TrackData } from '../robot/TrackModel';
import { RobotArmData } from '../robot/arm/RobotArmModel';

export interface ProjectDocument {
  schemaVersion: '1.0.0';
  name: string;
  board: 'esp32-devkit-v1' | 'arduino-uno-r3';
  code: string;
  components: ComponentInstance[];
  wires: WireConnection[];
  track?: TrackData;
  robotArm?: RobotArmData;
  simulationConfig?: {
    stepTimeSeconds?: number;
    nominalVoltage?: number;
    maxRPM?: number;
  };
}

export interface WorkspacePreferences {
  editorWidthPercent: number;     // e.g. 50%
  drawerOpen: boolean;
  drawerWidthPixels: number;      // e.g. 480px
  consoleCollapsed: boolean;
  activeMobileTab?: 'editor' | 'circuit' | 'viewport';
}

export function validateProjectDocument(doc: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Project document must be an object'] };
  }
  if (doc.schemaVersion !== '1.0.0') {
    errors.push(`Invalid schemaVersion. Expected "1.0.0", got "${doc.schemaVersion}"`);
  }
  if (typeof doc.code !== 'string') {
    errors.push('Missing or invalid code property');
  }
  if (!Array.isArray(doc.components)) {
    errors.push('Missing or invalid components array');
  }
  if (!Array.isArray(doc.wires)) {
    errors.push('Missing or invalid wires array');
  }
  return { valid: errors.length === 0, errors };
}
