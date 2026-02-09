import { Component } from '@angular/core';
import { LucideAngularModule, Calendar, Users, FileText, Settings, Plus } from 'lucide-angular';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStatsComponent {
  Calendar = Calendar;
  Users = Users;
  FileText = FileText;
  Settings = Settings;
  Plus = Plus;
}
