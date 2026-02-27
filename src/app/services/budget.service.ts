import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Budget, BudgetFormData, Quote, BudgetItem } from '../core/models/budget';
import { Observable, from, map } from 'rxjs';
import { Database } from '../models/supabase';

/**
 * BudgetService - Manages budget data CRUD operations with Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private supabaseService = inject(SupabaseService);

  /**
   * Create a new budget
   * @param budgetData - Budget data to save
   * @returns Promise with the generated budget ID
   */
  async createBudget(budgetData: BudgetFormData): Promise<string> {
    // 1. Create main budget record
    const { data: budget, error: budgetError } = await this.supabaseService.client
      .from('budgets')
      .insert({
        patient_id: budgetData.patientId,
        total_amount: budgetData.totalAmount,
        status: budgetData.status,
        financing_type: budgetData.financingType,
        description: budgetData.description,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (budgetError) throw budgetError;

    const budgetId = budget.id;

    // 2. Create budget items
    if (budgetData.items.length > 0) {
      const items = budgetData.items.map((item) => ({
        budget_id: budgetId,
        procedure_id: item.procedureId,
        procedure_name: item.procedureName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await this.supabaseService.client
        .from('budget_items')
        .insert(items);

      if (itemsError) throw itemsError;
    }

    // 3. Create quotes if fixed-quotes
    if (budgetData.financingType === 'fixed-quotes' && budgetData.quotes) {
      const quotes = budgetData.quotes.map((q) => ({
        budget_id: budgetId,
        number: q.number,
        amount: q.amount,
        due_date: q.dueDate instanceof Date ? q.dueDate.toISOString().split('T')[0] : q.dueDate,
        status: q.status,
      }));

      const { error: quotesError } = await this.supabaseService.client
        .from('quotes')
        .insert(quotes);

      if (quotesError) throw quotesError;
    }

    return budgetId;
  }

  /**
   * Get a budget by ID
   * @param budgetId - The budget ID
   * @returns Promise with budget data or null if not found
   */
  async getBudget(budgetId: string): Promise<Budget | null> {
    const { data, error } = await this.supabaseService.client
      .from('budgets')
      .select('*, budget_items(*), quotes(*)')
      .eq('id', budgetId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapSupabaseToBudget(data);
  }

  /**
   * Update an existing budget
   * @param budgetId - The budget ID
   * @param updates - Partial budget data to update
   */
  async updateBudget(budgetId: string, updates: Partial<BudgetFormData>): Promise<void> {
    // Update main record
    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.description) updateData.description = updates.description;
    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabaseService.client
      .from('budgets')
      .update(updateData)
      .eq('id', budgetId);

    if (error) throw error;
  }

  /**
   * Delete a budget
   * @param budgetId - The budget ID
   */
  async deleteBudget(budgetId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) throw error;
  }

  /**
   * Get all budgets for a specific patient
   */
  async getBudgetsByPatient(patientId: string): Promise<Budget[]> {
    const { data, error } = await this.supabaseService.client
      .from('budgets')
      .select('*, budget_items(*), quotes(*)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map((b) => this.mapSupabaseToBudget(b));
  }

  /**
   * Get budgets stream (real-time updates)
   */
  getBudgetsStream(): Observable<Budget[]> {
    return from(this.getAllBudgets());
  }

  private async getAllBudgets(): Promise<Budget[]> {
    const { data, error } = await this.supabaseService.client
      .from('budgets')
      .select('*, budget_items(*), quotes(*)')
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map((b) => this.mapSupabaseToBudget(b));
  }

  private mapSupabaseToBudget(data: any): Budget {
    return {
      id: data.id,
      patientId: data.patient_id,
      date: data.date,
      totalAmount: data.total_amount,
      status: data.status,
      items: (data.budget_items || []).map((item: any) => ({
        procedureId: item.procedure_id,
        procedureName: item.procedure_name || '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
      financingType: data.financing_type,
      quotes: (data.quotes || [])
        .map((q: any) => ({
          number: q.number,
          amount: q.amount,
          dueDate: new Date(q.due_date),
          status: q.status,
        }))
        .sort((a: any, b: any) => a.number - b.number),
      description: data.description || undefined,
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };
  }

  /**
   * Utility methods (copied from original service as they are business logic only)
   */
  calculateQuotes(totalAmount: number, numberOfQuotes: number): Quote[] {
    const quotes: Quote[] = [];
    const amountPerQuote = totalAmount / numberOfQuotes;

    for (let i = 0; i < numberOfQuotes; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      quotes.push({
        number: i + 1,
        amount: parseFloat(amountPerQuote.toFixed(2)),
        dueDate,
        status: 'pending',
      });
    }

    const sumOfQuotes = quotes.reduce((sum, quote) => sum + quote.amount, 0);
    const difference = totalAmount - sumOfQuotes;
    if (difference !== 0 && quotes.length > 0) {
      quotes[quotes.length - 1].amount += difference;
    }

    return quotes;
  }

  validateQuotesSum(quotes: Quote[], totalAmount: number): boolean {
    const sum = quotes.reduce((acc, quote) => acc + quote.amount, 0);
    return Math.abs(sum - totalAmount) < 0.01;
  }
}
