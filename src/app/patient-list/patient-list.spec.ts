import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientListComponent } from './patient-list';

describe('PatientListComponent', () => {
  let component: PatientListComponent;
  let fixture: ComponentFixture<PatientListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filter functionality', () => {
    it('should filter by name (case-insensitive partial match)', () => {
      component.filters.name = 'john';
      component.applyFilters();
      expect(component.filteredPatients.some(p => p.personalData.firstName.toLowerCase().includes('john'))).toBeTrue();
    });

    it('should filter by idCard (exact match)', () => {
      component.filters.idCard = '12345678';
      component.applyFilters();
      expect(component.filteredPatients.every(p => p.personalData.idCard === '12345678')).toBeTrue();
    });

    it('should filter by affiliateNumber (exact match)', () => {
      component.filters.affiliateNumber = 'BC-001';
      component.applyFilters();
      expect(component.filteredPatients.every(p => p.insuranceInfo.affiliateNumber === 'BC-001')).toBeTrue();
    });

    it('should clear all filters', () => {
      component.filters = { name: 'test', idCard: '123', affiliateNumber: 'ABC' };
      component.clearFilters();
      expect(component.filters).toEqual({ name: '', idCard: '', affiliateNumber: '' });
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
