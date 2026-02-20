import { Injectable, inject } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { Patient } from '../patient-form/patient-form';

export type PatientListItem = Patient & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * PatientService - Manages patient data CRUD operations with Firebase
 */
@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private firebaseService = inject(FirebaseService);

  /**
   * Create a new patient in Firebase
   * @param patient - Patient data to save
   * @returns Promise with the generated patient ID
   */
  async createPatient(patient: Patient): Promise<string> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot create patient: User not authenticated');
    }

    // Generate unique patient ID
    const patientId = this.generatePatientId(patient.personalData.idCard);
    const path = `users/${userId}/patients/${patientId}`;

    // Save patient data
    await this.firebaseService.writeData(path, {
      ...patient,
      id: patientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`Patient created with ID: ${patientId}`);
    return patientId;
  }

  /**
   * Get a patient by ID
   * @param patientId - The patient ID
   * @returns Promise with patient data or null if not found
   */
  async getPatient(patientId: string): Promise<Patient | null> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot get patient: User not authenticated');
    }

    const path = `users/${userId}/patients/${patientId}`;
    const data = await this.firebaseService.readData(path);
    return data as Patient | null;
  }

  /**
   * Update an existing patient
   * @param patientId - The patient ID
   * @param patient - Updated patient data
   */
  async updatePatient(patientId: string, patient: Partial<Patient>): Promise<void> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot update patient: User not authenticated');
    }

    const path = `users/${userId}/patients/${patientId}`;
    const existing = await this.firebaseService.readData(path);

    if (!existing) {
      throw new Error(`Patient ${patientId} not found`);
    }

    await this.firebaseService.writeData(path, {
      ...existing,
      ...patient,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Patient ${patientId} updated`);
  }

  /**
   * Delete a patient
   * @param patientId - The patient ID
   */
  async deletePatient(patientId: string): Promise<void> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot delete patient: User not authenticated');
    }

    const path = `users/${userId}/patients/${patientId}`;
    await this.firebaseService.writeData(path, null);
    console.log(`Patient ${patientId} deleted`);
  }

  /**
   * Get all patients for current user
   * @returns Promise with array of patients
   */
  async getAllPatients(): Promise<Patient[]> {
    const userId = this.firebaseService.getCurrentUserId();
    if (!userId) {
      throw new Error('Cannot get patients: User not authenticated');
    }

    const path = `users/${userId}/patients`;
    const data = await this.firebaseService.readData(path);

    if (!data) {
      return [];
    }

    // Convert object to array
    return Object.values(data) as Patient[];
  }

  getPatientsStream(): Observable<PatientListItem[]> {
    return this.firebaseService.currentUser$.pipe(
      switchMap((user) => {
        if (!user) {
          return of([] as PatientListItem[]);
        }

        const path = `users/${user.uid}/patients`;
        return this.firebaseService
          .listenToData(path)
          .pipe(map((data) => this.normalizePatients(data)));
      }),
    );
  }

  private normalizePatients(data: unknown): PatientListItem[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const patientsNode = data as Record<string, unknown>;

    return Object.entries(patientsNode)
      .map(([id, raw]) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }

        const patient = raw as Partial<PatientListItem>;
        return {
          ...(patient as Patient),
          id: typeof patient.id === 'string' && patient.id.length > 0 ? patient.id : id,
          createdAt: typeof patient.createdAt === 'string' ? patient.createdAt : undefined,
          updatedAt: typeof patient.updatedAt === 'string' ? patient.updatedAt : undefined,
        } as PatientListItem;
      })
      .filter((patient): patient is PatientListItem => !!patient)
      .sort((a, b) =>
        (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''),
      );
  }

  /**
   * Generate a unique patient ID based on ID card and timestamp
   * @param idCard - Patient's ID card number
   * @returns Unique patient ID
   */
  private generatePatientId(idCard: string): string {
    const normalizedId = (idCard || 'patient').trim().replace(/\s+/g, '-').toLowerCase();
    return `${normalizedId}-${Date.now()}`;
  }
}
