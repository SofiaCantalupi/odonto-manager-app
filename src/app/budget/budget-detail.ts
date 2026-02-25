import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { BudgetService } from '../services/budget.service';
import { PatientService, PatientListItem } from '../services/patient.service';
import { Budget, BUDGET_STATUS_LABELS, FINANCING_TYPE_LABELS } from '../core/models/budget';

@Component({
  selector: 'app-budget-detail',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzAlertModule,
    NzTagModule,
    NzDividerModule,
  ],
  templateUrl: './budget-detail.html',
  styleUrls: ['./budget-detail.css'],
})
export class BudgetDetailComponent implements OnInit {
  budget = signal<Budget | null>(null);
  patient = signal<PatientListItem | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  readonly statusLabels = BUDGET_STATUS_LABELS;
  readonly financingLabels = FINANCING_TYPE_LABELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private budgetService: BudgetService,
    private patientService: PatientService,
  ) {}

  ngOnInit(): void {
    const budgetId = this.route.snapshot.paramMap.get('id');
    if (budgetId) {
      this.loadBudgetDetails(budgetId);
    } else {
      this.errorMessage.set('Budget ID not found');
      this.isLoading.set(false);
    }
  }

  async loadBudgetDetails(budgetId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // Fetch budget data
      const budgetData = await this.budgetService.getBudget(budgetId);

      if (!budgetData) {
        this.errorMessage.set('Budget not found');
        this.isLoading.set(false);
        return;
      }

      this.budget.set(budgetData);

      // Fetch patient data
      const patients = await this.patientService.getAllPatients();
      const patient = patients.find((p: any) => p.id === budgetData.patientId);

      if (patient) {
        this.patient.set(patient as PatientListItem);
      }

      this.isLoading.set(false);
    } catch (error) {
      this.errorMessage.set('Failed to load budget details. Please try again.');
      this.isLoading.set(false);
    }
  }

  /**
   * Navigate back to budget list
   */
  goBack(): void {
    this.router.navigate(['/budgets']);
  }

  /**
   * Navigate to edit budget
   */
  editBudget(): void {
    const budgetId = this.budget()?.id;
    if (budgetId) {
      this.router.navigate(['/budgets/edit', budgetId]);
    }
  }

  /**
   * Print budget as PDF
   */
  printPDF(): void {
    window.print();
  }

  /**
   * Get status color for tag
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'gold';
      case 'active':
        return 'blue';
      case 'paid':
        return 'green';
      default:
        return 'default';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Get patient full name
   */
  getPatientName(): string {
    const pat = this.patient();
    if (!pat) return 'Unknown Patient';
    return `${pat.personalData.firstName} ${pat.personalData.lastName}`;
  }
}
