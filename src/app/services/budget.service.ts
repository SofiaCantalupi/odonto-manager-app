import { Injectable, inject } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Budget, BudgetFormData, Quote } from '../core/models/budget';
import { Observable, map, of, switchMap } from 'rxjs';

/**
 * BudgetService - Manages budget data CRUD operations with Firebase
 */
@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private firebaseService = inject(FirebaseService);
  private readonly BUDGETS_PATH = 'budgets';

  /**
   * Create a new budget
   * @param budgetData - Budget data to save
   * @returns Promise with the generated budget ID
   */
  async createBudget(budgetData: BudgetFormData): Promise<string> {
    const budgetId = this.generateBudgetId();
    const path = `${this.BUDGETS_PATH}/${budgetId}`;

    const budget: Budget = {
      id: budgetId,
      patientId: budgetData.patientId,
      date: new Date().toISOString(),
      totalAmount: budgetData.totalAmount,
      status: budgetData.status,
      items: budgetData.items,
      financingType: budgetData.financingType,
      quotes: budgetData.quotes,
      description: budgetData.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseService.writeData(path, budget);
    console.log(`Budget created with ID: ${budgetId}`);
    return budgetId;
  }

  /**
   * Get a budget by ID
   * @param budgetId - The budget ID
   * @returns Promise with budget data or null if not found
   */
  async getBudget(budgetId: string): Promise<Budget | null> {
    const path = `${this.BUDGETS_PATH}/${budgetId}`;
    const data = await this.firebaseService.readData(path);
    return data as Budget | null;
  }

  /**
   * Update an existing budget
   * @param budgetId - The budget ID
   * @param updates - Partial budget data to update
   */
  async updateBudget(budgetId: string, updates: Partial<BudgetFormData>): Promise<void> {
    const path = `${this.BUDGETS_PATH}/${budgetId}`;
    const existing = await this.firebaseService.readData(path);

    if (!existing) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const updated: Budget = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseService.writeData(path, updated);
    console.log(`Budget ${budgetId} updated`);
  }

  /**
   * Delete a budget
   * @param budgetId - The budget ID
   */
  async deleteBudget(budgetId: string): Promise<void> {
    const path = `${this.BUDGETS_PATH}/${budgetId}`;
    await this.firebaseService.deleteData(path);
    console.log(`Budget ${budgetId} deleted`);
  }

  /**
   * Get all budgets for a specific patient
   * @param patientId - The patient ID
   * @returns Promise with array of budgets
   */
  async getBudgetsByPatient(patientId: string): Promise<Budget[]> {
    const path = this.BUDGETS_PATH;
    const data = await this.firebaseService.readData(path);

    if (!data || typeof data !== 'object') {
      return [];
    }

    return Object.values(data)
      .filter((budget: any) => budget.patientId === patientId)
      .sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }) as Budget[];
  }

  /**
   * Get budgets filtered by status
   * @param status - The status to filter by
   * @returns Promise with array of budgets
   */
  async getBudgetsByStatus(status: 'pending' | 'active' | 'paid'): Promise<Budget[]> {
    const path = this.BUDGETS_PATH;
    const data = await this.firebaseService.readData(path);

    if (!data || typeof data !== 'object') {
      return [];
    }

    return Object.values(data)
      .filter((budget: any) => budget.status === status)
      .sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }) as Budget[];
  }

  /**
   * Get budgets by patient and status
   */
  async getBudgetsByPatientAndStatus(
    patientId: string,
    status: 'pending' | 'active' | 'paid',
  ): Promise<Budget[]> {
    const path = this.BUDGETS_PATH;
    const data = await this.firebaseService.readData(path);

    if (!data || typeof data !== 'object') {
      return [];
    }

    return Object.values(data)
      .filter((budget: any) => budget.patientId === patientId && budget.status === status)
      .sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }) as Budget[];
  }

  /**
   * Get budgets stream (real-time updates)
   * @returns Observable with array of budgets
   */
  getBudgetsStream(): Observable<Budget[]> {
    return this.firebaseService.currentUser$.pipe(
      switchMap(() => {
        const path = this.BUDGETS_PATH;
        return this.firebaseService.listenToData(path).pipe(
          map((data) => {
            if (!data || typeof data !== 'object') {
              return [];
            }

            return Object.entries(data)
              .map(([id, budgetData]: [string, any]) => ({
                id: budgetData.id || id,
                ...budgetData,
              }))
              .sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              }) as Budget[];
          }),
        );
      }),
    );
  }

  /**
   * Calculate quotes for fixed quotes financing
   * @param totalAmount - Total budget amount
   * @param numberOfQuotes - Number of quotes to generate
   * @returns Array of Quote objects
   */
  calculateQuotes(totalAmount: number, numberOfQuotes: number): Quote[] {
    const quotes: Quote[] = [];
    const amountPerQuote = totalAmount / numberOfQuotes;

    for (let i = 0; i < numberOfQuotes; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1); // Add 1 month for each quote

      quotes.push({
        number: i + 1,
        amount: parseFloat(amountPerQuote.toFixed(2)),
        dueDate,
        status: 'pending',
      });
    }

    // Adjust last quote to handle rounding differences
    const sumOfQuotes = quotes.reduce((sum, quote) => sum + quote.amount, 0);
    const difference = totalAmount - sumOfQuotes;
    if (difference !== 0 && quotes.length > 0) {
      quotes[quotes.length - 1].amount += difference;
    }

    return quotes;
  }

  /**
   * Validate that sum of quote amounts equals total amount
   * @param quotes - Array of quotes
   * @param totalAmount - Total budget amount
   * @returns true if valid, false otherwise
   */
  validateQuotesSum(quotes: Quote[], totalAmount: number): boolean {
    const sum = quotes.reduce((acc, quote) => acc + quote.amount, 0);
    return Math.abs(sum - totalAmount) < 0.01; // Allow small rounding differences
  }

  /**
   * Generate a unique budget ID
   * @returns Unique budget ID
   */
  private generateBudgetId(): string {
    return `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
