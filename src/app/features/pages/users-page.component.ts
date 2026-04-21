import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorResponse, UserFilters, UserProfileResponse, UserRequest, UserResponse } from '../../core/api.models';
import { ProfilesApiService } from '../../core/services/profiles-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { CpfMaskDirective } from '../../shared/directives/cpf-mask.directive';
import { formatCpf, sanitizeCpf } from '../../shared/utils/cpf.utils';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CpfMaskDirective],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/users</p>
          <h1>Usuários</h1>
          <p>Listagem filtrável, cadastro completo e atualização de usuários vinculados aos perfis da API.</p>
        </div>

        <div class="segment-group">
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'list'" (click)="setView('list')">Consultar</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'create'" (click)="setView('create')">{{ selectedId() ? 'Editar' : 'Cadastrar' }}</button>
        </div>
      </div>

      @if (message()) {
        <div class="alert" [class.alert-error]="messageType() === 'error'" [class.alert-success]="messageType() === 'success'">{{ message() }}</div>
      }

      <section class="content-grid two-columns user-layout">
        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Formulário</p>
            <h2>{{ selectedId() ? 'Atualizar usuário' : 'Novo usuário' }}</h2>
          </div>

          <form class="form-grid" [formGroup]="userForm" (ngSubmit)="submitUser()">
            <label class="field">
              <span>Nome</span>
              <input class="input" type="text" formControlName="name" placeholder="Nome completo" />
            </label>

            <label class="field">
              <span>CPF</span>
              <input class="input" type="text" formControlName="cpf" appCpfMask inputmode="numeric" placeholder="000.000.000-00" />
            </label>

            <label class="field">
              <span>E-mail</span>
              <input class="input" type="email" formControlName="email" placeholder="usuario@org.br" />
            </label>

            <label class="field">
              <span>Telefone</span>
              <input class="input" type="text" formControlName="phone" placeholder="(00) 00000-0000" />
            </label>

            <label class="field">
              <span>Perfil</span>
              <select class="input" formControlName="profileId">
                <option [ngValue]="0">Selecione</option>
                @for (profile of profiles(); track profile.id) {
                  <option [ngValue]="profile.id">{{ profile.profile }}</option>
                }
              </select>
            </label>

            <label class="field">
              <span>Senha</span>
              <input class="input" type="password" formControlName="password" placeholder="Senha inicial ou redefinição" />
            </label>

            <div class="button-row span-2">
              <button type="submit" class="btn btn-primary" [disabled]="loading()">{{ loading() ? 'Salvando...' : selectedId() ? 'Atualizar usuário' : 'Cadastrar usuário' }}</button>
              <button type="button" class="btn btn-secondary" (click)="resetUserForm()">Limpar</button>
            </div>
          </form>
        </article>

        <article class="card-soft stacked-panels">
          <div class="section-heading compact">
            <p class="eyebrow">Consulta</p>
            <h2>Filtros e listagem</h2>
          </div>

          <form class="form-grid" [formGroup]="filterForm" (ngSubmit)="searchUsers(true)">
            <label class="field">
              <span>Nome</span>
              <input class="input" type="text" formControlName="name" placeholder="Buscar por nome" />
            </label>
            <label class="field">
              <span>CPF</span>
              <input class="input" type="text" formControlName="cpf" appCpfMask inputmode="numeric" placeholder="000.000.000-00" />
            </label>
            <label class="field span-2">
              <span>Perfil</span>
              <select class="input" formControlName="profile">
                <option value="">Todos</option>
                @for (profile of profiles(); track profile.id) {
                  <option [value]="profile.profile">{{ profile.profile }}</option>
                }
              </select>
            </label>

            <div class="button-row span-2">
              <button type="submit" class="btn btn-secondary">Aplicar filtros</button>
              <button type="button" class="btn btn-ghost" (click)="clearFilters()">Limpar busca</button>
            </div>
          </form>

          <div class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td data-label="Nome">
                      <strong>{{ user.name }}</strong>
                      <small>{{ user.email }}</small>
                    </td>
                    <td data-label="CPF">{{ user.cpf }}</td>
                    <td data-label="Perfil"><span class="tag">{{ user.profile }}</span></td>
                    <td data-label="Status">
                      <span class="tag" [class.tag-muted]="!user.active">{{ user.active ? 'Ativo' : 'Inativo' }}</span>
                    </td>
                    <td data-label="Ações">
                      <div class="table-actions">
                        <button type="button" class="btn btn-ghost btn-sm" (click)="editUser(user)">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm" (click)="deleteUser(user.id)">Excluir</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="empty-state">Nenhum usuário encontrado.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-bar">
            <p>Página {{ currentPage() + 1 }} de {{ totalPagesLabel() }} · {{ totalElements() }} usuários</p>
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
export class UsersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersApi = inject(UsersApiService);
  private readonly profilesApi = inject(ProfilesApiService);

  readonly users = signal<UserResponse[]>([]);
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
  readonly userCount = computed(() => this.users().length);
  readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));

  readonly filterForm = this.fb.nonNullable.group({
    name: [''],
    cpf: [''],
    profile: [''],
  });

  readonly userForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    profileId: [0, [Validators.min(1)]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.loadProfiles();
    this.searchUsers();
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

  searchUsers(resetPage = false): void {
    if (resetPage) {
      this.currentPage.set(0);
    }

    const rawFilters = this.filterForm.getRawValue() as UserFilters;
    const filters: UserFilters = {
      ...rawFilters,
      cpf: sanitizeCpf(rawFilters.cpf) || undefined,
    };

    this.usersApi.list(filters, { page: this.currentPage(), size: this.pageSize() }).subscribe({
      next: (pageData) => {
        this.users.set(pageData.items);
        this.currentPage.set(pageData.page);
        this.totalElements.set(pageData.totalElements);
        this.totalPages.set(pageData.totalPages);
        this.hasNextPage.set(pageData.hasNext);
        this.hasPreviousPage.set(pageData.hasPrevious);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.currentPage.update((page) => Math.max(page - 1, 0));
    this.searchUsers();
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.searchUsers();
  }

  changePageSize(sizeValue: string): void {
    const size = Number(sizeValue);
    if (!this.pageSizeOptions.includes(size) || this.pageSize() === size) {
      return;
    }

    this.pageSize.set(size);
    this.searchUsers(true);
  }

  clearFilters(): void {
    this.filterForm.reset({ name: '', cpf: '', profile: '' });
    this.searchUsers(true);
  }

  submitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.setError('Preencha os campos obrigatórios do usuário.');
      return;
    }

    this.loading.set(true);
    const payload = this.buildUserPayload();
    const request = this.selectedId()
      ? this.usersApi.update(this.selectedId()!, payload)
      : this.usersApi.create(payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.setSuccess('Usuário salvo com sucesso.');
        this.searchUsers();
        this.resetUserForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  editUser(user: UserResponse): void {
    const profile = this.profiles().find((item) => item.profile === user.profile);

    this.selectedId.set(user.id);
    this.userForm.patchValue({
      name: user.name,
      cpf: formatCpf(user.cpf),
      email: user.email,
      phone: user.phone ?? '',
      profileId: profile?.id ?? 0,
      password: '',
    });
    this.setView('create');
  }

  deleteUser(id: number): void {
    if (!window.confirm('Deseja realmente excluir este usuário?')) {
      return;
    }

    this.usersApi.remove(id).subscribe({
      next: () => {
        this.setSuccess('Usuário removido com sucesso.');
        this.searchUsers();
        this.resetUserForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  resetUserForm(): void {
    this.userForm.reset({
      name: '',
      cpf: '',
      email: '',
      phone: '',
      profileId: 0,
      password: '',
    });
    this.selectedId.set(null);
  }

  private loadProfiles(): void {
    this.profilesApi.listAll().subscribe({
      next: (profiles) => this.profiles.set(profiles),
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private buildUserPayload(): UserRequest {
    const raw = this.userForm.getRawValue();
    return {
      ...raw,
      cpf: sanitizeCpf(raw.cpf),
      profileId: Number(raw.profileId),
    };
  }

  private handleError(error: HttpErrorResponse): void {
    const apiError = error.error as ApiErrorResponse | undefined;
    this.setError(apiError?.message ?? 'Não foi possível concluir a operação com usuários.');
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