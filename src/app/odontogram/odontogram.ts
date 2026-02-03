import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToothComponent, ToothSurfaceData, ToothZoneClickEvent } from '../tooth/tooth';
import { 
  OdontogramState, 
  ToothTreatment, 
  OdontogramChangeEvent,
  surfaceToZone,
  treatmentToCondition
} from './dental-types';

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule, ToothComponent],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
})
export class OdontogramComponent {
  /**
   * Signal Input: The current state of the odontogram
   * Uses modern Angular 18+ signal input API
   */
  data = input<OdontogramState>({});

  /**
   * Signal Input: Whether the odontogram is read-only
   */
  readonly = input<boolean>(false);

  /**
   * Output: Emitted when odontogram data changes
   */
  dataChange = output<OdontogramChangeEvent>();

  /**
   * Output: Emitted when a tooth zone is clicked
   */
  toothClick = output<ToothZoneClickEvent>();

  /**
   * Upper arch teeth (FDI numbering: right to left from patient's perspective)
   * 18-11: Upper right (third molar to central incisor)
   * 21-28: Upper left (central incisor to third molar)
   */
  readonly upperArch: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];

  /**
   * Lower arch teeth (FDI numbering: right to left from patient's perspective)
   * 48-41: Lower right (third molar to central incisor)
   * 31-38: Lower left (central incisor to third molar)
   */
  readonly lowerArch: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  /**
   * Get treatments for a specific tooth
   * @param toothId - The FDI tooth number
   * @returns Array of treatments for the tooth, or empty array
   */
  getTreatmentsForTooth(toothId: number): ToothTreatment[] {
    const state = this.data();
    return state[toothId] || [];
  }

  /**
   * Convert treatments to ToothSurfaceData format for the ToothComponent
   * @param toothId - The FDI tooth number
   * @returns ToothSurfaceData object with conditions per zone
   */
  getToothData(toothId: number): ToothSurfaceData {
    const treatments = this.getTreatmentsForTooth(toothId);
    const surfaceData: ToothSurfaceData = {};

    for (const treatment of treatments) {
      if (treatment.surface) {
        // Map surface to zone and treatment to condition
        const zone = surfaceToZone(treatment.surface);
        const condition = treatmentToCondition(treatment.type);
        surfaceData[zone] = condition;
      } else {
        // If no surface specified, apply to all zones for certain treatments
        if (treatment.type === 'extraction' || treatment.type === 'missing') {
          surfaceData.center = 'extraction';
          surfaceData.top = 'extraction';
          surfaceData.bottom = 'extraction';
          surfaceData.left = 'extraction';
          surfaceData.right = 'extraction';
        } else if (treatment.type === 'crown') {
          surfaceData.center = 'crown';
          surfaceData.top = 'crown';
          surfaceData.bottom = 'crown';
          surfaceData.left = 'crown';
          surfaceData.right = 'crown';
        }
      }
    }

    return surfaceData;
  }

  /**
   * Handle tooth zone click events
   * @param event - The click event from ToothComponent
   */
  onToothZoneClick(event: ToothZoneClickEvent): void {
    if (this.readonly()) {
      return;
    }

    this.toothClick.emit(event);
  }

  /**
   * Check if a tooth number is in the right side (quadrants 1 and 4)
   */
  isRightSide(toothNumber: number): boolean {
    const quadrant = Math.floor(toothNumber / 10);
    return quadrant === 1 || quadrant === 4;
  }

  /**
   * Get the quadrant label for a tooth
   */
  getQuadrantLabel(toothNumber: number): string {
    const quadrant = Math.floor(toothNumber / 10);
    switch (quadrant) {
      case 1: return 'Upper Right';
      case 2: return 'Upper Left';
      case 3: return 'Lower Left';
      case 4: return 'Lower Right';
      default: return '';
    }
  }
}
