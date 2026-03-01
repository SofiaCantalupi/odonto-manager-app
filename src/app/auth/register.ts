import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService, UserRole } from '../services/supabase.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
  ],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-600 to-indigo-800 p-4 font-sans">
      <div class="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
        <div class="mb-8 text-center">
          <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">Create Account</h1>
          <p class="mt-2 text-sm text-gray-500 font-medium">Join our dental management platform.</p>
        </div>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" nz-form nzLayout="vertical">
          <nz-form-item class="mb-4">
            <nz-form-label nzRequired class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Email Address</nz-form-label>
            <nz-form-control nzErrorTip="Please enter a valid email">
              <input nz-input formControlName="email" placeholder="dr.smith@example.com" type="email" class="rounded-lg py-2.5 px-4" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item class="mb-4">
            <nz-form-label nzRequired class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Password</nz-form-label>
            <nz-form-control nzErrorTip="Password must be at least 6 characters">
              <input nz-input formControlName="password" placeholder="Min 6 characters" type="password" class="rounded-lg py-2.5 px-4" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item class="mb-6">
            <nz-form-label nzRequired class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Professional Role</nz-form-label>
            <nz-form-control nzErrorTip="Please select your role">
              <nz-select formControlName="role" nzPlaceHolder="Select your role" class="rounded-lg h-auto overflow-hidden">
                <nz-option nzValue="dentist" nzLabel="Dentist"></nz-option>
                <nz-option nzValue="admin" nzLabel="Admin"></nz-option>
                <nz-option nzValue="secretary" nzLabel="Secretary"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" class="w-full rounded-lg py-6 font-bold text-base shadow-lg transition-transform active:scale-95 mt-2" [nzLoading]="loading()" [disabled]="registerForm.invalid">
            Register Account
          </button>
        </form>

        <div class="mt-8 border-t border-gray-100 pt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account? 
            <a routerLink="/login" class="font-bold text-blue-600 hover:text-blue-700 transition-colors">Log in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  loading = signal(false);

  registerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['dentist' as UserRole, [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    const { email, password, role } = this.registerForm.getRawValue();

    try {
      const { error } = await this.supabaseService.signUp(email, password, role);
      
      if (error) {
        this.message.error(error.message);
      } else {
        this.message.success('Registration successful! Please check your email for verification.');
        this.router.navigate(['/login']);
      }
    } catch (err: any) {
      this.message.error('An unexpected error occurred during registration.');
    } finally {
      this.loading.set(false);
    }
  }
}
