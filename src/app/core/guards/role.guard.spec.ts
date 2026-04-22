import { ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../auth/auth.service';
import { roleGuard } from './role.guard';

function makeRoute(roles: string[]): ActivatedRouteSnapshot {
  return { data: { roles } } as unknown as ActivatedRouteSnapshot;
}

describe('roleGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return true when route has no required roles', () => {
    const result = TestBed.runInInjectionContext(() => roleGuard(makeRoute([]), {} as any));
    expect(result).toBe(true);
  });

  it('should return true when user profile matches required roles', () => {
    vi.spyOn(authService, 'hasAnyRole').mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(makeRoute(['ADMINISTRADOR']), {} as any),
    );

    expect(result).toBe(true);
  });

  it('should return UrlTree to /welcome when user profile does not match', () => {
    vi.spyOn(authService, 'hasAnyRole').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(makeRoute(['ADMINISTRADOR']), {} as any),
    );

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/welcome');
  });

  it('should check hasAnyRole with the roles from route data', () => {
    const spy = vi.spyOn(authService, 'hasAnyRole').mockReturnValue(true);

    TestBed.runInInjectionContext(() =>
      roleGuard(makeRoute(['SECRETARIO', 'ADMINISTRADOR']), {} as any),
    );

    expect(spy).toHaveBeenCalledWith(['SECRETARIO', 'ADMINISTRADOR'] as any);
  });
});
