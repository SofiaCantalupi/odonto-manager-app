# Supabase Style Guide

## Overview
Guidelines for managing PostgreSQL and Supabase within the Dental Manager project.

## Schema Management
- **Explicit Schemas:** Always specify schemas explicitly (e.g., `public.users` instead of `users`).
- **Migrations:** Use `apply_migration` for all schema changes (CREATE/ALTER/DROP tables).
- **Queries:** Use `execute_sql` for queries and data operations (SELECT/INSERT/UPDATE/DELETE).

## Best Practices
- **Type Generation:** Always generate updated TypeScript types after making schema changes using `npx supabase gen types --linked`.
- **Security:** Ensure Row Level Security (RLS) is enabled for all tables.
- **Performance:** Use `get_advisors` to find and fix "security" and "performance" issues.

## Migration from Firebase
- Ensure all logic is transitioned to PostgreSQL-compatible queries.
- Validate data integrity during the migration phase.
- Update all services to use the Supabase client.
