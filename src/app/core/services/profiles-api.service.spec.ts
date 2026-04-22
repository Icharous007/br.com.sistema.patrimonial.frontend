import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PageResponse, UserProfileRequest, UserProfileResponse } from '../api.models';
import { ProfilesApiService } from './profiles-api.service';

const BASE = 'http://localhost:8080';

const mockProfile: UserProfileResponse = { id: 1, profile: 'ADMINISTRADOR' };

function makePage(items: UserProfileResponse[], total: number, totalPages: number, page = 0): PageResponse<UserProfileResponse> {
  return {
    items,
    page,
    size: 10,
    totalElements: total,
    totalPages,
    hasNext: page < totalPages - 1,
    hasPrevious: page > 0,
  };
}

describe('ProfilesApiService', () => {
  let service: ProfilesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProfilesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── list() ─────────────────────────────────────────────────────────────────

  it('list() should GET /api/profiles', () => {
    const page = makePage([mockProfile], 1, 1);
    service.list().subscribe((res) => expect(res).toEqual(page));

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/profiles`);
    expect(req.request.method).toBe('GET');
    req.flush(page);
  });

  it('list() should send pagination params', () => {
    service.list({ page: 1, size: 20 }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/profiles`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(makePage([], 0, 0));
  });

  // ── listAll() — single page ────────────────────────────────────────────────

  it('listAll() should return items directly when there is only one page', () => {
    let result: UserProfileResponse[] | undefined;
    service.listAll().subscribe((items) => { result = items; });

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/profiles`);
    req.flush(makePage([mockProfile], 1, 1));

    expect(result).toEqual([mockProfile]);
  });

  // ── listAll() — multiple pages ─────────────────────────────────────────────

  it('listAll() should merge results from multiple pages', () => {
    const p2Profile: UserProfileResponse = { id: 2, profile: 'SECRETARIO' };
    let result: UserProfileResponse[] | undefined;

    service.listAll().subscribe((items) => { result = items; });

    // first page
    const firstReq = httpTesting.expectOne((r) => r.url === `${BASE}/api/profiles` && r.params.get('page') === '0');
    firstReq.flush(makePage([mockProfile], 2, 2, 0));

    // second page
    const secondReq = httpTesting.expectOne((r) => r.url === `${BASE}/api/profiles` && r.params.get('page') === '1');
    secondReq.flush(makePage([p2Profile], 2, 2, 1));

    expect(result).toEqual([mockProfile, p2Profile]);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  it('create() should POST to /api/profiles', () => {
    const payload: UserProfileRequest = { profile: 'SECRETARIO' };
    const expected: UserProfileResponse = { id: 2, profile: 'SECRETARIO' };

    service.create(payload).subscribe((res) => expect(res).toEqual(expected));

    const req = httpTesting.expectOne(`${BASE}/api/profiles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(expected);
  });

  // ── update() ───────────────────────────────────────────────────────────────

  it('update() should PUT to /api/profiles/:id', () => {
    const payload: UserProfileRequest = { profile: 'COMUM' };
    const expected: UserProfileResponse = { id: 1, profile: 'COMUM' };

    service.update(1, payload).subscribe((res) => expect(res).toEqual(expected));

    const req = httpTesting.expectOne(`${BASE}/api/profiles/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(expected);
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  it('remove() should DELETE /api/profiles/:id', () => {
    service.remove(1).subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/profiles/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
