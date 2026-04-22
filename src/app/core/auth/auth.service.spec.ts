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
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

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
    localStorage.clear();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated when localStorage is empty', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.claims()).toBeNull();
    expect(service.profile()).toBeNull();
    expect(service.userName()).toBe('Visitante');
  });

  // ── login() ────────────────────────────────────────────────────────────────

  it('should persist session and mark authenticated after successful login', () => {
    service.login({ cpf: '12345678901', password: 'secret' }).subscribe();

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(fakeLoginResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe(fakeToken);
    expect(service.profile()).toBe('ADMINISTRADOR');
    expect(service.userName()).toBe('Admin User');
    expect(localStorage.getItem('accessToken')).toBe(fakeToken);
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

  // ── logout() ───────────────────────────────────────────────────────────────

  it('should clear session on logout', () => {
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('authClaims', JSON.stringify(adminClaims));
    localStorage.setItem('tokenExpiresAt', String(Date.now() + 3_600_000));

    // Re-create service so it reads the pre-seeded localStorage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', component: DummyComponent }, { path: 'welcome', component: DummyComponent }])],
    });
    const freshService = TestBed.inject(AuthService);

    freshService.logout(false);

    expect(freshService.isAuthenticated()).toBe(false);
    expect(freshService.token()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
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

  it('ensureValidSession should return false and logout when token is expired', () => {
    const expiredResponse: LoginResponse = {
      tokenType: 'Bearer',
      accessToken: fakeExpiredToken,
      expiresInSeconds: -1,
    };

    service.login({ cpf: '12345678901', password: 'x' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(expiredResponse);

    const result = service.ensureValidSession();

    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  // ── localStorage restoration ───────────────────────────────────────────────

  it('should restore session from localStorage on initialization', () => {
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('authClaims', JSON.stringify(adminClaims));
    localStorage.setItem('tokenExpiresAt', String(Date.now() + 3_600_000));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', component: DummyComponent }, { path: 'welcome', component: DummyComponent }])],
    });
    const restored = TestBed.inject(AuthService);

    expect(restored.token()).toBe(fakeToken);
    expect(restored.profile()).toBe('ADMINISTRADOR');
    expect(restored.userName()).toBe('Admin User');
    expect(restored.isAuthenticated()).toBe(true);
  });
});
