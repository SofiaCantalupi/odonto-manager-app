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
import { FirebaseService } from '../services/firebase.service';
import { Budget, BudgetFormData, Quote, BUDGET_STATUS_LABELS, FINANCING_TYPE_LABELS } from '../core/models/budget';
import { Procedure } from '../models/procedure';

interface BudgetFormGroup {
  patientId: FormControl<string>;
  financingType: FormControl<'fixed-quotes' | 'open-balance'>;
  numberOfQuotes: FormControl<number | null>;
  totalAmount: FormControl<number>;
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

  // Computed values
  quotesTotalAmount = computed(() => {
    const quotesList = this.quotes();
    return quotesList.reduce((sum, quote) => sum + quote.amount, 0);
  });

  isQuotesValid = computed(() => {
    const form = this.budgetForm;
    if (!form) return false;
    const totalAmount = form.get('totalAmount')?.value || 0;
    return this.budgetService.validateQuotesSum(this.quotes(), totalAmount);
  });

  showQuotesTable = computed(() => {
    const financingType = this.budgetForm?.get('financingType')?.value;
    const quotesLength = this.quotes().length;
    const show = financingType === 'fixed-quotes' && quotesLength > 0;
    console.log('showQuotesTable computed: financingType=', financingType, 'quotesLength=', quotesLength, 'result=', show);
    return show;
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
    private firebaseService: FirebaseService,
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
      numberOfQuotes: this.fb.control<number | null>(null),
      totalAmount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
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
        console.log('Financing type changed to:', type);
        if (type === 'fixed-quotes') {
          this.budgetForm.get('numberOfQuotes')?.setValidators([Validators.required, Validators.min(1)]);
          
          // Regenerate quotes if switching back to fixed-quotes with existing values
          const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
          const totalAmount = this.budgetForm.get('totalAmount')?.value || 0;
          console.log('numberOfQuotes:', numberOfQuotes, 'totalAmount:', totalAmount);
          
          if (numberOfQuotes && numberOfQuotes > 0 && totalAmount > 0) {
            console.log('Regenerating quotes with existing numberOfQuotes');
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
        console.log('numberOfQuotes changed to:', num);
        if (num && num > 0) {
          const totalAmount = this.budgetForm.get('totalAmount')?.value || 0;
          console.log('Generating quotes with totalAmount:', totalAmount);
          if (totalAmount > 0) {
            this.generateQuotes(totalAmount, num);
            console.log('Quotes after generation:', this.quotes());
          }
        }
      });

    // Listen to totalAmount changes
    this.budgetForm
      .get('totalAmount')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((amount) => {
        if (amount > 0) {
          const financingType = this.budgetForm.get('financingType')?.value;
          if (financingType === 'fixed-quotes') {
            const numberOfQuotes = this.budgetForm.get('numberOfQuotes')?.value;
            if (numberOfQuotes && numberOfQuotes > 0) {
              this.generateQuotes(amount, numberOfQuotes);
            }
          }
        }
      });
  }

  private loadData(): void {
    try {
      this.isLoading = true;
      this.errorMessage.set('');

      // Check if user is authenticated
      this.firebaseService.currentUser$
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
              console.error('Failed to load data:', error);
              this.errorMessage.set('Failed to load data. Please try again.');
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error('Authentication error:', error);
            this.errorMessage.set('Authentication error. Please log in again.');
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
    } catch (error) {
      console.error('Failed to initialize form:', error);
      this.errorMessage.set('An error occurred while loading the form.');
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Generate quotes based on total amount and number of quotes
   */
  private generateQuotes(totalAmount: number, numberOfQuotes: number): void {
    console.log('generateQuotes called with totalAmount:', totalAmount, 'numberOfQuotes:', numberOfQuotes);
    const newQuotes = this.budgetService.calculateQuotes(totalAmount, numberOfQuotes);
    console.log('Calculated quotes:', newQuotes);
    this.quotes.set(newQuotes);
    console.log('Quotes signal set, quotes():', this.quotes());
    this.validateQuotes();
    this.cdr.markForCheck();
  }

  /**
   * Validate quotes and show warning if sum doesn't match total
   */
  validateQuotes(): void {
    const totalAmount = this.budgetForm.get('totalAmount')?.value || 0;
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
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        subtotal: [0],
      }),
    );
  }

  /**
   * Remove a procedure item
   */
  removeItem(index: number): void {
    const itemsArray = this.budgetForm.get('items') as FormArray;
    itemsArray.removeAt(index);
  }

  /**
   * Handle procedure selection
   */
  onProcedureChange(index: number, procedureId: string): void {
    const selectedProcedure = this.procedures.find((p) => p.id === procedureId);
    if (selectedProcedure) {
      const item = this.itemsArray.at(index);
      item.patchValue({
        procedureName: selectedProcedure.name,
        unitPrice: selectedProcedure.basePrice,
      });
      this.calculateItemSubtotal(index);
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
        totalAmount: formValue.totalAmount,
        status: 'pending', // Always set to pending when creating
        items: formValue.items || [],
        financingType: formValue.financingType,
        numberOfQuotes: formValue.numberOfQuotes || undefined,
        quotes: this.quotes(),
        description: formValue.description || undefined,
      };

      const budgetId = await this.budgetService.createBudget(budgetData);
      alert('Budget created successfully!');
      this.router.navigate(['/budgets', budgetId]);
    } catch (error) {
      console.error('Failed to save budget:', error);
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
