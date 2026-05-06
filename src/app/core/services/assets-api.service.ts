import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  API_BASE_URL,
  AssetFilters,
  AssetRequest,
  AssetResponse,
  PageRequest,
  PageResponse,
} from '../api.models';
import { buildHttpParams } from './http-query.utils';

@Injectable({ providedIn: 'root' })
export class AssetsApiService {
  private readonly http = inject(HttpClient);

  list(filters: AssetFilters = {}, pageRequest: PageRequest = {}) {
    return this.http.get<PageResponse<AssetResponse>>(`${API_BASE_URL}/api/assets`, {
      params: buildHttpParams({ ...filters, ...pageRequest }),
    });
  }

  create(payload: AssetRequest) {
    return this.http.post<AssetResponse>(`${API_BASE_URL}/api/assets`, payload);
  }

  update(id: number, payload: AssetRequest) {
    return this.http.put<AssetResponse>(`${API_BASE_URL}/api/assets/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<void>(`${API_BASE_URL}/api/assets/${id}`);
  }

  downloadReport(format: 'csv' | 'excel' | 'pdf') {
    return this.http.get(`${API_BASE_URL}/api/assets/report/${format}`, {
      responseType: 'blob',
    });
  }
}