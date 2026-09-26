// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyProvider, usePrivacy } from './privacy-context';
import { MASKED_VALUE } from './format';

describe('usePrivacy', () => {
  it('throws when used outside a PrivacyProvider', () => {
    expect(() => renderHook(() => usePrivacy())).toThrow(
      'usePrivacy must be used within a PrivacyProvider'
    );
  });

  it('defaults to hidden', () => {
    const { result } = renderHook(() => usePrivacy(), {
      wrapper: PrivacyProvider,
    });

    expect(result.current.hidden).toBe(true);
    expect(result.current.mask('$100')).toBe(MASKED_VALUE);
  });

  it('toggle flips visibility and mask reflects it', () => {
    const { result } = renderHook(() => usePrivacy(), {
      wrapper: PrivacyProvider,
    });

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(false);
    expect(result.current.mask('$100')).toBe('$100');

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(true);
  });

  it('hide forces visibility off regardless of current state', () => {
    const { result } = renderHook(() => usePrivacy(), {
      wrapper: PrivacyProvider,
    });

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(false);

    act(() => result.current.hide());
    expect(result.current.hidden).toBe(true);

    act(() => result.current.hide());
    expect(result.current.hidden).toBe(true);
  });
});
