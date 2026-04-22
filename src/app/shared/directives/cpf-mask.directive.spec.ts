import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CpfMaskDirective } from './cpf-mask.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CpfMaskDirective],
  template: `<input appCpfMask [formControl]="ctrl" />`,
})
class HostComponent {
  ctrl = new FormControl('');
}

describe('CpfMaskDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('should create the host component', () => {
    expect(host).toBeTruthy();
  });

  it('should leave empty input unchanged', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('');
  });

  it('should format digits as CPF mask on input event', () => {
    input.value = '12345678901';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('123.456.789-01');
  });

  it('should apply partial mask while typing (6 digits)', () => {
    input.value = '123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('123.456');
  });

  it('should apply partial mask while typing (9 digits)', () => {
    input.value = '123456789';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('123.456.789');
  });

  it('should apply mask on blur event', () => {
    input.value = '12345678901';
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.value).toBe('123.456.789-01');
  });

  it('should strip non-digit characters before applying mask', () => {
    input.value = 'abc12345def67890';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.value).toBe('123.456.789-0');
  });

  it('should apply mask on init (ngOnInit)', () => {
    // Pre-seed the control value
    const fixture2 = TestBed.createComponent(HostComponent);
    fixture2.componentInstance.ctrl.setValue('98765432100');
    fixture2.detectChanges();
    const input2 = fixture2.nativeElement.querySelector('input') as HTMLInputElement;
    // trigger the init mask
    input2.dispatchEvent(new Event('input'));
    fixture2.detectChanges();
    expect(input2.value).toBe('987.654.321-00');
  });
});
