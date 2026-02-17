# Project Context - Dental Clinic Management

## Odontogram Logic
- **Mutual Exclusion**: If a tooth status is 'missing', 'extraction', 'implant', or 'crown', disable all surface-level treatments (caries, filling).
- **Surface Integrity**: A single tooth surface (Mesial, Distal, Vestibular, Lingual, Occlusal) cannot have overlapping treatments. Adding a 'filling' replaces a 'caries' on that specific surface.
- **Initial State vs Evolution**: Distinguish between pre-existing conditions (no date required) and new treatments (timestamp required).

## Tech Stack
- Angular (latest version)
- NG-ZORRO Ant Design
- TailwindCSS
- TypeScript

## Conventions
- Use NG-ZORRO for UI components (tables, forms, modals, calendars)
- Use TailwindCSS for layouts and utilities
- English naming for variables and domain-related methods
- Typed interfaces for all models

## Main Models
- Patient: id, personalData( idCard, firstName, lastName, birthDate, age, address,phone, isOrthodontic), insuranceInfo (hasInsurance, insuranceName, affiliateNumber), dentalRecord(pathologies, allergies, medication)
- Appointment: patient, date, time, reason, status
- Budget: patient, treatments, amount, status
- Odontogram: patient, teeth, treatments

## Preferences
- Use standalone components when possible
- Reactive forms (ReactiveFormsModule)
- Form validations
- Reusable components