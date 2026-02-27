import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from '../models/supabase';
import { supabaseConfig } from './supabase.config';
import { BehaviorSubject } from 'rxjs';

/**
 * SupabaseService - Manages Supabase client initialization and authentication
 * Handles both browser and SSR environments
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private platformId = inject(PLATFORM_ID);
  private supabase: SupabaseClient<Database> | null = null;

  // User authentication state
  private currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUser.asObservable();

  // Initialization state
  private initialized = new BehaviorSubject<boolean>(false);
  initialized$ = this.initialized.asObservable();

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase - only in browser environment
   */
  private initializeSupabase(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('Supabase: Running in SSR mode - skipping initialization');
      this.initialized.next(false);
      return;
    }

    try {
      this.supabase = createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey);

      // Sign in anonymously for database access (matching previous Firebase flow)
      this.setupAuthentication();

      console.log('Supabase initialized successfully');
      this.initialized.next(true);
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.initialized.next(false);
    }
  }

  /**
   * Setup anonymous authentication
   */
  private async setupAuthentication(): Promise<void> {
    if (!this.supabase || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Get initial session
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.currentUser.next(session.user);
      console.log('Supabase: Authenticated as:', session.user.id);
    } else {
      // Sign in anonymously if not authenticated
      const { data, error } = await this.supabase.auth.signInAnonymously();
      if (data?.user) {
        this.currentUser.next(data.user);
        console.log('Supabase: Signed in anonymously:', data.user.id);
      } else if (error) {
        console.error('Supabase: Anonymous authentication failed:', error);
      }
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.currentUser.next(session.user);
      } else {
        this.currentUser.next(null);
      }
    });
  }

  /**
   * Get the Supabase client instance
   */
  get client(): SupabaseClient<Database> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Check if running in browser.');
    }
    return this.supabase;
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUser.value?.id || null;
  }

  /**
   * Check if Supabase is initialized
   */
  isInitialized(): boolean {
    return this.initialized.value;
  }

  /**
   * Check if running in browser environment
   */
  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
