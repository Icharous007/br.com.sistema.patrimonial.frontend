import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { ProfileName } from '../api.models';
import { AuthService } from '../auth/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] ?? []) as ProfileName[];

  if (!roles.length || authService.hasAnyRole(roles)) {
    return true;
  }

  return router.parseUrl('/welcome');
};