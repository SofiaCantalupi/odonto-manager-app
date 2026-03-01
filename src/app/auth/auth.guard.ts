import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map, take } from 'rxjs';

/**
 * AuthGuard - Protects routes from unauthenticated access
 */
export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (user) {
        return true;
      } else {
        // Redirect to login page
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }),
  );
};
