import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PageResponse, UserRequest, UserResponse } from '../api.models';
import { UsersApiService } from './users-api.service';

const BASE = 'http://localhost:8080';

const mockUser: UserResponse = {
  id: 1,
  name: 'Alice',
  cpf: '12345678901',
  email: 'alice@example.com',
  profile: 'ADMINISTRADOR',
  active: true,
};

const mockPage: PageResponse<UserResponse> = {
  items: [mockUser],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

const mockRequest: UserRequest = {
  name: 'Alice',
  cpf: '12345678901',
  email: 'alice@example.com',
  profileId: 1,
  password: 'secret',
};

describe('UsersApiService', () => {
  let service: UsersApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UsersApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── list() ─────────────────────────────────────────────────────────────────

  it('list() should GET /api/users without params when called with defaults', () => {
    service.list().subscribe((res) => expect(res).toEqual(mockPage));

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() should send filter query params', () => {
    service.list({ name: 'Alice', cpf: '12345678901' }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/users`);
    expect(req.request.params.get('name')).toBe('Alice');
    expect(req.request.params.get('cpf')).toBe('12345678901');
    req.flush(mockPage);
  });

  it('list() should send pagination params', () => {
    service.list({}, { page: 2, size: 20 }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/users`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(mockPage);
  });

  it('list() should omit null/undefined/empty filter values', () => {
    service.list({ name: '', cpf: undefined }).subscribe();

    const req = httpTesting.expectOne((r) => r.url === `${BASE}/api/users`);
    expect(req.request.params.has('name')).toBe(false);
    expect(req.request.params.has('cpf')).toBe(false);
    req.flush(mockPage);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  it('create() should POST to /api/users with the payload', () => {
    service.create(mockRequest).subscribe((res) => expect(res).toEqual(mockUser));

    const req = httpTesting.expectOne(`${BASE}/api/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockUser);
  });

  // ── update() ───────────────────────────────────────────────────────────────

  it('update() should PUT to /api/users/:id with the payload', () => {
    service.update(1, mockRequest).subscribe((res) => expect(res).toEqual(mockUser));

    const req = httpTesting.expectOne(`${BASE}/api/users/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockUser);
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  it('remove() should DELETE /api/users/:id', () => {
    service.remove(1).subscribe();

    const req = httpTesting.expectOne(`${BASE}/api/users/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
