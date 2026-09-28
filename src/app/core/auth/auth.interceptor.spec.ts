import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

@Component({ standalone: true, template: '' })
class DummyComponent {}

function buildFakeToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const claims = { cpf: '12345678901', perfil: 'ADMINISTRADOR', nome: 'Test', exp: Math.floor(Date.now() / 1000) + 3600 };
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${payload}.sig`;
}

describe('authInterceptor', () => {
  let httpTesting: HttpTestingController;
  let http: HttpClient;
  let authService: AuthService;

  function configure() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: DummyComponent }]),
      ],
    });

    http = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpTesting.verify();
  });

  it('should pass request through without Authorization header when no token is present', () => {
    configure();

    http.get('/api/data').subscribe();

    const req = httpTesting.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('should attach Authorization header when a token is held in memory', () => {
    configure();
    const fakeToken = buildFakeToken();
    vi.spyOn(authService, 'token').mockReturnValue(fakeToken);

    http.get('/api/protected').subscribe();

    const req = httpTesting.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.flush({});
  });

  it('should silently refresh and retry the request on 401 outside auth endpoints', () => {
    configure();
    const newToken = buildFakeToken();
    vi.spyOn(authService, 'refresh').mockReturnValue(of(newToken));

    let result: unknown;
    http.get('/api/protected').subscribe((value) => (result = value));

    httpTesting.expectOne('/api/protected').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const retried = httpTesting.expectOne('/api/protected');
    expect(retried.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('should logout and redirect to /login when silent refresh fails on 401', () => {
    configure();
    vi.spyOn(authService, 'refresh').mockReturnValue(of(null));
    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {});

    http.get('/api/protected').subscribe({ error: () => {} });

    httpTesting.expectOne('/api/protected').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).toHaveBeenCalledWith(false);
  });

  it('should NOT attempt refresh on 401 for the login endpoint', () => {
    configure();
    const refreshSpy = vi.spyOn(authService, 'refresh');

    http.post('/api/auth/login', {}).subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should propagate non-401 errors without attempting refresh', () => {
    configure();
    const refreshSpy = vi.spyOn(authService, 'refresh');

    let error: any;
    http.get('/api/data').subscribe({ error: (e) => { error = e; } });

    const req = httpTesting.expectOne('/api/data');
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Server Error' });

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(error.status).toBe(500);
  });
});
