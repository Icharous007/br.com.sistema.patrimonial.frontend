import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';

type AuthServiceMock = {
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  hasAnyRole: ReturnType<typeof vi.fn>;
  hasRole: ReturnType<typeof vi.fn>;
  ensureValidSession: ReturnType<typeof vi.fn>;
  token: () => null;
  claims: () => null;
  profile: () => null;
  userName: () => string;
  isAuthenticated: () => boolean;
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let authService: AuthServiceMock;

  beforeEach(async () => {
    localStorage.clear();

    authService = {
      login: vi.fn(),
      logout: vi.fn(),
      hasAnyRole: vi.fn(),
      hasRole: vi.fn(),
      ensureValidSession: vi.fn(),
      token: () => null,
      claims: () => null,
      profile: () => null,
      userName: () => 'Visitante',
      isAuthenticated: () => false,
    };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'welcome', component: DummyComponent }, { path: 'login', component: DummyComponent }]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading=false and no errorMessage', () => {
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should have an invalid form initially (required fields empty)', () => {
    expect(component.loginForm.invalid).toBe(true);
  });

  // ── submit() — invalid form ────────────────────────────────────────────────

  it('submit() should set errorMessage when form is invalid', () => {
    component.submit();
    expect(component.errorMessage()).toBeTruthy();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('submit() should mark all fields as touched when form is invalid', () => {
    component.submit();
    expect(component.loginForm.controls.cpf.touched).toBe(true);
    expect(component.loginForm.controls.password.touched).toBe(true);
  });

  // ── submit() — valid form ──────────────────────────────────────────────────

  it('submit() should call authService.login with sanitized CPF and password', () => {
    authService.login.mockReturnValue(of({ tokenType: 'Bearer', accessToken: 'token', expiresInSeconds: 3600 }));

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'secret123' });
    component.submit();

    expect(authService.login).toHaveBeenCalledWith({ cpf: '12345678901', password: 'secret123' });
  });

  it('submit() should set loading=true while request is in flight', () => {
    let loadingDuringCall = false;

    authService.login.mockImplementation(() => {
      loadingDuringCall = component.loading();
      return of({ tokenType: 'Bearer', accessToken: 'token', expiresInSeconds: 3600 });
    });

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'abc' });
    component.submit();

    expect(loadingDuringCall).toBe(true);
    expect(component.loading()).toBe(false); // finalize resets it
  });

  it('submit() should set loading=false after successful login', () => {
    authService.login.mockReturnValue(of({ tokenType: 'Bearer', accessToken: 'token', expiresInSeconds: 3600 }));

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'abc' });
    component.submit();

    expect(component.loading()).toBe(false);
  });

  // ── submit() — error handling ─────────────────────────────────────────────

  it('submit() should set errorMessage on 401 error', () => {
    const httpError = { status: 401, error: null } as any;
    authService.login.mockReturnValue(throwError(() => httpError));

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'wrong' });
    component.submit();

    expect(component.errorMessage()).toBeTruthy();
    expect(component.loading()).toBe(false);
  });

  it('submit() should set network error message on status 0', () => {
    const httpError = { status: 0, error: null } as any;
    authService.login.mockReturnValue(throwError(() => httpError));

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'abc' });
    component.submit();

    expect(component.errorMessage()).toContain('backend');
  });

  it('submit() should display string error body directly', () => {
    const httpError = { status: 400, error: 'CPF inválido.' } as any;
    authService.login.mockReturnValue(throwError(() => httpError));

    component.loginForm.setValue({ cpf: '123.456.789-01', password: 'abc' });
    component.submit();

    expect(component.errorMessage()).toBe('CPF inválido.');
  });

  // ── template rendering ─────────────────────────────────────────────────────

  it('should render the login form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeTruthy();
    expect(compiled.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should show error message div when errorMessage is set', () => {
    component.errorMessage.set('Erro de autenticação');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('Erro de autenticação');
  });

  it('should disable submit button while loading', () => {
    component.loading.set(true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
