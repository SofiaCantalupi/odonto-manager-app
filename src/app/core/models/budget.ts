import { Procedure } from '../../models/procedure';

/**
 * Quote for Fixed Quotes financing type
 */
export interface Quote {
  number: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid';
}

/**
 * Budget Interface
 * Represents a treatment budget for a patient
 */
export interface Budget {
  id: string;
  patientId: string;
  date: string; // ISO 8601 timestamp
  totalAmount: number;
  status: 'pending' | 'active' | 'paid';
  items: BudgetItem[];
  financingType: 'fixed-quotes' | 'open-balance';
  quotes?: Quote[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Budget Item - Procedure with quantity and price
 */
export interface BudgetItem {
  procedureId: string;
  procedureName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Form data for budget creation/editing
 */
export interface BudgetFormData {
  patientId: string;
  totalAmount: number;
  status: 'pending' | 'active' | 'paid';
  items: BudgetItem[];
  financingType: 'fixed-quotes' | 'open-balance';
  numberOfQuotes?: number;
  quotes?: Quote[];
  description?: string;
}

/**
 * Status labels for UI display
 */
export const BUDGET_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  paid: 'Paid',
};

/**
 * Financing type labels for UI display
 */
export const FINANCING_TYPE_LABELS: Record<string, string> = {
  'fixed-quotes': 'Fixed Quotes',
  'open-balance': 'Open Balance',
};
