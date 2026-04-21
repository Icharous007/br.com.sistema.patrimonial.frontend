import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  ApiErrorResponse,
  CatalogPageData,
  CatalogRequest,
  CatalogResponse,
  CodedCatalogRequest,
  CodedCatalogResponse,
} from '../../core/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/{{ data.endpoint }}</p>
          <h1>{{ data.title }}</h1>
          <p>{{ data.subtitle }}</p>
        </div>

        <div class="segment-group">
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'list'" (click)="setView('list')">Listagem</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'create'" (click)="setView('create')">{{ selectedId() ? 'Editar' : 'Cadastrar' }}</button>
        </div>
      </div>

      @if (message()) {
        <div class="alert" [class.alert-error]="messageType() === 'error'" [class.alert-success]="messageType() === 'success'">
          {{ message() }}
        </div>
      }

      <section class="content-grid two-columns">
        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Formulário</p>
            <h2>{{ selectedId() ? 'Atualizar' : 'Cadastrar' }} {{ data.singularLabel }}</h2>
          </div>

          <form class="form-grid single-column" [formGroup]="form" (ngSubmit)="submit()">
            <label class="field">
              <span>Descrição</span>
              <input class="input" type="text" formControlName="description" [placeholder]="'Nome da ' + data.singularLabel" />
            </label>

            @if (data.coded) {
              <label class="field">
                <span>Código</span>
                <input class="input" type="text" formControlName="code" placeholder="Código identificador" />
              </label>
            }

            <div class="button-row">
              <button type="submit" class="btn btn-primary" [disabled]="loading() || (!canEdit() && !!selectedId())">
                {{ loading() ? 'Salvando...' : selectedId() ? 'Atualizar registro' : 'Cadastrar registro' }}
              </button>
              <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpar</button>
            </div>
          </form>
        </article>

        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Consulta</p>
            <h2>Lista de {{ data.title.toLowerCase() }}</h2>
          </div>

          <label class="field">
            <span>Filtrar na tela</span>
            <input class="input" type="text" [value]="filterTerm()" (input)="updateFilter($any($event.target).value)" placeholder="Digite para localizar" />
          </label>

          <div class="table-shell compact-table">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  @if (data.coded) {
                    <th>Código</th>
                  }
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr>
                    <td data-label="Descrição">{{ item.description }}</td>
                    @if (data.coded) {
                      <td data-label="Código">{{ isCoded(item) ? item.code : '-' }}</td>
                    }
                    <td data-label="Ações">
                      <div class="table-actions">
                        <button type="button" class="btn btn-ghost btn-sm" [disabled]="!canEdit()" (click)="editItem(item)">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm" [disabled]="!canEdit()" (click)="deleteItem(item.id)">Excluir</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="data.coded ? 3 : 2" class="empty-state">Nenhum registro encontrado.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-bar">
            <p>Página {{ currentPage() + 1 }} de {{ totalPagesLabel() }} · {{ totalElements() }} registros</p>
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
export class CatalogPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly catalogService = inject(CatalogApiService);

  readonly data = this.route.snapshot.data as CatalogPageData;
  readonly items = signal<Array<CatalogResponse | CodedCatalogResponse>>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly filterTerm = signal('');
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
  readonly canEdit = computed(() => this.auth.hasAnyRole(['SECRETARIO', 'ADMINISTRADOR']));
  readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));
  readonly filteredItems = computed(() => {
    const term = this.filterTerm().toLowerCase().trim();
    if (!term) return this.items();

    return this.items().filter((item) => {
      const description = item.description.toLowerCase();
      const code = this.isCoded(item) ? item.code.toLowerCase() : '';
      return description.includes(term) || code.includes(term);
    });
  });

  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required]],
    code: [''],
  });

  constructor() {
    this.loadItems();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = params.get('view');
      this.viewMode.set(view === 'create' ? 'create' : 'list');
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
    this.loadItems();
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.loadItems();
  }

  changePageSize(sizeValue: string): void {
    const size = Number(sizeValue);
    if (!this.pageSizeOptions.includes(size) || this.pageSize() === size) {
      return;
    }

    this.pageSize.set(size);
    this.loadItems(true);
  }

  updateFilter(value: string): void {
    this.filterTerm.set(value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setError('Preencha os campos obrigatórios antes de salvar.');
      return;
    }

    if (this.selectedId() && !this.canEdit()) {
      this.setError('Seu perfil não possui permissão para alterar este cadastro.');
      return;
    }

    this.loading.set(true);
    const payload = this.buildPayload();
    const request = this.selectedId()
      ? this.catalogService.update(this.data.endpoint, this.selectedId()!, payload)
      : this.catalogService.create(this.data.endpoint, payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.setSuccess(`Registro de ${this.data.singularLabel} salvo com sucesso.`);
        this.loadItems();
        this.resetForm();
      },
      error: (error: HttpErrorResponse) => this.handleHttpError(error),
    });
  }

  editItem(item: CatalogResponse | CodedCatalogResponse): void {
    if (!this.canEdit()) {
      return;
    }

    this.selectedId.set(item.id);
    this.form.patchValue({
      description: item.description,
      code: this.isCoded(item) ? item.code : '',
    });
    this.setView('create');
  }

  deleteItem(id: number): void {
    if (!this.canEdit()) {
      this.setError('Seu perfil não possui permissão para excluir este cadastro.');
      return;
    }

    if (!window.confirm('Deseja realmente excluir este registro?')) {
      return;
    }

    this.catalogService.remove(this.data.endpoint, id).subscribe({
      next: () => {
        this.setSuccess(`Registro de ${this.data.singularLabel} removido com sucesso.`);
        this.loadItems();
        this.resetForm();
      },
      error: (error: HttpErrorResponse) => this.handleHttpError(error),
    });
  }

  resetForm(): void {
    this.form.reset({ description: '', code: '' });
    this.selectedId.set(null);
  }

  isCoded(item: CatalogResponse | CodedCatalogResponse): item is CodedCatalogResponse {
    return 'code' in item;
  }

  private loadItems(resetPage = false): void {
    if (resetPage) {
      this.currentPage.set(0);
    }

    this.catalogService.list(this.data.endpoint, { page: this.currentPage(), size: this.pageSize() }).subscribe({
      next: (pageData) => {
        this.items.set(pageData.items);
        this.currentPage.set(pageData.page);
        this.totalElements.set(pageData.totalElements);
        this.totalPages.set(pageData.totalPages);
        this.hasNextPage.set(pageData.hasNext);
        this.hasPreviousPage.set(pageData.hasPrevious);
      },
      error: (error: HttpErrorResponse) => this.handleHttpError(error),
    });
  }

  private buildPayload(): CatalogRequest | CodedCatalogRequest {
    const raw = this.form.getRawValue();
    return this.data.coded
      ? {
          description: raw.description,
          code: raw.code,
        }
      : {
          description: raw.description,
        };
  }

  private handleHttpError(error: HttpErrorResponse): void {
    const apiError = error.error as ApiErrorResponse | undefined;
    this.setError(apiError?.message ?? 'Não foi possível concluir a operação.');
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