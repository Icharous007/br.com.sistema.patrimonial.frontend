import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorResponse, ChangePasswordRequest, MyProfileRequest, MyProfileResponse } from '../../core/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { MeApiService } from '../../core/services/me-api.service';

@Component({
  selector: 'app-my-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/me</p>
          <h1>Meu Perfil</h1>
          <p>Visualize e atualize seus dados pessoais ou altere sua senha de acesso.</p>
        </div>

        <div class="segment-group wrap">
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'profile'" (click)="setView('profile')">Dados pessoais</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'password'" (click)="setView('password')">Alterar senha</button>
        </div>
      </div>

      @if (requiresPasswordChange()) {
        <div class="alert alert-warning">
          <strong>Troca de senha obrigatória.</strong> Você deve alterar sua senha antes de continuar acessando o sistema.
        </div>
      }

      @if (message()) {
        <div class="alert" [class.alert-error]="messageType() === 'error'" [class.alert-success]="messageType() === 'success'">{{ message() }}</div>
      }

      <section class="content-grid two-columns">

        @if (viewMode() === 'profile') {
          <article class="card-soft span-2">
            <div class="section-heading compact">
              <p class="eyebrow">Dados pessoais</p>
              <h2>Atualizar informações</h2>
            </div>

            @if (profileData()) {
              <div class="profile-info-strip">
                <span class="tag">{{ profileData()!.profile }}</span>
                <span class="tag tag-muted">CPF: {{ profileData()!.cpf }}</span>
                <span class="tag" [class.tag-muted]="!profileData()!.active">{{ profileData()!.active ? 'Ativo' : 'Inativo' }}</span>
              </div>
            }

            <form class="form-grid" [formGroup]="profileForm" (ngSubmit)="submitProfile()">
              <label class="field">
                <span>Nome</span>
                <input class="input" type="text" formControlName="name" placeholder="Nome completo" />
              </label>

              <label class="field">
                <span>E-mail</span>
                <input class="input" type="email" formControlName="email" placeholder="usuario@org.br" />
              </label>

              <label class="field span-2">
                <span>Telefone</span>
                <input class="input" type="text" formControlName="phone" placeholder="(00) 00000-0000" />
              </label>

              <div class="button-row span-2">
                <button type="submit" class="btn btn-primary" [disabled]="loadingProfile()">
                  {{ loadingProfile() ? 'Salvando...' : 'Salvar dados' }}
                </button>
              </div>
            </form>
          </article>
        }

        @if (viewMode() === 'password') {
          <article class="card-soft span-2">
            <div class="section-heading compact">
              <p class="eyebrow">Segurança</p>
              <h2>Alterar senha</h2>
            </div>

            <form class="form-grid single-column" [formGroup]="passwordForm" (ngSubmit)="submitPasswordChange()">
              <label class="field">
                <span>Senha atual</span>
                <input class="input" type="password" formControlName="currentPassword" placeholder="••••••" />
              </label>

              <label class="field">
                <span>Nova senha</span>
                <input class="input" type="password" formControlName="newPassword" placeholder="••••••" />
              </label>

              <label class="field">
                <span>Confirmar nova senha</span>
                <input class="input" type="password" formControlName="confirmNewPassword" placeholder="••••••" />
              </label>

              <div class="button-row">
                <button type="submit" class="btn btn-primary" [disabled]="loadingPassword()">
                  {{ loadingPassword() ? 'Alterando...' : 'Alterar senha' }}
                </button>
              </div>
            </form>
          </article>
        }

      </section>
    </section>
  `,
})
export class MyProfilePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meApi = inject(MeApiService);
  private readonly auth = inject(AuthService);

  readonly viewMode = signal<'profile' | 'password'>('profile');
  readonly profileData = signal<MyProfileResponse | null>(null);
  readonly loadingProfile = signal(false);
  readonly loadingPassword = signal(false);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'success' | 'error'>('success');
  readonly requiresPasswordChange = this.auth.requiresPasswordChange;

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', [Validators.required]],
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = params.get('view');
      this.viewMode.set(view === 'password' ? 'password' : 'profile');
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  setView(mode: 'profile' | 'password'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
    });
  }

  submitProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.setError('Preencha os campos obrigatórios antes de salvar.');
      return;
    }

    const raw = this.profileForm.getRawValue();
    const payload: MyProfileRequest = {
      name: raw.name,
      email: raw.email,
      phone: raw.phone || undefined,
    };

    this.loadingProfile.set(true);
    this.meApi
      .updateMyProfile(payload)
      .pipe(finalize(() => this.loadingProfile.set(false)))
      .subscribe({
        next: (updated) => {
          this.profileData.set(updated);
          this.setSuccess('Dados atualizados com sucesso.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.setError('Preencha todos os campos de senha.');
      return;
    }

    const raw = this.passwordForm.getRawValue();
    if (raw.newPassword !== raw.confirmNewPassword) {
      this.setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    const payload: ChangePasswordRequest = {
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
      confirmNewPassword: raw.confirmNewPassword,
    };

    this.loadingPassword.set(true);
    this.meApi
      .changePassword(payload)
      .pipe(finalize(() => this.loadingPassword.set(false)))
      .subscribe({
        next: () => {
          this.auth.clearPasswordChangeRequirement();
          this.setSuccess('Senha alterada com sucesso. Você será desconectado para fazer login novamente.');
          this.passwordForm.reset();
          setTimeout(() => this.auth.logout(), 2500);
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  private loadProfile(): void {
    this.meApi.getMyProfile().subscribe({
      next: (profile) => {
        this.profileData.set(profile);
        this.profileForm.patchValue({
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? '',
        });
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private setSuccess(msg: string): void {
    this.message.set(msg);
    this.messageType.set('success');
    setTimeout(() => this.message.set(null), 4000);
  }

  private setError(msg: string): void {
    this.message.set(msg);
    this.messageType.set('error');
  }

  private handleError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      this.setError('Não foi possível alcançar o servidor.');
      return;
    }

    const apiError = error.error as ApiErrorResponse | string | undefined;
    if (apiError && typeof apiError === 'object' && 'message' in apiError && apiError.message) {
      this.setError(String(apiError.message));
      return;
    }

    const messages: Record<number, string> = {
      400: 'Dados inválidos. Verifique os campos e tente novamente.',
      401: 'Sessão expirada. Faça login novamente.',
      404: 'Usuário não encontrado.',
      409: 'E-mail já utilizado por outro usuário.',
    };

    this.setError(messages[error.status] ?? `Erro inesperado (${error.status}).`);
  }
}
