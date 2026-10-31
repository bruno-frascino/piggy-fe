// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppDialog from './AppDialog';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AppDialog', () => {
  it('positions task forms on the right while ordinary dialogs remain centered', () => {
    const { rerender } = render(
      <AppDialog header='Position task' visible task onHide={() => {}}>
        <InputText aria-label='Task field' />
      </AppDialog>
    );
    expect(screen.getByRole('dialog').closest('.p-dialog-mask')).toHaveClass(
      'p-dialog-right'
    );
    rerender(
      <AppDialog header='Confirmation' visible onHide={() => {}}>
        <p>Confirm this action.</p>
      </AppDialog>
    );
    expect(screen.getByRole('dialog').closest('.p-dialog-mask')).toHaveClass(
      'p-dialog-center'
    );
  });

  it('fits mobile task actions to the visual viewport when the keyboard opens', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 480, offsetTop: 0 });
    vi.stubGlobal('visualViewport', viewport);
    render(
      <AppDialog header='Keyboard task' visible task onHide={() => {}}>
        <InputText aria-label='Task field' />
      </AppDialog>
    );
    await waitFor(() =>
      expect(screen.getByText('Keyboard task')).toHaveFocus()
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.getPropertyValue('--task-height')).toBe('480px');
    Object.assign(viewport, { height: 360, offsetTop: 24 });
    act(() => viewport.dispatchEvent(new Event('resize')));
    expect(dialog.style.getPropertyValue('--task-height')).toBe('360px');
    expect(dialog.closest<HTMLElement>('.p-dialog-mask')?.style.top).toBe(
      '24px'
    );
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    act(() => window.dispatchEvent(new Event('resize')));
    expect(dialog.style.getPropertyValue('--task-height')).toBe('');
    expect(dialog.closest<HTMLElement>('.p-dialog-mask')?.style.height).toBe(
      '100%'
    );
  });

  it('keeps task actions outside the scrolling content', () => {
    render(
      <AppDialog
        header='Task'
        visible
        task
        onHide={() => {}}
        footer={<button>Save task</button>}
      >
        <InputText aria-label='Task field' />
      </AppDialog>
    );
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(
      screen
        .getByRole('button', { name: 'Save task' })
        .closest('.p-dialog-footer')
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Save task' })
        .closest('.p-dialog-content')
    ).toBeNull();
  });

  it('focuses the title on mobile without opening the keyboard', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(
      <AppDialog header='Mobile task' visible task onHide={() => {}}>
        <InputText aria-label='Task field' />
      </AppDialog>
    );
    await waitFor(() => expect(screen.getByText('Mobile task')).toHaveFocus());
  });

  it('reveals and focuses an invalid field in a collapsed section', () => {
    const { rerender } = render(
      <AppDialog header='Validate' visible task onHide={() => {}}>
        <details>
          <summary>Optional</summary>
          <InputText aria-label='Invalid field' />
        </details>
      </AppDialog>
    );
    rerender(
      <AppDialog
        header='Validate'
        visible
        task
        validationErrors={{ field: 'Required' }}
        onHide={() => {}}
      >
        <details>
          <summary>Optional</summary>
          <InputText aria-label='Invalid field' aria-invalid='true' />
        </details>
      </AppDialog>
    );
    expect(screen.getByLabelText('Invalid field')).toHaveFocus();
    expect(screen.getByText('Optional').closest('details')).toHaveAttribute(
      'open'
    );
  });
  it('focuses the first enabled input, skipping disabled and read-only ones', async () => {
    render(
      <AppDialog header='Test' visible onHide={() => {}}>
        <InputText aria-label='disabled' disabled />
        <InputText aria-label='readonly' readOnly />
        <InputText aria-label='first-editable' />
        <InputText aria-label='second-editable' />
      </AppDialog>
    );

    await waitFor(() =>
      expect(screen.getByLabelText('first-editable')).toHaveFocus()
    );
  });

  it('focuses a Dropdown when it is the first field', async () => {
    render(
      <AppDialog header='Test' visible onHide={() => {}}>
        <Dropdown
          aria-label='year'
          value='a'
          options={['a', 'b']}
          onChange={() => {}}
        />
        <InputText aria-label='later' />
      </AppDialog>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('later')).not.toHaveFocus();
      expect(document.activeElement?.closest('.p-dropdown')).not.toBeNull();
    });
  });

  it('falls back to default focus when there are no editable fields', async () => {
    render(
      <AppDialog header='Test' visible onHide={() => {}}>
        <p>Just text</p>
      </AppDialog>
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector('.p-dialog-header-close')
      )
    );
  });
});
