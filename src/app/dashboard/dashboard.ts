import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import {
  LucideAngularModule,
  Calendar,
  Users,
  FileText,
  Settings,
  Plus,
  ClipboardList,
  DollarSign,
  LogOut,
} from 'lucide-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { filter } from 'rxjs/operators';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { SupabaseService } from '../services/supabase.service';

interface MenuItem {
  label: string;
  icon: any;
  route: string;
  active: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterOutlet, NzButtonModule, NzLayoutModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  // Icons
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly FileText = FileText;
  readonly Settings = Settings;
  readonly Plus = Plus;
  readonly ClipboardList = ClipboardList;
  readonly DollarSign = DollarSign;
  readonly LogOut = LogOut;

  isHomePage = true;
  profile = this.supabaseService.profile$;

  // Navigation menu items
  menuItems: MenuItem[] = [
    { label: 'Agenda', icon: Calendar, route: '/agenda', active: true },
    { label: 'Patients', icon: Users, route: '/patients', active: false },
    { label: 'Procedures', icon: ClipboardList, route: '/procedures', active: false },
    { label: 'Budgets', icon: DollarSign, route: '/budgets', active: false },
    { label: 'Estimates', icon: FileText, route: '/estimates', active: false },
    { label: 'Settings', icon: Settings, route: '/settings', active: false },
  ];

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.isHomePage = url === '/' || url === '/home' || url === '';
        this.updateActiveMenuItem(url);
      });
  }

  private updateActiveMenuItem(url: string): void {
    this.menuItems.forEach((item) => {
      item.active = url.startsWith(item.route);
    });
  }

  onMenuItemClick(item: MenuItem): void {
    this.router.navigate([item.route]);
  }

  onCreateNewPatient(): void {
    this.router.navigate(['/patients/new']);
  }

  async onLogout(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }

  getUserDisplayName(email: string): string {
    return email.split('@')[0];
  }

  getAvatarUrl(email: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getUserDisplayName(email))}&background=0D8ABC&color=fff`;
  }
}
