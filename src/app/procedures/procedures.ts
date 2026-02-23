import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ProcedureService } from '../services/procedure.service';
import {
  Procedure,
  ProcedureCategory,
  ProcedureFormData,
  PROCEDURE_CATEGORY_LABELS,
} from '../models/procedure';

interface ProcedureForm {
  name: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<ProcedureCategory>;
  basePrice: FormControl<number>;
}

@Component({
  selector: 'app-procedures',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NzModalModule, NzButtonModule],
  templateUrl: './procedures.html',
  styleUrls: ['./procedures.css'],
})
export class ProceduresComponent implements OnInit, OnDestroy {
  procedures: Procedure[] = [];
  filteredProcedures: Procedure[] = [];
  isModalVisible = false;
  isEditMode = false;
  editingProcedureId: string | null = null;
  searchQuery = '';

  procedureForm!: FormGroup<ProcedureForm>;
  private destroy$ = new Subject<void>();

  // Category labels for dropdown
  readonly categoryLabels = PROCEDURE_CATEGORY_LABELS;
  readonly categories: ProcedureCategory[] = [
    'general',
    'restorative',
    'prevention',
    'surgery',
    'orthodontics',
    'periodontics',
    'prosthesis',
    'endodontics',
  ];

  constructor(
    private fb: FormBuilder,
    private procedureService: ProcedureService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProcedures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.procedureForm = this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
      description: this.fb.nonNullable.control(''),
      category: this.fb.nonNullable.control<ProcedureCategory>('general', [Validators.required]),
      basePrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    }) as FormGroup<ProcedureForm>;
  }

  private async loadProcedures(): Promise<void> {
    this.procedures = await this.procedureService.getProcedures();
    this.filteredProcedures = [...this.procedures];
  }

  onSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredProcedures = [...this.procedures];
      return;
    }

    this.filteredProcedures = this.procedures.filter(
      (procedure) =>
        procedure.name.toLowerCase().includes(query) ||
        procedure.category.toLowerCase().includes(query) ||
        procedure.description?.toLowerCase().includes(query),
    );
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingProcedureId = null;
    this.procedureForm.reset({
      name: '',
      description: '',
      category: 'general',
      basePrice: 0,
    });
    this.isModalVisible = true;
  }

  openEditModal(procedure: Procedure): void {
    this.isEditMode = true;
    this.editingProcedureId = procedure.id;
    this.procedureForm.patchValue({
      name: procedure.name,
      description: procedure.description || '',
      category: procedure.category,
      basePrice: procedure.basePrice,
    });
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.procedureForm.reset();
  }

  async onSave(): Promise<void> {
    if (this.procedureForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    const formValue = this.procedureForm.getRawValue();
    const procedureData: ProcedureFormData = {
      name: formValue.name,
      description: formValue.description || undefined,
      category: formValue.category,
      basePrice: formValue.basePrice,
    };

    try {
      if (this.isEditMode && this.editingProcedureId) {
        await this.procedureService.updateProcedure(this.editingProcedureId, procedureData);
        alert('Procedure updated successfully.');
      } else {
        await this.procedureService.createProcedure(procedureData);
        alert('Procedure created successfully.');
      }

      this.closeModal();
      await this.loadProcedures();
      this.onSearch();
    } catch (error) {
      console.error('Failed to save procedure:', error);
      alert('Could not save procedure. Please try again.');
    }
  }

  async onDelete(procedure: Procedure): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete "${procedure.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.procedureService.deleteProcedure(procedure.id);
      alert('Procedure deleted successfully.');
      await this.loadProcedures();
      this.onSearch();
    } catch (error) {
      console.error('Failed to delete procedure:', error);
      alert('Could not delete procedure. Please try again.');
    }
  }

  isFieldInvalid(fieldName: keyof ProcedureForm): boolean {
    const control = this.procedureForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  private markFormAsTouched(): void {
    Object.keys(this.procedureForm.controls).forEach((key) => {
      this.procedureForm.get(key)?.markAsTouched();
    });
  }

  getCategoryLabel(category: ProcedureCategory): string {
    return this.categoryLabels[category];
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }
}
