# Angular Style Guide

## Overview
Standards and best practices for Angular development within the Dental Manager project.

## Core Mandates
- **Standalone Components:** Always use standalone components over NgModules.
- **Signals:** Use Angular Signals for all state management.
- **OnPush Change Detection:** Set `changeDetection: ChangeDetectionStrategy.OnPush` in all components.
- **Reactive Forms:** Prefer Reactive forms over Template-driven ones.

## Templates
- **Native Control Flow:** Use `@if`, `@for`, and `@switch` instead of `*ngIf`, `*ngFor`, and `*ngSwitch`.
- **Class Bindings:** Use `[class.name]="condition"` instead of `ngClass`.
- **Style Bindings:** Use `[style.name]="value"` instead of `ngStyle`.

## Components
- Keep components small and focused on a single responsibility.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Prefer inline templates for small components.

## Services
- Use the `providedIn: 'root'` option for singleton services.
- Use the `inject()` function instead of constructor injection.
