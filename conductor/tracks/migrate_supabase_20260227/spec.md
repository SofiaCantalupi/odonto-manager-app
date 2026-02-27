# Specification - Migrate database from Firebase Realtime Database to Supabase (PostgreSQL)

## Goal
The goal of this track is to migrate the Dental Manager application's database and authentication from Firebase Realtime Database to Supabase (PostgreSQL). This includes setting up the new environment, defining the schema, migrating existing data, and refactoring the application services to use the Supabase client.

## Requirements

### Supabase Setup
- Initialize a new Supabase project.
- Link the local development environment to the Supabase project.
- Configure Supabase Auth for anonymous or email-based access.

### Database Schema
- Define a PostgreSQL schema that accurately reflects the current Firebase Realtime Database structure.
- Create tables for:
    - `patients`: Patient profiles and records.
    - `procedures`: List of dental procedures and their pricing.
    - `selected_teeth`: User-specific tooth selections for the odontogram.
    - `budgets`: Patient treatment budgets and financing details.
    - `quotes`: Payment schedules for fixed-quote financing.
    - `budget_items`: Procedure line items within a budget.

### Data Migration
- Export all existing data from Firebase Realtime Database in JSON format.
- Develop a migration script to parse the JSON and insert the data into the corresponding Supabase PostgreSQL tables.
- Ensure data integrity and consistent record mapping (e.g., matching patient IDs).

### Application Refactoring
- Replace the `FirebaseService` with a new `SupabaseService`.
- Refactor all existing data services (`PatientService`, `ProcedureService`, `OdontogramService`, `BudgetService`) to use the Supabase client for all CRUD operations.
- Ensure all services follow the project's TDD principles and provide comprehensive test coverage.

### Validation & Cleanup
- Verify that the application functions correctly with the new Supabase backend through automated tests and manual verification.
- Remove all Firebase-related dependencies, configuration files, and unused code from the project.

## Non-Functional Requirements
- **Data Integrity:** All existing data must be preserved and accurately migrated.
- **Performance:** Database queries and data retrieval must be as performant as or better than the current Firebase implementation.
- **Maintainability:** The new Supabase integration must follow best practices and be well-documented.
- **Scalability:** The chosen PostgreSQL schema must be scalable to accommodate future application features.
