import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { JwtClaims, LoginResponse } from '../api.models';
import { AuthService } from './auth.service';

/** Builds a minimal fake JWT token whose payload encodes the given claims. */
function makeFakeJwt(claims: JwtClaims & { exp?: number }): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.fakesignature`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600;

const adminClaims: JwtClaims = { cpf: '12345678901', perfil: 'ADMINISTRADOR', nome: 'Admin User', exp: FUTURE_EXP };
const expiredClaims: JwtClaims = { cpf: '12345678901', perfil: 'ADMINISTRADOR', nome: 'Admin User', exp: PAST_EXP };

const fakeToken = makeFakeJwt(adminClaims);
const fakeExpiredToken = makeFakeJwt(expiredClaims);

const fakeLoginResponse: LoginResponse = {
  tokenType: 'Bearer',
  accessToken: fakeToken,
  expiresInSeconds: 3600,
  requirePasswordChange: false,
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: DummyComponent }, { path: 'welcome', component: DummyComponent }]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated with no in-memory token', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.claims()).toBeNull();
    expect(service.profile()).toBeNull();
    expect(service.userName()).toBe('Visitante');
  });

  // ── login() ────────────────────────────────────────────────────────────────

  it('should persist session in memory and mark authenticated after successful login', () => {
    service.login({ cpf: '12345678901', password: 'secret' }).subscribe();

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(fakeLoginResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe(fakeToken);
    expect(service.profile()).toBe('ADMINISTRADOR');
    expect(service.userName()).toBe('Admin User');
  });

  it('should propagate HTTP errors from login', () => {
    let errorCaught = false;
    service.login({ cpf: '12345678901', password: 'wrong' }).subscribe({
      error: () => { errorCaught = true; },
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  // ── refresh() / restoreSession() ───────────────────────────────────────────

  it('refresh() should exchange the HttpOnly cookie for a new access token', () => {
    let resolvedToken: string | null = null;
    service.refresh().subscribe((token) => (resolvedToken = token));

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/refresh');
    expect(req.request.withCredentials).toBe(true);
    req.flush(fakeLoginResponse);

    expect(resolvedToken).toBe(fakeToken);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('refresh() should share a single in-flight request across concurrent callers', () => {
    let firstToken: string | null = null;
    let secondToken: string | null = null;
    service.refresh().subscribe((token) => (firstToken = token));
    service.refresh().subscribe((token) => (secondToken = token));

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/refresh');
    req.flush(fakeLoginResponse);

    expect(firstToken).toBe(fakeToken);
    expect(secondToken).toBe(fakeToken);
  });

  it('restoreSession() should resolve false and clear state when there is no valid refresh cookie', () => {
    let restored: boolean | null = null;
    service.restoreSession().subscribe((ok) => (restored = ok));

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/refresh');
    req.flush({ message: 'Refresh token invalido.' }, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  // ── logout() ───────────────────────────────────────────────────────────────

  it('should clear in-memory session after logout completes', () => {
    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(fakeLoginResponse);

    service.logout(false);
    httpTesting.expectOne('http://localhost:8080/api/auth/logout').flush(null);

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('should clear in-memory session even when the logout request fails', () => {
    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(fakeLoginResponse);

    service.logout(false);
    httpTesting
      .expectOne('http://localhost:8080/api/auth/logout')
      .flush({ message: 'error' }, { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBe(false);
  });

  // ── hasAnyRole() / hasRole() ───────────────────────────────────────────────

  it('hasAnyRole should return false when not authenticated', () => {
    expect(service.hasAnyRole(['ADMINISTRADOR', 'SECRETARIO'])).toBe(false);
  });

  it('hasAnyRole should return true when profile matches list', () => {
    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(fakeLoginResponse);

    expect(service.hasAnyRole(['ADMINISTRADOR'])).toBe(true);
    expect(service.hasAnyRole(['SECRETARIO', 'ADMINISTRADOR'])).toBe(true);
    expect(service.hasAnyRole(['COMUM'])).toBe(false);
  });

  it('hasRole should return true for exact profile match', () => {
    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(fakeLoginResponse);

    expect(service.hasRole('ADMINISTRADOR')).toBe(true);
    expect(service.hasRole('SECRETARIO')).toBe(false);
  });

  // ── ensureValidSession() ───────────────────────────────────────────────────

  it('ensureValidSession should return false when no token', () => {
    expect(service.ensureValidSession()).toBe(false);
  });

  it('ensureValidSession should return true with valid unexpired token', () => {
    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(fakeLoginResponse);

    expect(service.ensureValidSession()).toBe(true);
  });

  it('ensureValidSession should return false and clear session when token is expired', () => {
    const expiredResponse: LoginResponse = {
      tokenType: 'Bearer',
      accessToken: fakeExpiredToken,
      expiresInSeconds: -1,
      requirePasswordChange: false,
    };

    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(expiredResponse);

    const result = service.ensureValidSession();

    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });
});
