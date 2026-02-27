import { Injectable, inject } from '@angular/core';
import { map, Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Patient } from '../patient-form/patient-form';
import { Database } from '../models/supabase';

export type PatientListItem = Patient & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * PatientService - Manages patient data CRUD operations with Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private supabaseService = inject(SupabaseService);

  /**
   * Create a new patient in Supabase
   * @param patient - Patient data to save
   * @returns Promise with the generated patient ID
   */
  async createPatient(patient: Patient): Promise<string> {
    const { data, error } = await this.supabaseService.client
      .from('patients')
      .insert({
        first_name: patient.personalData.firstName,
        last_name: patient.personalData.lastName,
        id_card: patient.personalData.idCard,
        birth_date: patient.personalData.birthDate,
        address: patient.personalData.address,
        phone: patient.personalData.phone,
        is_orthodontic: patient.personalData.isOrthodontic,
        has_insurance: patient.insuranceInfo.hasInsurance,
        insurance_name: patient.insuranceInfo.insuranceName,
        affiliate_number: patient.insuranceInfo.affiliateNumber,
        pathologies: patient.dentalRecord.pathologies,
        allergies: patient.dentalRecord.allergies,
        medication: patient.dentalRecord.medication,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      throw error;
    }

    console.log(`Patient created with ID: ${data.id}`);
    return data.id;
  }

  /**
   * Get a patient by ID
   * @param patientId - The patient ID
   * @returns Promise with patient data or null if not found
   */
  async getPatient(patientId: string): Promise<Patient | null> {
    const { data, error } = await this.supabaseService.client
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error getting patient:', error);
      throw error;
    }

    return this.mapSupabaseToPatient(data);
  }

  /**
   * Update an existing patient
   * @param patientId - The patient ID
   * @param patient - Updated patient data
   */
  async updatePatient(patientId: string, patient: Partial<Patient>): Promise<void> {
    const updateData: any = {};

    if (patient.personalData) {
      if (patient.personalData.firstName) updateData.first_name = patient.personalData.firstName;
      if (patient.personalData.lastName) updateData.last_name = patient.personalData.lastName;
      if (patient.personalData.idCard) updateData.id_card = patient.personalData.idCard;
      if (patient.personalData.birthDate) updateData.birth_date = patient.personalData.birthDate;
      if (patient.personalData.address) updateData.address = patient.personalData.address;
      if (patient.personalData.phone) updateData.phone = patient.personalData.phone;
      if (patient.personalData.isOrthodontic !== undefined)
        updateData.is_orthodontic = patient.personalData.isOrthodontic;
    }

    if (patient.insuranceInfo) {
      if (patient.insuranceInfo.hasInsurance !== undefined)
        updateData.has_insurance = patient.insuranceInfo.hasInsurance;
      if (patient.insuranceInfo.insuranceName)
        updateData.insurance_name = patient.insuranceInfo.insuranceName;
      if (patient.insuranceInfo.affiliateNumber)
        updateData.affiliate_number = patient.insuranceInfo.affiliateNumber;
    }

    if (patient.dentalRecord) {
      if (patient.dentalRecord.pathologies) updateData.pathologies = patient.dentalRecord.pathologies;
      if (patient.dentalRecord.allergies) updateData.allergies = patient.dentalRecord.allergies;
      if (patient.dentalRecord.medication) updateData.medication = patient.dentalRecord.medication;
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabaseService.client
      .from('patients')
      .update(updateData)
      .eq('id', patientId);

    if (error) {
      console.error('Error updating patient:', error);
      throw error;
    }

    console.log(`Patient ${patientId} updated`);
  }

  /**
   * Delete a patient
   * @param patientId - The patient ID
   */
  async deletePatient(patientId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }

    console.log(`Patient ${patientId} deleted`);
  }

  /**
   * Get all patients
   * @returns Promise with array of patients
   */
  async getAllPatients(): Promise<PatientListItem[]> {
    const { data, error } = await this.supabaseService.client
      .from('patients')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting patients:', error);
      throw error;
    }

    return (data || []).map((p) => ({
      ...this.mapSupabaseToPatient(p),
      id: p.id,
      createdAt: p.created_at || undefined,
      updatedAt: p.updated_at || undefined,
    }));
  }

  /**
   * Get patients stream (real-time updates)
   * @returns Observable with array of patients
   */
  getPatientsStream(): Observable<PatientListItem[]> {
    // Note: For simplicity in this migration, we use from() to get the data once.
    // Real-time subscriptions in Supabase can be added later if needed.
    return from(this.getAllPatients());
  }

  /**
   * Helper to map Supabase table row to Patient interface
   */
  private mapSupabaseToPatient(data: Database['public']['Tables']['patients']['Row']): Patient {
    return {
      personalData: {
        firstName: data.first_name,
        lastName: data.last_name,
        idCard: data.id_card || '',
        birthDate: data.birth_date || '',
        age: this.calculateAge(data.birth_date),
        address: data.address || '',
        phone: data.phone || '',
        isOrthodontic: data.is_orthodontic || false,
      },
      insuranceInfo: {
        hasInsurance: data.has_insurance || false,
        insuranceName: data.insurance_name || '',
        affiliateNumber: data.affiliate_number || '',
      },
      dentalRecord: {
        pathologies: data.pathologies || '',
        allergies: data.allergies || '',
        medication: data.medication || '',
      },
    } as Patient;
  }

  private calculateAge(birthDate: string | null): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}
