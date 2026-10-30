import { describe, expect, it } from 'vitest';
import {
  cryptoQuote,
  exchangeCurrency,
  exchangeLabel,
  instrumentType,
  isCryptoExchange,
} from './crypto';
import { formatCurrency } from './format';

describe('crypto instrument presentation', () => {
  it.each([
    ['KRAKEN', 'Kraken (AUD)', 'AUD'],
    ['KRAKEN_USD', 'Kraken (USD)', 'USD'],
    ['BINANCE', 'Binance (USD)', 'USD'],
    ['BINANCE_AUD', 'Binance (AUD)', 'AUD'],
    ['COINBASE', 'Coinbase (USD)', 'USD'],
    ['COINBASE_AUD', 'Coinbase (AUD)', 'AUD'],
  ])(
    'mirrors the backend currency registry for %s',
    (code, label, currency) => {
      expect(isCryptoExchange(code)).toBe(true);
      expect(exchangeLabel(code)).toBe(label);
      expect(exchangeCurrency(code)).toBe(currency);
      expect(instrumentType(undefined, code)).toBe('CRYPTO');
    }
  );

  it('preserves ordinary listings and does not invent unsupported venue codes', () => {
    expect(exchangeLabel('ASX')).toBe('ASX');
    expect(exchangeCurrency('ASX')).toBeUndefined();
    expect(isCryptoExchange('KRAKEN_AUD')).toBe(false);
    expect(isCryptoExchange('__proto__')).toBe(false);
    expect(instrumentType(undefined, 'ASX')).toBe('EQUITY');
    expect(instrumentType('ETF', 'NASDAQ')).toBe('ETF');
    expect(cryptoQuote('BTC-USD')).toBe('USD');
    expect(cryptoQuote('BTC-AUD')).toBe('AUD');
    expect(formatCurrency(0.00001234, 'AUD', 12)).toContain('0.00001234');
  });
});
