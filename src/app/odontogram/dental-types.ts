/**
 * Dental Types - Shared type definitions for the odontogram system
 */

/**
 * Tooth surface identifiers (FDI standard naming)
 */
export type ToothSurface =
  | 'vestibular' // Outer surface (toward cheek/lip) - maps to 'top'
  | 'lingual' // Inner surface (toward tongue) - maps to 'bottom'
  | 'distal' // Away from midline - maps to 'right'
  | 'mesial' // Toward midline - maps to 'left'
  | 'occlusal' // Chewing surface - maps to 'center'
  | 'center'; // Alternative name for occlusal

/**
 * Types of dental treatments/conditions
 */
export type TreatmentType =
  | 'extraction' // Tooth extracted (blue cross)
  | 'missing' // Tooth missing (red cross)
  | 'caries' // Tooth decay (blue fill - surface)
  | 'root-canal' // Root canal treatment (label TC)
  | 'crown' // Crown placed (black circle outline)
  | 'filling' // Filling/Obturacion (red fill - surface)
  | 'implant'; // Dental implant (label IM)

/**
 * Treatment scope - determines how the treatment is visually applied
 */
export type TreatmentScope = 'surface' | 'whole-tooth';

/**
 * Symbol type for whole-tooth treatments
 */
export type TreatmentSymbol = 'cross' | 'circle' | 'text-TC' | 'text-IM' | 'none';

/**
 * Configuration for a treatment type's visual representation
 */
export interface TreatmentConfig {
  /** Display name for the treatment */
  label: string;
  /** Whether it applies to a surface or whole tooth */
  scope: TreatmentScope;
  /** Color for the treatment (hex or Tailwind class) */
  color: string;
  /** Tailwind background class */
  bgClass: string;
  /** Tailwind text/stroke class */
  strokeClass: string;
  /** Symbol to display for whole-tooth treatments */
  symbol: TreatmentSymbol;
}

/**
 * Configuration mapping for all treatment types
 * Defines visual rules for each treatment
 */
export const TREATMENT_CONFIG: Record<TreatmentType, TreatmentConfig> = {
  extraction: {
    label: 'Extraction',
    scope: 'whole-tooth',
    color: '#3b82f6', // Blue-500
    bgClass: 'bg-blue-500',
    strokeClass: 'stroke-blue-500',
    symbol: 'cross',
  },
  missing: {
    label: 'Missing',
    scope: 'whole-tooth',
    color: '#ef4444', // Red-500
    bgClass: 'bg-red-500',
    strokeClass: 'stroke-red-500',
    symbol: 'cross',
  },
  caries: {
    label: 'Caries',
    scope: 'surface',
    color: '#3b82f6', // Blue-500
    bgClass: 'bg-blue-500',
    strokeClass: 'stroke-blue-500',
    symbol: 'none',
  },
  filling: {
    label: 'Filling (Obturación)',
    scope: 'surface',
    color: '#ef4444', // Red-500
    bgClass: 'bg-red-500',
    strokeClass: 'stroke-red-500',
    symbol: 'none',
  },
  crown: {
    label: 'Crown',
    scope: 'whole-tooth',
    color: '#000000', // Black
    bgClass: 'bg-black',
    strokeClass: 'stroke-black',
    symbol: 'circle',
  },
  'root-canal': {
    label: 'Root Canal',
    scope: 'whole-tooth',
    color: '#000000', // Black
    bgClass: 'bg-black',
    strokeClass: 'stroke-black',
    symbol: 'text-TC',
  },
  implant: {
    label: 'Implant',
    scope: 'whole-tooth',
    color: '#000000', // Black
    bgClass: 'bg-black',
    strokeClass: 'stroke-black',
    symbol: 'text-IM',
  },
};

/**
 * A single treatment record for a tooth
 */
export interface ToothTreatment {
  /** The type of treatment */
  type: TreatmentType;
  /** Optional: specific surface affected */
  surface?: ToothSurface;
  /** Optional: clinical notes */
  notes?: string;
  /** Optional: date of treatment */
  date?: string;
}

/**
 * Complete odontogram state
 * Key: tooth number (FDI numbering)
 * Value: Array of treatments for that tooth
 */
export type OdontogramState = Record<number, ToothTreatment[]>;

/**
 * Event emitted when odontogram data changes
 */
export interface OdontogramChangeEvent {
  toothNumber: number;
  treatments: ToothTreatment[];
  action: 'add' | 'remove' | 'update';
}

/**
 * Maps ToothSurface to the ToothZone used by ToothComponent
 */
export function surfaceToZone(
  surface: ToothSurface,
): 'center' | 'top' | 'bottom' | 'left' | 'right' {
  switch (surface) {
    case 'vestibular':
      return 'top';
    case 'lingual':
      return 'bottom';
    case 'distal':
      return 'right';
    case 'mesial':
      return 'left';
    case 'occlusal':
    case 'center':
      return 'center';
    default:
      return 'center';
  }
}

/**
 * Maps TreatmentType to the ToothCondition used by ToothComponent
 * This maps treatments to their fill colors for surface-level display
 */
export function treatmentToCondition(
  type: TreatmentType,
): 'healthy' | 'caries' | 'filling' | 'crown' | 'extraction' | 'root-canal' {
  switch (type) {
    case 'caries':
    case 'extraction':
      return 'caries'; // Blue fill
    case 'filling':
    case 'missing':
      return 'filling'; // Red fill
    case 'crown':
      return 'crown';
    case 'root-canal':
      return 'root-canal';
    case 'implant':
      return 'caries'; // Blue fill
    default:
      return 'healthy';
  }
}

/**
 * Helper to check if a treatment applies to the whole tooth
 */
export function isWholeToothTreatment(type: TreatmentType): boolean {
  return TREATMENT_CONFIG[type].scope === 'whole-tooth';
}

/**
 * Helper to get the symbol for a treatment
 */
export function getTreatmentSymbol(type: TreatmentType): TreatmentSymbol {
  return TREATMENT_CONFIG[type].symbol;
}

/**
 * Helper to get the color for a treatment
 */
export function getTreatmentColor(type: TreatmentType): string {
  return TREATMENT_CONFIG[type].color;
}
