# Implementation Plan - Migrate database from Firebase Realtime Database to Supabase (PostgreSQL)

This plan outlines the steps to migrate the Dental Manager application's database and authentication from Firebase Realtime Database to Supabase (PostgreSQL).

## Phase 1: Setup & Schema Definition [checkpoint: 861d9c2]
- [x] Task: Initialize Supabase project and link CLI [861d9c2]
    - [x] Create a new Supabase project via the dashboard or CLI
    - [x] Link the local project to the Supabase project using `npx supabase link`
- [x] Task: Define database schema (Tables: patients, procedures, selected_teeth, budgets, quotes, budget_items) [861d9c2]
    - [x] Write SQL migration for `patients` table
    - [x] Write SQL migration for `procedures` table
    - [x] Write SQL migration for `selected_teeth` table
    - [x] Write SQL migration for `budgets`, `quotes`, and `budget_items` tables
    - [x] Apply migrations to the Supabase project
- [x] Task: Generate TypeScript types for the schema [861d9c2]
    - [x] Run `npx supabase gen types --linked > src/app/models/supabase.ts`
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup & Schema Definition' (Protocol in workflow.md) [861d9c2]

## Phase 2: Authentication & Client Integration
- [ ] Task: Set up Supabase Auth in the Angular app
    - [ ] Install `@supabase/supabase-js`
    - [ ] Create `SupabaseService` to initialize the client
    - [ ] Implement anonymous authentication (or similar to match current Firebase flow)
- [ ] Task: Write Tests for Supabase Client Initialization
    - [ ] Create `supabase.service.spec.ts`
    - [ ] Write failing test to verify client initialization and auth state
- [ ] Task: Implement Supabase Client and Auth
    - [ ] Update `SupabaseService` to pass the tests
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Authentication & Client Integration' (Protocol in workflow.md)

## Phase 3: Data Migration
- [ ] Task: Export data from Firebase Realtime Database
    - [ ] Use Firebase CLI or Console to export JSON data
- [ ] Task: Create and run a script to import data into Supabase
    - [ ] Write a Node.js script to parse Firebase JSON and insert into Supabase PostgreSQL
    - [ ] Verify data count and integrity
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Data Migration' (Protocol in workflow.md)

## Phase 4: Service Refactoring
- [ ] Task: Update PatientService to use Supabase
    - [ ] Write failing tests in `patient.service.spec.ts` for Supabase-based CRUD
    - [ ] Refactor `PatientService` to use `SupabaseService`
- [ ] Task: Update ProcedureService to use Supabase
    - [ ] Write failing tests in `procedure.service.spec.ts` for Supabase-based CRUD
    - [ ] Refactor `ProcedureService` to use `SupabaseService`
- [ ] Task: Update OdontogramService to use Supabase
    - [ ] Write failing tests in `odontogram.service.spec.ts` for Supabase-based persistence
    - [ ] Refactor `OdontogramService` to use `SupabaseService`
- [ ] Task: Update BudgetService to use Supabase
    - [ ] Write failing tests in `budget.service.spec.ts` for Supabase-based CRUD
    - [ ] Refactor `BudgetService` to use `SupabaseService`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Service Refactoring' (Protocol in workflow.md)

## Phase 5: Validation & Cleanup
- [ ] Task: Run end-to-end tests to verify functionality
    - [ ] Execute `ng test` and ensure all service tests pass
    - [ ] Perform manual smoke tests on the UI
- [ ] Task: Remove Firebase dependencies and code
    - [ ] Uninstall `firebase` and `@angular/fire` (if present)
    - [ ] Delete `firebase.service.ts` and related config files
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Validation & Cleanup' (Protocol in workflow.md)
