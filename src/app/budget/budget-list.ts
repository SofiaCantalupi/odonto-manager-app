import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { BudgetService } from '../services/budget.service';
import { PatientService, PatientListItem } from '../services/patient.service';
import { FirebaseService } from '../services/firebase.service';
import { Budget, BUDGET_STATUS_LABELS, FINANCING_TYPE_LABELS } from '../core/models/budget';

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzTagModule,
    NzEmptyModule,
    NzPopconfirmModule,
  ],
  templateUrl: './budget-list.html',
  styleUrls: ['./budget-list.css'],
})
export class BudgetListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  budgets = signal<Budget[]>([]);
  filteredBudgets = signal<Budget[]>([]);
  patients: PatientListItem[] = [];
  isLoading = signal(true);
  errorMessage = signal<string>('');

  // Filters
  searchText = signal<string>('');
  selectedStatus = signal<'all' | 'pending' | 'active' | 'paid'>('all');

  // Labels
  readonly statusLabels = BUDGET_STATUS_LABELS;
  readonly financingLabels = FINANCING_TYPE_LABELS;
  readonly statusOptions = ['all', 'pending', 'active', 'paid'] as const;

  constructor(
    private budgetService: BudgetService,
    private patientService: PatientService,
    private firebaseService: FirebaseService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load budgets and patients
   */
  private loadData(): void {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // Check if user is authenticated
      this.firebaseService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe({
        next: async (user) => {
          if (!user) {
            this.errorMessage.set('Please log in to view budgets');
            this.isLoading.set(false);
            return;
          }

          try {
            // Load patients for reference
            this.patients = (await this.patientService.getAllPatients()) as PatientListItem[];

            // Subscribe to budgets stream for real-time updates
            this.budgetService
              .getBudgetsStream()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (budgets) => {
                  this.budgets.set(budgets);
                  this.applyFilters();
                  this.isLoading.set(false);
                },
                error: (error) => {
                  this.errorMessage.set('Failed to load budgets. Please try again.');
                  this.isLoading.set(false);
                },
              });
          } catch (error) {
            this.errorMessage.set('Failed to load patient data. Please try again.');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          this.errorMessage.set('Authentication error. Please log in again.');
          this.isLoading.set(false);
        },
      });
    } catch (error) {
      this.errorMessage.set('An error occurred while loading data.');
      this.isLoading.set(false);
    }
  }

  /**
   * Apply filters to budgets
   */
  applyFilters(): void {
    let filtered = [...this.budgets()];

    // Apply status filter
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter((budget) => budget.status === this.selectedStatus());
    }

    // Apply search filter
    if (this.searchText()) {
      const searchLower = this.searchText().toLowerCase();
      filtered = filtered.filter((budget) => {
        const patient = this.getPatientName(budget.patientId);
        return patient.toLowerCase().includes(searchLower);
      });
    }

    this.filteredBudgets.set(filtered);
  }

  /**
   * Handle search text change
   */
  onSearchChange(text: string): void {
    this.searchText.set(text);
    this.applyFilters();
  }

  /**
   * Handle status filter change
   */
  onStatusChange(status: 'all' | 'pending' | 'active' | 'paid'): void {
    this.selectedStatus.set(status);
    this.applyFilters();
  }

  /**
   * Delete budget
   */
  async deleteBudget(budgetId: string): Promise<void> {
    try {
      await this.budgetService.deleteBudget(budgetId);
      alert('Budget deleted successfully');
    } catch (error) {
      alert('Could not delete budget. Please try again.');
    }
  }

  /**
   * Get patient name by ID
   */
  getPatientName(patientId: string): string {
    const patient = this.patients.find((p) => p.id === patientId);
    return patient
      ? `${patient.personalData.firstName} ${patient.personalData.lastName}`
      : 'Unknown Patient';
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /**
   * Get status color for tag
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'volcano';
      case 'active':
        return 'processing';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  }
}
