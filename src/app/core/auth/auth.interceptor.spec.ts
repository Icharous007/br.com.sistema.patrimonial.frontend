import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
    localStorage.clear();
  });

  it('should pass request through without Authorization header when no token is present', () => {
    localStorage.clear();
    configure();

    http.get('/api/data').subscribe();

    const req = httpTesting.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should attach Authorization header when token is stored in localStorage', () => {
    const fakeToken = buildFakeToken();
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('tokenExpiresAt', String(Date.now() + 3_600_000));

    configure();

    http.get('/api/protected').subscribe();

    const req = httpTesting.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.flush({});
  });

  it('should call logout(false) on 401 response outside the login endpoint', () => {
    localStorage.clear();
    configure();

    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {});

    http.get('/api/protected').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/protected');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).toHaveBeenCalledWith(false);
  });

  it('should NOT call logout on 401 for the login endpoint', () => {
    localStorage.clear();
    configure();

    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {});

    http.post('/api/auth/login', {}).subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('should propagate non-401 errors without calling logout', () => {
    localStorage.clear();
    configure();

    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {});

    let error: any;
    http.get('/api/data').subscribe({ error: (e) => { error = e; } });

    const req = httpTesting.expectOne('/api/data');
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Server Error' });

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(error.status).toBe(500);
  });
});
