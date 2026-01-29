import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'patients',
    loadComponent: () => import('./patient-list/patient-list').then(m => m.PatientListComponent)
  },
  {
    path: 'patients/new',
    loadComponent: () => import('./patient-form/patient-form').then(m => m.PatientFormComponent)
  },
  {
    path: 'patients/:id',
    loadComponent: () => import('./patient-detail/patient-detail').then(m => m.PatientDetailComponent)
  }
];
