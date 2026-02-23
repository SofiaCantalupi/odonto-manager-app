/**
 * Procedure Category Types
 */
export type ProcedureCategory =
  | 'general'
  | 'restorative'
  | 'prevention'
  | 'surgery'
  | 'orthodontics'
  | 'periodontics'
  | 'prosthesis'
  | 'endodontics';

/**
 * Procedure Interface
 * Represents a dental procedure with pricing and categorization
 */
export interface Procedure {
  id: string;
  name: string;
  description?: string;
  category: ProcedureCategory;
  basePrice: number;
}

/**
 * Procedure form data (without id for creation)
 */
export interface ProcedureFormData {
  name: string;
  description?: string;
  category: ProcedureCategory;
  basePrice: number;
}

/**
 * Category labels for UI display
 */
export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  general: 'General',
  restorative: 'Restorative',
  prevention: 'Prevention',
  surgery: 'Surgery',
  orthodontics: 'Orthodontics',
  periodontics: 'Periodontics',
  prosthesis: 'Prosthesis',
  endodontics: 'Endodontics',
};
