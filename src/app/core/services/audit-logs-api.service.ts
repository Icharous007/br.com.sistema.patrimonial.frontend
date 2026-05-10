import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  API_BASE_URL,
  AuditLogFilters,
  AuditLogResponse,
  PageRequest,
  PageResponse,
} from '../api.models';
import { buildHttpParams } from './http-query.utils';

@Injectable({ providedIn: 'root' })
export class AuditLogsApiService {
  private readonly http = inject(HttpClient);

  list(filters: AuditLogFilters = {}, pageRequest: PageRequest = {}) {
    return this.http.get<PageResponse<AuditLogResponse>>(`${API_BASE_URL}/api/audit-logs`, {
      params: buildHttpParams({ ...filters, ...pageRequest }),
    });
  }
}
