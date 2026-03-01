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
    <div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 class="mb-6 text-center text-2xl font-bold text-gray-800">Login</h2>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Email</nz-form-label>
            <nz-form-control nzErrorTip="Please enter a valid email">
              <input nz-input formControlName="email" placeholder="email@example.com" type="email" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Password</nz-form-label>
            <nz-form-control nzErrorTip="Please enter your password">
              <input nz-input formControlName="password" placeholder="Your password" type="password" />
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" class="mt-4 w-full" [nzLoading]="loading()" [disabled]="loginForm.invalid">
            Log in
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <a routerLink="/register" class="font-medium text-blue-600 hover:text-blue-500">Sign up</a>
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
