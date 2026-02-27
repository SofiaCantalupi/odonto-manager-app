import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OdontogramComponent } from '../odontogram/odontogram';
import { OdontogramState } from '../models/dental-types';
import { OdontogramService } from '../services/odontogram.service';
import { PatientService } from '../services/patient.service';

// Patient interface
export interface Patient {
  id: string;
  personalData: {
    idCard: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    age: number;
    address: string;
    phone: string;
    isOrthodontic: boolean;
  };
  insuranceInfo: {
    hasInsurance: boolean;
    insuranceName: string;
    affiliateNumber: string;
  };
  dentalRecord: {
    pathologies: string;
    allergies: string;
    medication: string;
  };
}

type TabId = 'odontogram' | 'clinical-history' | 'estimates' | 'appointments';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-patient-detail',
  imports: [CommonModule, OdontogramComponent],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  odontogramData: OdontogramState = {};
  odontogramGeneralNotes = '';
  loading = true;
  activeTab: TabId = 'odontogram';

  tabs: Tab[] = [
    { id: 'odontogram', label: 'Odontogram' },
    { id: 'clinical-history', label: 'Clinical History' },
    { id: 'estimates', label: 'Estimates' },
    { id: 'appointments', label: 'Appointment History' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private odontogramService: OdontogramService,
  ) {}

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (patientId) {
      this.loadPatient(patientId);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  private async loadPatient(id: string): Promise<void> {
    this.loading = true;

    try {
      // Load patient data from Supabase
      const patientData = await this.patientService.getPatient(id);

      if (!patientData) {
        console.error('Patient not found:', id);
        alert('Patient not found');
        this.router.navigate(['/patients']);
        return;
      }

      // Ensure the patient has the id property
      this.patient = { ...patientData, id } as Patient;

      // Load odontogram data
      const odontogramData = await this.odontogramService.loadPersistedOdontogramData(id);
      this.odontogramData = odontogramData.state || {};
      this.odontogramGeneralNotes = odontogramData.generalNotes || '';

      console.log('Patient loaded:', this.patient);
      console.log('Odontogram loaded:', this.odontogramData);
    } catch (error) {
      console.error('Error loading patient:', error);
      alert('Failed to load patient data');
      this.router.navigate(['/patients']);
    } finally {
      this.loading = false;
    }
  }

  get fullName(): string {
    return this.patient
      ? `${this.patient.personalData.firstName} ${this.patient.personalData.lastName}`
      : '';
  }

  get formattedBirthDate(): string {
    if (!this.patient) return '';
    const date = new Date(this.patient.personalData.birthDate);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get hasAllergies(): boolean {
    return !!this.patient?.dentalRecord.allergies;
  }

  setActiveTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  goBack(): void {
    this.router.navigate(['/patients']);
  }
}
