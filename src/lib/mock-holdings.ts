// Mock holdings data per exchange
// Each holding represents a position in a stock symbol.
// This is mock data; replace with real API data later.

export interface HoldingPosition {
  symbol: string;
  name: string;
  openDate: string; // ISO date string
  units: number;
  buyPrice: number; // price per unit at purchase
  buyFee: number; // total fee paid on purchase
  stopLoss: number; // stop loss price per unit
  industry: string;
  currentPrice: number; // latest market price per unit
}

export interface ExchangeHoldings {
  exchange: string;
  holdings: HoldingPosition[];
}

// Helper to make dates (n days ago)
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const mockHoldings: ExchangeHoldings[] = [
  {
    exchange: 'Binance',
    holdings: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        openDate: daysAgo(45),
        units: 40,
        buyPrice: 175.2,
        buyFee: 5.5,
        stopLoss: 150,
        industry: 'Technology',
        currentPrice: 189.4,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        openDate: daysAgo(60),
        units: 25,
        buyPrice: 322.1,
        buyFee: 4.1,
        stopLoss: 290,
        industry: 'Technology',
        currentPrice: 334.9,
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        openDate: daysAgo(20),
        units: 18,
        buyPrice: 245.8,
        buyFee: 3.3,
        stopLoss: 220,
        industry: 'Automotive',
        currentPrice: 238.6,
      },
    ],
  },
  {
    exchange: 'Coinbase',
    holdings: [
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        openDate: daysAgo(90),
        units: 12,
        buyPrice: 132.3,
        buyFee: 2.4,
        stopLoss: 115,
        industry: 'Communication Services',
        currentPrice: 138.9,
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        openDate: daysAgo(15),
        units: 10,
        buyPrice: 452.6,
        buyFee: 2.9,
        stopLoss: 400,
        industry: 'Semiconductors',
        currentPrice: 468.1,
      },
    ],
  },
  {
    exchange: 'Kraken',
    holdings: [
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        openDate: daysAgo(30),
        units: 22,
        buyPrice: 128.4,
        buyFee: 3.1,
        stopLoss: 110,
        industry: 'Consumer Discretionary',
        currentPrice: 133.2,
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        openDate: daysAgo(70),
        units: 14,
        buyPrice: 301.9,
        buyFee: 2.7,
        stopLoss: 270,
        industry: 'Communication Services',
        currentPrice: 314.5,
      },
      {
        symbol: 'INTC',
        name: 'Intel Corp.',
        openDate: daysAgo(10),
        units: 50,
        buyPrice: 34.2,
        buyFee: 4.9,
        stopLoss: 30,
        industry: 'Semiconductors',
        currentPrice: 33.1,
      },
    ],
  },
];

export const getHoldingsForExchange = (name: string): HoldingPosition[] => {
  return mockHoldings.find(h => h.exchange === name)?.holdings ?? [];
};
