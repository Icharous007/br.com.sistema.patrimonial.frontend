import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import {
  ApiErrorResponse,
  AssetFilters,
  AssetRequest,
  AssetResponse,
  CatalogResponse,
  CodedCatalogResponse,
} from '../../core/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { AssetsApiService } from '../../core/services/assets-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';

type LookupList = Array<CatalogResponse | CodedCatalogResponse>;

@Component({
  selector: 'app-assets-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  template: `
    <section class="page-stack">
      <div class="page-header card-soft">
        <div class="section-heading compact">
          <p class="eyebrow">Endpoint /api/assets</p>
          <h1>Bens patrimoniais</h1>
          <p>Cadastro completo, filtros detalhados, relatórios e integração com catálogos auxiliares.</p>
        </div>

        <div class="segment-group wrap">
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'list'" (click)="setView('list')">Consultar</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'create'" (click)="setView('create')">{{ selectedId() ? 'Editar bem' : 'Cadastrar bem' }}</button>
          <button type="button" class="segment-button" [class.segment-active]="viewMode() === 'reports'" (click)="setView('reports')">Relatórios</button>
        </div>
      </div>

      @if (message()) {
        <div class="alert" [class.alert-error]="messageType() === 'error'" [class.alert-success]="messageType() === 'success'">{{ message() }}</div>
      }

      <section class="content-grid asset-layout">
        <article class="card-soft span-2">
          <div class="section-heading compact">
            <p class="eyebrow">Filtros de consulta</p>
            <h2>Listar e localizar bens</h2>
          </div>

          <form class="form-grid" [formGroup]="filterForm" (ngSubmit)="searchAssets(true)">
            <label class="field"><span>Descrição</span><input class="input" type="text" formControlName="description" /></label>
            <label class="field"><span>Marca</span><input class="input" type="text" formControlName="brand" /></label>
            <label class="field"><span>Modelo</span><input class="input" type="text" formControlName="model" /></label>
            <label class="field"><span>Número de série</span><input class="input" type="text" formControlName="serialNumber" /></label>
            <label class="field"><span>Fabricante</span><input class="input" type="text" formControlName="manufacturer" /></label>
            <label class="field"><span>Nota fiscal</span><input class="input" type="text" formControlName="invoice" /></label>
            <label class="field"><span>Aquisição</span><input class="input" type="date" formControlName="acquisitionDate" /></label>
            <label class="field"><span>Baixa</span><input class="input" type="date" formControlName="disposalDate" /></label>
            <label class="field"><span>Cor</span><select class="input" formControlName="color"><option value="">Todas</option>@for (item of colors(); track item.id) {<option [value]="item.description">{{ item.description }}</option>}</select></label>
            <label class="field"><span>Tipo</span><select class="input" formControlName="type"><option value="">Todos</option>@for (item of assetTypes(); track item.id) {<option [value]="item.description">{{ item.description }}</option>}</select></label>
            <label class="field"><span>Status</span><select class="input" formControlName="status"><option value="">Todos</option>@for (item of assetStatuses(); track item.id) {<option [value]="item.description">{{ item.description }}</option>}</select></label>
            <label class="field"><span>Material</span><select class="input" formControlName="material"><option value="">Todos</option>@for (item of assetMaterials(); track item.id) {<option [value]="item.description">{{ item.description }}</option>}</select></label>
            <label class="field span-2"><span>Localização</span><select class="input" formControlName="location"><option value="">Todas</option>@for (item of assetLocations(); track item.id) {<option [value]="item.description">{{ item.description }} @if (hasCode(item)) {({{ item.code }})}</option>}</select></label>

            <div class="button-row span-2">
              <button type="submit" class="btn btn-secondary">Aplicar filtros</button>
              <button type="button" class="btn btn-ghost" (click)="clearAssetFilters()">Limpar</button>
            </div>
          </form>
        </article>

        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Cadastro do bem</p>
            <h2>{{ selectedId() ? 'Atualizar bem' : 'Novo bem' }}</h2>
          </div>

          <form class="form-grid" [formGroup]="assetForm" (ngSubmit)="submitAsset()">
            <label class="field span-2"><span>Descrição</span><input class="input" type="text" formControlName="description" /></label>
            <label class="field"><span>Quantidade</span><input class="input" type="number" min="1" step="1" formControlName="quantity" /></label>
            <label class="field"><span>Data de aquisição</span><input class="input" type="date" formControlName="acquisitionDate" /></label>
            <label class="field"><span>Data de baixa</span><input class="input" type="date" formControlName="disposalDate" /></label>
            <label class="field"><span>Valor de aquisição</span><input class="input" type="number" step="0.01" formControlName="acquisitionValue" /></label>
            <label class="field"><span>Marca</span><input class="input" type="text" formControlName="brand" /></label>
            <label class="field"><span>Modelo</span><input class="input" type="text" formControlName="model" /></label>
            <label class="field"><span>Número de série</span><input class="input" type="text" formControlName="serialNumber" /></label>
            <label class="field"><span>Fabricante</span><input class="input" type="text" formControlName="manufacturer" /></label>
            <label class="field"><span>Nota fiscal</span><input class="input" type="text" formControlName="invoice" /></label>
            <label class="field"><span>Cor</span><select class="input" formControlName="colorId"><option [ngValue]="0">Selecione</option>@for (item of colors(); track item.id) {<option [ngValue]="item.id">{{ item.description }}</option>}</select></label>
            <label class="field"><span>Tipo de bem</span><select class="input" formControlName="assetTypeId"><option [ngValue]="0">Selecione</option>@for (item of assetTypes(); track item.id) {<option [ngValue]="item.id">{{ item.description }} @if (hasCode(item)) {({{ item.code }})}</option>}</select></label>
            <label class="field"><span>Status</span><select class="input" formControlName="assetStatusId"><option [ngValue]="0">Selecione</option>@for (item of assetStatuses(); track item.id) {<option [ngValue]="item.id">{{ item.description }}</option>}</select></label>
            <label class="field"><span>Material</span><select class="input" formControlName="assetMaterialId"><option [ngValue]="0">Selecione</option>@for (item of assetMaterials(); track item.id) {<option [ngValue]="item.id">{{ item.description }}</option>}</select></label>
            <label class="field span-2"><span>Localização</span><select class="input" formControlName="assetLocationId"><option [ngValue]="0">Selecione</option>@for (item of assetLocations(); track item.id) {<option [ngValue]="item.id">{{ item.description }} @if (hasCode(item)) {({{ item.code }})}</option>}</select></label>
            <label class="field span-2"><span>Foto do bem</span><input class="input" type="file" accept="image/*" (change)="handlePhotoSelection($event)" /></label>

            @if (photoPreview()) {
              <div class="media-preview span-2"><img [src]="photoPreview()" alt="Prévia do bem" /></div>
            }

            <div class="button-row span-2">
              <button type="submit" class="btn btn-primary" [disabled]="loading() || (selectedId() && !canUpdate())">{{ loading() ? 'Salvando...' : selectedId() ? 'Atualizar bem' : 'Cadastrar bem' }}</button>
              <button type="button" class="btn btn-secondary" (click)="resetAssetForm()">Limpar</button>
            </div>
          </form>
        </article>

        <article class="card-soft">
          <div class="section-heading compact">
            <p class="eyebrow">Relatórios e retorno</p>
            <h2>Saída operacional</h2>
          </div>

          <div class="report-panel">
            <button type="button" class="btn btn-secondary btn-block" (click)="downloadReport('csv')">Baixar CSV</button>
            <button type="button" class="btn btn-secondary btn-block" (click)="downloadReport('excel')">Baixar Excel</button>
          </div>

          @if (savedAsset()) {
            <div class="summary-card">
              <p><strong>Código patrimonial:</strong> {{ savedAsset()?.assetCode }}</p>
              <p><strong>Descrição:</strong> {{ savedAsset()?.description }}</p>
              <p><strong>Quantidade:</strong> {{ savedAsset()?.quantity }}</p>
              @if (barcodeImage()) {
                <div class="barcode-frame"><img [src]="barcodeImage()" alt="Código de barras" /></div>
              }
            </div>
          }
        </article>

        <article class="card-soft span-2">
          <div class="section-heading compact">
            <p class="eyebrow">Listagem retornada</p>
            <h2>Bens encontrados</h2>
          </div>

          <div class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Bem</th>
                  <th>Qtd.</th>
                  <th>Código</th>
                  <th>Classificação</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (asset of assets(); track asset.id) {
                  <tr>
                    <td data-label="Bem">
                      <strong>{{ asset.description }}</strong>
                      <small>{{ asset.brand }} {{ asset.model }}</small>
                    </td>
                    <td data-label="Qtd.">{{ asset.quantity }}</td>
                    <td data-label="Código">{{ asset.assetCode }}</td>
                    <td data-label="Classificação">
                      <div class="stacked-inline">
                        <span>{{ asset.assetType || '-' }}</span>
                        <small>{{ asset.assetLocation || '-' }} • {{ asset.assetStatus || '-' }}</small>
                      </div>
                    </td>
                    <td data-label="Valor">{{ asset.acquisitionValue || 0 | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}</td>
                    <td data-label="Ações">
                      <div class="table-actions">
                        <button type="button" class="btn btn-ghost btn-sm" [disabled]="!canUpdate()" (click)="editAsset(asset)">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm" [disabled]="!canDelete()" (click)="deleteAsset(asset.id)">Excluir</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="empty-state">Nenhum bem retornado com os filtros informados.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-bar">
            <p>Página {{ currentPage() + 1 }} de {{ totalPagesLabel() }} · {{ totalElements() }} bens</p>
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
export class AssetsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly assetsApi = inject(AssetsApiService);
  private readonly catalogApi = inject(CatalogApiService);

  readonly assets = signal<AssetResponse[]>([]);
  readonly colors = signal<LookupList>([]);
  readonly assetTypes = signal<LookupList>([]);
  readonly assetStatuses = signal<LookupList>([]);
  readonly assetMaterials = signal<LookupList>([]);
  readonly assetLocations = signal<LookupList>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'create' | 'reports'>('list');
  readonly photoBase64 = signal<string>('');
  readonly photoPreview = signal<string>('');
  readonly savedAsset = signal<AssetResponse | null>(null);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'success' | 'error'>('success');
  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly pageSizeOptions: number[] = [10, 20, 50];
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);
  readonly canUpdate = computed(() => this.auth.hasAnyRole(['SECRETARIO', 'ADMINISTRADOR']));
  readonly canDelete = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR']));
  readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));
  readonly barcodeImage = computed(() => {
    const value = this.savedAsset()?.barcodeValue;
    return value ? `data:image/png;base64,${value}` : '';
  });

  readonly filterForm = this.fb.nonNullable.group({
    brand: [''],
    model: [''],
    description: [''],
    createdFrom: [''],
    disposalDate: [''],
    acquisitionDate: [''],
    invoice: [''],
    material: [''],
    location: [''],
    status: [''],
    color: [''],
    serialNumber: [''],
    manufacturer: [''],
    type: [''],
  });

  readonly assetForm = this.fb.nonNullable.group({
    description: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    acquisitionDate: [''],
    disposalDate: [''],
    acquisitionValue: [0],
    brand: [''],
    model: [''],
    serialNumber: [''],
    manufacturer: [''],
    invoice: [''],
    colorId: [0, [Validators.min(1)]],
    assetTypeId: [0, [Validators.min(1)]],
    assetStatusId: [0, [Validators.min(1)]],
    assetMaterialId: [0, [Validators.min(1)]],
    assetLocationId: [0, [Validators.min(1)]],
  });

  constructor() {
    this.loadLookups();
    this.searchAssets();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = params.get('view');
      this.viewMode.set(view === 'create' || view === 'reports' ? view : 'list');
    });
  }

  setView(mode: 'list' | 'create' | 'reports'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
    });
  }

  hasCode(item: CatalogResponse | CodedCatalogResponse): item is CodedCatalogResponse {
    return 'code' in item;
  }

  searchAssets(resetPage = false): void {
    if (resetPage) {
      this.currentPage.set(0);
    }

    const filters = this.filterForm.getRawValue() as AssetFilters;
    this.assetsApi
      .list(filters, { page: this.currentPage(), size: this.pageSize() })
      .subscribe({
      next: (pageData) => {
        this.assets.set(pageData.items);
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
    this.searchAssets();
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.searchAssets();
  }

  changePageSize(sizeValue: string): void {
    const size = Number(sizeValue);
    if (!this.pageSizeOptions.includes(size) || this.pageSize() === size) {
      return;
    }

    this.pageSize.set(size);
    this.searchAssets(true);
  }

  clearAssetFilters(): void {
    this.filterForm.reset({
      brand: '', model: '', description: '', createdFrom: '', disposalDate: '', acquisitionDate: '', invoice: '',
      material: '', location: '', status: '', color: '', serialNumber: '', manufacturer: '', type: '',
    });
    this.searchAssets(true);
  }

  submitAsset(): void {
    if (this.assetForm.invalid) {
      this.assetForm.markAllAsTouched();
      this.setError('Preencha os campos obrigatórios do bem antes de salvar.');
      return;
    }

    if (this.selectedId() && !this.canUpdate()) {
      this.setError('Seu perfil não possui permissão para atualizar bens.');
      return;
    }

    this.loading.set(true);
    const payload = this.buildAssetPayload();
    const request = this.selectedId()
      ? this.assetsApi.update(this.selectedId()!, payload)
      : this.assetsApi.create(payload);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (asset) => {
        this.savedAsset.set(asset);
        this.setSuccess('Bem salvo com sucesso.');
        this.searchAssets();
        this.resetAssetForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  editAsset(asset: AssetResponse): void {
    if (!this.canUpdate()) {
      return;
    }

    const color = this.findLookupId(this.colors(), asset.color);
    const type = this.findLookupId(this.assetTypes(), asset.assetType);
    const status = this.findLookupId(this.assetStatuses(), asset.assetStatus);
    const material = this.findLookupId(this.assetMaterials(), asset.assetMaterial);
    const location = this.findLookupId(this.assetLocations(), asset.assetLocation);

    this.selectedId.set(asset.id);
    this.assetForm.patchValue({
      description: asset.description,
      quantity: asset.quantity,
      acquisitionDate: asset.acquisitionDate ?? '',
      disposalDate: asset.disposalDate ?? '',
      acquisitionValue: asset.acquisitionValue ?? 0,
      brand: asset.brand ?? '',
      model: asset.model ?? '',
      serialNumber: asset.serialNumber ?? '',
      manufacturer: asset.manufacturer ?? '',
      invoice: asset.invoice ?? '',
      colorId: color,
      assetTypeId: type,
      assetStatusId: status,
      assetMaterialId: material,
      assetLocationId: location,
    });
    this.savedAsset.set(asset);
    this.setView('create');
  }

  deleteAsset(id: number): void {
    if (!this.canDelete()) {
      this.setError('Seu perfil não possui permissão para excluir bens.');
      return;
    }

    if (!window.confirm('Deseja realmente excluir este bem?')) {
      return;
    }

    this.assetsApi.remove(id).subscribe({
      next: () => {
        this.setSuccess('Bem excluído com sucesso.');
        this.searchAssets();
        this.resetAssetForm();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  handlePhotoSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const [, base64] = result.split(',');
      this.photoBase64.set(base64 ?? '');
      this.photoPreview.set(result);
    };
    reader.readAsDataURL(file);
  }

  downloadReport(format: 'csv' | 'excel'): void {
    this.assetsApi.downloadReport(format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `bens-patrimoniais.${format === 'csv' ? 'csv' : 'xlsx'}`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  resetAssetForm(): void {
    this.assetForm.reset({
      description: '', quantity: 1, acquisitionDate: '', disposalDate: '', acquisitionValue: 0, brand: '', model: '',
      serialNumber: '', manufacturer: '', invoice: '', colorId: 0, assetTypeId: 0, assetStatusId: 0,
      assetMaterialId: 0, assetLocationId: 0,
    });
    this.photoBase64.set('');
    this.photoPreview.set('');
    this.selectedId.set(null);
  }

  private loadLookups(): void {
    forkJoin({
      colors: this.catalogApi.listAll('colors'),
      assetTypes: this.catalogApi.listAll('asset-types'),
      assetStatuses: this.catalogApi.listAll('asset-statuses'),
      assetMaterials: this.catalogApi.listAll('asset-materials'),
      assetLocations: this.catalogApi.listAll('asset-locations'),
    }).subscribe({
      next: (result) => {
        this.colors.set(result.colors);
        this.assetTypes.set(result.assetTypes);
        this.assetStatuses.set(result.assetStatuses);
        this.assetMaterials.set(result.assetMaterials);
        this.assetLocations.set(result.assetLocations);
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  private buildAssetPayload(): AssetRequest {
    const raw = this.assetForm.getRawValue();
    return {
      description: raw.description,
      quantity: Number(raw.quantity),
      acquisitionDate: raw.acquisitionDate || undefined,
      disposalDate: raw.disposalDate || undefined,
      acquisitionValue: raw.acquisitionValue ? Number(raw.acquisitionValue) : undefined,
      brand: raw.brand || undefined,
      model: raw.model || undefined,
      serialNumber: raw.serialNumber || undefined,
      manufacturer: raw.manufacturer || undefined,
      invoice: raw.invoice || undefined,
      colorId: Number(raw.colorId),
      assetTypeId: Number(raw.assetTypeId),
      assetStatusId: Number(raw.assetStatusId),
      assetMaterialId: Number(raw.assetMaterialId),
      assetLocationId: Number(raw.assetLocationId),
      photoBase64: this.photoBase64() || undefined,
    };
  }

  private findLookupId(list: LookupList, description?: string): number {
    return list.find((item) => item.description === description)?.id ?? 0;
  }

  private handleError(error: HttpErrorResponse): void {
    const apiError = error.error as ApiErrorResponse | undefined;
    this.setError(apiError?.message ?? 'Não foi possível concluir a operação patrimonial.');
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