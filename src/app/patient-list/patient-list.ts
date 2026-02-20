import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PatientListItem, PatientService } from '../services/patient.service';

// Filter criteria interface
interface FilterCriteria {
  name: string;
  id: string;
}

@Component({
  selector: 'app-patient-list',
  imports: [CommonModule, FormsModule, NzButtonModule],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
})
export class PatientListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  patients: PatientListItem[] = [];

  // Filtered patients
  filteredPatients: PatientListItem[] = [];

  // Filter criteria
  filters: FilterCriteria = {
    name: '',
    id: '',
  };

  // Pagination
  readonly pageSize = 8;
  currentPage = 1;

  // Track if component is mounted and ready
  isComponentReady = false;

  constructor(
    private router: Router,
    private location: Location,
    private patientService: PatientService,
  ) {}

  ngOnInit(): void {
    this.patientService
      .getPatientsStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.applyFilters();
          this.isComponentReady = true;
        },
        error: (error) => {
          console.error('Failed to load patients stream:', error);
          this.patients = [];
          this.filteredPatients = [];
          this.isComponentReady = true;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Apply filters to the patient list
   * - Name: Case-insensitive partial match (contains)
   * - ID: Case-insensitive partial match on patient ID or DNI
   */
  applyFilters(): void {
    const normalizedName = this.filters.name.trim().toLowerCase();
    const normalizedId = this.filters.id.trim().toLowerCase();

    this.filteredPatients = this.patients.filter((patient) => {
      // Name filter: case-insensitive partial match on first or last name
      const nameMatch =
        normalizedName === '' ||
        patient.personalData.firstName.toLowerCase().includes(normalizedName) ||
        patient.personalData.lastName.toLowerCase().includes(normalizedName);

      const idMatch =
        normalizedId === '' ||
        patient.id.toLowerCase().includes(normalizedId) ||
        patient.personalData.idCard.toLowerCase().includes(normalizedId);

      return nameMatch && idMatch;
    });

    // Reset to first page when filters change
    this.currentPage = 1;
  }

  // Clear all filters
  clearFilters(): void {
    this.filters = {
      name: '',
      id: '',
    };
    this.applyFilters();
  }

  // Get full name
  getFullName(patient: PatientListItem): string {
    return `${patient.personalData.firstName} ${patient.personalData.lastName}`;
  }

  // Get insurance display name or 'Private'
  getInsuranceDisplay(patient: PatientListItem): string {
    return patient.insuranceInfo.hasInsurance ? patient.insuranceInfo.insuranceName : 'Private';
  }

  // Pagination: get current page patients
  get paginatedPatients(): PatientListItem[] {
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
