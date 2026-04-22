import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  CatalogRequest,
  CatalogResponse,
  CodedCatalogRequest,
  CodedCatalogResponse,
  PageResponse,
} from '../api.models';
import { CatalogApiService } from './catalog-api.service';

const BASE = 'http://localhost:8080';

const mockColor: CatalogResponse = { id: 1, description: 'Azul' };
const mockAssetType: CodedCatalogResponse = { id: 1, description: 'Móvel', code: 'MOV' };

function makePage<T>(items: T[], totalPages = 1, page = 0): PageResponse<T> {
  return {
    items,
    page,
    size: 10,
    totalElements: items.length,
    totalPages,
    hasNext: page < totalPages - 1,
    hasPrevious: page > 0,
  };
}

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CatalogApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── list() ─────────────────────────────────────────────────────────────────

  it('list() should GET /api/colors', () => {
    const page = makePage([mockColor]);
    service.list('colors').subscribe((res) => expect(res).toEqual(page));

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/colors`);
    expect(req.request.method).toBe('GET');
    req.flush(page);
  });

  it('list() should GET correct endpoint for asset-types', () => {
    service.list('asset-types', { page: 0, size: 20 }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/asset-types`);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(makePage([mockAssetType]));
  });

  // ── listAll() — single page ────────────────────────────────────────────────

  it('listAll() should return items directly when only one page', () => {
    let result: any;
    service.listAll('colors').subscribe((items) => { result = items; });

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/colors`);
    req.flush(makePage([mockColor]));

    expect(result).toEqual([mockColor]);
  });

  // ── listAll() — multiple pages ─────────────────────────────────────────────

  it('listAll() should merge results from multiple pages', () => {
    const color2: CatalogResponse = { id: 2, description: 'Vermelho' };
    let result: any;

    service.listAll('colors').subscribe((items) => { result = items; });

    const firstReq = httpTesting.expectOne(
      (r) => r.url === `${BASE}/api/colors` && r.params.get('page') === '0',
    );
    firstReq.flush(makePage([mockColor], 2, 0));

    const secondReq = httpTesting.expectOne(
      (r) => r.url === `${BASE}/api/colors` && r.params.get('page') === '1',
    );
    secondReq.flush(makePage([color2], 2, 1));

    expect(result).toEqual([mockColor, color2]);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  it('create() should POST to /api/colors with simple payload', () => {
    const payload: CatalogRequest = { description: 'Verde' };
    const expected: CatalogResponse = { id: 3, description: 'Verde' };

    service.create('colors', payload).subscribe((res) => expect(res).toEqual(expected));

    const req = httpTesting.expectOne(`${BASE}/api/colors`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(expected);
  });

  it('create() should POST to /api/asset-types with coded payload', () => {
    const payload: CodedCatalogRequest = { description: 'Imóvel', code: 'IMO' };
    const expected: CodedCatalogResponse = { id: 2, description: 'Imóvel', code: 'IMO' };

    service.create('asset-types', payload).subscribe((res) => expect(res).toEqual(expected));

    const req = httpTesting.expectOne(`${BASE}/api/asset-types`);
    expect(req.request.body).toEqual(payload);
    req.flush(expected);
  });

  // ── update() ───────────────────────────────────────────────────────────────

  it('update() should PUT to /api/colors/:id', () => {
    const payload: CatalogRequest = { description: 'Azul Escuro' };
    const expected: CatalogResponse = { id: 1, description: 'Azul Escuro' };

    service.update('colors', 1, payload).subscribe((res) => expect(res).toEqual(expected));

    const req = httpTesting.expectOne(`${BASE}/api/colors/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(expected);
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  it('remove() should DELETE /api/colors/:id', () => {
    service.remove('colors', 1).subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/colors/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('remove() should DELETE correct endpoint', () => {
    service.remove('asset-locations', 5).subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/asset-locations/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
