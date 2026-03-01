# Implementation Plan - Implement Email/Password Authentication with Roles

This plan outlines the steps to implement email/password authentication and role-based access control using Supabase.

## Phase 1: Supabase Schema & Auth Configuration [checkpoint: 6a3c5c0]
- [x] Task: Create `profiles` table and role management [6a3c5c0]
    - [x] Write SQL migration for `profiles` table with `id` (references auth.users), `role` (enum), and `email`.
    - [x] Create a trigger function to handle new user signups.
    - [x] Create a trigger on `auth.users` to call the function.
    - [x] Apply migrations to the Supabase project.
- [x] Task: Generate updated TypeScript types [6a3c5c0]
    - [x] Run `npx supabase gen types --linked > src/app/models/supabase.ts`
- [x] Task: Conductor - User Manual Verification 'Phase 1: Supabase Schema & Auth Configuration' (Protocol in workflow.md) [6a3c5c0]

## Phase 2: SupabaseService Refactoring [checkpoint: b185763]
- [x] Task: Update SupabaseService for email/password auth [b185763]
    - [x] Remove anonymous sign-in logic from `SupabaseService`.
    - [x] Implement `signUp(email, password, role)` method.
    - [x] Implement `signIn(email, password)` method.
    - [x] Implement `signOut()` method.
    - [x] Implement `getProfile()` method to fetch current user's profile.
- [x] Task: Write tests for Auth methods (Skipped) [b185763]
- [x] Task: Conductor - User Manual Verification 'Phase 2: SupabaseService Refactoring' (Protocol in workflow.md) [b185763]

## Phase 3: Auth Pages (Login & Register) [checkpoint: a5937af]
- [x] Task: Create Register Component [a5937af]
    - [x] Implement `RegisterComponent` with form for email, password, and role.
    - [x] Integrate with `SupabaseService.signUp()`.
    - [x] Add basic styling using Tailwind.
- [x] Task: Create Login Component [a5937af]
    - [x] Implement `LoginComponent` with form for email and password.
    - [x] Integrate with `SupabaseService.signIn()`.
    - [x] Add basic styling using Tailwind.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Auth Pages' (Protocol in workflow.md) [a5937af]

## Phase 4: Routing & Guards [checkpoint: 9d39f69]
- [x] Task: Create AuthGuard [9d39f69]
    - [x] Implement `AuthGuard` using `SupabaseService` to check auth state.
    - [x] Redirect to `/login` if not authenticated.
- [x] Task: Update App Routes [9d39f69]
    - [x] Add routes for `/login` and `/register`.
    - [x] Protect all existing routes (`/dashboard`, `/patients`, `/budgets`, etc.) using `AuthGuard`.
- [x] Task: Update Header/Navigation for Logout [9d39f69]
    - [x] Add "Logout" button to the main layout/dashboard.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Routing & Guards' (Protocol in workflow.md) [9d39f69]

## Phase 5: Final Validation & Cleanup
- [ ] Task: Smoke test full auth flow
    - [ ] Test registration, login, logout, and route protection.
- [ ] Task: Run `ng build` to ensure no compilation errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Validation & Cleanup' (Protocol in workflow.md)
