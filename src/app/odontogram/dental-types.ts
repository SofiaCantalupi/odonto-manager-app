/**
 * Dental Types - Shared type definitions for the odontogram system
 */

/**
 * Tooth surface identifiers (FDI standard naming)
 */
export type ToothSurface = 
  | 'vestibular'  // Outer surface (toward cheek/lip) - maps to 'top'
  | 'lingual'     // Inner surface (toward tongue) - maps to 'bottom'
  | 'distal'      // Away from midline - maps to 'right'
  | 'mesial'      // Toward midline - maps to 'left'
  | 'occlusal'    // Chewing surface - maps to 'center'
  | 'center';     // Alternative name for occlusal

/**
 * Types of dental treatments/conditions
 */
export type TreatmentType = 
  | 'caries'      // Tooth decay (red)
  | 'extraction'  // Tooth removed (dark gray)
  | 'crown'       // Crown placed (gold)
  | 'endodontics' // Root canal treatment (purple)
  | 'implant'     // Dental implant (blue)
  | 'missing'     // Tooth missing (dark gray)
  | 'filling';    // Filling placed (blue)

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
export function surfaceToZone(surface: ToothSurface): 'center' | 'top' | 'bottom' | 'left' | 'right' {
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
 */
export function treatmentToCondition(type: TreatmentType): 'healthy' | 'caries' | 'filling' | 'crown' | 'extraction' | 'root-canal' {
  switch (type) {
    case 'caries':
      return 'caries';
    case 'filling':
    case 'implant':
      return 'filling';
    case 'crown':
      return 'crown';
    case 'extraction':
    case 'missing':
      return 'extraction';
    case 'endodontics':
      return 'root-canal';
    default:
      return 'healthy';
  }
}
