import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const isAuthEndpoint = (url: string) =>
  url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/logout');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token();

  const withAuth = (accessToken: string | null) =>
    accessToken
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` }, withCredentials: true })
      : req.clone({ withCredentials: true });

  const request = withAuth(token);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint(request.url)) {
        return authService.refresh().pipe(
          switchMap((newToken) => {
            if (!newToken) {
              authService.logout(false);
              void router.navigate(['/login']);
              return throwError(() => error);
            }
            return next(withAuth(newToken));
          }),
        );
      }

      if (error.status === 428) {
        void router.navigate(['/my-profile'], { queryParams: { view: 'password' } });
      }

      return throwError(() => error);
    }),
  );
};