import { UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../auth/auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
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

  it('should return true (allow) when session is invalid — user not logged in', () => {
    vi.spyOn(authService, 'ensureValidSession').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should return a UrlTree redirecting to /welcome when user is already authenticated', () => {
    vi.spyOn(authService, 'ensureValidSession').mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/welcome');
  });
});
