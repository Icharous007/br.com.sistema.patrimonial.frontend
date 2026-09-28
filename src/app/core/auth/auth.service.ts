import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';

import { API_BASE_URL, JwtClaims, LoginRequest, LoginResponse, ProfileName } from '../api.models';

/**
 * Access tokens live only in memory (never persisted) to reduce XSS token-theft impact.
 * The refresh token never reaches JavaScript; it travels only in an HttpOnly, SameSite=Strict cookie
 * scoped to /api/auth, so session restoration on reload goes through a silent POST /api/auth/refresh.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(null);
  private readonly claimsState = signal<JwtClaims | null>(null);
  private readonly expiresAtState = signal<number | null>(null);
  private readonly requirePasswordChangeState = signal<boolean>(false);

  private refreshing$: Observable<string | null> | null = null;

  readonly token = computed(() => this.tokenState());
  readonly claims = computed(() => this.claimsState());
  readonly profile = computed(() => this.claimsState()?.perfil ?? null);
  readonly userName = computed(() => this.claimsState()?.nome ?? 'Visitante');
  readonly isAuthenticated = computed(() => !!this.tokenState() && !this.hasSessionExpired());
  readonly requiresPasswordChange = computed(() => this.requirePasswordChangeState());

  login(payload: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, payload, { withCredentials: true })
      .pipe(tap((response) => this.persistSession(response)));
  }

  /** Attempts to restore a session from the refresh cookie; call once at app bootstrap. */
  restoreSession(): Observable<boolean> {
    return this.refresh().pipe(map((token) => !!token));
  }

  /** Silently exchanges the HttpOnly refresh cookie for a new access token; shares one in-flight call. */
  refresh(): Observable<string | null> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http
        .post<LoginResponse>(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          tap((response) => this.persistSession(response)),
          map((response) => response.accessToken),
          catchError(() => {
            this.clearSession();
            return of(null);
          }),
          shareReplay(1),
        );

      this.refreshing$.subscribe({
        complete: () => (this.refreshing$ = null),
      });
    }

    return this.refreshing$;
  }

  logout(redirect = true): void {
    this.http.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.finishLogout(redirect),
      error: () => this.finishLogout(redirect),
    });
  }

  private finishLogout(redirect: boolean): void {
    this.clearSession();
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  hasAnyRole(roles: ProfileName[]): boolean {
    const profile = this.profile();
    return !!profile && roles.includes(profile);
  }

  hasRole(role: ProfileName): boolean {
    return this.profile() === role;
  }

  ensureValidSession(): boolean {
    if (!this.tokenState()) {
      return false;
    }

    if (this.hasSessionExpired()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearPasswordChangeRequirement(): void {
    this.requirePasswordChangeState.set(false);
  }

  private persistSession(response: LoginResponse): void {
    const claims = this.decodeJwt(response.accessToken);
    const expiresAt = Date.now() + response.expiresInSeconds * 1000;

    this.tokenState.set(response.accessToken);
    this.claimsState.set(claims);
    this.expiresAtState.set(expiresAt);
    this.requirePasswordChangeState.set(!!response.requirePasswordChange);
  }

  private clearSession(): void {
    this.tokenState.set(null);
    this.claimsState.set(null);
    this.expiresAtState.set(null);
    this.requirePasswordChangeState.set(false);
  }

  private hasSessionExpired(): boolean {
    const expiresAt = this.expiresAtState();
    return !!expiresAt && Date.now() >= expiresAt;
  }

  private decodeJwt(token: string): JwtClaims {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtClaims;
  }
}