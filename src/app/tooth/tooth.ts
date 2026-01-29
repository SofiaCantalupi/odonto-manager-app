import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Zone identifier type
export type ToothZone = 'center' | 'top' | 'bottom' | 'left' | 'right';

// Condition types for dental states
export type ToothCondition = 'healthy' | 'caries' | 'filling' | 'crown' | 'extraction' | 'root-canal';

// Data structure for tooth state
export interface ToothSurfaceData {
  center?: ToothCondition;
  top?: ToothCondition;
  bottom?: ToothCondition;
  left?: ToothCondition;
  right?: ToothCondition;
}

// Event emitted when a zone is clicked
export interface ToothZoneClickEvent {
  toothNumber: number;
  zone: ToothZone;
  currentCondition?: ToothCondition;
}

@Component({
  selector: 'app-tooth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooth.html',
  styleUrl: './tooth.css',
})
export class ToothComponent {
  /**
   * The FDI number of the tooth (1-32 for permanent, 51-85 for deciduous)
   */
  @Input() toothNumber: number = 0;

  /**
   * Current state of each tooth surface/zone
   */
  @Input() data: ToothSurfaceData = {};

  /**
   * Event emitted when a zone is clicked
   */
  @Output() zoneClick = new EventEmitter<ToothZoneClickEvent>();

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
    right: '70,30 100,0 100,100 70,70'
  };

  /**
   * Zone labels for accessibility and tooltips
   */
  readonly zoneLabels: Record<ToothZone, string> = {
    center: 'Occlusal',
    top: 'Vestibular',
    bottom: 'Lingual/Palatal',
    left: 'Mesial',
    right: 'Distal'
  };

  /**
   * Get the CSS class for a specific zone based on its condition
   */
  getZoneClass(zone: ToothZone): string {
    const condition = this.data[zone];
    
    if (!condition || condition === 'healthy') {
      return 'zone-default';
    }

    switch (condition) {
      case 'caries':
        return 'zone-caries';
      case 'filling':
        return 'zone-filling';
      case 'crown':
        return 'zone-crown';
      case 'extraction':
        return 'zone-extraction';
      case 'root-canal':
        return 'zone-root-canal';
      default:
        return 'zone-default';
    }
  }

  /**
   * Handle click on a zone
   */
  onZoneClick(zone: ToothZone): void {
    this.zoneClick.emit({
      toothNumber: this.toothNumber,
      zone,
      currentCondition: this.data[zone]
    });
  }

  /**
   * Get tooltip text for a zone
   */
  getTooltip(zone: ToothZone): string {
    const label = this.zoneLabels[zone];
    const condition = this.data[zone] || 'healthy';
    return `${label} - ${condition}`;
  }
}
