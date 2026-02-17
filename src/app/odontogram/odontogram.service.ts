import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, switchMap, startWith, tap } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { FIREBASE_PATHS } from '../services/firebase.config';
import {
  OdontogramInitialState,
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

  // Observable for template binding with Firebase sync
  selectedTeeth$: Observable<Set<number>>;

  constructor() {
    const initialTeeth = new Set<number>();
    this.selectedTeethSubject = new BehaviorSubject<Set<number>>(initialTeeth);

    // Setup Firebase synchronization
    this.setupFirebaseSync();

    // Expose selectable observable
    this.selectedTeeth$ = this.selectedTeethSubject.asObservable();
  }

  /**
   * Setup Firebase real-time synchronization
   * Listen to Firebase changes and update local state
   */
  private setupFirebaseSync(): void {
    // Wait for Firebase initialization and user auth
    this.firebaseService.currentUser$
      .pipe(
        switchMap((user) => {
          if (!user) {
            // No user, return empty observable
            return new Observable<Set<number>>((observer) => {
              observer.next(new Set());
              observer.complete();
            });
          }

          // User exists, listen to their selected teeth in Firebase
          const path = FIREBASE_PATHS.selectedTeeth(user.uid);
          return this.firebaseService.listenToData(path).pipe(
            startWith(null),
            tap((data) => {
              if (data && Array.isArray(data)) {
                // Data from Firebase
                this.selectedTeethSubject.next(new Set(data));
              } else if (data === null) {
                // No data in Firebase yet
                this.selectedTeethSubject.next(new Set());
              }
            }),
          );
        }),
      )
      .subscribe({
        error: (error) => {
          console.error('Error syncing with Firebase:', error);
        },
      });
  }

  /**
   * Toggle selection of a single tooth
   * Updates both local state and Firebase simultaneously
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

    this.updateSelectionInFirebase(updated);
  }

  /**
   * Select multiple teeth
   * @param toothIds - Array of FDI tooth numbers to select
   */
  selectTeeth(toothIds: number[]): void {
    const updated = new Set(toothIds);
    this.updateSelectionInFirebase(updated);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.updateSelectionInFirebase(new Set());
  }

  /**
   * Update selection in Firebase and local state
   * @param teeth - Set of selected tooth IDs
   */
  private updateSelectionInFirebase(teeth: Set<number>): void {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      // Still update local state for immediate UI feedback
      this.selectedTeethSubject.next(teeth);
      return;
    }

    const path = FIREBASE_PATHS.selectedTeeth(userId);
    const data = Array.from(teeth).sort((a, b) => a - b);

    // Update Firebase
    this.firebaseService
      .writeData(path, data.length > 0 ? data : null)
      .catch((error) => {
        console.error('Failed to update selectedTeeth in Firebase:', error);
        // Fallback: still update local state
        this.selectedTeethSubject.next(teeth);
      });
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

  /**
   * Save treatment selections for multiple teeth
   * @param payload - Array of treatment records with tooth ID, treatment type, and surfaces
   * @returns Promise that resolves when all treatments are saved
   */
  saveTreatmentSelections(
    payload: Array<{
      toothId: number;
      treatment: string;
      surfaces: string[];
    }>,
  ): Promise<void> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      return Promise.reject(new Error('User not authenticated'));
    }

    if (!payload || payload.length === 0) {
      return Promise.resolve();
    }

    // Create array of promises for all treatment saves
    const savePromises = payload.map((record) => {
      const path = FIREBASE_PATHS.treatments(userId, record.toothId);
      return this.firebaseService.writeData(path, {
        type: record.treatment,
        surfaces: record.surfaces,
        timestamp: new Date().toISOString(),
      });
    });

    // Wait for ALL treatment saves to complete
    return Promise.all(savePromises)
      .catch((error) => {
        console.error('Error saving treatments to Firebase:', error);
        throw error;
      })
      .then(() => {
        // Explicitly return void
        return;
      });
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
