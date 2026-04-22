import { HttpParams } from '@angular/common/http';

import { buildHttpParams } from './http-query.utils';

describe('buildHttpParams', () => {
  it('should return empty HttpParams for empty object', () => {
    const params = buildHttpParams({});
    expect(params.keys().length).toBe(0);
  });

  it('should include string values', () => {
    const params = buildHttpParams({ name: 'João' });
    expect(params.get('name')).toBe('João');
  });

  it('should include number values as strings', () => {
    const params = buildHttpParams({ page: 0, size: 10 });
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
  });

  it('should include boolean values as strings', () => {
    const params = buildHttpParams({ active: true });
    expect(params.get('active')).toBe('true');
  });

  it('should skip null values', () => {
    const params = buildHttpParams({ name: null });
    expect(params.has('name')).toBe(false);
  });

  it('should skip undefined values', () => {
    const params = buildHttpParams({ name: undefined });
    expect(params.has('name')).toBe(false);
  });

  it('should skip empty string values', () => {
    const params = buildHttpParams({ name: '' });
    expect(params.has('name')).toBe(false);
  });

  it('should include mixed object keeping only valid values', () => {
    const params = buildHttpParams({ name: 'Ana', cpf: null, page: 1, size: undefined, active: '' });
    expect(params.get('name')).toBe('Ana');
    expect(params.has('cpf')).toBe(false);
    expect(params.get('page')).toBe('1');
    expect(params.has('size')).toBe(false);
    expect(params.has('active')).toBe(false);
  });

  it('should return an HttpParams instance', () => {
    const result = buildHttpParams({ foo: 'bar' });
    expect(result instanceof HttpParams).toBe(true);
  });

  it('should include the number 0 (falsy but valid)', () => {
    const params = buildHttpParams({ page: 0 });
    expect(params.get('page')).toBe('0');
  });
});
