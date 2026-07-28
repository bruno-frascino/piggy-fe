import { createHttpClient } from './api/http';
import { createAuthApi } from './api/auth';
import { createAccountsApi } from './api/accounts';
import { createUserApi } from './api/user';
import { createPortfolioApi } from './api/portfolio';
import { createPositionsApi } from './api/positions';
import { createStocksApi } from './api/stocks';
import { createTaxReportsApi } from './api/tax-reports';

// Thin facade preserving the historical flat `apiClient.<method>()` surface
// while the actual implementation lives in domain modules under `./api/`.
// See src/lib/api/ for auth, accounts, user, portfolio, positions, stocks,
// tax-reports and the shared axios http client + response mappers.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const httpClient = createHttpClient(API_BASE_URL);

export const apiClient = {
  ...createAuthApi(httpClient),
  ...createAccountsApi(httpClient),
  ...createUserApi(httpClient),
  ...createPortfolioApi(httpClient),
  ...createPositionsApi(httpClient),
  ...createStocksApi(httpClient),
  ...createTaxReportsApi(httpClient),
};
