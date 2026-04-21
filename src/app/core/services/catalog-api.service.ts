import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import {
  API_BASE_URL,
  CatalogEndpoint,
  CatalogRequest,
  CatalogResponse,
  CodedCatalogRequest,
  CodedCatalogResponse,
  PageRequest,
  PageResponse,
} from '../api.models';
import { buildHttpParams } from './http-query.utils';

type CatalogItem = CatalogResponse | CodedCatalogResponse;

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  list(endpoint: CatalogEndpoint, pageRequest: PageRequest = {}): Observable<PageResponse<CatalogItem>> {
    return this.http.get<PageResponse<CatalogItem>>(`${API_BASE_URL}/api/${endpoint}`, {
      params: buildHttpParams(pageRequest),
    });
  }

  listAll(endpoint: CatalogEndpoint, size = 100): Observable<CatalogItem[]> {
    return this.list(endpoint, { page: 0, size }).pipe(
      switchMap((firstPage) => {
        if (firstPage.totalPages <= 1) {
          return of(firstPage.items);
        }

        const requests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          this.list(endpoint, { page: index + 1, size }),
        );

        return forkJoin(requests).pipe(
          map((pages) => [firstPage, ...pages].flatMap((page) => page.items)),
        );
      }),
    );
  }

  create(endpoint: CatalogEndpoint, payload: CatalogRequest | CodedCatalogRequest) {
    return this.http.post<CatalogResponse | CodedCatalogResponse>(`${API_BASE_URL}/api/${endpoint}`, payload);
  }

  update(endpoint: CatalogEndpoint, id: number, payload: CatalogRequest | CodedCatalogRequest) {
    return this.http.put<CatalogResponse | CodedCatalogResponse>(`${API_BASE_URL}/api/${endpoint}/${id}`, payload);
  }

  remove(endpoint: CatalogEndpoint, id: number) {
    return this.http.delete<void>(`${API_BASE_URL}/api/${endpoint}/${id}`);
  }
}