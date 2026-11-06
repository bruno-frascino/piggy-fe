import { describe, expect, it } from 'vitest';
import { mutationErrorMessage } from './mutation-error';

describe('mutationErrorMessage', () => {
  it('surfaces server conflict guidance rather than the generic HTTP status', () => {
    expect(
      mutationErrorMessage(
        {
          isAxiosError: true,
          response: {
            status: 409,
            data: { message: 'This trade needs coordinated correction.' },
          },
        },
        'Failed'
      )
    ).toBe('This trade needs coordinated correction.');
  });
  it.each([undefined, null, '', '  ', 123])(
    'ignores malformed conflict messages %#',
    message => {
      expect(
        mutationErrorMessage(
          { isAxiosError: true, response: { status: 409, data: { message } } },
          'Failed'
        )
      ).toBe('Failed');
    }
  );
  it('preserves ordinary errors and does not expose server failure payloads', () => {
    expect(mutationErrorMessage(new Error('Offline'), 'Failed')).toBe(
      'Offline'
    );
    expect(mutationErrorMessage(new Error(''), 'Failed')).toBe('Failed');
    expect(mutationErrorMessage(null, 'Failed')).toBe('Failed');
    expect(
      mutationErrorMessage(
        {
          isAxiosError: true,
          response: { status: 500, data: { message: 'Internal details' } },
        },
        'Failed'
      )
    ).toBe('Failed');
  });
});
