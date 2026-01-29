import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

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
  imports: [CommonModule],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  loading = true;
  activeTab: TabId = 'odontogram';

  tabs: Tab[] = [
    { id: 'odontogram', label: 'Odontogram' },
    { id: 'clinical-history', label: 'Clinical History' },
    { id: 'estimates', label: 'Estimates' },
    { id: 'appointments', label: 'Appointment History' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (patientId) {
      this.loadPatient(patientId);
    } else {
      this.router.navigate(['/patients']);
    }
  }

  private loadPatient(id: string): void {
    // Mock data - in real app this would come from a service
    const mockPatients: Patient[] = [
      {
        id: '1',
        personalData: { idCard: '12345678', firstName: 'John', lastName: 'Doe', birthDate: '1990-05-15', age: 35, address: '123 Main St', phone: '+1234567890', isOrthodontic: false },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Blue Cross', affiliateNumber: 'BC-001' },
        dentalRecord: { pathologies: 'Mild gingivitis', allergies: '', medication: 'None' }
      },
      {
        id: '2',
        personalData: { idCard: '87654321', firstName: 'Jane', lastName: 'Smith', birthDate: '1985-08-20', age: 40, address: '456 Oak Ave', phone: '+0987654321', isOrthodontic: true },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: '', allergies: 'Penicillin, Latex', medication: 'Ibuprofen' }
      },
      {
        id: '3',
        personalData: { idCard: '11223344', firstName: 'Carlos', lastName: 'García', birthDate: '1978-03-10', age: 47, address: '789 Pine Rd', phone: '+1122334455', isOrthodontic: false },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Aetna', affiliateNumber: 'AE-002' },
        dentalRecord: { pathologies: 'Bruxism', allergies: 'Aspirin', medication: 'Omeprazole' }
      },
      {
        id: '4',
        personalData: { idCard: '55667788', firstName: 'María', lastName: 'López', birthDate: '1995-12-01', age: 30, address: '321 Elm St', phone: '+5566778899', isOrthodontic: true },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Cigna', affiliateNumber: 'CG-003' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' }
      },
      {
        id: '5',
        personalData: { idCard: '99887766', firstName: 'Robert', lastName: 'Johnson', birthDate: '1982-07-25', age: 43, address: '654 Maple Dr', phone: '+9988776655', isOrthodontic: false },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: 'Periodontitis', allergies: 'Lidocaine', medication: 'Metformin, Lisinopril' }
      },
    ];

    // Simulate API call delay
    setTimeout(() => {
      this.patient = mockPatients.find(p => p.id === id) || null;
      this.loading = false;
    }, 300);
  }

  get fullName(): string {
    return this.patient ? `${this.patient.personalData.firstName} ${this.patient.personalData.lastName}` : '';
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
