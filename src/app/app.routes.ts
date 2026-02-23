import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { PatientListComponent } from './patient-list/patient-list';
import { PatientFormComponent } from './patient-form/patient-form';
import { PatientDetailComponent } from './patient-detail/patient-detail';
import { DashboardStatsComponent } from './dashboard-stats/dashboard-stats';
import { ProceduresComponent } from './procedures/procedures';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: DashboardStatsComponent },
      { path: 'patients', component: PatientListComponent },
      { path: 'patients/new', component: PatientFormComponent },
      { path: 'patients/:id', component: PatientDetailComponent },
      { path: 'procedures', component: ProceduresComponent },
    ],
  },
];
