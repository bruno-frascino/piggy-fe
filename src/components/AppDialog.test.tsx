// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { afterEach, describe, expect, it } from 'vitest';
import AppDialog from './AppDialog';

afterEach(cleanup);

describe('AppDialog', () => {
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
