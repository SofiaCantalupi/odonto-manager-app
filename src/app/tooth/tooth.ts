import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TreatmentType,
  isWholeToothTreatment,
  getTreatmentColor,
} from '../odontogram/dental-types';

// Zone identifier type
export type ToothZone = 'center' | 'top' | 'bottom' | 'left' | 'right';

// Condition types for dental states
export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'filling'
  | 'crown'
  | 'extraction'
  | 'root-canal';

// Data structure for tooth state
export interface ToothSurfaceData {
  center?: ToothCondition;
  top?: ToothCondition;
  bottom?: ToothCondition;
  left?: ToothCondition;
  right?: ToothCondition;
  // Whole tooth treatment (optional)
  wholeToothTreatment?: TreatmentType;
}

@Component({
  selector: 'app-tooth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooth.html',
  styleUrl: './tooth.css',
})
/**
 * ToothComponent - Pure Presentational Component
 *
 * IMPORTANT: This component is PURELY VISUAL and REACTIVE
 * It does NOT emit any events from zone clicks
 * All rendering is based solely on @Input data
 *
 * Responsibility:
 * - Render SVG based on tooth surface data
 * - Display whole-tooth treatments (cross, circle, text labels)
 * - Apply CSS classes based on conditions (caries, filing, etc.)
 *
 * Parent responsibility (OdontogramComponent):
 * - Handle tooth selection (blue highlight)
 * - Handle modal for treatment selection
 * - Update data when treatments are confirmed
 */
export class ToothComponent {
  /**
   * The FDI number of the tooth (1-32 for permanent, 51-85 for deciduous)
   */
  @Input() toothNumber: number = 0;

  /**
   * Current state of each tooth surface/zone
   * This is the ONLY way to control what the component displays
   */
  @Input() data: ToothSurfaceData = {};

  /**
   * SVG viewBox dimensions for easy coordinate calculation
   * Using 100x100 for percentage-based positioning
   */
  readonly viewBoxSize = 100;

  /**
   * Inner square offset (creates the center zone)
   * 30% from each edge
   */
  readonly innerOffset = 30;

  /**
   * SVG polygon points for each zone
   * Calculated based on viewBox of 0 0 100 100
   * Inner square is from (30,30) to (70,70)
   */
  readonly zones = {
    // Center square (Occlusal)
    center: '30,30 70,30 70,70 30,70',
    // Top triangle (Vestibular)
    top: '0,0 100,0 70,30 30,30',
    // Bottom triangle (Lingual/Palatal)
    bottom: '30,70 70,70 100,100 0,100',
    // Left triangle (Mesial)
    left: '0,0 30,30 30,70 0,100',
    // Right triangle (Distal)
    right: '70,30 100,0 100,100 70,70',
  };

  /**
   * Zone labels for accessibility and tooltips
   */
  readonly zoneLabels: Record<ToothZone, string> = {
    center: 'Occlusal',
    top: 'Vestibular',
    bottom: 'Lingual/Palatal',
    left: 'Mesial',
    right: 'Distal',
  };

  /**
   * Check if the tooth has a whole-tooth treatment
   */
  get hasWholeToothTreatment(): boolean {
    return !!this.data.wholeToothTreatment && isWholeToothTreatment(this.data.wholeToothTreatment);
  }

  /**
   * Get the whole-tooth treatment type
   */
  get wholeToothTreatment(): TreatmentType | undefined {
    return this.data.wholeToothTreatment;
  }

  /**
   * Check if tooth has a cross overlay (extraction or missing)
   */
  get hasCrossOverlay(): boolean {
    const treatment = this.data.wholeToothTreatment;
    if (!treatment) return false;
    return treatment === 'extraction' || treatment === 'missing';
  }

  /**
   * Check if tooth has a circle overlay (crown)
   */
  get hasCircleOverlay(): boolean {
    return this.data.wholeToothTreatment === 'crown';
  }

  /**
   * Get the color for the cross overlay
   */
  get crossColor(): string {
    const treatment = this.data.wholeToothTreatment;
    if (!treatment) return '#000000';
    return getTreatmentColor(treatment);
  }

  /**
   * Resolve SVG fill color for each surface zone from configured treatment colors
   */
  getZoneFill(zone: ToothZone): string {
    const condition = this.data[zone];

    if (condition === 'caries') {
      return getTreatmentColor('caries');
    }

    if (condition === 'filling') {
      return getTreatmentColor('filling');
    }

    return '#ffffff';
  }

  /**
   * Resolve SVG stroke color for each surface zone
   */
  getZoneStroke(zone: ToothZone): string {
    const condition = this.data[zone];

    if (condition === 'caries') {
      return getTreatmentColor('caries');
    }

    if (condition === 'filling') {
      return getTreatmentColor('filling');
    }

    return '#6b7280';
  }

  /**
   * Crown overlay color from treatment config
   */
  get crownColor(): string {
    return getTreatmentColor('crown');
  }

  /**
   * Get tooltip text for a zone (for accessibility)
   */
  getTooltip(zone: ToothZone): string {
    const label = this.zoneLabels[zone];
    const condition = this.data[zone] || 'healthy';
    return `${label} - ${condition}`;
  }
}
