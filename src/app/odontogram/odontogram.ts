import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { ToothComponent, ToothSurfaceData } from '../tooth/tooth';
import {
  getTreatmentSymbol,
  isWholeToothTreatment,
  OdontogramChangeEvent,
  OdontogramState,
  surfaceToZone,
  ToothSurface,
  ToothTreatment,
  TREATMENT_CONFIG,
  TreatmentType,
  treatmentToCondition,
} from './dental-types';
import { OdontogramService } from './odontogram.service';

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
export class OdontogramComponent implements OnInit {
  readonly localOdontogramState = signal<OdontogramState>({});

  constructor(private selectionService: OdontogramService) {
    this.selectedTeeth$ = this.selectionService.selectedTeeth$;
    this.selectedTeethSignal = toSignal(this.selectionService.selectedTeeth$, {
      initialValue: new Set<number>(),
    });
  }

  data = input<OdontogramState>({});
  generalNotes = input<string>('');
  patientId = input<string | null>(null);
  readonly = input<boolean>(false);
  dataChange = output<OdontogramChangeEvent>();

  selectedTeeth$: Observable<Set<number>>;
  readonly selectedTeethSignal: () => Set<number>;

  readonly treatmentConfig = TREATMENT_CONFIG;
  selectedCount = computed(() => this.selectedTeethSignal().size);

  isTreatmentModalVisible = false;
  selectedTreatment: TreatmentType | null = null;
  readonly treatmentOptions = Object.entries(TREATMENT_CONFIG).map(([key, config]) => ({
    value: key as TreatmentType,
    label: config.label,
  }));

  isSurfaceModalVisible = false;
  currentSurfaceStep = 0;
  surfaceSelections: Record<number, Set<ToothSurface>> = {};
  surfaceValidationMessage: string | null = null;
  lastTreatmentPayload: Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> = [];

  isConfirmReplaceModalVisible = false;
  private pendingConfirmCallback: (() => void) | null = null;
  generalNotesText = signal<string>('');

  readonly upperArch: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  readonly lowerArch: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  ngOnInit(): void {
    this.initializeDraftState();
  }

  private async initializeDraftState(): Promise<void> {
    const targetPatientId = this.patientId();

    // If readonly mode, just use the input data without initializing draft
    if (this.readonly()) {
      const inputState = this.data() ?? {};
      const localState = this.cloneState(inputState);
      this.localOdontogramState.set(localState);
      this.generalNotesText.set(this.generalNotes() ?? '');
      return;
    }

    try {
      if (targetPatientId) {
        await this.selectionService.initializeDraftForPatient(targetPatientId);
        this.localOdontogramState.set(this.selectionService.getTemporaryState());
        this.generalNotesText.set(this.selectionService.getTemporaryGeneralNotes());
      } else {
        const inputState = this.data() ?? {};
        const localState = this.cloneState(inputState);
        this.localOdontogramState.set(localState);
        this.selectionService.setTemporaryState(localState);
        const initialNotes = this.generalNotes() ?? '';
        this.generalNotesText.set(initialNotes);
        this.selectionService.setTemporaryGeneralNotes(initialNotes);
      }
    } catch (error) {
      console.error('Failed to initialize odontogram draft state:', error);
      const fallback = this.cloneState(this.data() ?? {});
      this.localOdontogramState.set(fallback);
      this.selectionService.setTemporaryState(fallback);
      this.generalNotesText.set(this.generalNotes() ?? '');
    }
  }

  onGeneralNotesChange(value: string): void {
    const notes = value ?? '';
    this.generalNotesText.set(notes);

    if (this.readonly()) {
      return;
    }

    this.selectionService.setTemporaryGeneralNotes(notes);
  }

  getTreatmentsForTooth(toothId: number): ToothTreatment[] {
    return this.getToothCondition(toothId);
  }

  getToothCondition(toothId: number): ToothTreatment[] {
    const state = this.localOdontogramState();
    return state[toothId] || [];
  }

  getWholeToothTreatment(toothId: number): TreatmentType | undefined {
    const treatments = this.getToothCondition(toothId);
    for (let index = treatments.length - 1; index >= 0; index--) {
      const treatment = treatments[index];
      if (!treatment.surface && isWholeToothTreatment(treatment.type)) {
        return treatment.type;
      }
    }
    return undefined;
  }

  getToothTag(toothId: number): 'IM' | 'TC' | null {
    const treatments = this.getToothCondition(toothId);
    for (let index = treatments.length - 1; index >= 0; index--) {
      const treatment = treatments[index];
      if (treatment.surface) {
        continue;
      }

      const symbol = getTreatmentSymbol(treatment.type);
      if (symbol === 'text-IM') {
        return 'IM';
      }
      if (symbol === 'text-RC') {
        return 'TC';
      }
    }

    return null;
  }

  getToothTagLabel(toothId: number): string {
    const treatments = this.getToothCondition(toothId);
    for (let index = treatments.length - 1; index >= 0; index--) {
      const treatment = treatments[index];
      if (treatment.surface) {
        continue;
      }

      const symbol = getTreatmentSymbol(treatment.type);
      if (symbol === 'text-IM' || symbol === 'text-RC') {
        return this.treatmentConfig[treatment.type].label;
      }
    }
    return '';
  }

  getToothData(toothId: number): ToothSurfaceData {
    const treatments = this.getToothCondition(toothId);
    const surfaceData: ToothSurfaceData = {};

    for (const treatment of treatments) {
      if (treatment.surface) {
        const zone = surfaceToZone(treatment.surface);
        const condition = treatmentToCondition(treatment.type);
        surfaceData[zone] = condition;
      } else if (isWholeToothTreatment(treatment.type)) {
        surfaceData.wholeToothTreatment = treatment.type;
      }
    }

    return surfaceData;
  }

  isRightSide(toothNumber: number): boolean {
    const quadrant = Math.floor(toothNumber / 10);
    return quadrant === 1 || quadrant === 4;
  }

  isUpperArchTooth(toothId: number): boolean {
    return toothId >= 10 && toothId <= 29;
  }

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

  selectTooth(toothId: number): void {
    if (this.readonly()) {
      return;
    }
    this.selectionService.toggleToothSelection(toothId);
  }

  isToothSelected(toothId: number): boolean {
    return this.selectionService.isToothSelected(toothId);
  }

  clearSelection(): void {
    if (this.readonly()) {
      return;
    }
    this.selectionService.clearSelection();
  }

  openTreatmentModal(): void {
    if (this.readonly()) {
      return;
    }
    this.selectedTreatment = null;
    this.isTreatmentModalVisible = true;
  }

  closeTreatmentModal(): void {
    this.isTreatmentModalVisible = false;
  }

  confirmTreatment(): void {
    if (!this.selectedTreatment) {
      return;
    }

    if (this.isTreatmentOptionDisabled(this.selectedTreatment)) {
      return;
    }

    const capturedSelectedTeeth = this.getSelectedToothIds();
    const treatment = this.selectedTreatment;

    this.isTreatmentModalVisible = false;

    if (this.isSurfaceTreatment(treatment)) {
      this.initializeSurfaceSelection();
      this.isSurfaceModalVisible = true;
      return;
    }

    this.lastTreatmentPayload = this.buildWholeToothPayload(treatment, capturedSelectedTeeth);

    try {
      this.applyPayloadToDraftState(this.lastTreatmentPayload);
      this.selectedTreatment = null;
      this.clearSelection();
    } catch (error) {
      console.error('Failed to update odontogram draft:', error);
    }
  }

  initializeSurfaceSelection(): void {
    const selectedToothIds = this.getSelectedToothIds();
    this.surfaceSelections = {};
    selectedToothIds.forEach((toothId) => {
      this.surfaceSelections[toothId] = new Set<ToothSurface>();
    });
    this.currentSurfaceStep = 0;
  }

  closeSurfaceModal(): void {
    this.isSurfaceModalVisible = false;
    this.surfaceValidationMessage = null;
  }

  confirmSurfaceSelection(): void {
    if (!this.selectedTreatment) {
      return;
    }

    const capturedSelectedTeeth = this.getSelectedToothIds();
    const capturedSurfaceSelections = { ...this.surfaceSelections };
    const treatment = this.selectedTreatment;

    this.lastTreatmentPayload = capturedSelectedTeeth.map((toothId) => ({
      toothId,
      surfaces: Array.from(capturedSurfaceSelections[toothId] ?? []),
      treatment,
    }));

    if (this.hasAnySelectedSurfaceConflict()) {
      this.pendingConfirmCallback = () => this.applyPayloadToDraftStateAfterConfirm();
      this.isConfirmReplaceModalVisible = true;
      return;
    }

    try {
      this.applyPayloadToDraftState(this.lastTreatmentPayload);
      this.isSurfaceModalVisible = false;
      this.selectedTreatment = null;
      this.surfaceValidationMessage = null;
      this.clearSelection();
    } catch (error) {
      console.error('Failed to update odontogram draft surfaces:', error);
    }
  }

  private applyPayloadToDraftState(
    payload: Array<{
      toothId: number;
      treatment: TreatmentType;
      surfaces: ToothSurface[];
    }>,
  ): void {
    let nextState = this.cloneState(this.localOdontogramState());

    for (const record of payload) {
      nextState = this.selectionService.applyDraftTreatment(nextState, record);
      this.dataChange.emit({
        toothNumber: record.toothId,
        treatments: nextState[record.toothId] ?? [],
        action: 'update',
      });
    }

    this.localOdontogramState.set(nextState);
    this.selectionService.setTemporaryState(nextState);
  }

  prevSurfaceStep(): void {
    this.currentSurfaceStep = Math.max(0, this.currentSurfaceStep - 1);
  }

  nextSurfaceStep(): void {
    const maxIndex = this.getSelectedToothIds().length - 1;
    this.currentSurfaceStep = Math.min(maxIndex, this.currentSurfaceStep + 1);
  }

  goToSurfaceStep(index: number): void {
    this.currentSurfaceStep = index;
  }

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
    this.surfaceValidationMessage = this.hasAnySelectedSurfaceConflict()
      ? 'Warning: applying caries will replace existing filling on selected surfaces.'
      : null;
  }

  isSurfaceSelected(surface: ToothSurface): boolean {
    const toothId = this.getCurrentSurfaceToothId();
    if (!toothId) {
      return false;
    }
    return this.surfaceSelections[toothId]?.has(surface) ?? false;
  }

  isSurfaceTreatment(treatment: TreatmentType): boolean {
    return treatment === 'caries' || treatment === 'filling';
  }

  getSurfacesList(): ToothSurface[] {
    return ['mesial', 'distal', 'vestibular', 'lingual', 'occlusal'] as ToothSurface[];
  }

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

  getSelectedToothIds(): number[] {
    const selected = this.selectedTeethSignal();
    return Array.from(selected).sort((a, b) => a - b);
  }

  getCurrentSurfaceToothId(): number | null {
    const ids = this.getSelectedToothIds();
    return ids.length > 0 ? ids[this.currentSurfaceStep] : null;
  }

  canConfirmSurfaceSelection(): boolean {
    const ids = this.getSelectedToothIds();
    if (ids.length === 0) {
      return false;
    }
    if (!ids.every((id) => (this.surfaceSelections[id]?.size ?? 0) > 0)) {
      return false;
    }

    return true;
  }

  isTreatmentOptionDisabled(treatment: TreatmentType): boolean {
    const requiresNoGlobalStatus = this.isSurfaceTreatment(treatment) || treatment === 'root-canal';

    if (!requiresNoGlobalStatus) {
      return false;
    }

    const selectedIds = this.getSelectedToothIds();
    if (selectedIds.length === 0) {
      return false;
    }

    return selectedIds.some((toothId) => this.hasBlockingGlobalStatus(toothId));
  }

  getTreatmentOptionDisabledReason(treatment: TreatmentType): string | null {
    if (!this.isTreatmentOptionDisabled(treatment)) {
      return null;
    }

    if (treatment === 'root-canal') {
      return 'Root canal is not allowed when a selected tooth already has a global status (missing, crown, extraction, implant, root canal).';
    }

    return 'Surface treatments are not allowed when a selected tooth has a global status (missing, crown, extraction, implant, root canal).';
  }

  isSurfaceDisabled(surface: ToothSurface): boolean {
    return false;
  }

  private hasBlockingGlobalStatus(toothId: number): boolean {
    const treatments = this.getToothCondition(toothId);
    return treatments.some(
      (treatment) =>
        !treatment.surface &&
        ['missing', 'crown', 'extraction', 'implant', 'root-canal'].includes(treatment.type),
    );
  }

  private hasAnySelectedSurfaceConflict(): boolean {
    if (this.selectedTreatment !== 'caries') {
      return false;
    }

    return this.getSelectedToothIds().some((toothId) => {
      const selectedSurfaces = this.surfaceSelections[toothId] ?? new Set<ToothSurface>();
      return Array.from(selectedSurfaces).some((surface) =>
        this.isSurfaceConflict(toothId, surface),
      );
    });
  }

  private isSurfaceConflict(toothId: number, surface: ToothSurface): boolean {
    if (this.selectedTreatment !== 'caries') {
      return false;
    }

    const treatments = this.getToothCondition(toothId);
    for (let index = treatments.length - 1; index >= 0; index--) {
      const treatment = treatments[index];
      if (treatment.surface === surface) {
        return treatment.type === 'filling';
      }
    }

    return false;
  }

  buildSurfacePayload(
    treatment: TreatmentType,
    selectedToothIds?: number[],
  ): Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> {
    const ids = selectedToothIds ?? this.getSelectedToothIds();
    return ids.map((toothId) => ({
      toothId,
      surfaces: Array.from(this.surfaceSelections[toothId] ?? []),
      treatment,
    }));
  }

  buildWholeToothPayload(
    treatment: TreatmentType,
    selectedToothIds?: number[],
  ): Array<{
    toothId: number;
    treatment: TreatmentType;
    surfaces: ToothSurface[];
  }> {
    const ids = selectedToothIds ?? this.getSelectedToothIds();
    return ids.map((toothId) => ({
      toothId,
      surfaces: [],
      treatment,
    }));
  }

  getSelectionCounterText(): string {
    const count = this.selectedCount();
    return count === 1 ? '1 tooth selected' : `${count} teeth selected`;
  }

  hasSelectedToothWithTreatments(): boolean {
    return this.getSelectedToothIds().some((toothId) => this.hasAnyTreatments(toothId));
  }

  hasAnyTreatments(toothId: number): boolean {
    return this.getToothCondition(toothId).length > 0;
  }

  private cloneState(state: OdontogramState): OdontogramState {
    const result: OdontogramState = {};
    for (const [toothKey, treatments] of Object.entries(state)) {
      const toothId = Number(toothKey);
      if (!Number.isNaN(toothId)) {
        result[toothId] = treatments.map((treatment) => ({ ...treatment }));
      }
    }
    return result;
  }

  onConfirmReplace(): void {
    this.isConfirmReplaceModalVisible = false;
    if (this.pendingConfirmCallback) {
      this.pendingConfirmCallback();
      this.pendingConfirmCallback = null;
    }
  }

  onCancelReplace(): void {
    this.isConfirmReplaceModalVisible = false;
    this.pendingConfirmCallback = null;
  }

  private applyPayloadToDraftStateAfterConfirm(): void {
    try {
      this.applyPayloadToDraftState(this.lastTreatmentPayload);
      this.isSurfaceModalVisible = false;
      this.selectedTreatment = null;
      this.surfaceValidationMessage = null;
      this.clearSelection();
    } catch (error) {
      console.error('Failed to apply surface treatments after confirmation:', error);
    }
  }

  clearSelectedTeeth(): void {
    const selectedToothIds = this.getSelectedToothIds();
    if (selectedToothIds.length === 0) {
      return;
    }

    let nextState = this.cloneState(this.localOdontogramState());

    for (const toothId of selectedToothIds) {
      nextState[toothId] = [];
      this.dataChange.emit({
        toothNumber: toothId,
        treatments: [],
        action: 'remove',
      });
    }

    this.localOdontogramState.set(nextState);
    this.selectionService.setTemporaryState(nextState);
    this.isTreatmentModalVisible = false;
    this.selectedTreatment = null;
    this.clearSelection();
  }

  removeSurfaceFromTooth(toothId: number, surface: ToothSurface): void {
    let nextState = this.cloneState(this.localOdontogramState());
    const treatments = nextState[toothId] || [];

    nextState[toothId] = treatments.filter((t) => !(t.surface === surface));

    this.localOdontogramState.set(nextState);
    this.selectionService.setTemporaryState(nextState);
    this.surfaceValidationMessage = null;

    this.dataChange.emit({
      toothNumber: toothId,
      treatments: nextState[toothId] ?? [],
      action: 'update',
    });
  }

  getExistingSurfaceTreatments(
    toothId: number,
  ): Array<{ surface: ToothSurface; type: TreatmentType }> {
    const treatments = this.getToothCondition(toothId);
    return treatments
      .filter((t) => t.surface)
      .map((t) => ({
        surface: t.surface as ToothSurface,
        type: t.type,
      }));
  }

  getSurfaceTreatmentLabel(surface: ToothSurface, treatmentType: TreatmentType): string {
    const surfaceLabel = this.getSurfaceLabel(surface);
    const treatmentLabel = this.treatmentConfig[treatmentType]?.label || treatmentType;
    return `${surfaceLabel} - ${treatmentLabel}`;
  }
}
