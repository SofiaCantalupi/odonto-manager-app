import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  OdontogramState,
  ToothTreatment,
  ToothSurface,
  TreatmentType,
} from '../models/dental-types';
import { Database } from '../models/supabase';

/**
 * OdontogramService - Manages tooth selection state and persistence
 * Provides reactive state management for selected teeth with Supabase persistence
 * SSR-compatible: gracefully handles server-side environments
 */
@Injectable({
  providedIn: 'root',
})
export class OdontogramService {
  private supabaseService = inject(SupabaseService);

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

  /**
   * Persist odontogram state to Supabase
   * @param patientId - The patient ID
   */
  async persistOdontogram(patientId: string): Promise<void> {
    const draftState = this.temporaryStateSubject.value;
    const generalNotes = this.temporaryGeneralNotesSubject.value;

    // 1. Delete existing treatments for this patient
    const { error: deleteError } = await this.supabaseService.client
      .from('selected_teeth')
      .delete()
      .eq('patient_id', patientId);

    if (deleteError) throw deleteError;

    // 2. Prepare new records
    const records: Database['public']['Tables']['selected_teeth']['Insert'][] = [];

    for (const [toothNumber, treatments] of Object.entries(draftState)) {
      for (const t of treatments) {
        records.push({
          patient_id: patientId,
          tooth_number: parseInt(toothNumber),
          treatment_type: t.type,
          surface: t.surface || null,
          notes: t.notes || null,
          date: t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0],
        });
      }
    }

    // 3. Insert new records
    if (records.length > 0) {
      const { error: insertError } = await this.supabaseService.client
        .from('selected_teeth')
        .insert(records);

      if (insertError) throw insertError;
    }

    // 4. Update general notes in patient record
    const { error: patientUpdateError } = await this.supabaseService.client
      .from('patients')
      .update({ pathologies: generalNotes }) // Re-using pathologies for general notes for now
      .eq('id', patientId);

    if (patientUpdateError) throw patientUpdateError;
  }

  /**
   * Load persisted odontogram state from Supabase
   * @param patientId - The patient ID
   */
  async loadPersistedOdontogram(patientId: string): Promise<OdontogramState> {
    const persisted = await this.loadPersistedOdontogramData(patientId);
    return persisted.state;
  }

  /**
   * Load persisted odontogram data from Supabase
   * @param patientId - The patient ID
   */
  async loadPersistedOdontogramData(
    patientId: string,
  ): Promise<{ state: OdontogramState; generalNotes: string }> {
    // 1. Get treatments
    const { data: treatmentsData, error: treatmentsError } = await this.supabaseService.client
      .from('selected_teeth')
      .select('*')
      .eq('patient_id', patientId);

    if (treatmentsError) throw treatmentsError;

    // 2. Get general notes (pathologies) from patient
    const { data: patientData, error: patientError } = await this.supabaseService.client
      .from('patients')
      .select('pathologies')
      .eq('id', patientId)
      .single();

    if (patientError) throw patientError;

    // 3. Normalize state
    const state: OdontogramState = {};
    (treatmentsData || []).forEach((record) => {
      const toothNum = record.tooth_number;
      if (!state[toothNum]) state[toothNum] = [];
      state[toothNum].push({
        type: record.treatment_type as TreatmentType,
        surface: (record.surface as ToothSurface) || undefined,
        notes: record.notes || undefined,
        date: record.date || undefined,
      });
    });

    return {
      state,
      generalNotes: patientData?.pathologies || '',
    };
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
}
