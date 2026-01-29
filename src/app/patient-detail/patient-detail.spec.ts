import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PatientDetailComponent } from './patient-detail';

describe('PatientDetailComponent', () => {
  let component: PatientDetailComponent;
  let fixture: ComponentFixture<PatientDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patient on init', (done) => {
    setTimeout(() => {
      expect(component.patient).toBeTruthy();
      expect(component.loading).toBeFalse();
      done();
    }, 400);
  });

  it('should have 4 tabs', () => {
    expect(component.tabs.length).toBe(4);
  });

  it('should default to odontogram tab', () => {
    expect(component.activeTab).toBe('odontogram');
  });

  it('should change active tab', () => {
    component.setActiveTab('clinical-history');
    expect(component.activeTab).toBe('clinical-history');
  });

  it('should detect allergies correctly', (done) => {
    // Wait for patient to load
    setTimeout(() => {
      // Patient 1 has no allergies
      expect(component.hasAllergies).toBeFalse();
      done();
    }, 400);
  });
});
