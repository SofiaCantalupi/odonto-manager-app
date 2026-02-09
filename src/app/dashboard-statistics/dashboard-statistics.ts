import { Component } from '@angular/core';
import { LucideAngularModule, Calendar, Users, FileText, Settings, Plus } from 'lucide-angular';

@Component({
  selector: 'app-dashboard-statistics',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './dashboard-statistics.html',
  styleUrl: './dashboard-statistics.css',
})
export class DashboardStatistics {
  Calendar = Calendar;
  Users = Users;
  FileText = FileText;
  Settings = Settings;
  Plus = Plus;
}
