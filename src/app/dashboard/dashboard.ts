import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  Calendar,
  Users,
  FileText,
  Settings,
  Plus,
  ClipboardList,
  DollarSign,
} from 'lucide-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

interface User {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

interface MenuItem {
  label: string;
  icon: any;
  route: string;
  active: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, LucideAngularModule, RouterOutlet, NzButtonModule, NzLayoutModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  // Icons
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly FileText = FileText;
  readonly Settings = Settings;
  readonly Plus = Plus;
  readonly ClipboardList = ClipboardList;
  readonly DollarSign = DollarSign;

  isHomePage = true;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isHomePage = event.url === '/' || event.url === '/home';
      });
  }

  // Mock current user
  currentUser: User = {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@dental.com',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=0D8ABC&color=fff',
    role: 'Dentist',
  };

  // Navigation menu items
  menuItems: MenuItem[] = [
    { label: 'Agenda', icon: Calendar, route: '/agenda', active: true },
    { label: 'Patients', icon: Users, route: '/patients', active: false },
    { label: 'Procedures', icon: ClipboardList, route: '/procedures', active: false },
    { label: 'Budgets', icon: DollarSign, route: '/budgets', active: false },
    { label: 'Estimates', icon: FileText, route: '/estimates', active: false },
    { label: 'Settings', icon: Settings, route: '/settings', active: false },
  ];

  onMenuItemClick(item: MenuItem): void {
    this.menuItems.forEach((menuItem) => (menuItem.active = false));
    item.active = true;
    this.router.navigate([item.route]);
  }

  onCreateNewPatient(): void {
    this.router.navigate(['/patients/new']);
  }
}
