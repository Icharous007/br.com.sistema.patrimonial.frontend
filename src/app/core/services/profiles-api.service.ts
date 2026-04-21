import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import {
  API_BASE_URL,
  PageRequest,
  PageResponse,
  UserProfileRequest,
  UserProfileResponse,
} from '../api.models';
import { buildHttpParams } from './http-query.utils';

@Injectable({ providedIn: 'root' })
export class ProfilesApiService {
  private readonly http = inject(HttpClient);

  list(pageRequest: PageRequest = {}) {
    return this.http.get<PageResponse<UserProfileResponse>>(`${API_BASE_URL}/api/profiles`, {
      params: buildHttpParams(pageRequest),
    });
  }

  listAll(size = 100): Observable<UserProfileResponse[]> {
    return this.list({ page: 0, size }).pipe(
      switchMap((firstPage) => {
        if (firstPage.totalPages <= 1) {
          return of(firstPage.items);
        }

        const requests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          this.list({ page: index + 1, size }),
        );

        return forkJoin(requests).pipe(
          map((pages) => [firstPage, ...pages].flatMap((page) => page.items)),
        );
      }),
    );
  }

  create(payload: UserProfileRequest) {
    return this.http.post<UserProfileResponse>(`${API_BASE_URL}/api/profiles`, payload);
  }

  update(id: number, payload: UserProfileRequest) {
    return this.http.put<UserProfileResponse>(`${API_BASE_URL}/api/profiles/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<void>(`${API_BASE_URL}/api/profiles/${id}`);
  }
}