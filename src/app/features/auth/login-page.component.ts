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
      <section class="auth-hero card-hero">
        <p class="eyebrow">Plataforma institucional</p>
        <h1>Controle patrimonial com visão operacional e elegância visual.</h1>
        <p class="hero-copy">
          Acesse um ambiente completo para autenticação, cadastros auxiliares, usuários, perfis,
          bens e relatórios consolidados em Angular 21.
        </p>

        <div class="feature-grid">
          <article class="feature-card">
            <strong>Login com JWT</strong>
            <span>Sessão protegida por perfis COMUM, SECRETARIO e ADMINISTRADOR.</span>
          </article>
          <article class="feature-card">
            <strong>Fluxos por endpoint</strong>
            <span>Menus em cascata para consulta, cadastro, edição e relatórios.</span>
          </article>
          <article class="feature-card">
            <strong>Cadastros conectados</strong>
            <span>Seleções cruzadas com listas de cores, tipos, status, materiais e locais.</span>
          </article>
        </div>
      </section>

      <section class="auth-panel card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Acesso seguro</p>
          <h2>Login</h2>
          <p>Informe CPF e senha para entrar no sistema.</p>
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
            {{ loading() ? 'Entrando...' : 'Entrar no painel' }}
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
        next: () => {
          void this.router.navigate(['/welcome']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Não foi possível alcançar o backend. Verifique se a API está ativa, se a porta está correta e se o CORS está liberado.';
    }

    const apiError = error.error as ApiErrorResponse | string | undefined;
    if (typeof apiError === 'string' && apiError.trim()) {
      return apiError;
    }

    if (apiError && typeof apiError === 'object' && 'message' in apiError && apiError.message) {
      return String(apiError.message);
    }

    if (error.status >= 500) {
      return 'O backend retornou erro interno no login. Verifique o log da API.';
    }

    return 'Não foi possível autenticar com os dados informados.';
  }
}