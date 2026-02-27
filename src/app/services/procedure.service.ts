import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Procedure, ProcedureFormData, ProcedureCategory } from '../models/procedure';
import { Database } from '../models/supabase';

/**
 * ProcedureService - Handles CRUD operations for dental procedures
 * Manages procedure data persistence in Supabase PostgreSQL
 */
@Injectable({
  providedIn: 'root',
})
export class ProcedureService {
  private supabaseService = inject(SupabaseService);

  /**
   * Get all procedures as an Observable stream
   */
  getProceduresStream(): Observable<Procedure[]> {
    return from(this.getProcedures());
  }

  /**
   * Get all procedures once (no real-time updates)
   */
  async getProcedures(): Promise<Procedure[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('procedures')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return this.normalizeProcedures(data);
    } catch (error) {
      console.error('Failed to load procedures from Supabase:', error);
      return [];
    }
  }

  /**
   * Get a single procedure by ID
   */
  async getProcedureById(id: string): Promise<Procedure | null> {
    const { data, error } = await this.supabaseService.client
      .from('procedures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapSupabaseToProcedure(data);
  }

  /**
   * Create a new procedure
   * @returns The generated procedure ID
   */
  async createProcedure(procedureData: ProcedureFormData): Promise<string> {
    const { data, error } = await this.supabaseService.client
      .from('procedures')
      .insert({
        name: procedureData.name,
        description: procedureData.description,
        category: procedureData.category,
        base_price: procedureData.basePrice,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Update an existing procedure
   */
  async updateProcedure(id: string, procedureData: Partial<ProcedureFormData>): Promise<void> {
    const updateData: any = {};
    if (procedureData.name) updateData.name = procedureData.name;
    if (procedureData.description) updateData.description = procedureData.description;
    if (procedureData.category) updateData.category = procedureData.category;
    if (procedureData.basePrice !== undefined) updateData.base_price = procedureData.basePrice;

    const { error } = await this.supabaseService.client
      .from('procedures')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete a procedure
   */
  async deleteProcedure(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('procedures')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Search procedures by name or category
   */
  async searchProcedures(query: string): Promise<Procedure[]> {
    const { data, error } = await this.supabaseService.client
      .from('procedures')
      .select('*')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`);

    if (error) throw error;
    return this.normalizeProcedures(data);
  }

  /**
   * Get procedures by category
   */
  async getProceduresByCategory(category: string): Promise<Procedure[]> {
    const { data, error } = await this.supabaseService.client
      .from('procedures')
      .select('*')
      .eq('category', category);

    if (error) throw error;
    return this.normalizeProcedures(data);
  }

  /**
   * Normalize Supabase data to Procedure array
   */
  private normalizeProcedures(data: any[] | null): Procedure[] {
    if (!data) return [];
    return data.map((p) => this.mapSupabaseToProcedure(p));
  }

  private mapSupabaseToProcedure(data: Database['public']['Tables']['procedures']['Row']): Procedure {
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      category: (data.category as ProcedureCategory) || 'general',
      basePrice: data.base_price,
    };
  }
}
