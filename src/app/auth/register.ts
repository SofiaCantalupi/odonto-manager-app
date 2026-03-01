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
    <div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 class="mb-6 text-center text-2xl font-bold text-gray-800">Create Account</h2>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Email</nz-form-label>
            <nz-form-control nzErrorTip="Please enter a valid email">
              <input nz-input formControlName="email" placeholder="email@example.com" type="email" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Password</nz-form-label>
            <nz-form-control nzErrorTip="Password must be at least 6 characters">
              <input nz-input formControlName="password" placeholder="Min 6 characters" type="password" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Role</nz-form-label>
            <nz-form-control nzErrorTip="Please select a role">
              <nz-select formControlName="role" nzPlaceHolder="Select your role">
                <nz-option nzValue="dentist" nzLabel="Dentist"></nz-option>
                <nz-option nzValue="admin" nzLabel="Admin"></nz-option>
                <nz-option nzValue="secretary" nzLabel="Secretary"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" class="mt-4 w-full" [nzLoading]="loading()" [disabled]="registerForm.invalid">
            Register
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account? 
            <a routerLink="/login" class="font-medium text-blue-600 hover:text-blue-500">Log in</a>
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
