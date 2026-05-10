import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ApiErrorResponse,
  AuditLogFilters,
  AuditLogResponse,
} from '../../core/api.models';
import { AuditLogsApiService } from '../../core/services/audit-logs-api.service';
import { CpfMaskDirective } from '../../shared/directives/cpf-mask.directive';
import { sanitizeCpf } from '../../shared/utils/cpf.utils';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, CpfMaskDirective],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/audit-logs</p>
          <h1>Auditoria</h1>
          <p>Histórico das ações executadas pelos usuários (criação, atualização e exclusão de registros). Acesso exclusivo do perfil <strong>ADMINISTRADOR</strong>.</p>
        </div>
      </div>

      @if (message()) {
        <div class="alert alert-error">{{ message() }}</div>
      }

      <article class="card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Filtros</p>
          <h2>Pesquisar eventos</h2>
        </div>

        <details class="collapsible-filters" [open]="true">
          <summary>Filtros</summary>
          <div class="collapsible-body">
            <form class="form-grid" [formGroup]="filterForm" (ngSubmit)="search(true)">
              <label class="field">
                <span>Ação</span>
                <select class="input" formControlName="action">
                  <option value="">Todas</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>

              <label class="field">
                <span>Entidade</span>
                <select class="input" formControlName="entityName">
                  <option value="">Todas</option>
                  @for (entity of entityOptions; track entity) {
                    <option [value]="entity">{{ entity }}</option>
                  }
                </select>
              </label>

              <label class="field">
                <span>ID da entidade</span>
                <input class="input" type="text" formControlName="entityId" placeholder="Ex.: 57" />
              </label>

              <label class="field">
                <span>Perfil do usuário</span>
                <select class="input" formControlName="userProfile">
                  <option value="">Todos</option>
                  <option value="COMUM">COMUM</option>
                  <option value="SECRETARIO">SECRETARIO</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>
              </label>

              <label class="field">
                <span>Nome do usuário</span>
                <input class="input" type="text" formControlName="userName" placeholder="Busca parcial por nome" />
              </label>

              <label class="field">
                <span>CPF do usuário</span>
                <input class="input" type="text" formControlName="userCpf" appCpfMask inputmode="numeric" placeholder="000.000.000-00" />
              </label>

              <label class="field">
                <span>Data inicial</span>
                <input class="input" type="date" formControlName="dateFrom" />
              </label>

              <label class="field">
                <span>Data final</span>
                <input class="input" type="date" formControlName="dateTo" />
              </label>

              <div class="button-row span-2">
                <button type="submit" class="btn btn-secondary">Aplicar filtros</button>
                <button type="button" class="btn btn-ghost" (click)="clearFilters()">Limpar</button>
              </div>
            </form>
          </div>
        </details>
      </article>

      <article class="card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Resultados</p>
          <h2>Eventos registrados</h2>
        </div>

        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>ID</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.id) {
                <tr>
                  <td data-label="Data/Hora">{{ log.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td data-label="Usuário">
                    <strong>{{ log.userName || '—' }}</strong>
                    <small>{{ log.userCpf || '—' }} · {{ log.userProfile || '—' }}</small>
                  </td>
                  <td data-label="Ação">
                    <span class="tag" [class.tag-muted]="log.action === 'DELETE'">{{ log.action }}</span>
                  </td>
                  <td data-label="Entidade">{{ log.entityName }}</td>
                  <td data-label="ID">{{ log.entityId || '—' }}</td>
                  <td data-label="Detalhes">{{ log.details || '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty-state">Nenhum evento de auditoria encontrado.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <p>Página {{ currentPage() + 1 }} de {{ totalPagesLabel() }} · {{ totalElements() }} eventos</p>
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
  `,
})
export class AuditLogsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AuditLogsApiService);

  readonly logs = signal<AuditLogResponse[]>([]);
  readonly message = signal<string | null>(null);
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly pageSizeOptions: number[] = [10, 20, 50];
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);
  readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));

  readonly entityOptions = ['ASSET', 'USER_ACCOUNT', 'USER_PROFILE', 'COLOR', 'ASSET_TYPE', 'ASSET_STATUS', 'ASSET_MATERIAL', 'ASSET_LOCATION'];

  readonly filterForm = this.fb.nonNullable.group({
    action: [''],
    entityName: [''],
    entityId: [''],
    userCpf: [''],
    userName: [''],
    userProfile: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(() => {
      // current view always shows list; route reserved for future expansion
    });
    this.search();
  }

  search(resetPage = false): void {
    if (resetPage) {
      this.currentPage.set(0);
    }

    const raw = this.filterForm.getRawValue();
    const filters: AuditLogFilters = {
      ...raw,
      userCpf: sanitizeCpf(raw.userCpf) || undefined,
    };

    this.api.list(filters, { page: this.currentPage(), size: this.pageSize() }).subscribe({
      next: (page) => {
        this.logs.set(page.items);
        this.currentPage.set(page.page);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.hasNextPage.set(page.hasNext);
        this.hasPreviousPage.set(page.hasPrevious);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      action: '', entityName: '', entityId: '', userCpf: '', userName: '', userProfile: '', dateFrom: '', dateTo: '',
    });
    this.search(true);
  }

  goToPreviousPage(): void {
    if (!this.hasPreviousPage()) return;
    this.currentPage.update((page) => Math.max(page - 1, 0));
    this.search();
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) return;
    this.currentPage.update((page) => page + 1);
    this.search();
  }

  changePageSize(sizeValue: string): void {
    const size = Number(sizeValue);
    if (!this.pageSizeOptions.includes(size) || this.pageSize() === size) return;
    this.pageSize.set(size);
    this.search(true);
  }

  private handleError(error: HttpErrorResponse): void {
    const apiError = error.error as ApiErrorResponse | undefined;
    this.message.set(apiError?.message ?? 'Não foi possível carregar a auditoria.');
  }
}
