import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Location } from '@angular/common';

// Patient interface matching the one from patient-form
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

// Filter criteria interface
interface FilterCriteria {
  name: string;
  idCard: string;
  affiliateNumber: string;
}

@Component({
  selector: 'app-patient-list',
  imports: [CommonModule, FormsModule, NzButtonModule],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientListComponent implements OnInit {
  // All patients (would come from a service in real app)
  patients: Patient[] = [];

  // Filtered patients
  filteredPatients: Patient[] = [];

  // Filter criteria
  filters: FilterCriteria = {
    name: '',
    idCard: '',
    affiliateNumber: '',
  };

  // Pagination
  readonly pageSize = 8;
  currentPage = 1;

  // Track if component is mounted and ready
  isComponentReady = false;

  constructor(
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loadMockPatients();
    this.applyFilters();
    // Mark as ready after initial load to prevent flash from redirect
    this.isComponentReady = true;
  }

  // Mock data for demonstration
  private loadMockPatients(): void {
    this.patients = [
      {
        id: '1',
        personalData: {
          idCard: '12345678',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          age: 35,
          address: '123 Main St',
          phone: '+1234567890',
          isOrthodontic: false,
        },
        insuranceInfo: {
          hasInsurance: true,
          insuranceName: 'Blue Cross',
          affiliateNumber: 'BC-001',
        },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '2',
        personalData: {
          idCard: '87654321',
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1985-08-20',
          age: 40,
          address: '456 Oak Ave',
          phone: '+0987654321',
          isOrthodontic: true,
        },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: '', allergies: 'Penicillin', medication: '' },
      },
      {
        id: '3',
        personalData: {
          idCard: '11223344',
          firstName: 'Carlos',
          lastName: 'García',
          birthDate: '1978-03-10',
          age: 47,
          address: '789 Pine Rd',
          phone: '+1122334455',
          isOrthodontic: false,
        },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Aetna', affiliateNumber: 'AE-002' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '4',
        personalData: {
          idCard: '55667788',
          firstName: 'María',
          lastName: 'López',
          birthDate: '1995-12-01',
          age: 30,
          address: '321 Elm St',
          phone: '+5566778899',
          isOrthodontic: true,
        },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Cigna', affiliateNumber: 'CG-003' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '5',
        personalData: {
          idCard: '99887766',
          firstName: 'Robert',
          lastName: 'Johnson',
          birthDate: '1982-07-25',
          age: 43,
          address: '654 Maple Dr',
          phone: '+9988776655',
          isOrthodontic: false,
        },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '6',
        personalData: {
          idCard: '44332211',
          firstName: 'Ana',
          lastName: 'Martínez',
          birthDate: '1992-09-18',
          age: 33,
          address: '987 Cedar Ln',
          phone: '+4433221100',
          isOrthodontic: false,
        },
        insuranceInfo: {
          hasInsurance: true,
          insuranceName: 'United Health',
          affiliateNumber: 'UH-004',
        },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '7',
        personalData: {
          idCard: '66778899',
          firstName: 'Michael',
          lastName: 'Brown',
          birthDate: '1988-11-30',
          age: 37,
          address: '147 Birch Way',
          phone: '+6677889900',
          isOrthodontic: true,
        },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '8',
        personalData: {
          idCard: '33445566',
          firstName: 'Laura',
          lastName: 'Davis',
          birthDate: '1975-04-05',
          age: 50,
          address: '258 Spruce Ct',
          phone: '+3344556677',
          isOrthodontic: false,
        },
        insuranceInfo: { hasInsurance: true, insuranceName: 'Kaiser', affiliateNumber: 'KS-005' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '9',
        personalData: {
          idCard: '22114433',
          firstName: 'David',
          lastName: 'Wilson',
          birthDate: '1998-02-14',
          age: 27,
          address: '369 Willow Blvd',
          phone: '+2211443355',
          isOrthodontic: false,
        },
        insuranceInfo: {
          hasInsurance: true,
          insuranceName: 'Blue Cross',
          affiliateNumber: 'BC-006',
        },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
      {
        id: '10',
        personalData: {
          idCard: '77889900',
          firstName: 'Sofia',
          lastName: 'Anderson',
          birthDate: '1993-06-22',
          age: 32,
          address: '741 Ash St',
          phone: '+7788990011',
          isOrthodontic: true,
        },
        insuranceInfo: { hasInsurance: false, insuranceName: '', affiliateNumber: '' },
        dentalRecord: { pathologies: '', allergies: '', medication: '' },
      },
    ];
  }

  /**
   * Apply filters to the patient list
   * - Name: Case-insensitive partial match (contains)
   * - ID Card: Strict equality (exact match)
   * - Affiliate Number: Strict equality (exact match)
   */
  applyFilters(): void {
    this.filteredPatients = this.patients.filter((patient) => {
      // Name filter: case-insensitive partial match on first or last name
      const nameMatch =
        this.filters.name === '' ||
        patient.personalData.firstName.toLowerCase().includes(this.filters.name.toLowerCase()) ||
        patient.personalData.lastName.toLowerCase().includes(this.filters.name.toLowerCase());

      // ID Card filter: strict equality (exact match)
      const idCardMatch =
        this.filters.idCard === '' || patient.personalData.idCard === this.filters.idCard;

      // Affiliate Number filter: strict equality (exact match)
      const affiliateMatch =
        this.filters.affiliateNumber === '' ||
        patient.insuranceInfo.affiliateNumber === this.filters.affiliateNumber;

      return nameMatch && idCardMatch && affiliateMatch;
    });

    // Reset to first page when filters change
    this.currentPage = 1;
  }

  // Clear all filters
  clearFilters(): void {
    this.filters = {
      name: '',
      idCard: '',
      affiliateNumber: '',
    };
    this.applyFilters();
  }

  // Get full name
  getFullName(patient: Patient): string {
    return `${patient.personalData.firstName} ${patient.personalData.lastName}`;
  }

  // Get insurance display name or 'Private'
  getInsuranceDisplay(patient: Patient): string {
    return patient.insuranceInfo.hasInsurance ? patient.insuranceInfo.insuranceName : 'Private';
  }

  // Pagination: get current page patients
  get paginatedPatients(): Patient[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatients.slice(startIndex, startIndex + this.pageSize);
  }

  // Total pages
  get totalPages(): number {
    return Math.ceil(this.filteredPatients.length / this.pageSize);
  }

  // Can go to previous page
  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  // Can go to next page
  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  // Go to previous page
  previousPage(): void {
    if (this.canGoPrevious) {
      this.currentPage--;
    }
  }

  // Go to next page
  nextPage(): void {
    if (this.canGoNext) {
      this.currentPage++;
    }
  }

  // Navigate to patient detail
  viewPatient(patientId: string): void {
    this.router.navigate(['/patients', patientId]);
  }

  // Navigate back
  goBack(): void {
    this.location.back();
  }

  onCreateNewPatient(): void {
    this.router.navigate(['/patients/new']);
  }
}
