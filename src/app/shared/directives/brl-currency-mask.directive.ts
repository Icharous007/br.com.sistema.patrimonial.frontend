import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toCents(digits: string): number {
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  return parseFloat(`${intPart}.${decPart}`);
}

@Directive({
  selector: 'input[appBrlCurrencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BrlCurrencyMaskDirective),
      multi: true,
    },
  ],
})
export class BrlCurrencyMaskDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const numericValue = digits ? toCents(digits) : 0;
    input.value = digits ? formatter.format(numericValue) : '';
    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur(): void {
    const digits = this.el.nativeElement.value.replace(/\D/g, '');
    if (digits) {
      this.el.nativeElement.value = formatter.format(toCents(digits));
    }
    this.onTouched();
  }

  writeValue(value: number | null | undefined): void {
    if (value === null || value === undefined || value === 0) {
      this.el.nativeElement.value = '';
    } else {
      this.el.nativeElement.value = formatter.format(value);
    }
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }
}
