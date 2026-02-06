# Project Context - Dental Clinic Management

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