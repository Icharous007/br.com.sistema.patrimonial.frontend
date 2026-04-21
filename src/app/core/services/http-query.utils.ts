import { HttpParams } from '@angular/common/http';

export function buildHttpParams(payload: object): HttpParams {
  let params = new HttpParams();

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params = params.set(key, String(value));
  });

  return params;
}