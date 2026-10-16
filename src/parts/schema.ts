export type PartCategory = 'mcu' | 'driver' | 'actuator' | 'power' | 'sensor' | 'passive';

export type PinElectricalType =
  | 'power'
  | 'ground'
  | 'digital_in'
  | 'digital_out'
  | 'analog_in'
  | 'pwm_out'
  | 'motor_out'
  | 'bidirectional';

export interface VoltageSpec {
  min: number;
  typical: number;
  max: number;
}

export interface PartPinManifest {
  name: string;
  type: PinElectricalType;
  description: string;
  nominal_voltage?: number;
  blender_empty?: string;
}

export interface PartPhysicsSpec {
  mass_kg?: number;
  collision_shape?: 'box' | 'cylinder' | 'sphere' | 'convex_hull';
  friction?: number;
}

export interface PartVisualSpec {
  mesh_file?: string;
  color_hex?: string;
  dimensions_m?: [number, number, number];
}

export interface PartManifest {
  schema_version: '1.0.0';
  id: string;
  name: string;
  category: PartCategory;
  description: string;
  operating_voltage?: VoltageSpec;
  current_draw_typical_ma?: number;
  protocol?: string;
  pins: PartPinManifest[];
  physics?: PartPhysicsSpec;
  visual?: PartVisualSpec;
  behavior_script?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePartManifest(manifest: any): ValidationResult {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object'] };
  }

  if (manifest.schema_version !== '1.0.0') {
    errors.push(`Unsupported or missing schema_version. Expected "1.0.0", got "${manifest.schema_version}"`);
  }

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Missing or invalid id string');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Missing or invalid name string');
  }

  const validCategories: PartCategory[] = ['mcu', 'driver', 'actuator', 'power', 'sensor', 'passive'];
  if (!validCategories.includes(manifest.category)) {
    errors.push(`Invalid category "${manifest.category}". Expected one of: ${validCategories.join(', ')}`);
  }

  if (!Array.isArray(manifest.pins) || manifest.pins.length === 0) {
    errors.push('Manifest must define a non-empty "pins" array');
  } else {
    const pinNames = new Set<string>();
    manifest.pins.forEach((pin: any, idx: number) => {
      if (!pin.name || typeof pin.name !== 'string') {
        errors.push(`Pin at index ${idx} missing valid "name"`);
      } else if (pinNames.has(pin.name)) {
        errors.push(`Duplicate pin name "${pin.name}"`);
      } else {
        pinNames.add(pin.name);
      }

      const validPinTypes: PinElectricalType[] = [
        'power',
        'ground',
        'digital_in',
        'digital_out',
        'analog_in',
        'pwm_out',
        'motor_out',
        'bidirectional',
      ];
      if (!validPinTypes.includes(pin.type)) {
        errors.push(`Pin "${pin.name || idx}" has invalid electrical type "${pin.type}"`);
      }
    });
  }

  if (manifest.operating_voltage) {
    const v = manifest.operating_voltage;
    if (typeof v.min !== 'number' || typeof v.typical !== 'number' || typeof v.max !== 'number') {
      errors.push('operating_voltage must contain numerical min, typical, and max values');
    } else if (v.min > v.typical || v.typical > v.max) {
      errors.push('operating_voltage values must satisfy min <= typical <= max');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
