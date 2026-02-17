import { Component, input, output, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToothComponent, ToothSurfaceData } from '../tooth/tooth';
import {
  OdontogramState,
  ToothTreatment,
  OdontogramChangeEvent,
  surfaceToZone,
  treatmentToCondition,
  TREATMENT_CONFIG,
  TreatmentType,
  ToothSurface,
} from './dental-types';
import { OdontogramService } from './odontogram.service';
import { Observable } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToothComponent,
    NzButtonModule,
    NzModalModule,
    NzRadioModule,
    NzStepsModule,
    NzCheckboxModule,
  ],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
})
/**
 * OdontogramComponent - Dental Chart with Selection Management
 *
 * ARCHITECTURE:
 * This component manages ONLY tooth selection via click interactions.
 * All visual rendering is PURELY REACTIVE to @Input data.
 *
 * INTERACTION MODEL:
 * - Click on tooth (number OR SVG) -> selectTooth(toothId)
 * - Selection state syncs to Firebase via OdontogramService
 * - Selected tooth gets blue highlight
 *
 * DATA FLOW:
 * - Parent provides @Input data (OdontogramState from DB)
 * - ToothComponent is purely presentational (@Input only)
 * - Tooth surface colors show existing treatments only
 * - No temporary/transient state created by clicks
 *
 * PARENT RESPONSIBILITY:
 * - Listen to selection changes via selectedTeeth$ observable
 * - Open modal/form when user wants to add/edit treatments
 * - Update @Input data when treatments are confirmed
 * - ToothComponent automatically re-renders based on new data
 */
export class OdontogramComponent implements OnInit {
  constructor(private selectionService: OdontogramService) {
    this.selectedTeeth$ = this.selectionService.selectedTeeth$;
    this.selectedTeethSignal = toSignal(this.selectionService.selectedTeeth$, {
      initialValue: new Set<number>(),
    });
  }

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
   * Observable for selected teeth state
   */
  selectedTeeth$: Observable<Set<number>>;

  /**
   * Signal for selected teeth state (reactive template bindings)
   */
  readonly selectedTeethSignal: () => Set<number>;

  /**
   * Computed property for selected teeth count
   */
  selectedCount = computed(() => this.selectedTeethSignal().size);

  /**
   * Treatment modal state
   */
  isTreatmentModalVisible = false;
  selectedTreatment: TreatmentType | null = null;
  readonly treatmentOptions = Object.entries(TREATMENT_CONFIG).map(([key, config]) => ({
    value: key as TreatmentType,
    label: config.label,
  }));

  /**
   * Surface selection modal state
   */
  isSurfaceModalVisible = false;
  currentSurfaceStep = 0;
  surfaceSelections: Record<number, Set<ToothSurface>> = {};
  lastTreatmentPayload: Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> = [];

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
      case 1:
        return 'Upper Right';
      case 2:
        return 'Upper Left';
      case 3:
        return 'Lower Left';
      case 4:
        return 'Lower Right';
      default:
        return '';
    }
  }

  /**
   * Initialize component and load persisted selections
   */
  ngOnInit(): void {
    this.selectedTeeth$ = this.selectionService.selectedTeeth$;
  }

  /**
   * Handle tooth selection toggle
   * Click on tooth (anywhere) toggles selection and syncs to Firebase
   * @param toothId - The FDI tooth number to select/deselect
   */
  selectTooth(toothId: number): void {
    this.selectionService.toggleToothSelection(toothId);
  }

  /**
   * Check if a specific tooth is selected
   * @param toothId - The FDI tooth number to check
   */
  isToothSelected(toothId: number): boolean {
    return this.selectionService.isToothSelected(toothId);
  }

  /**
   * Clear all selected teeth
   */
  clearSelection(): void {
    this.selectionService.clearSelection();
  }

  /**
   * Open treatment selection modal
   */
  openTreatmentModal(): void {
    this.isTreatmentModalVisible = true;
  }

  /**
   * Close treatment selection modal
   */
  closeTreatmentModal(): void {
    this.isTreatmentModalVisible = false;
  }

  /**
   * Confirm selected treatment (hook for modal-driven updates)
   */
  confirmTreatment(): void {
    if (!this.selectedTreatment) {
      return;
    }

    this.isTreatmentModalVisible = false;

    if (this.isSurfaceTreatment(this.selectedTreatment)) {
      this.initializeSurfaceSelection();
      this.isSurfaceModalVisible = true;
      return;
    }

    this.lastTreatmentPayload = this.buildWholeToothPayload(this.selectedTreatment);
    this.selectionService.saveTreatmentSelections(this.lastTreatmentPayload);
  }

  /**
   * Initialize surface selection for selected teeth
   */
  initializeSurfaceSelection(): void {
    const selectedToothIds = this.getSelectedToothIds();
    this.surfaceSelections = {};
    selectedToothIds.forEach((toothId) => {
      this.surfaceSelections[toothId] = new Set<ToothSurface>();
    });
    this.currentSurfaceStep = 0;
  }

  /**
   * Close surface selection modal
   */
  closeSurfaceModal(): void {
    this.isSurfaceModalVisible = false;
  }

  /**
   * Confirm surface selections and build payload
   */
  confirmSurfaceSelection(): void {
    if (!this.selectedTreatment) {
      return;
    }
    this.lastTreatmentPayload = this.buildSurfacePayload(this.selectedTreatment);
    this.selectionService.saveTreatmentSelections(this.lastTreatmentPayload);
    this.isSurfaceModalVisible = false;
  }

  /**
   * Move to previous tooth in surface selection
   */
  prevSurfaceStep(): void {
    this.currentSurfaceStep = Math.max(0, this.currentSurfaceStep - 1);
  }

  /**
   * Move to next tooth in surface selection
   */
  nextSurfaceStep(): void {
    const maxIndex = this.getSelectedToothIds().length - 1;
    this.currentSurfaceStep = Math.min(maxIndex, this.currentSurfaceStep + 1);
  }

  /**
   * Jump to a specific tooth step
   */
  goToSurfaceStep(index: number): void {
    this.currentSurfaceStep = index;
  }

  /**
   * Toggle a surface selection for the active tooth
   */
  toggleSurface(surface: ToothSurface): void {
    const toothId = this.getCurrentSurfaceToothId();
    if (!toothId) {
      return;
    }
    const set = this.surfaceSelections[toothId] ?? new Set<ToothSurface>();
    if (set.has(surface)) {
      set.delete(surface);
    } else {
      set.add(surface);
    }
    this.surfaceSelections[toothId] = set;
  }

  /**
   * Check if a surface is selected for the active tooth
   */
  isSurfaceSelected(surface: ToothSurface): boolean {
    const toothId = this.getCurrentSurfaceToothId();
    if (!toothId) {
      return false;
    }
    return this.surfaceSelections[toothId]?.has(surface) ?? false;
  }

  /**
   * Determine if treatment needs surface selection
   */
  isSurfaceTreatment(treatment: TreatmentType): boolean {
    return treatment === 'caries' || treatment === 'filling';
  }

  /**
   * Get list of available surfaces
   */
  getSurfacesList(): ToothSurface[] {
    return ['mesial', 'distal', 'vestibular', 'lingual', 'occlusal'] as ToothSurface[];
  }

  /**
   * Get human-readable label for a surface
   */
  getSurfaceLabel(surface: ToothSurface): string {
    const labels: Record<ToothSurface, string> = {
      mesial: 'Mesial',
      distal: 'Distal',
      vestibular: 'Vestibular',
      lingual: 'Lingual/Palatal',
      occlusal: 'Occlusal/Incisal',
      center: 'Occlusal/Incisal',
    };
    return labels[surface] || surface;
  }

  /**
   * Get selected tooth IDs as array
   */
  getSelectedToothIds(): number[] {
    return Array.from(this.selectedTeethSignal()).sort((a, b) => a - b);
  }

  /**
   * Get active tooth for surface selection
   */
  getCurrentSurfaceToothId(): number | null {
    const ids = this.getSelectedToothIds();
    return ids.length > 0 ? ids[this.currentSurfaceStep] : null;
  }

  /**
   * Whether all selected teeth have at least one surface
   */
  canConfirmSurfaceSelection(): boolean {
    const ids = this.getSelectedToothIds();
    if (ids.length === 0) {
      return false;
    }
    return ids.every((id) => (this.surfaceSelections[id]?.size ?? 0) > 0);
  }

  /**
   * Build payload for surface treatments
   */
  buildSurfacePayload(treatment: TreatmentType): Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> {
    const ids = this.getSelectedToothIds();
    return ids.map((toothId) => ({
      toothId,
      surfaces: Array.from(this.surfaceSelections[toothId] ?? []),
      treatment,
    }));
  }

  /**
   * Build payload for whole-tooth treatments
   */
  buildWholeToothPayload(treatment: TreatmentType): Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> {
    const ids = this.getSelectedToothIds();
    return ids.map((toothId) => ({
      toothId,
      surfaces: [],
      treatment,
    }));
  }

  /**
   * Get formatted selection counter text
   */
  getSelectionCounterText(): string {
    const count = this.selectedCount();
    return count === 1 ? '1 tooth selected' : `${count} teeth selected`;
  }
}
