'use client';

import { useEffect, useState } from 'react';
import Dialog from './AppDialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { AutoComplete } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';
import CryptoCoinPicker from './CryptoCoinPicker';
import { useExchanges } from '@/hooks/api';
import {
  cryptoQuote,
  exchangeCurrency,
  exchangeLabel,
  instrumentType,
  isCryptoExchange,
} from '@/lib/crypto';
import type { CryptoQuote } from '@/lib/types';
import type { HoldingPosition } from '@/lib/types';
import type { StockSearchResult } from '@/lib/types';
import { useSymbolSearch } from '@/hooks/useSymbolSearch';
import { useAccountNameSuggestions } from '@/hooks/useAccountNameSuggestions';

export type LocalHolding = Omit<
  HoldingPosition,
  'stopLoss' | 'currentPrice' | 'maxDrawdownPercent'
> & {
  stopLoss?: number;
  currentPrice?: number;
  accountName?: string;
  exchangeCode?: string;
  buyComments?: string;
  /** null = explicitly cleared; undefined = not changed (edit) or not set (add) */
  maxDrawdownPercent?: number | null;
};

export default function AddHoldingsDialog({
  visible,
  mode = 'add',
  initial,
  accountName,
  lockAccount = false,
  exchangeCode,
  onHide,
  onSubmit,
  onDelete,
  onImport,
  onCorrectAcquisition,
  busy = false,
  error,
}: {
  visible: boolean;
  mode?: 'add' | 'edit';
  initial?: Partial<LocalHolding>;
  accountName?: string;
  lockAccount?: boolean;
  exchangeCode?: string;
  onHide: () => void;
  onSubmit: (value: LocalHolding) => void;
  onDelete?: () => void;
  onImport?: () => void;
  onCorrectAcquisition?: () => void;
  busy?: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<Partial<LocalHolding>>({
    openDate: new Date().toISOString().slice(0, 10),
    units: 0,
    buyPrice: 0,
    buyFee: 0,
    stopLoss: undefined,
    accountName: accountName ?? 'Main',
    exchangeCode: exchangeCode ?? '',
    symbol: '',
    name: '',
    industry: '',
    buyComments: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const auditedAcquisition =
    mode === 'edit' && Boolean(initial?.acquisitionCorrection);
  const { symbolSuggestions, setSymbolSuggestions, searchSymbol } =
    useSymbolSearch();
  const { accountSuggestions, searchAccount, resetAccountSuggestions } =
    useAccountNameSuggestions(visible, exchangeCode);
  const [manualSymbol, setManualSymbol] = useState(false);
  const [stockSelected, setStockSelected] = useState(false);
  const [crypto, setCrypto] = useState(false);
  const [quote, setQuote] = useState<CryptoQuote>('AUD');
  const equityExchanges = useExchanges(
    'equity',
    visible && manualSymbol && !crypto
  );
  const coin = form.symbol?.split('-')[0] ?? '';
  const currency = crypto ? cryptoQuote(form.symbol || `COIN-${quote}`) : '';

  // Load initial values when dialog opens or mode changes
  useEffect(() => {
    if (!visible) return;
    const base: Partial<LocalHolding> = {
      symbol: (initial?.symbol ?? '').toUpperCase(),
      name: '',
      industry: '',
      openDate: new Date().toISOString().slice(0, 10),
      units: 0,
      buyPrice: 0,
      buyFee: 0,
      stopLoss: undefined,
      accountName: accountName ?? 'Main',
      exchangeCode: exchangeCode ?? '',
      buyComments: '',
      ...initial,
    };
    const initialQuote = initial?.symbol
      ? cryptoQuote(initial.symbol)
      : (exchangeCurrency(initial?.exchangeCode ?? exchangeCode) ?? 'AUD');
    if (mode === 'add' && isCryptoExchange(base.exchangeCode)) {
      base.exchangeCode = initialQuote === 'USD' ? 'KRAKEN_USD' : 'KRAKEN';
    }
    setForm(base);
    setErrors({});
    setSymbolSuggestions([]);
    resetAccountSuggestions();
    setManualSymbol(false);
    setStockSelected(Boolean(initial?.symbol && initial?.exchangeCode));
    setCrypto(
      instrumentType(
        initial?.assetType,
        initial?.exchangeCode ?? exchangeCode
      ) === 'CRYPTO'
    );
    setQuote(initialQuote);
  }, [visible, mode, initial, accountName]);

  const handleSymbolSelect = (result: StockSearchResult) => {
    setStockSelected(true);
    setForm(f => ({
      ...f,
      symbol: result.symbol,
      name: result.name,
      exchangeCode: result.exchange,
      assetType: /etf/i.test(result.type) ? 'ETF' : 'EQUITY',
    }));
  };

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    const required: (keyof HoldingPosition)[] = [
      'symbol',
      'openDate',
      'units',
      'buyPrice',
    ];
    required.forEach(k => {
      const v = form[k as keyof LocalHolding];
      if (
        v === undefined ||
        v === null ||
        (typeof v === 'string' && v.trim() === '')
      ) {
        e[k as string] = 'Required';
      }
    });
    if (typeof form.units !== 'number' || isNaN(form.units!))
      e.units = 'Enter a number';
    else if (form.units <= 0) e.units = 'Enter units greater than 0';
    if (typeof form.buyPrice !== 'number' || isNaN(form.buyPrice!))
      e.buyPrice = 'Enter a number';
    if (!/\d{4}-\d{2}-\d{2}/.test(form.openDate ?? ''))
      e.openDate = 'Enter a valid date (DD/MM/YYYY)';

    const resolvedExchange =
      form.exchangeCode?.trim() || exchangeCode?.trim() || '';
    if (!resolvedExchange) {
      e.symbol = 'Select a symbol from search so exchange can be detected';
    }
    if (
      mode === 'add' &&
      !crypto &&
      !manualSymbol &&
      form.symbol &&
      !stockSelected
    ) {
      e.symbol =
        'Choose a stock from search, or enter it manually and choose its exchange.';
    }
    if (crypto && (!form.symbol || !isCryptoExchange(resolvedExchange))) {
      e.symbol = 'Choose a coin from Kraken search before saving.';
    }
    if (!crypto && isCryptoExchange(resolvedExchange)) {
      e.symbol = 'Choose a stock exchange, or switch to Crypto.';
    }
    if (form.buyPrice !== undefined && form.buyPrice <= 0)
      e.buyPrice = 'Enter a price greater than 0';

    setErrors(e);
    if (Object.keys(e).length) return;

    const value: LocalHolding = {
      symbol: form.symbol!,
      assetType: crypto ? 'CRYPTO' : (form.assetType ?? 'EQUITY'),
      name: form.name ?? '',
      openDate: form.openDate!,
      units: form.units!,
      buyPrice: form.buyPrice!,
      buyFee: form.buyFee ?? 0,
      // 0 / cleared both mean "no stop loss".
      stopLoss:
        typeof form.stopLoss === 'number' && form.stopLoss > 0
          ? form.stopLoss
          : undefined,
      accountName: form.accountName?.trim() || 'Main',
      exchangeCode: (
        form.exchangeCode?.trim() ||
        exchangeCode?.trim() ||
        ''
      ).toUpperCase(),
      industry: form.industry ?? '',
      // Current price should come from quotes API; use buy price only as fallback.
      currentPrice: form.buyPrice!,
      buyComments: form.buyComments?.trim() || undefined,
    };
    onSubmit(value);
  };

  return (
    <Dialog
      header={mode === 'edit' ? 'Edit Position' : 'Add Position'}
      visible={visible}
      style={{ width: '640px', maxWidth: '95vw' }}
      task
      validationErrors={errors}
      footer={
        <div className='task-actions'>
          {mode === 'edit' && onDelete && !auditedAcquisition && (
            <Button
              className='task-delete'
              label='Delete'
              icon='pi pi-trash'
              severity='danger'
              text
              onClick={onDelete}
              disabled={busy}
            />
          )}
          <Button
            label='Cancel'
            severity='secondary'
            outlined
            onClick={onHide}
            disabled={busy}
          />
          <Button
            label={mode === 'edit' ? 'Save' : 'Add Position'}
            loading={busy}
            icon={mode === 'edit' ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
          />
        </div>
      }
      modal
      blockScroll
      onHide={onHide}
    >
      <div className='space-y-4'>
        {auditedAcquisition && (
          <div className='space-y-2'>
            <Message
              severity='info'
              text='This purchase is cash-linked. Financial changes require an audited acquisition correction; notes and trading metadata remain editable here.'
            />
            {onCorrectAcquisition && (
              <Button
                label='Correct acquisition'
                outlined
                onClick={onCorrectAcquisition}
                disabled={busy}
              />
            )}
          </div>
        )}
        {error && <Message severity='error' text={error} />}
        {mode === 'add' && (
          <div>
            <label
              id='investment-type-label'
              className='block text-sm font-medium mb-1'
            >
              Investment type
            </label>
            <SelectButton
              className='segmented-control'
              aria-labelledby='investment-type-label'
              allowEmpty={false}
              value={crypto ? 'crypto' : 'stocks'}
              options={[
                { label: 'Shares / ETFs', value: 'stocks' },
                { label: 'Crypto', value: 'crypto' },
              ]}
              onChange={event => {
                const nextCrypto = event.value === 'crypto';
                setCrypto(nextCrypto);
                setManualSymbol(false);
                setStockSelected(false);
                setErrors({});
                setForm(f => ({
                  ...f,
                  symbol: '',
                  name: '',
                  assetType: nextCrypto ? 'CRYPTO' : 'EQUITY',
                  exchangeCode: nextCrypto
                    ? quote === 'AUD'
                      ? 'KRAKEN'
                      : 'KRAKEN_USD'
                    : '',
                }));
              }}
            />
            {onImport && (
              <Button
                type='button'
                label='Import Kraken CSVs instead'
                text
                onClick={onImport}
              />
            )}
          </div>
        )}
        {/* Row 1: Trading Account */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12'>
            {lockAccount || auditedAcquisition ? (
              <p className='task-summary'>
                Account <strong>{form.accountName ?? 'Main'}</strong>
              </p>
            ) : (
              <>
                <label className='block text-sm font-medium mb-1'>
                  Account
                </label>
                <AutoComplete
                  value={form.accountName ?? 'Main'}
                  suggestions={accountSuggestions}
                  completeMethod={searchAccount}
                  onChange={e =>
                    setForm(f => ({ ...f, accountName: String(e.value ?? '') }))
                  }
                  dropdown
                  forceSelection={false}
                  placeholder='Main'
                  className='w-full'
                  inputClassName='w-full'
                  appendTo='self'
                />
              </>
            )}
          </div>
        </div>

        {/* Row 2: Symbol, Name */}
        {crypto ? (
          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium mb-1'>
                  Bought on
                </label>
                <InputText
                  value={exchangeLabel(
                    form.exchangeCode ||
                      (quote === 'AUD' ? 'KRAKEN' : 'KRAKEN_USD')
                  ).replace(/ \((AUD|USD)\)$/, '')}
                  readOnly
                  className='w-full'
                  aria-label='Bought on'
                />
              </div>
              <div>
                <label
                  id='crypto-quote-label'
                  className='block text-sm font-medium mb-1'
                >
                  Paid with
                </label>
                <SelectButton
                  className='segmented-control'
                  aria-labelledby='crypto-quote-label'
                  allowEmpty={false}
                  value={quote}
                  disabled={mode === 'edit'}
                  options={['AUD', 'USD']}
                  onChange={event => {
                    const next: CryptoQuote = event.value;
                    setQuote(next);
                    setForm(f => ({
                      ...f,
                      symbol: '',
                      name: '',
                      exchangeCode: next === 'AUD' ? 'KRAKEN' : 'KRAKEN_USD',
                    }));
                  }}
                />
              </div>
            </div>
            {mode === 'add' ? (
              <CryptoCoinPicker
                key={`${quote}-${visible}`}
                quote={quote}
                onClear={() => setForm(f => ({ ...f, symbol: '', name: '' }))}
                onSelect={market =>
                  setForm(f => ({
                    ...f,
                    symbol: market.symbol,
                    name: market.name,
                    exchangeCode: market.exchangeCode,
                    assetType: 'CRYPTO',
                  }))
                }
              />
            ) : (
              <p>
                {form.name} · {coin} · {currency}
              </p>
            )}
            <Message
              severity='info'
              text='Each purchase creates a separate position. If you plan to import these trades later, use CSV import instead to avoid recording the same purchase twice.'
            />
            {errors.symbol && <Message severity='error' text={errors.symbol} />}
          </div>
        ) : (
          <div className='grid grid-cols-12 gap-3'>
            <div className='col-span-12'>
              <label
                htmlFor='position-symbol'
                className='block text-sm font-medium mb-1'
              >
                Symbol *
              </label>
              {mode === 'add' ? (
                <>
                  {manualSymbol ? (
                    <InputText
                      id='position-symbol'
                      aria-invalid={Boolean(errors.symbol)}
                      value={(form.symbol ?? '').toUpperCase()}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          symbol: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder='e.g. AAPL'
                      className='w-full uppercase'
                    />
                  ) : (
                    <AutoComplete
                      inputId='position-symbol'
                      invalid={Boolean(errors.symbol)}
                      value={form.symbol ?? ''}
                      suggestions={symbolSuggestions}
                      completeMethod={searchSymbol}
                      field='symbol'
                      itemTemplate={(item: StockSearchResult) => (
                        <div className='flex flex-col py-1'>
                          <div>
                            <span className='font-semibold'>{item.symbol}</span>
                            <span className='text-xs ml-2 text-gray-400'>
                              {item.exchange}
                            </span>
                          </div>
                          <span className='text-sm text-gray-500'>
                            {item.name}
                          </span>
                        </div>
                      )}
                      onChange={e => {
                        const v = e.value as unknown;
                        if (typeof v === 'string') {
                          setStockSelected(false);
                          setForm(f => ({
                            ...f,
                            symbol: v.toUpperCase(),
                            exchangeCode: '',
                            name: '',
                          }));
                        }
                      }}
                      onSelect={e =>
                        handleSymbolSelect(e.value as StockSearchResult)
                      }
                      placeholder='Search symbol…'
                      className='w-full'
                      inputClassName='w-full uppercase'
                      delay={0}
                      appendTo='self'
                      scrollHeight='240px'
                    />
                  )}
                  <button
                    type='button'
                    className='text-xs text-blue-500 hover:underline mt-1 block'
                    onClick={() => {
                      setManualSymbol(m => !m);
                      setSymbolSuggestions([]);
                    }}
                  >
                    {manualSymbol
                      ? '← Search symbol'
                      : "Can't find it? Enter manually"}
                  </button>
                  {(form.exchangeCode || exchangeCode) && (
                    <p className='text-xs text-gray-500 mt-1'>
                      Exchange:{' '}
                      {(form.exchangeCode || exchangeCode || '').toUpperCase()}
                    </p>
                  )}
                  {manualSymbol && (
                    <div className='mt-2'>
                      <label
                        htmlFor='manual-exchange'
                        className='block text-sm'
                      >
                        Stock exchange
                      </label>
                      <Dropdown
                        inputId='manual-exchange'
                        value={form.exchangeCode || null}
                        options={equityExchanges.data ?? []}
                        optionLabel='name'
                        optionValue='code'
                        placeholder='Choose stock exchange'
                        loading={equityExchanges.isFetching}
                        onChange={event =>
                          setForm(f => ({ ...f, exchangeCode: event.value }))
                        }
                      />
                      {equityExchanges.isError && (
                        <Message
                          severity='error'
                          text='Could not load stock exchanges. Try symbol search or reopen this form.'
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <InputText
                  id='position-symbol'
                  readOnly={auditedAcquisition}
                  aria-invalid={Boolean(errors.symbol)}
                  value={(form.symbol ?? '').toUpperCase()}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      symbol: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder='e.g. AAPL'
                  className='w-full uppercase'
                />
              )}
              {errors.symbol && (
                <p className='text-xs text-red-600 mt-1'>{errors.symbol}</p>
              )}
            </div>
            {form.name && (
              <p className='col-span-12 text-sm text-gray-500'>{form.name}</p>
            )}
          </div>
        )}
        {/* Row 3: Open Date, Units, Industry */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 sm:col-span-6'>
            <label
              htmlFor='position-date'
              className='block text-sm font-medium mb-1'
            >
              {crypto ? 'Purchase date *' : 'Open Date *'}
            </label>
            <Calendar
              inputId='position-date'
              disabled={auditedAcquisition}
              invalid={Boolean(errors.openDate)}
              value={(() => {
                const parts = (form.openDate ?? '').split('-').map(Number);
                return parts.length === 3 && parts[0] > 0
                  ? new Date(parts[0], parts[1] - 1, parts[2])
                  : null;
              })()}
              onChange={e => {
                const d = e.value as Date | null;
                if (d) {
                  const y = d.getFullYear();
                  const mo = String(d.getMonth() + 1).padStart(2, '0');
                  const dy = String(d.getDate()).padStart(2, '0');
                  setForm(f => ({ ...f, openDate: `${y}-${mo}-${dy}` }));
                } else {
                  setForm(f => ({ ...f, openDate: '' }));
                }
              }}
              dateFormat='dd/mm/yy'
              mask='99/99/9999'
              readOnlyInput={false}
              inputRef={input => {
                if (input) input.inputMode = 'numeric';
              }}
              showIcon
              placeholder='DD/MM/YYYY'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.openDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.openDate}</p>
            )}
          </div>
          <div className='col-span-12 sm:col-span-6'>
            <label
              htmlFor='position-units'
              className='block text-sm font-medium mb-1'
            >
              {crypto ? `Quantity${coin ? ` (${coin})` : ''} *` : 'Units *'}
            </label>
            <InputNumber
              disabled={auditedAcquisition}
              value={form.units ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, units: (e.value ?? 0) as number }))
              }
              mode='decimal'
              inputId='position-units'
              invalid={Boolean(errors.units)}
              minFractionDigits={0}
              maxFractionDigits={crypto ? 12 : 6}
              placeholder='e.g. 10.5'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.units && (
              <p className='text-xs text-red-600 mt-1'>{errors.units}</p>
            )}
          </div>
        </div>

        {/* Row 4: Buy Price, Buy Fee, Stop Loss */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 sm:col-span-6'>
            <label
              htmlFor='position-price'
              className='block text-sm font-medium mb-1'
            >
              {crypto ? `Price per coin (${currency}) *` : 'Buy Price *'}
            </label>
            <InputNumber
              inputId='position-price'
              disabled={auditedAcquisition}
              invalid={Boolean(errors.buyPrice)}
              value={form.buyPrice ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, buyPrice: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={crypto ? 12 : 3}
              placeholder='e.g. 175.250'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyPrice}</p>
            )}
          </div>
          <div className='col-span-12 sm:col-span-6'>
            <label
              htmlFor='position-fee'
              className='block text-sm font-medium mb-1'
            >
              {crypto ? `Purchase fees (${currency})` : 'Buy Fee'}
            </label>
            <InputNumber
              inputId='position-fee'
              disabled={auditedAcquisition}
              value={form.buyFee ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, buyFee: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={crypto ? 8 : 3}
              placeholder='e.g. 5.500'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyFee && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyFee}</p>
            )}
          </div>
        </div>
        {crypto && (
          <p className='task-summary' role='status'>
            Total purchase cost:{' '}
            {(
              (form.units ?? 0) * (form.buyPrice ?? 0) +
              (form.buyFee ?? 0)
            ).toLocaleString('en-AU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 8,
            })}{' '}
            {currency}
          </p>
        )}
        <details className='optional-fields'>
          <summary>Risk settings and notes (optional)</summary>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='position-stop-loss'
                className='block text-sm font-medium mb-1'
              >
                {crypto ? `Stop Loss (${currency})` : 'Stop Loss'}
              </label>
              <InputNumber
                inputId='position-stop-loss'
                value={form.stopLoss ?? null}
                onValueChange={e =>
                  setForm(f => ({
                    ...f,
                    stopLoss: typeof e.value === 'number' ? e.value : undefined,
                  }))
                }
                mode='decimal'
                minFractionDigits={0}
                maxFractionDigits={crypto ? 12 : 3}
                placeholder='e.g. 150.000'
                className='w-full'
                inputClassName='w-full'
              />
              {errors.stopLoss && (
                <p className='text-xs text-red-600 mt-1'>{errors.stopLoss}</p>
              )}
            </div>

            {/* Row 5: Buy Comments */}
            <div>
              <label
                htmlFor='position-comments'
                className='block text-sm font-medium mb-1'
              >
                Buy Comments
              </label>
              <InputTextarea
                id='position-comments'
                autoResize
                style={{ maxHeight: '200px' }}
                value={form.buyComments ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm(f => ({ ...f, buyComments: e.target.value }))
                }
                rows={3}
                className='w-full position-comments'
                placeholder='Optional notes for this purchase'
              />
            </div>
          </div>
        </details>
        {!crypto && (
          <details className='optional-fields'>
            <summary>Asset details (optional)</summary>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div>
                <label
                  htmlFor='position-name'
                  className='block text-sm font-medium mb-1'
                >
                  Name
                </label>
                <InputText
                  id='position-name'
                  value={form.name ?? ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='Company name'
                  className='w-full'
                />
              </div>
              <div>
                <label
                  htmlFor='position-industry'
                  className='block text-sm font-medium mb-1'
                >
                  Industry
                </label>
                <InputText
                  id='position-industry'
                  value={form.industry ?? ''}
                  onChange={e =>
                    setForm(f => ({ ...f, industry: e.target.value }))
                  }
                  placeholder='Sector'
                  className='w-full'
                />
              </div>
            </div>
          </details>
        )}
      </div>
    </Dialog>
  );
}
