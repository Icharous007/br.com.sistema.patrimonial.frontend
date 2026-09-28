import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorResponse } from '../../core/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { CpfMaskDirective } from '../../shared/directives/cpf-mask.directive';
import { sanitizeCpf } from '../../shared/utils/cpf.utils';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CpfMaskDirective],
  template: `
    <div class="auth-page">
      <section class="auth-hero card-hero hero-photo">
        <div class="hero-photo-content">
          <img class="brand-logo brand-logo-lg" src="/logo.jpg" width="112" height="112" alt="Brasão da Paróquia São Francisco de Assis" />
          <p class="eyebrow">Paróquia São Francisco de Assis</p>
          <h1>Cuidar dos bens da comunidade.</h1>
          <p class="hero-copy">
            Inventário da paróquia em Vicente Pires — nave, sacristia, secretaria e demais espaços
            sob um só registro.
          </p>
          <span class="motto">Pax et Bonum</span>
        </div>
      </section>

      <section class="auth-panel card-soft">
        <div class="auth-mobile-brand">
          <img class="brand-logo brand-logo-sm" src="/logo.jpg" width="44" height="44" alt="Brasão da Paróquia São Francisco de Assis" />
          <div>
            <p class="eyebrow">PSFA</p>
            <strong>Sistema Patrimonial</strong>
          </div>
        </div>

        <div class="section-heading compact">
          <p class="eyebrow">Acesso da secretaria</p>
          <h2>Entrar</h2>
          <p>Informe CPF e senha para consultar e registrar o patrimônio da paróquia.</p>
        </div>

        <form class="form-grid single-column" [formGroup]="loginForm" (ngSubmit)="submit()">
          <label class="field">
            <span>CPF</span>
            <input class="input" type="text" formControlName="cpf" appCpfMask inputmode="numeric" placeholder="000.000.000-00" />
          </label>

          <label class="field">
            <span>Senha</span>
            <input class="input" type="password" formControlName="password" placeholder="••••••" />
          </label>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            {{ loading() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
      </section>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loginForm = this.fb.nonNullable.group({
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Informe CPF e senha antes de prosseguir.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const raw = this.loginForm.getRawValue();

    this.authService
      .login({
        cpf: sanitizeCpf(raw.cpf),
        password: raw.password,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.requirePasswordChange) {
            void this.router.navigate(['/my-profile'], { queryParams: { view: 'password' } });
          } else {
            void this.router.navigate(['/welcome']);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
    }

    const apiError = error.error as ApiErrorResponse | string | undefined;
    if (typeof apiError === 'string' && apiError.trim()) {
      return apiError;
    }

    if (apiError && typeof apiError === 'object' && 'message' in apiError && apiError.message) {
      return String(apiError.message);
    }

    if (error.status === 423) {
      return 'Esta conta está temporariamente bloqueada. Aguarde alguns minutos e tente de novo.';
    }

    if (error.status === 429) {
      return 'Muitas tentativas de acesso. Aguarde um momento antes de tentar novamente.';
    }

    if (error.status >= 500) {
      return 'O serviço está indisponível no momento. Tente novamente em instantes.';
    }

    return 'Não foi possível autenticar com os dados informados.';
  }
}