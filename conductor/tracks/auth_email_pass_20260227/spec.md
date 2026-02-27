# Specification - Implement Email/Password Authentication with Roles

## Goal
The goal of this track is to replace the current anonymous authentication with a secure email/password authentication system. This system will support user roles (Dentist, Admin, Secretary) and protect the application's routes using Angular guards.

## Requirements

### Supabase Auth & Database
- Enable Email/Password authentication in the Supabase project.
- Create a `profiles` table in the `public` schema to store user roles and metadata.
- Implement a Supabase trigger to automatically create a profile record whenever a new user signs up.
- Define valid roles: `dentist`, `admin`, `secretary`.

### Application Services
- Refactor `SupabaseService` to remove anonymous sign-in logic.
- Add `signUp(email, password, role, metadata)` method to `SupabaseService`.
- Add `signIn(email, password)` method to `SupabaseService`.
- Add `signOut()` method to `SupabaseService`.
- Add `getProfile()` method to retrieve the current user's profile and role.

### User Interface
- **Login Page:**
    - Form with email and password fields.
    - Validation for required fields and email format.
    - Error handling for invalid credentials.
    - "Register" link to navigate to the registration page.
    - Redirect to dashboard on successful login.
- **Register Page:**
    - Form with email, password, and role selection.
    - Role selection dropdown (Dentist, Admin, Secretary).
    - Validation for all fields.
    - Success/error feedback for the registration process.
    - Link back to the login page.

### Security & Routing
- Create an `AuthGuard` to protect all existing application routes.
- Redirect unauthenticated users to the login page.
- Ensure the login and register pages are accessible to unauthenticated users.
- (Optional/Future) Implement role-based access control (RBAC) within components or routes.

## User Stories
- **As an unauthenticated user**, I want to be able to create an account with my email, password, and role so that I can access the system.
- **As a registered user**, I want to log in with my credentials so that I can manage clinical data.
- **As an authenticated user**, I want to be able to log out securely.
- **As a developer**, I want to ensure that all clinical routes are protected from unauthorized access.
