import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { Database } from '../models/supabase';
import { supabaseConfig } from './supabase.config';
import { BehaviorSubject, Observable, from, map, of, switchMap } from 'rxjs';

export type UserRole = Database['public']['Enums']['user_role'];

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * SupabaseService - Manages Supabase client initialization, authentication, and profiles
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

  // User profile state
  private profile = new BehaviorSubject<UserProfile | null>(null);
  profile$ = this.profile.asObservable();

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

      // Setup auth state listener
      this.setupAuthStateListener();

      console.log('Supabase initialized successfully');
      this.initialized.next(true);
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.initialized.next(false);
    }
  }

  /**
   * Setup auth state listener
   */
  private async setupAuthStateListener(): Promise<void> {
    if (!this.supabase || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Get initial session
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.currentUser.next(session.user);
      await this.fetchProfile(session.user.id);
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      if (session?.user) {
        this.currentUser.next(session.user);
        await this.fetchProfile(session.user.id);
      } else {
        this.currentUser.next(null);
        this.profile.next(null);
      }
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, role: UserRole): Promise<{ error: AuthError | null }> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
        },
      },
    });

    return { error };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
  }

  /**
   * Fetch user profile from public.profiles
   */
  private async fetchProfile(userId: string): Promise<void> {
    if (!this.supabase) return;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      this.profile.next({
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
      });
    }
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

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser.value;
  }
}
