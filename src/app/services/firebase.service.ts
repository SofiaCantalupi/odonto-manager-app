import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, FirebaseApp, getApp, getApps } from 'firebase/app';
import {
  getDatabase,
  Database,
  ref,
  set,
  get,
  remove,
  onValue,
  Unsubscribe,
} from 'firebase/database';
import { getAuth, Auth, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * FirebaseService - Manages Firebase initialization and authentication
 * Handles both browser and SSR environments
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private platformId = inject(PLATFORM_ID);

  // Firebase instances
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private auth: Auth | null = null;

  // User authentication state
  private currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUser.asObservable();

  // Initialization state
  private initialized = new BehaviorSubject<boolean>(false);
  initialized$ = this.initialized.asObservable();

  // Active listeners (for cleanup)
  private activeListeners: Map<string, Unsubscribe> = new Map();

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase - only in browser environment
   */
  private initializeFirebase(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('Firebase: Running in SSR mode - skipping initialization');
      this.initialized.next(false);
      return;
    }

    try {
      // Check if Firebase is already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApp();
      }

      this.database = getDatabase(this.app);
      this.auth = getAuth(this.app);

      // Sign in anonymously for database access
      this.setupAuthentication();

      console.log('Firebase initialized successfully');
      this.initialized.next(true);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.initialized.next(false);
    }
  }

  /**
   * Setup anonymous authentication
   */
  private setupAuthentication(): void {
    if (!this.auth || !isPlatformBrowser(this.platformId)) {
      return;
    }

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.currentUser.next(user);
        console.log('Authenticated as:', user.uid);
      } else {
        // Sign in anonymously if not authenticated
        signInAnonymously(this.auth!)
          .then((result) => {
            this.currentUser.next(result.user);
            console.log('Signed in anonymously:', result.user.uid);
          })
          .catch((error) => {
            console.error('Anonymous authentication failed:', error);
          });
      }
    });
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUser.value?.uid || null;
  }

  /**
   * Write data to Realtime Database
   */
  async writeData(path: string, data: any): Promise<void> {
    if (!this.database || !isPlatformBrowser(this.platformId)) {
      console.warn('Firebase: Cannot write data in SSR environment');
      return;
    }

    try {
      await set(ref(this.database, path), data);
      console.log('Data written to:', path);
    } catch (error) {
      console.error('Error writing data:', error);
      throw error;
    }
  }

  /**
   * Read data from Realtime Database
   */
  async readData(path: string): Promise<any> {
    if (!this.database || !isPlatformBrowser(this.platformId)) {
      console.warn('Firebase: Cannot read data in SSR environment');
      return null;
    }

    try {
      const snapshot = await get(ref(this.database, path));
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error: any) {
      if (error?.message?.includes('Permission denied')) {
        console.error(
          '❌ Firebase Permission Denied for path: ' +
            path +
            '\n' +
            'Please update your Firebase Realtime Database security rules.\n' +
            'See FIREBASE_SETUP.md for detailed instructions.',
        );
      } else {
        console.error('Error reading data:', error);
      }
      throw error;
    }
  }

  /**
   * Listen to real-time data changes
   * Returns an observable that emits when data changes
   */
  listenToData(path: string): Observable<any> {
    return new Observable((observer) => {
      if (!this.database || !isPlatformBrowser(this.platformId)) {
        observer.next(null);
        observer.complete();
        return;
      }

      // Remove previous listener if exists
      if (this.activeListeners.has(path)) {
        this.activeListeners.get(path)?.();
      }

      // Setup new listener
      const unsubscribe = onValue(
        ref(this.database!, path),
        (snapshot) => {
          if (snapshot.exists()) {
            observer.next(snapshot.val());
          } else {
            observer.next(null);
          }
        },
        (error) => {
          observer.error(error);
        },
      );

      // Store listener for cleanup
      this.activeListeners.set(path, unsubscribe);

      // Return cleanup function
      return () => {
        unsubscribe();
        this.activeListeners.delete(path);
      };
    });
  }

  /**
   * Delete data from Realtime Database
   */
  async deleteData(path: string): Promise<void> {
    if (!this.database || !isPlatformBrowser(this.platformId)) {
      console.warn('Firebase: Cannot delete data in SSR environment');
      return;
    }

    try {
      await remove(ref(this.database, path));
      console.log('Data deleted from:', path);
    } catch (error) {
      console.error('Error deleting data:', error);
      throw error;
    }
  }

  /**
   * Check if Firebase is initialized
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
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    // Clean up all listeners
    this.activeListeners.forEach((unsubscribe) => unsubscribe());
    this.activeListeners.clear();
  }
}
