import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from "@angular/router";
import { OdontogramComponent } from '../odontogram/odontogram';
import { OdontogramState } from '../odontogram/dental-types';
import { ToothZoneClickEvent } from '../tooth/tooth';

// Custom validator to prevent future dates
export function noFutureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (inputDate > today) {
      return { futureDate: true };
    }
    return null;
  };
}

// Interfaces for strict typing
interface PersonalData {
  idCard: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number;
  address: string;
  phone: string;
  isOrthodontic: boolean;
}

interface InsuranceInfo {
  hasInsurance: boolean;
  insuranceName: string;
  affiliateNumber: string;
}

interface DentalRecord {
  pathologies: string;
  allergies: string;
  medication: string;
}

export interface Patient {
  personalData: PersonalData;
  insuranceInfo: InsuranceInfo;
  dentalRecord: DentalRecord;
}

// Form type for strict typing
interface PatientFormType {
  personalData: FormGroup<{
    idCard: import('@angular/forms').FormControl<string>;
    firstName: import('@angular/forms').FormControl<string>;
    lastName: import('@angular/forms').FormControl<string>;
    birthDate: import('@angular/forms').FormControl<string>;
    age: import('@angular/forms').FormControl<number>;
    address: import('@angular/forms').FormControl<string>;
    phone: import('@angular/forms').FormControl<string>;
    isOrthodontic: import('@angular/forms').FormControl<boolean>;
  }>;
  insuranceInfo: FormGroup<{
    hasInsurance: import('@angular/forms').FormControl<boolean>;
    insuranceName: import('@angular/forms').FormControl<string>;
    affiliateNumber: import('@angular/forms').FormControl<string>;
  }>;
  dentalRecord: FormGroup<{
    pathologies: import('@angular/forms').FormControl<string>;
    allergies: import('@angular/forms').FormControl<string>;
    medication: import('@angular/forms').FormControl<string>;
  }>;
}

@Component({
  selector: 'app-patient-form',
  imports: [CommonModule, ReactiveFormsModule, OdontogramComponent],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
})
export class PatientFormComponent implements OnInit, OnDestroy {
  patientForm!: FormGroup<PatientFormType>;
  private destroy$ = new Subject<void>();

  // Odontogram state (not part of reactive form, managed separately)
  odontogramData: OdontogramState = {};

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.initForm();
    this.setupInsuranceWatcher();
    this.setupAgeCalculation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.patientForm = this.fb.group({
      personalData: this.fb.group({
        idCard: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
        firstName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
        lastName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
        birthDate: this.fb.nonNullable.control('', [Validators.required, noFutureDateValidator()]),
        age: this.fb.nonNullable.control({ value: 0, disabled: true }),
        address: this.fb.nonNullable.control('', [Validators.required]),
        phone: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\+?[\d\s-]{10,}$/)]),
        isOrthodontic: this.fb.nonNullable.control(false, [Validators.required]),
      }),
      insuranceInfo: this.fb.group({
        hasInsurance: this.fb.nonNullable.control(false),
        insuranceName: this.fb.nonNullable.control(''),
        affiliateNumber: this.fb.nonNullable.control(''),
      }),
      dentalRecord: this.fb.group({
        pathologies: this.fb.nonNullable.control(''),
        allergies: this.fb.nonNullable.control(''),
        medication: this.fb.nonNullable.control(''),
      }),
    }) as FormGroup<PatientFormType>;
  }

  private setupInsuranceWatcher(): void {
    const insuranceGroup = this.patientForm.get('insuranceInfo') as FormGroup;
    const hasInsuranceControl = insuranceGroup.get('hasInsurance');
    const insuranceNameControl = insuranceGroup.get('insuranceName');
    const affiliateNumberControl = insuranceGroup.get('affiliateNumber');

    hasInsuranceControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasInsurance: boolean) => {
        if (hasInsurance) {
          insuranceNameControl?.setValidators([Validators.required]);
          affiliateNumberControl?.setValidators([Validators.required]);
        } else {
          insuranceNameControl?.clearValidators();
          affiliateNumberControl?.clearValidators();
          insuranceNameControl?.setValue('');
          affiliateNumberControl?.setValue('');
        }
        insuranceNameControl?.updateValueAndValidity();
        affiliateNumberControl?.updateValueAndValidity();
      });
  }

  private setupAgeCalculation(): void {
    const personalDataGroup = this.patientForm.get('personalData') as FormGroup;
    const birthDateControl = personalDataGroup.get('birthDate');
    const ageControl = personalDataGroup.get('age');

    birthDateControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((birthDate: string) => {
        if (birthDate) {
          const age = this.calculateAge(new Date(birthDate));
          ageControl?.setValue(age);
        } else {
          ageControl?.setValue(0);
        }
      });
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  }

  get hasInsurance(): boolean {
    return this.patientForm.get('insuranceInfo.hasInsurance')?.value ?? false;
  }

  get personalData(): FormGroup {
    return this.patientForm.get('personalData') as FormGroup;
  }

  get insuranceInfo(): FormGroup {
    return this.patientForm.get('insuranceInfo') as FormGroup;
  }

  get dentalRecord(): FormGroup {
    return this.patientForm.get('dentalRecord') as FormGroup;
  }

  isFieldInvalid(groupName: string, fieldName: string): boolean {
    const control = this.patientForm.get(`${groupName}.${fieldName}`);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  hasFieldError(groupName: string, fieldName: string, errorName: string): boolean {
    const control = this.patientForm.get(`${groupName}.${fieldName}`);
    return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
  }

  onSave(): void {
    if (this.patientForm.valid) {
      const formValue = this.patientForm.getRawValue();
      console.log('Patient Form Value:', formValue);
      alert('Patient saved! Check console for details.');
      this.resetForm();
    } else {
      this.markAllAsTouched();
      console.log('Form is invalid', this.patientForm.errors);
    }
  }

  private resetForm(): void {
    this.patientForm.reset();
    // Reset nested form groups to ensure all validation states are cleared
    this.patientForm.markAsPristine();
    this.patientForm.markAsUntouched();
  }

  private markAllAsTouched(): void {
    Object.keys(this.patientForm.controls).forEach(groupKey => {
      const group = this.patientForm.get(groupKey) as FormGroup;
      Object.keys(group.controls).forEach(key => {
        group.get(key)?.markAsTouched();
      });
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Handle tooth zone click from odontogram
   * This can be expanded to open a modal for selecting treatment type
   */
  onToothClick(event: ToothZoneClickEvent): void {
    console.log('Tooth clicked:', event);
    // For now, toggle between healthy and caries as a demo
    const { toothNumber, zone } = event;
    
    // Initialize tooth data if not exists
    if (!this.odontogramData[toothNumber]) {
      this.odontogramData[toothNumber] = [];
    }

    // Map zone to surface
    const surfaceMap: Record<string, 'vestibular' | 'lingual' | 'distal' | 'mesial' | 'occlusal'> = {
      'top': 'vestibular',
      'bottom': 'lingual',
      'left': 'mesial',
      'right': 'distal',
      'center': 'occlusal'
    };
    const surface = surfaceMap[zone];

    // Check if there's already a treatment on this surface
    const existingIndex = this.odontogramData[toothNumber].findIndex(t => t.surface === surface);
    
    if (existingIndex >= 0) {
      // Remove existing treatment (toggle off)
      this.odontogramData[toothNumber].splice(existingIndex, 1);
    } else {
      // Add caries treatment (demo - in real app, show a selection modal)
      this.odontogramData[toothNumber].push({
        type: 'caries',
        surface: surface
      });
    }

    // Trigger change detection by creating new object reference
    this.odontogramData = { ...this.odontogramData };
  }
}
