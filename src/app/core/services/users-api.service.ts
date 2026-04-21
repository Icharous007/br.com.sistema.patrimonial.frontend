import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL, PageRequest, PageResponse, UserFilters, UserRequest, UserResponse } from '../api.models';
import { buildHttpParams } from './http-query.utils';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);

  list(filters: UserFilters = {}, pageRequest: PageRequest = {}) {
    return this.http.get<PageResponse<UserResponse>>(`${API_BASE_URL}/api/users`, {
      params: buildHttpParams({ ...filters, ...pageRequest }),
    });
  }

  create(payload: UserRequest) {
    return this.http.post<UserResponse>(`${API_BASE_URL}/api/users`, payload);
  }

  update(id: number, payload: UserRequest) {
    return this.http.put<UserResponse>(`${API_BASE_URL}/api/users/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<void>(`${API_BASE_URL}/api/users/${id}`);
  }
}