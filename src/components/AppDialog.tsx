'use client';

import { useEffect, useRef } from 'react';
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

function fitTaskViewport(root: HTMLElement | null) {
  if (!root) return;
  const mask = root.closest<HTMLElement>('.p-dialog-mask');
  const mobile = window.matchMedia?.('(max-width: 767px)').matches;
  if (mobile && window.visualViewport) {
    root.style.setProperty(
      '--task-height',
      `${window.visualViewport.height}px`
    );
    if (mask) {
      mask.style.height = `${window.visualViewport.height}px`;
      mask.style.top = `${window.visualViewport.offsetTop}px`;
    }
  } else {
    root.style.removeProperty('--task-height');
    if (mask) {
      mask.style.height = '100%';
      mask.style.top = '0px';
    }
  }
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
export default function AppDialog({
  onShow,
  children,
  task = false,
  validationErrors,
  className,
  ...props
}: DialogProps & {
  task?: boolean;
  validationErrors?: Record<string, string>;
}) {
  const ref = useRef<Dialog>(null);

  useEffect(() => {
    if (!task || !props.visible) return;
    const update = () => fitTaskViewport(ref.current?.getElement() ?? null);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [task, props.visible]);

  useEffect(() => {
    if (
      !props.visible ||
      !validationErrors ||
      !Object.keys(validationErrors).length
    )
      return;
    const root = ref.current?.getElement();
    const invalid = root?.querySelector<HTMLElement>(
      '[aria-invalid="true"], .p-invalid input'
    );
    if (!invalid) return;
    const details = invalid.closest('details');
    if (details) details.open = true;
    invalid.focus();
    invalid.scrollIntoView?.({ block: 'nearest' });
  }, [validationErrors, props.visible]);

  return (
    <Dialog
      {...props}
      position={task ? 'right' : (props.position ?? 'center')}
      draggable={task ? false : props.draggable}
      resizable={task ? false : props.resizable}
      className={[className, task ? 'task-dialog' : '']
        .filter(Boolean)
        .join(' ')}
      ref={ref}
      onShow={() => {
        onShow?.();
        const root = ref.current?.getElement() ?? null;
        if (task) fitTaskViewport(root);
        if (task && window.matchMedia?.('(max-width: 767px)').matches) {
          const title = root?.querySelector<HTMLElement>('.p-dialog-title');
          title?.setAttribute('tabindex', '-1');
          title?.focus();
        } else {
          focusFirstField(root);
        }
      }}
    >
      {children}
    </Dialog>
  );
}
