import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorResponse, UserProfileResponse } from '../../core/api.models';
import { ProfilesApiService } from '../../core/services/profiles-api.service';

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/profiles</p>
          <h1>Perfis</h1>
          <p>Gestão do conjunto de perfis funcionais que controlam acesso e experiência do usuário.</p>
        </div>

        <div class="segment-group">
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'list'" (click)="setView('list')">Listagem</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'create'" (click)="setView('create')">{{ selectedId() ? 'Editar' : 'Cadastrar' }}</button>
        </div>
      </div>

      @if (message()) {
        <div class="alert" [class.alert-error]="messageType() === 'error'" [class.alert-success]="messageType() === 'success'">{{ message() }}</div>
      }

      <section class="content-grid two-columns">
        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Formulário</p>
            <h2>{{ selectedId() ? 'Atualizar perfil' : 'Novo perfil' }}</h2>
          </div>

          <form class="form-grid single-column" [formGroup]="form" (ngSubmit)="submit()">
            <label class="field">
              <span>Perfil</span>
              <input class="input" type="text" formControlName="profile" placeholder="Ex.: ADMINISTRADOR" />
            </label>

            <div class="button-row">
              <button type="submit" class="btn btn-primary" [disabled]="loading()">{{ loading() ? 'Salvando...' : selectedId() ? 'Atualizar perfil' : 'Cadastrar perfil' }}</button>
              <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpar</button>
            </div>
          </form>
        </article>

        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Lista</p>
            <h2>Perfis ativos</h2>
          </div>

          <div class="table-shell compact-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Perfil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (profile of profiles(); track profile.id) {
                  <tr>
                    <td data-label="ID">#{{ profile.id }}</td>
                    <td data-label="Perfil"><span class="tag">{{ profile.profile }}</span></td>
                    <td data-label="Ações">
                      <div class="table-actions">
                        <button type="button" class="btn btn-ghost btn-sm" (click)="edit(profile)">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm" (click)="remove(profile.id)">Excluir</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="3" class="empty-state">Nenhum perfil cadastrado.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-bar">
            <p>Página {{ currentPage() + 1 }} de {{ totalPagesLabel() }} · {{ totalElements() }} perfis</p>
            <label class="pagination-size">
              Itens por página
              <select class="input pagination-size-select" [value]="pageSize()" (change)="changePageSize($any($event.target).value)">
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </label>
            <div class="pagination-actions">
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="!hasPreviousPage()" (click)="goToPreviousPage()">Anterior</button>
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="!hasNextPage()" (click)="goToNextPage()">Próxima</button>
            </div>
          </div>
        </article>
      </section>
    </section>
  `,
})
export class ProfilesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profilesApi = inject(ProfilesApiService);

  readonly profiles = signal<UserProfileResponse[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'create'>('list');
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'success' | 'error'>('success');
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly pageSizeOptions: number[] = [10, 20, 50];
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);
  readonly profileCount = computed(() => this.profiles().length);
  readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));

  readonly form = this.fb.nonNullable.group({
    profile: ['', [Validators.required]],
  });

  constructor() {
    this.loadProfiles();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.viewMode.set(params.get('view') === 'create' ? 'create' : 'list');
    });
  }

  setView(mode: 'list' | 'create'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
    });
  }

  goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.currentPage.update((page) => Math.max(page - 1, 0));
    this.loadProfiles();
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.loadProfiles();
  }

  changePageSize(sizeValue: string): void {
    const size = Number(sizeValue);
    if (!this.pageSizeOptions.includes(size) || this.pageSize() === size) {
      return;
    }

    this.pageSize.set(size);
    this.loadProfiles(true);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setError('Informe o nome do perfil antes de salvar.');
      return;
    }

    this.loading.set(true);
    const request = this.selectedId()
      ? this.profilesApi.update(this.selectedId()!, this.form.getRawValue())
      : this.profilesApi.create(this.form.getRawValue());

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.setSuccess('Perfil salvo com sucesso.');
        this.loadProfiles();
        this.resetForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  edit(profile: UserProfileResponse): void {
    this.selectedId.set(profile.id);
    this.form.patchValue({ profile: profile.profile });
    this.setView('create');
  }

  remove(id: number): void {
    if (!window.confirm('Deseja realmente excluir este perfil?')) {
      return;
    }

    this.profilesApi.remove(id).subscribe({
      next: () => {
        this.setSuccess('Perfil removido com sucesso.');
        this.loadProfiles();
        this.resetForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  resetForm(): void {
    this.form.reset({ profile: '' });
    this.selectedId.set(null);
  }

  private loadProfiles(resetPage = false): void {
    if (resetPage) {
      this.currentPage.set(0);
    }

    this.profilesApi.list({ page: this.currentPage(), size: this.pageSize() }).subscribe({
      next: (pageData) => {
        this.profiles.set(pageData.items);
        this.currentPage.set(pageData.page);
        this.totalElements.set(pageData.totalElements);
        this.totalPages.set(pageData.totalPages);
        this.hasNextPage.set(pageData.hasNext);
        this.hasPreviousPage.set(pageData.hasPrevious);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private handleError(error: HttpErrorResponse): void {
    const apiError = error.error as ApiErrorResponse | undefined;
    this.setError(apiError?.message ?? 'Não foi possível concluir a operação com perfis.');
  }

  private setSuccess(message: string): void {
    this.messageType.set('success');
    this.message.set(message);
  }

  private setError(message: string): void {
    this.messageType.set('error');
    this.message.set(message);
  }
}