import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  describe('Browser environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          SupabaseService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });
      service = TestBed.inject(SupabaseService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize Supabase client in browser', () => {
      expect(service.isBrowser()).toBeTrue();
      // Since we can't easily mock the external supabase-js without more setup,
      // we check the initialization state
      expect(service.isInitialized()).toBeTrue();
    });

    it('should provide the client instance', () => {
      const client = service.client;
      expect(client).toBeDefined();
    });
  });

  describe('SSR environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          SupabaseService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      service = TestBed.inject(SupabaseService);
    });

    it('should NOT initialize Supabase client in SSR', () => {
      expect(service.isBrowser()).toBeFalse();
      expect(service.isInitialized()).toBeFalse();
    });

    it('should throw error when accessing client in SSR', () => {
      expect(() => service.client).toThrowError(/not initialized/);
    });
  });
});
