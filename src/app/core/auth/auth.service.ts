import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { API_BASE_URL, JwtClaims, LoginRequest, LoginResponse, ProfileName } from '../api.models';

const ACCESS_TOKEN_KEY = 'accessToken';
const CLAIMS_KEY = 'authClaims';
const EXPIRES_AT_KEY = 'tokenExpiresAt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly claimsState = signal<JwtClaims | null>(this.readClaims());
  private readonly expiresAtState = signal<number | null>(this.readExpiresAt());

  readonly token = computed(() => this.tokenState());
  readonly claims = computed(() => this.claimsState());
  readonly profile = computed(() => this.claimsState()?.perfil ?? null);
  readonly userName = computed(() => this.claimsState()?.nome ?? 'Visitante');
  readonly isAuthenticated = computed(() => !!this.tokenState() && !this.hasSessionExpired());

  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, payload).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  logout(redirect = true): void {
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
      this.logout();
      return false;
    }

    return true;
  }

  private persistSession(response: LoginResponse): void {
    const claims = this.decodeJwt(response.accessToken);
    const expiresAt = Date.now() + response.expiresInSeconds * 1000;

    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));

    this.tokenState.set(response.accessToken);
    this.claimsState.set(claims);
    this.expiresAtState.set(expiresAt);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CLAIMS_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);

    this.tokenState.set(null);
    this.claimsState.set(null);
    this.expiresAtState.set(null);
  }

  private hasSessionExpired(): boolean {
    const expiresAt = this.expiresAtState();
    return !!expiresAt && Date.now() >= expiresAt;
  }

  private readClaims(): JwtClaims | null {
    const claimsValue = localStorage.getItem(CLAIMS_KEY);
    if (claimsValue) {
      try {
        return JSON.parse(claimsValue) as JwtClaims;
      } catch {
        localStorage.removeItem(CLAIMS_KEY);
      }
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const claims = this.decodeJwt(token);
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
      return claims;
    } catch {
      return null;
    }
  }

  private readExpiresAt(): number | null {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    return raw ? Number(raw) : null;
  }

  private decodeJwt(token: string): JwtClaims {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtClaims;
  }
}