import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  FormArray,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

import { BudgetService } from '../services/budget.service';
import { PatientService, PatientListItem } from '../services/patient.service';
import { ProcedureService } from '../services/procedure.service';
import { SupabaseService } from '../services/supabase.service';
import { Budget, BudgetFormData, Quote, BUDGET_STATUS_LABELS, FINANCING_TYPE_LABELS } from '../core/models/budget';
import { Procedure } from '../models/procedure';

interface BudgetFormGroup {
  patientId: FormControl<string>;
  financingType: FormControl<'fixed-quotes' | 'open-balance'>;
  numberOfQuotes: FormControl<number | null>;
  description: FormControl<string>;
  items: FormArray;
}

@Component({
  selector: 'app-budget-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzTableModule,
    NzAlertModule,
    NzIconModule,
    NzSpinModule,
    NzInputNumberModule,
  ],
  templateUrl: './budget-form.html',
  styleUrls: ['./budget-form.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Form
  budgetForm!: FormGroup<BudgetFormGroup>;
  isLoading = false;
  isSubmitting = false;

  // Data
  patients: PatientListItem[] = [];
  procedures: Procedure[] = [];
  quotes = signal<Quote[]>([]);
  selectedPatient = signal<PatientListItem | null>(null);

  // Validation
  quotesValidationMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Items tracking
  private itemsChangeCounter = signal(0);

  // Computed values
  quotesTotalAmount = computed(() => {
    const quotesList = this.quotes();
    return quotesList.reduce((sum, quote) => sum + quote.amount, 0);
  });

  calculatedTotalAmount = computed(() => {
    this.itemsChangeCounter(); // Track items changes
    const itemsArray = this.budgetForm?.get('items') as FormArray;
    if (!itemsArray) return 0;
    return itemsArray.controls.reduce((sum, item) => {
      return sum + (item.get('subtotal')?.value || 0);
    }, 0);
  });

  isQuotesValid = computed(() => {
    const totalAmount = this.calculatedTotalAmount();
    return this.budgetService.validateQuotesSum(this.quotes(), totalAmount);
  });

  showQuotesTable = computed(() => {
    const financingType = this.budgetForm?.get('financingType')?.value;
    const quotesLength = this.quotes().length;
    return financingType === 'fixed-quotes' && quotesLength > 0;
  });

  // Status and financing labels
  readonly statusLabels = BUDGET_STATUS_LABELS;
  readonly financingLabels = FINANCING_TYPE_LABELS;
  readonly financingOptions = ['fixed-quotes', 'open-balance'] as const;

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private patientService: PatientService,
    private procedureService: ProcedureService,
    private supabaseService: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.budgetForm = this.fb.group({
      patientId: this.fb.nonNullable.control('', [Validators.required]),
      financingType: this.fb.nonNullable.control<'fixed-quotes' | 'open-balance'>('fixed-quotes', [
        Validators.required,
      ]),
      numberOfQuotes: this.fb.control<number | null>(3, [Validators.required, Validators.min(1)]), // Default to 3 quotes with validators
      description: this.fb.nonNullable.control(''),
      items: this.fb.array([]),
    }) as FormGroup<BudgetFormGroup>;
  }

  private setupFormListeners(): void {
    // Listen to financing type changes
    this.budgetForm
      .get('financingType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        if (type === 'fixed-quotes') {
          this.budgetForm.get('numberOfQuotes')?.setValidators([Validators.required, Validators.min(1)]);
          
          // Regenerate quotes if switching back to fixed-quotes with existing values
          const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
          const totalAmount = this.calculatedTotalAmount();
          
          if (numberOfQuotes && numberOfQuotes > 0 && totalAmount > 0) {
            this.generateQuotes(totalAmount, numberOfQuotes);
          }
        } else {
          this.budgetForm.get('numberOfQuotes')?.clearValidators();
          this.budgetForm.get('numberOfQuotes')?.reset(null);
          this.quotes.set([]);
        }
        this.budgetForm.get('numberOfQuotes')?.updateValueAndValidity();
      });

    // Listen to numberOfQuotes changes
    this.budgetForm
      .get('numberOfQuotes')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((num) => {
        if (num && num > 0) {
          const totalAmount = this.calculatedTotalAmount();
          if (totalAmount > 0) {
            this.generateQuotes(totalAmount, num);
          }
        }
      });

    // Listen to items array changes to regenerate quotes when items change
    (this.budgetForm.get('items') as FormArray)
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const financingType = this.budgetForm.get('financingType')?.value;
        if (financingType === 'fixed-quotes') {
          const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
          const totalAmount = this.calculatedTotalAmount();
          
          if (numberOfQuotes && numberOfQuotes > 0 && totalAmount > 0) {
            this.generateQuotes(totalAmount, numberOfQuotes);
          }
        }
      });
  }

  private loadData(): void {
    try {
      this.isLoading = true;
      this.errorMessage.set('');

      // Check if user is authenticated
      this.supabaseService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (user) => {
            if (!user) {
              this.errorMessage.set('Please log in to create a budget');
              this.isLoading = false;
              this.cdr.markForCheck();
              return;
            }

            try {
              const [patients, procedures] = await Promise.all([
                this.patientService.getAllPatients(),
                this.procedureService.getProcedures(),
              ]);

              // Transform patients for display
              this.patients = patients.map((p: any) => ({
                ...p,
                id: p.id || '',
              })) as PatientListItem[];

              this.procedures = procedures;
              this.isLoading = false;
              this.cdr.markForCheck();
            } catch (error) {
              this.errorMessage.set('Failed to load data. Please try again.');
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            this.errorMessage.set('Authentication error. Please log in again.');
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
    } catch (error) {
      this.errorMessage.set('An error occurred while loading the form.');
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Generate quotes based on total amount and number of quotes
   */
  private generateQuotes(totalAmount: number, numberOfQuotes: number): void {
    const newQuotes = this.budgetService.calculateQuotes(totalAmount, numberOfQuotes);
    this.quotes.set(newQuotes);
    this.validateQuotes();
    this.cdr.markForCheck();
  }

  /**
   * Validate quotes and show warning if sum doesn't match total
   */
  validateQuotes(): void {
    const totalAmount = this.calculatedTotalAmount();
    if (!this.budgetService.validateQuotesSum(this.quotes(), totalAmount)) {
      this.quotesValidationMessage.set(
        `Warning: Sum of quotes ($${this.quotesTotalAmount().toFixed(2)}) does not match total ($${totalAmount.toFixed(2)})`,
      );
    } else {
      this.quotesValidationMessage.set('');
    }
  }

  /**
   * Update a quote amount
   */
  updateQuoteAmount(index: number, newAmount: number): void {
    const currentQuotes = [...this.quotes()];
    currentQuotes[index].amount = newAmount;
    this.quotes.set(currentQuotes);
    this.validateQuotes();
  }

  /**
   * Update a quote due date
   */
  updateQuoteDueDate(index: number, dateString: string): void {
    const currentQuotes = [...this.quotes()];
    currentQuotes[index].dueDate = new Date(dateString);
    this.quotes.set(currentQuotes);
  }

  /**
   * Add a procedure item to the budget
   */
  addItem(): void {
    const itemsArray = this.budgetForm.get('items') as FormArray;
    itemsArray.push(
      this.fb.group({
        procedureId: ['', Validators.required],
        procedureName: [''],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.min(0.01)]], // Changed: only validate min value, allow user to set price
        subtotal: [0],
      }),
    );
    // Trigger update and then regenerate quotes if needed
    this.triggerItemsUpdate();
    
    // Schedule quote regeneration after subtotal calculations
    setTimeout(() => {
      const financingType = this.budgetForm.get('financingType')?.value;
      const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
      const totalAmount = this.calculatedTotalAmount();
      
      if (financingType === 'fixed-quotes' && numberOfQuotes && numberOfQuotes > 0 && totalAmount > 0) {
        this.generateQuotes(totalAmount, numberOfQuotes);
      }
    }, 0);
  }

  /**
   * Remove a procedure item
   */
  removeItem(index: number): void {
    const itemsArray = this.budgetForm.get('items') as FormArray;
    itemsArray.removeAt(index);
    this.triggerItemsUpdate();
  }

  /**
   * Handle procedure selection
   */
  onProcedureChange(index: number, procedureId: string): void {
    const selectedProcedure = this.procedures.find((p) => p.id === procedureId);
    if (selectedProcedure) {
      const item = this.itemsArray.at(index);
      item.patchValue({
        procedureId: selectedProcedure.id,
        procedureName: selectedProcedure.name,
        unitPrice: selectedProcedure.basePrice,
      });
      this.calculateItemSubtotalInternal(index);
    }
  }

  /**
   * Calculate item subtotal
   */
  calculateItemSubtotal(index: number): void {
    const item = this.itemsArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const subtotal = quantity * unitPrice;
    item.patchValue({ subtotal });
    this.triggerItemsUpdate();
  }

  /**
   * Update procedure when selected from dropdown
   */
  updateItemProcedure(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const procedureId = select.value;
    this.onProcedureChange(index, procedureId);
  }

  /**
   * Update item quantity when changed
   */
  updateItemQuantity(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const quantity = parseInt(input.value) || 1;
    const item = this.itemsArray.at(index);
    item.patchValue({ quantity });
    this.calculateItemSubtotalInternal(index);
  }

  /**
   * Update item unit price when changed
   */
  updateItemPrice(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const unitPrice = parseFloat(input.value) || 0;
    const item = this.itemsArray.at(index);
    item.patchValue({ unitPrice });
    this.calculateItemSubtotalInternal(index);
  }

  /**
   * Trigger items update signal (internal use)
   */
  private calculateItemSubtotalInternal(index: number): void {
    const item = this.itemsArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const subtotal = quantity * unitPrice;
    item.patchValue({ subtotal });
    this.triggerItemsUpdate();
  }

  /**
   * Trigger items update to notify computed signals
   */
  private triggerItemsUpdate(): void {
    this.itemsChangeCounter.update((count) => count + 1);
    this.cdr.markForCheck();
    
    // Regenerate quotes if in fixed-quotes mode
    const financingType = this.budgetForm.get('financingType')?.value;
    if (financingType === 'fixed-quotes') {
      const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
      const totalAmount = this.calculatedTotalAmount();
      
      if (numberOfQuotes && numberOfQuotes > 0 && totalAmount > 0) {
        this.generateQuotes(totalAmount, numberOfQuotes);
      }
    }
  }

  /**
   * Get total of all items
   */
  getItemsTotal(): number {
    const itemsArray = this.budgetForm.get('items') as FormArray;
    return itemsArray.controls.reduce((sum, item) => {
      return sum + (item.get('subtotal')?.value || 0);
    }, 0);
  }

  /**
   * Save budget
   */
  async onSubmit(): Promise<void> {
    // Log patient selection
    const patientId = this.budgetForm.get('patientId')?.value;
    
    if (!patientId || patientId === '') {
      alert('Please select a patient for this budget.');
      return;
    }
    
    // Validate that at least one procedure item is added
    const itemsArray = this.budgetForm.get('items') as FormArray;
    
    if (itemsArray.length === 0) {
      alert('Please add at least one procedure to the budget.');
      return;
    }

    // Check each item for validity
    let hasInvalidItems = false;
    itemsArray.controls.forEach((item, index) => {
      const procedureId = item.get('procedureId')?.value;
      const unitPrice = item.get('unitPrice')?.value;
      
      if (!procedureId || procedureId === '') {
        hasInvalidItems = true;
      }
      if (unitPrice <= 0) {
        hasInvalidItems = true;
      }
    });
    
    if (hasInvalidItems) {
      alert('Please ensure all procedures are selected and have valid prices.');
      this.markFormAsTouched();
      return;
    }

    if (this.budgetForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    if (this.budgetForm.get('financingType')?.value === 'fixed-quotes' && !this.isQuotesValid()) {
      alert('Please fix the quote amounts so their sum matches the total amount.');
      return;
    }

    try {
      this.isSubmitting = true;
      const formValue = this.budgetForm.getRawValue();
      const budgetData: BudgetFormData = {
        patientId: formValue.patientId,
        totalAmount: this.calculatedTotalAmount(),
        status: 'pending', // Always set to pending when creating
        items: formValue.items || [],
        financingType: formValue.financingType,
        quotes: this.quotes(),
        description: formValue.description || '',
      };
      
      // Add numberOfQuotes only if it has a value (to avoid undefined)
      if (formValue.numberOfQuotes !== null && formValue.numberOfQuotes !== undefined) {
        budgetData.numberOfQuotes = formValue.numberOfQuotes;
      }

      const budgetId = await this.budgetService.createBudget(budgetData);
      alert('Budget created successfully!');
      this.router.navigate(['/budgets', budgetId]);
    } catch (error) {
      alert('Could not save budget. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    this.router.navigate(['/budgets']);
  }

  /**
   * Mark all form controls as touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.budgetForm.controls).forEach((key) => {
      this.budgetForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.budgetForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Get patient full name for display
   */
  getPatientName(patientId: string): string {
    const patient = this.patients.find((p) => p.id === patientId);
    return patient ? `${patient.personalData.firstName} ${patient.personalData.lastName}` : 'Unknown';
  }

  /**
   * Get items FormArray for template
   */
  get itemsArray(): FormArray {
    return this.budgetForm.get('items') as FormArray;
  }

  /**
   * Get item subtotal for display
   */
  getItemSubtotal(index: number): number {
    const item = this.itemsArray.at(index);
    return item?.get('subtotal')?.value || 0;
  }

  /**
   * Get procedure ID from item
   */
  getItemProcedureId(index: number): string {
    const item = this.itemsArray.at(index);
    return item?.get('procedureId')?.value || '';
  }
}
