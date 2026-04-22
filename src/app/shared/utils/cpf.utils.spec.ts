import { formatCpf, sanitizeCpf } from './cpf.utils';

describe('sanitizeCpf', () => {
  it('should remove non-digit characters', () => {
    expect(sanitizeCpf('123.456.789-01')).toBe('12345678901');
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeCpf('')).toBe('');
  });

  it('should return empty string for null', () => {
    expect(sanitizeCpf(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeCpf(undefined)).toBe('');
  }); 

  it('should slice to 11 digits maximum', () => {
    expect(sanitizeCpf('123456789012345')).toBe('12345678901');
  });

  it('should keep only digits from mixed input', () => {
    expect(sanitizeCpf('abc123def456ghi789jk01')).toBe('12345678901');
  });

  it('should return digits unchanged when already sanitized', () => {
    expect(sanitizeCpf('12345678901')).toBe('12345678901');
  });
});

describe('formatCpf', () => {
  it('should return empty string for empty input', () => {
    expect(formatCpf('')).toBe('');
  });

  it('should return empty string for null', () => {
    expect(formatCpf(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatCpf(undefined)).toBe('');
  });

  it('should return up to 3 digits without formatting', () => {
    expect(formatCpf('123')).toBe('123');
    expect(formatCpf('12')).toBe('12');
    expect(formatCpf('1')).toBe('1');
  });

  it('should format 4–6 digits as NNN.NNN', () => {
    expect(formatCpf('1234')).toBe('123.4');
    expect(formatCpf('123456')).toBe('123.456');
  });

  it('should format 7–9 digits as NNN.NNN.NNN', () => {
    expect(formatCpf('1234567')).toBe('123.456.7');
    expect(formatCpf('123456789')).toBe('123.456.789');
  });

  it('should format 10–11 digits as NNN.NNN.NNN-NN', () => {
    expect(formatCpf('1234567890')).toBe('123.456.789-0');
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });

  it('should strip non-digits before formatting', () => {
    expect(formatCpf('123.456.789-01')).toBe('123.456.789-01');
  });

  it('should handle string with spaces', () => {
    expect(formatCpf('123 456 789 01')).toBe('123.456.789-01');
  });
});
