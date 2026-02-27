# Implementation Plan - Implement Email/Password Authentication with Roles

This plan outlines the steps to implement email/password authentication and role-based access control using Supabase.

## Phase 1: Supabase Schema & Auth Configuration
- [x] Task: Create `profiles` table and role management
    - [x] Write SQL migration for `profiles` table with `id` (references auth.users), `role` (enum), and `email`.
    - [x] Create a trigger function to handle new user signups.
    - [x] Create a trigger on `auth.users` to call the function.
    - [x] Apply migrations to the Supabase project.
- [x] Task: Generate updated TypeScript types
    - [x] Run `npx supabase gen types --linked > src/app/models/supabase.ts`
- [~] Task: Conductor - User Manual Verification 'Phase 1: Supabase Schema & Auth Configuration' (Protocol in workflow.md)

## Phase 2: SupabaseService Refactoring
- [ ] Task: Update SupabaseService for email/password auth
    - [ ] Remove anonymous sign-in logic from `SupabaseService`.
    - [ ] Implement `signUp(email, password, role)` method.
    - [ ] Implement `signIn(email, password)` method.
    - [ ] Implement `signOut()` method.
    - [ ] Implement `getProfile()` method to fetch current user's profile.
- [ ] Task: Write tests for Auth methods (Skipped per user preference, but logic must be sound)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: SupabaseService Refactoring' (Protocol in workflow.md)

## Phase 3: Auth Pages (Login & Register)
- [ ] Task: Create Register Component
    - [ ] Implement `RegisterComponent` with form for email, password, and role.
    - [ ] Integrate with `SupabaseService.signUp()`.
    - [ ] Add basic styling using Tailwind.
- [ ] Task: Create Login Component
    - [ ] Implement `LoginComponent` with form for email and password.
    - [ ] Integrate with `SupabaseService.signIn()`.
    - [ ] Add basic styling using Tailwind.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Auth Pages' (Protocol in workflow.md)

## Phase 4: Routing & Guards
- [ ] Task: Create AuthGuard
    - [ ] Implement `AuthGuard` using `SupabaseService` to check auth state.
    - [ ] Redirect to `/login` if not authenticated.
- [ ] Task: Update App Routes
    - [ ] Add routes for `/login` and `/register`.
    - [ ] Protect all existing routes (`/dashboard`, `/patients`, `/budgets`, etc.) using `AuthGuard`.
- [ ] Task: Update Header/Navigation for Logout
    - [ ] Add "Logout" button to the main layout/dashboard.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Routing & Guards' (Protocol in workflow.md)

## Phase 5: Final Validation & Cleanup
- [ ] Task: Smoke test full auth flow
    - [ ] Test registration, login, logout, and route protection.
- [ ] Task: Run `ng build` to ensure no compilation errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Validation & Cleanup' (Protocol in workflow.md)
