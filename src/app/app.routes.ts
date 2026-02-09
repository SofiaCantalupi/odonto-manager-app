import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { PatientListComponent } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { DashboardStatsComponent } from './dashboard-stats/dashboard-stats';


export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: DashboardStatsComponent },
      { path: 'patients', component: PatientListComponent },
      { path: 'patients/new', component: PatientFormComponent },
    ],
  },
];
