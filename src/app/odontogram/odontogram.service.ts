import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, switchMap, startWith, tap } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { FIREBASE_PATHS } from '../services/firebase.config';

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
      console.warn('Cannot update Firebase: User not authenticated');
      // Still update local state for immediate UI feedback
      this.selectedTeethSubject.next(teeth);
      return;
    }

    const path = FIREBASE_PATHS.selectedTeeth(userId);
    const data = Array.from(teeth).sort((a, b) => a - b);

    // Update Firebase
    this.firebaseService
      .writeData(path, data.length > 0 ? data : null)
      .then(() => {
        console.log('Selected teeth updated in Firebase:', data);
        // Local state will be updated via Firebase listener
      })
      .catch((error) => {
        console.error('Failed to update Firebase:', error);
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
}
