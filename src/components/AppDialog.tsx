'use client';

import { useRef } from 'react';
import { Dialog, type DialogProps } from 'primereact/dialog';

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])',
  'textarea',
  'select',
].join(',');

function isFocusableField(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('tabindex') === '-1') {
    return false;
  }
  if (el.hasAttribute('readonly')) {
    // PrimeReact Dropdown/MultiSelect expose a visually hidden readonly input as their focus target.
    return el.closest('.p-hidden-accessible') !== null;
  }
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function focusFirstField(root: HTMLElement | null): boolean {
  if (!root) return false;
  if (root.contains(document.activeElement)) {
    const active = document.activeElement as HTMLElement;
    if (active.matches(FIELD_SELECTOR) && isFocusableField(active)) return true;
  }
  const target = Array.from(
    root.querySelectorAll<HTMLElement>(FIELD_SELECTOR)
  ).find(isFocusableField);
  if (!target) return false;
  target.focus();
  return true;
}

/**
 * Drop-in replacement for PrimeReact's Dialog that focuses the first enabled
 * input field when the dialog opens (PrimeReact otherwise focuses the close icon).
 * Dialogs without any editable field keep PrimeReact's default focus behaviour.
 */
export default function AppDialog({ onShow, children, ...props }: DialogProps) {
  const ref = useRef<Dialog>(null);

  return (
    <Dialog
      {...props}
      ref={ref}
      onShow={() => {
        onShow?.();
        focusFirstField(ref.current?.getElement() ?? null);
      }}
    >
      {children}
    </Dialog>
  );
}
