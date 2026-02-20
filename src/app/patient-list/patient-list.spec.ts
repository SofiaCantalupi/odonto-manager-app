import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PatientListComponent } from './patient-list';
import { PatientListItem, PatientService } from '../services/patient.service';

class PatientServiceMock {
  private readonly patientsSubject = new BehaviorSubject<PatientListItem[]>([]);

  getPatientsStream() {
    return this.patientsSubject.asObservable();
  }

  emitPatients(patients: PatientListItem[]): void {
    this.patientsSubject.next(patients);
  }
}

const mockPatients: PatientListItem[] = [
  {
    id: 'abc-001',
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
    id: 'xyz-002',
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
];

describe('PatientListComponent', () => {
  let component: PatientListComponent;
  let fixture: ComponentFixture<PatientListComponent>;
  let patientServiceMock: PatientServiceMock;

  beforeEach(async () => {
    patientServiceMock = new PatientServiceMock();

    await TestBed.configureTestingModule({
      imports: [PatientListComponent],
      providers: [{ provide: PatientService, useValue: patientServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientListComponent);
    component = fixture.componentInstance;
    patientServiceMock.emitPatients(mockPatients);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filter functionality', () => {
    it('should filter by name (case-insensitive partial match)', () => {
      component.filters.name = 'john';
      component.applyFilters();
      expect(
        component.filteredPatients.some((p) =>
          p.personalData.firstName.toLowerCase().includes('john'),
        ),
      ).toBeTrue();
    });

    it('should filter by patient id or dni (partial, case-insensitive)', () => {
      component.filters.id = 'abc';
      component.applyFilters();
      expect(
        component.filteredPatients.every(
          (p) => p.id.toLowerCase().includes('abc') || p.personalData.idCard.includes('abc'),
        ),
      ).toBeTrue();
    });

    it('should filter by dni', () => {
      component.filters.id = '87654321';
      component.applyFilters();
      expect(
        component.filteredPatients.every((p) => p.personalData.idCard === '87654321'),
      ).toBeTrue();
    });

    it('should clear all filters', () => {
      component.filters = { name: 'test', id: '123' };
      component.clearFilters();
      expect(component.filters).toEqual({ name: '', id: '' });
    });
  });

  describe('Pagination', () => {
    it('should limit to 8 records per page', () => {
      expect(component.pageSize).toBe(8);
    });

    it('should calculate total pages correctly', () => {
      component.filteredPatients = new Array(20).fill({});
      expect(component.totalPages).toBe(3);
    });

    it('should navigate to next page', () => {
      component.filteredPatients = new Array(20).fill({});
      component.currentPage = 1;
      component.nextPage();
      expect(component.currentPage).toBe(2);
    });

    it('should navigate to previous page', () => {
      component.filteredPatients = new Array(20).fill({});
      component.currentPage = 2;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });
  });
});
