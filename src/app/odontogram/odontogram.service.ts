import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { FIREBASE_PATHS } from '../services/firebase.config';
import {
  OdontogramInitialState,
  OdontogramState,
  ToothTreatment,
  ToothRecord,
  GlobalToothStatus,
  SurfaceTreatment,
  ToothSurface,
  TreatmentType,
} from './dental-types';

/**
 * OdontogramService - Manages tooth selection state and persistence
 * Provides reactive state management for selected teeth with Firebase persistence
 * SSR-compatible: gracefully handles server-side environments
 */
@Injectable({
  providedIn: 'root',
})
export class OdontogramService {
  private firebaseService = inject(FirebaseService);

  // BehaviorSubject to hold the set of selected tooth IDs
  private selectedTeethSubject: BehaviorSubject<Set<number>>;

  // Draft odontogram state (local-only until persisted)
  private temporaryStateSubject = new BehaviorSubject<OdontogramState>({});
  private temporaryGeneralNotesSubject = new BehaviorSubject<string>('');

  // Observable for template binding
  selectedTeeth$: Observable<Set<number>>;
  temporaryState$: Observable<OdontogramState> = this.temporaryStateSubject.asObservable();
  temporaryGeneralNotes$: Observable<string> = this.temporaryGeneralNotesSubject.asObservable();

  constructor() {
    const initialTeeth = new Set<number>();
    this.selectedTeethSubject = new BehaviorSubject<Set<number>>(initialTeeth);

    // Expose selectable observable
    this.selectedTeeth$ = this.selectedTeethSubject.asObservable();
  }

  /**
   * Toggle selection of a single tooth (local-only)
   * @param toothId - The FDI tooth number to toggle
   */
  toggleToothSelection(toothId: number): void {
    const current = this.selectedTeethSubject.value;
    const updated = new Set(current);

    if (updated.has(toothId)) {
      updated.delete(toothId);
    } else {
      updated.add(toothId);
    }

    this.selectedTeethSubject.next(updated);
  }

  /**
   * Select multiple teeth
   * @param toothIds - Array of FDI tooth numbers to select
   */
  selectTeeth(toothIds: number[]): void {
    const updated = new Set(toothIds);
    this.selectedTeethSubject.next(updated);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedTeethSubject.next(new Set());
  }

  /**
   * Check if a specific tooth is selected
   * @param toothId - The FDI tooth number to check
   * @returns true if the tooth is selected
   */
  isToothSelected(toothId: number): boolean {
    return this.selectedTeethSubject.value.has(toothId);
  }

  /**
   * Get the current set of selected teeth
   * @returns Set of selected tooth IDs
   */
  getSelectedTeeth(): Set<number> {
    return new Set(this.selectedTeethSubject.value);
  }

  /**
   * Get the count of selected teeth
   * @returns Number of selected teeth
   */
  getSelectedCount(): number {
    return this.selectedTeethSubject.value.size;
  }

  setTemporaryState(state: OdontogramState): void {
    this.temporaryStateSubject.next(this.cloneState(state));
  }

  getTemporaryState(): OdontogramState {
    return this.cloneState(this.temporaryStateSubject.value);
  }

  clearTemporaryState(): void {
    this.temporaryStateSubject.next({});
    this.temporaryGeneralNotesSubject.next('');
  }

  setTemporaryGeneralNotes(notes: string): void {
    this.temporaryGeneralNotesSubject.next(notes?.trim() ?? '');
  }

  getTemporaryGeneralNotes(): string {
    return this.temporaryGeneralNotesSubject.value;
  }

  applyDraftTreatment(
    state: OdontogramState,
    payload: {
      toothId: number;
      treatment: TreatmentType;
      surfaces: ToothSurface[];
    },
  ): OdontogramState {
    const next = this.cloneState(state);
    const toothId = payload.toothId;
    const existing = next[toothId] ? [...next[toothId]] : [];
    const isSurface = this.isSurfaceTreatmentType(payload.treatment);

    if (isSurface) {
      const validation = this.validateSurfaceTreatment(
        existing,
        payload.treatment,
        payload.surfaces,
      );
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const updated = [...existing];
      for (const surface of payload.surfaces) {
        for (let index = updated.length - 1; index >= 0; index--) {
          if (updated[index].surface === surface) {
            updated.splice(index, 1);
          }
        }
        updated.push({
          type: payload.treatment,
          surface,
          date: new Date().toISOString(),
        });
      }
      next[toothId] = updated;
      return next;
    }

    next[toothId] = [
      {
        type: payload.treatment,
        date: new Date().toISOString(),
      },
    ];
    return next;
  }

  async persistOdontogram(patientId: string): Promise<void> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot persist odontogram: User not authenticated');
    }

    const draftState = this.temporaryStateSubject.value;
    const generalNotes = this.temporaryGeneralNotesSubject.value;
    const serialized = this.serializeOdontogramState(draftState);
    const path = FIREBASE_PATHS.odontogramTreatments(userId, patientId);
    const payload = {
      teeth: serialized,
      generalNotes,
      updatedAt: new Date().toISOString(),
    };

    if (Object.keys(serialized).length === 0 && !generalNotes) {
      await this.firebaseService.writeData(path, null);
      return;
    }

    await this.firebaseService.writeData(path, payload);
  }

  async loadPersistedOdontogram(patientId: string): Promise<OdontogramState> {
    const persisted = await this.loadPersistedOdontogramData(patientId);
    return persisted.state;
  }

  async loadPersistedOdontogramData(
    patientId: string,
  ): Promise<{ state: OdontogramState; generalNotes: string }> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot load odontogram: User not authenticated');
    }

    const path = FIREBASE_PATHS.odontogramTreatments(userId, patientId);
    const data = await this.firebaseService.readData(path);
    return this.normalizePersistedOdontogram(data);
  }

  async initializeDraftForPatient(patientId?: string): Promise<void> {
    if (!patientId) {
      this.clearTemporaryState();
      return;
    }

    const persistedData = await this.loadPersistedOdontogramData(patientId);
    this.setTemporaryState(persistedData.state);
    this.setTemporaryGeneralNotes(persistedData.generalNotes);
  }

  private normalizePersistedOdontogram(data: unknown): {
    state: OdontogramState;
    generalNotes: string;
  } {
    if (!data || typeof data !== 'object') {
      return { state: {}, generalNotes: '' };
    }

    const record = data as { teeth?: unknown; generalNotes?: unknown };

    if ('teeth' in record) {
      return {
        state: this.normalizeTreatmentsNode(record.teeth),
        generalNotes: typeof record.generalNotes === 'string' ? record.generalNotes : '',
      };
    }

    return {
      state: this.normalizeTreatmentsNode(data),
      generalNotes: '',
    };
  }

  private validateSurfaceTreatment(
    existingTreatments: ToothTreatment[],
    treatmentType: TreatmentType,
    surfaces: ToothSurface[],
  ): { valid: boolean; error?: string } {
    if (!this.isSurfaceTreatmentType(treatmentType)) {
      return { valid: true };
    }

    if (!surfaces.length) {
      return {
        valid: false,
        error: 'At least one surface must be selected for this treatment.',
      };
    }

    const blockingGlobalStatus = existingTreatments.find((treatment) =>
      this.isGlobalBlockingType(treatment.type),
    );

    if (blockingGlobalStatus) {
      return {
        valid: false,
        error: `Cannot add surface treatment: tooth has status "${blockingGlobalStatus.type}".`,
      };
    }

    return { valid: true };
  }

  private isSurfaceTreatmentType(type: TreatmentType): boolean {
    return type === 'caries' || type === 'filling';
  }

  private isGlobalBlockingType(type: TreatmentType): boolean {
    return ['missing', 'implant', 'crown', 'extraction', 'root-canal'].includes(type);
  }

  private serializeOdontogramState(state: OdontogramState): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [toothKey, treatments] of Object.entries(state)) {
      if (!treatments || treatments.length === 0) {
        continue;
      }

      const groupedSurfaceTreatments: Record<string, Set<ToothSurface>> = {};
      const records: Array<{ type: TreatmentType; surfaces: ToothSurface[]; timestamp: string }> =
        [];

      for (const treatment of treatments) {
        if (treatment.surface) {
          if (!groupedSurfaceTreatments[treatment.type]) {
            groupedSurfaceTreatments[treatment.type] = new Set<ToothSurface>();
          }
          groupedSurfaceTreatments[treatment.type].add(treatment.surface);
          continue;
        }

        records.push({
          type: treatment.type,
          surfaces: [],
          timestamp: treatment.date || new Date().toISOString(),
        });
      }

      for (const [type, surfaces] of Object.entries(groupedSurfaceTreatments)) {
        records.push({
          type: type as TreatmentType,
          surfaces: Array.from(surfaces),
          timestamp: new Date().toISOString(),
        });
      }

      if (records.length === 1) {
        result[toothKey] = records[0];
      } else if (records.length > 1) {
        result[toothKey] = records;
      }
    }

    return result;
  }

  private normalizeTreatmentsNode(data: unknown): OdontogramState {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const rawNode = data as Record<string, unknown>;
    const result: OdontogramState = {};

    for (const [toothKey, rawValue] of Object.entries(rawNode)) {
      const toothId = Number(toothKey);
      if (Number.isNaN(toothId)) {
        continue;
      }

      const normalized = this.normalizeToothTreatments(rawValue);
      if (normalized.length > 0) {
        result[toothId] = normalized;
      }
    }

    return result;
  }

  private normalizeToothTreatments(rawValue: unknown): ToothTreatment[] {
    if (Array.isArray(rawValue)) {
      return rawValue.flatMap((item) => this.normalizeSingleTreatment(item));
    }

    return this.normalizeSingleTreatment(rawValue);
  }

  private normalizeSingleTreatment(rawValue: unknown): ToothTreatment[] {
    if (!rawValue || typeof rawValue !== 'object') {
      return [];
    }

    const record = rawValue as {
      type?: unknown;
      surfaces?: unknown;
      notes?: unknown;
      timestamp?: unknown;
      date?: unknown;
    };

    if (typeof record.type !== 'string' || !this.isTreatmentType(record.type)) {
      return [];
    }

    const surfaces = Array.isArray(record.surfaces)
      ? record.surfaces.filter((surface): surface is ToothSurface => this.isToothSurface(surface))
      : [];

    const base: Pick<ToothTreatment, 'type' | 'notes' | 'date'> = {
      type: record.type,
      notes: typeof record.notes === 'string' ? record.notes : undefined,
      date:
        typeof record.date === 'string'
          ? record.date
          : typeof record.timestamp === 'string'
            ? record.timestamp
            : undefined,
    };

    if (surfaces.length === 0) {
      return [base];
    }

    return surfaces.map((surface) => ({
      ...base,
      surface,
    }));
  }

  private isTreatmentType(value: string): value is TreatmentType {
    return [
      'extraction',
      'missing',
      'caries',
      'root-canal',
      'crown',
      'filling',
      'implant',
    ].includes(value);
  }

  private cloneState(state: OdontogramState): OdontogramState {
    const result: OdontogramState = {};
    for (const [toothKey, treatments] of Object.entries(state)) {
      const toothId = Number(toothKey);
      if (Number.isNaN(toothId)) {
        continue;
      }
      result[toothId] = treatments.map((treatment) => ({ ...treatment }));
    }
    return result;
  }

  private isToothSurface(value: unknown): value is ToothSurface {
    if (typeof value !== 'string') {
      return false;
    }

    return ['vestibular', 'lingual', 'distal', 'mesial', 'occlusal', 'center'].includes(value);
  }

  /**
   * INITIAL STATE MANAGEMENT
   * Methods for handling the patient's initial mouth condition
   */

  /**
   * Validate if a treatment can be added to a tooth
   *
   * Rules:
   * - If tooth has global status (missing, implant, crown, extraction), no other treatments allowed
   * - A surface cannot have overlapping treatments (must replace existing)
   *
   * @param toothId - The tooth ID to check
   * @param treatmentType - The treatment type attempting to add
   * @param surface - Optional surface (required for surface treatments)
   * @param state - The current odontogram state
   * @returns Object with validation result and optional error message
   */
  canAddTreatment(
    toothId: string,
    treatmentType: TreatmentType,
    surface: ToothSurface | undefined,
    state: OdontogramInitialState,
  ): { valid: boolean; error?: string } {
    const tooth = state.teeth[toothId];

    // If tooth doesn't exist, allow treatment
    if (!tooth) {
      return { valid: true };
    }

    // Rule 1: If tooth has global status, no other treatments can be added
    if (tooth.status) {
      return {
        valid: false,
        error: `Cannot add treatment: Tooth ${toothId} has global status "${tooth.status}". Remove it first.`,
      };
    }

    // Rule 2: For surface treatments, check if surface already has treatment
    if (surface && tooth.surfaces && tooth.surfaces[surface]) {
      return { valid: true }; // Allow replacement
    }

    return { valid: true };
  }

  /**
   * Add or update a treatment for a specific tooth
   *
   * @param toothId - The tooth ID
   * @param treatmentType - The treatment type
   * @param surface - Optional surface (required for surface treatments)
   * @param state - Current odontogram state (will be mutated)
   * @returns Updated OdontogramInitialState
   */
  addToothTreatment(
    toothId: string,
    treatmentType: TreatmentType,
    surface: ToothSurface | undefined,
    state: OdontogramInitialState,
  ): OdontogramInitialState {
    // Validate before adding
    const validation = this.canAddTreatment(toothId, treatmentType, surface, state);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Ensure tooth record exists
    if (!state.teeth[toothId]) {
      state.teeth[toothId] = {};
    }

    const tooth = state.teeth[toothId];
    const isGlobalStatus = this.isGlobalStatus(treatmentType);

    if (isGlobalStatus) {
      // Set global status
      tooth.status = treatmentType as GlobalToothStatus;
      tooth.surfaces = undefined; // Clear surfaces when setting global status
    } else {
      // Add to surfaces
      if (!tooth.surfaces) {
        tooth.surfaces = {} as Record<ToothSurface, SurfaceTreatment>;
      }
      if (surface && tooth.surfaces) {
        tooth.surfaces[surface] = {
          type: treatmentType,
        };
      }
    }

    return state;
  }

  /**
   * Remove a treatment from a tooth
   *
   * @param toothId - The tooth ID
   * @param surface - Optional surface (if removing surface treatment)
   * @param state - Current odontogram state (will be mutated)
   * @returns Updated OdontogramInitialState
   */
  removeToothTreatment(
    toothId: string,
    surface: ToothSurface | undefined,
    state: OdontogramInitialState,
  ): OdontogramInitialState {
    const tooth = state.teeth[toothId];

    if (!tooth) {
      return state;
    }

    if (surface && tooth.surfaces) {
      // Remove specific surface treatment
      delete tooth.surfaces[surface];
      if (Object.keys(tooth.surfaces).length === 0) {
        tooth.surfaces = undefined;
      }
    } else {
      // Remove global status
      tooth.status = undefined;
    }

    return state;
  }

  /**
   * Get treatment for a specific tooth surface
   *
   * @param toothId - The tooth ID
   * @param surface - The surface to check
   * @param state - The odontogram state
   * @returns The surface treatment or undefined
   */
  getSurfaceTreatment(
    toothId: string,
    surface: ToothSurface,
    state: OdontogramInitialState,
  ): SurfaceTreatment | undefined {
    const tooth = state.teeth[toothId];
    return tooth?.surfaces?.[surface];
  }

  /**
   * Get global status of a tooth
   *
   * @param toothId - The tooth ID
   * @param state - The odontogram state
   * @returns The global status or undefined
   */
  getToothStatus(toothId: string, state: OdontogramInitialState): GlobalToothStatus | undefined {
    return state.teeth[toothId]?.status;
  }

  /**
   * Check if a treatment type is a global status
   *
   * @param type - The treatment type
   * @returns true if it's a global status
   */
  private isGlobalStatus(type: TreatmentType): boolean {
    return ['missing', 'implant', 'crown', 'extraction', 'root-canal'].includes(type);
  }

  /**
   * Save initial odontogram state to Firebase
   *
   * @param patientId - The patient ID
   * @param state - The odontogram state to save
   * @param generalNotes - Optional general clinical notes
   * @returns Promise that resolves when saved
   */
  async saveInitialState(
    patientId: string,
    state: OdontogramInitialState,
    generalNotes?: string,
  ): Promise<void> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot save state: User not authenticated');
    }

    const stateToSave: OdontogramInitialState = {
      ...state,
      generalNotes: generalNotes || state.generalNotes,
      dateRecorded: new Date().toISOString(),
    };

    const path = FIREBASE_PATHS.odontogramInitialState(userId, patientId);

    try {
      await this.firebaseService.writeData(path, stateToSave);
    } catch (error) {
      console.error(`Failed to save initial state for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Load initial odontogram state from Firebase
   *
   * @param patientId - The patient ID
   * @returns Promise that resolves with the odontogram state
   */
  async loadInitialState(patientId: string): Promise<OdontogramInitialState | null> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot load state: User not authenticated');
    }

    const path = FIREBASE_PATHS.odontogramInitialState(userId, patientId);

    try {
      const data = await this.firebaseService.readData(path);
      return data as OdontogramInitialState | null;
    } catch (error) {
      console.error(`Failed to load initial state for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Create an empty initial state
   *
   * @param generalNotes - Optional general clinical notes
   * @returns New OdontogramInitialState
   */
  createEmptyState(generalNotes?: string): OdontogramInitialState {
    return {
      teeth: {},
      generalNotes,
      dateRecorded: new Date().toISOString(),
    };
  }
}
