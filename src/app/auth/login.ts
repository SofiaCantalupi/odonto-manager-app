import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
  ],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-600 to-indigo-800 p-4 font-sans">
      <div class="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
        <div class="mb-10 text-center">
          <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">DentalManager</h1>
          <p class="mt-2 text-sm text-gray-500 font-medium">Welcome back! Please enter your details.</p>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" nz-form nzLayout="vertical">
          <nz-form-item class="mb-6">
            <nz-form-label nzRequired class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Email Address</nz-form-label>
            <nz-form-control nzErrorTip="Please enter a valid email address">
              <input nz-input formControlName="email" placeholder="dr.smith@example.com" type="email" class="rounded-lg py-2.5 px-4" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item class="mb-8">
            <nz-form-label nzRequired class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Password</nz-form-label>
            <nz-form-control nzErrorTip="Please enter your password">
              <input nz-input formControlName="password" placeholder="••••••••" type="password" class="rounded-lg py-2.5 px-4" />
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" class="w-full rounded-lg py-6 font-bold text-base shadow-lg transition-transform active:scale-95" [nzLoading]="loading()" [disabled]="loginForm.invalid">
            Sign In
          </button>
        </form>

        <div class="mt-10 border-t border-gray-100 pt-8 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <a routerLink="/register" class="font-bold text-blue-600 hover:text-blue-700 transition-colors">Create an account</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  loading = signal(false);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    const { email, password } = this.loginForm.getRawValue();

    try {
      const { error } = await this.supabaseService.signIn(email, password);
      
      if (error) {
        this.message.error(error.message);
      } else {
        this.message.success('Login successful!');
        this.router.navigate(['/']);
      }
    } catch (err: any) {
      this.message.error('An unexpected error occurred during login.');
    } finally {
      this.loading.set(false);
    }
  }
}
