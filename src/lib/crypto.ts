import type { AssetType, CryptoQuote } from './types';

const VENUES: Record<string, { name: string; currency: CryptoQuote }> = {
  KRAKEN: { name: 'Kraken', currency: 'AUD' },
  KRAKEN_USD: { name: 'Kraken', currency: 'USD' },
  BINANCE: { name: 'Binance', currency: 'USD' },
  BINANCE_AUD: { name: 'Binance', currency: 'AUD' },
  COINBASE: { name: 'Coinbase', currency: 'USD' },
  COINBASE_AUD: { name: 'Coinbase', currency: 'AUD' },
};

export function isCryptoExchange(code?: string): boolean {
  return Object.hasOwn(VENUES, code ?? '');
}

export function exchangeLabel(code: string): string {
  const venue = isCryptoExchange(code) ? VENUES[code] : undefined;
  return venue ? `${venue.name} (${venue.currency})` : code;
}

export function exchangeCurrency(code?: string): CryptoQuote | undefined {
  return code && isCryptoExchange(code) ? VENUES[code].currency : undefined;
}

export function instrumentType(type?: AssetType, exchange?: string): AssetType {
  return type ?? (isCryptoExchange(exchange) ? 'CRYPTO' : 'EQUITY');
}

export function cryptoQuote(symbol?: string): CryptoQuote {
  return symbol?.endsWith('-USD') ? 'USD' : 'AUD';
}
