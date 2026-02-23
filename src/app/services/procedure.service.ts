import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { Procedure, ProcedureFormData } from '../models/procedure';
import { getDatabase, ref, push, update } from 'firebase/database';

/**
 * ProcedureService - Handles CRUD operations for dental procedures
 * Manages procedure data persistence in Firebase Realtime Database
 */
@Injectable({
  providedIn: 'root',
})
export class ProcedureService {
  private firebaseService = inject(FirebaseService);
  private readonly PROCEDURES_PATH = 'procedures';

  /**
   * Get all procedures as an Observable stream
   */
  getProceduresStream(): Observable<Procedure[]> {
    return this.firebaseService
      .listenToData(this.PROCEDURES_PATH)
      .pipe(map((data) => this.normalizeProcedures(data)));
  }

  /**
   * Get all procedures once (no real-time updates)
   */
  async getProcedures(): Promise<Procedure[]> {
    try {
      const data = await this.firebaseService.readData(this.PROCEDURES_PATH);
      return this.normalizeProcedures(data);
    } catch (error: any) {
      if (error?.message?.includes('Permission denied')) {
        console.error(
          '❌ Firebase Permission Denied: Please update your Firebase Realtime Database rules.\n' +
            'See FIREBASE_SETUP.md for instructions.\n' +
            'Quick fix: Go to Firebase Console → Realtime Database → Rules tab and use:\n' +
            '{\n' +
            '  "rules": {\n' +
            '    ".read": "auth != null",\n' +
            '    ".write": "auth != null"\n' +
            '  }\n' +
            '}',
        );
      } else {
        console.warn('Failed to load procedures from Firebase:', error);
      }
      return []; // Return empty array on error
    }
  }

  /**
   * Get a single procedure by ID
   */
  async getProcedureById(id: string): Promise<Procedure | null> {
    const data = await this.firebaseService.readData(`${this.PROCEDURES_PATH}/${id}`);
    if (!data) {
      return null;
    }
    return { id, ...data };
  }

  /**
   * Create a new procedure
   * @returns The generated procedure ID
   */
  async createProcedure(procedureData: ProcedureFormData): Promise<string> {
    // Generate a unique ID using Firebase push
    const database = getDatabase();
    const proceduresRef = ref(database, this.PROCEDURES_PATH);
    const newProcedureRef = push(proceduresRef);
    const procedureId = newProcedureRef.key!;

    // Write the procedure data
    await this.firebaseService.writeData(`${this.PROCEDURES_PATH}/${procedureId}`, procedureData);

    return procedureId;
  }

  /**
   * Update an existing procedure
   */
  async updateProcedure(id: string, procedureData: Partial<ProcedureFormData>): Promise<void> {
    await this.firebaseService.writeData(`${this.PROCEDURES_PATH}/${id}`, procedureData);
  }

  /**
   * Delete a procedure
   */
  async deleteProcedure(id: string): Promise<void> {
    await this.firebaseService.deleteData(`${this.PROCEDURES_PATH}/${id}`);
  }

  /**
   * Search procedures by name or category
   */
  async searchProcedures(query: string): Promise<Procedure[]> {
    const allProcedures = await this.getProcedures();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return allProcedures;
    }

    return allProcedures.filter(
      (procedure) =>
        procedure.name.toLowerCase().includes(lowerQuery) ||
        procedure.category.toLowerCase().includes(lowerQuery) ||
        procedure.description?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get procedures by category
   */
  async getProceduresByCategory(category: string): Promise<Procedure[]> {
    const allProcedures = await this.getProcedures();
    return allProcedures.filter((procedure) => procedure.category === category);
  }

  /**
   * Normalize Firebase data to Procedure array
   */
  private normalizeProcedures(data: Record<string, any> | null): Procedure[] {
    if (!data) {
      return [];
    }

    return Object.entries(data).map(([id, procedureData]) => ({
      id,
      name: procedureData.name || '',
      description: procedureData.description,
      category: procedureData.category || 'general',
      basePrice: procedureData.basePrice || 0,
    }));
  }
}
