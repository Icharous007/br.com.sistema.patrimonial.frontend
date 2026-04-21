import { Directive, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

import { formatCpf } from '../utils/cpf.utils';

@Directive({
  selector: 'input[appCpfMask]',
  standalone: true,
})
export class CpfMaskDirective implements OnInit {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  ngOnInit(): void {
    this.applyMask();
  }

  @HostListener('input')
  onInput(): void {
    this.applyMask();
  }

  @HostListener('blur')
  onBlur(): void {
    this.applyMask();
  }

  private applyMask(): void {
    const input = this.elementRef.nativeElement;
    const maskedValue = formatCpf(input.value);

    input.value = maskedValue;

    if (this.ngControl?.control && this.ngControl.control.value !== maskedValue) {
      this.ngControl.control.setValue(maskedValue, { emitEvent: false });
    }
  }
}
