import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AssetRequest, AssetResponse, PageResponse } from '../api.models';
import { AssetsApiService } from './assets-api.service';

const BASE = 'http://localhost:8080';

const mockAsset: AssetResponse = {
  id: 1,
  description: 'Mesa de escritório',
  quantity: 2,
  assetCode: 'PAT-001',
  barcodeValue: '1234567890',
};

const mockPage: PageResponse<AssetResponse> = {
  items: [mockAsset],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

const mockRequest: AssetRequest = {
  description: 'Mesa de escritório',
  quantity: 2,
  colorId: 1,
  assetTypeId: 1,
  assetStatusId: 1,
  assetMaterialId: 1,
  assetLocationId: 1,
};

describe('AssetsApiService', () => {
  let service: AssetsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AssetsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── list() ─────────────────────────────────────────────────────────────────

  it('list() should GET /api/assets without params when called with defaults', () => {
    service.list().subscribe((res) => expect(res).toEqual(mockPage));

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/assets`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() should send filter query params', () => {
    service.list({ brand: 'IKEA', description: 'Mesa' }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/assets`);
    expect(req.request.params.get('brand')).toBe('IKEA');
    expect(req.request.params.get('description')).toBe('Mesa');
    req.flush(mockPage);
  });

  it('list() should send assetCode filter query param', () => {
    service.list({ assetCode: '02.01.0000001' }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/assets`);
    expect(req.request.params.get('assetCode')).toBe('02.01.0000001');
    req.flush(mockPage);
  });

  it('list() should send pagination params', () => {
    service.list({}, { page: 1, size: 50 }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/assets`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    req.flush(mockPage);
  });

  it('list() should omit null/empty filter values', () => {
    service.list({ brand: '', description: undefined }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/assets`);
    expect(req.request.params.has('brand')).toBe(false);
    expect(req.request.params.has('description')).toBe(false);
    req.flush(mockPage);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  it('create() should POST to /api/assets with the payload', () => {
    service.create(mockRequest).subscribe((res) => expect(res).toEqual(mockAsset));

    const req = httpTesting.expectOne(`${BASE}/api/assets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockAsset);
  });

  // ── update() ───────────────────────────────────────────────────────────────

  it('update() should PUT to /api/assets/:id with the payload', () => {
    service.update(1, mockRequest).subscribe((res) => expect(res).toEqual(mockAsset));

    const req = httpTesting.expectOne(`${BASE}/api/assets/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockAsset);
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  it('remove() should DELETE /api/assets/:id', () => {
    service.remove(1).subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/assets/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── downloadReport() ───────────────────────────────────────────────────────

  it('downloadReport() should GET /api/assets/report/csv as blob', () => {
    service.downloadReport('csv').subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/assets/report/csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['data'], { type: 'text/csv' }));
  });

  it('downloadReport() should GET /api/assets/report/excel as blob', () => {
    service.downloadReport('excel').subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/assets/report/excel`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['data']));
  });
});
