import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { PatientListComponent } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { DashboardStatistics } from './dashboard-statistics/dashboard-statistics';


export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: DashboardStatistics },
      { path: 'patients', component: PatientListComponent },
      { path: 'patients/new', component: PatientFormComponent },
    ],
  },
];
