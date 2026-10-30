'use client';

import { useEffect, useState } from 'react';
import { AutoComplete } from 'primereact/autocomplete';
import { Message } from 'primereact/message';
import { Button } from 'primereact/button';
import { useKrakenAssetSearch } from '@/hooks/api';
import type { CryptoQuote, KrakenMarket } from '@/lib/types';

export default function CryptoCoinPicker({
  quote,
  onSelect,
  onClear,
}: {
  quote: CryptoQuote;
  onSelect: (market: KrakenMarket) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const search = useKrakenAssetSearch(query, quote);
  const [suggestions, setSuggestions] = useState<KrakenMarket[]>([]);
  useEffect(() => {
    if (search.data) setSuggestions(search.data);
    else if (search.isError) setSuggestions([]);
  }, [search.data, search.isError]);
  return (
    <div className='space-y-2'>
      <label htmlFor='crypto-coin' className='block text-sm font-medium'>
        Coin *
      </label>
      <AutoComplete
        inputId='crypto-coin'
        value={text}
        suggestions={suggestions}
        field='name'
        completeMethod={event => setQuery(event.query)}
        onChange={event => {
          if (typeof event.value === 'string') {
            setText(event.value);
            onClear();
          }
        }}
        onSelect={event => {
          const market: KrakenMarket = event.value;
          setText(`${market.name} (${market.base})`);
          onSelect(market);
        }}
        itemTemplate={(market: KrakenMarket) => (
          <div>
            <strong>{market.name}</strong> · {market.base}
            <div className='text-xs'>Kraken · {market.quote}</div>
          </div>
        )}
        delay={300}
        placeholder='Search Bitcoin, BTC, XBT, SOL…'
        className='w-full'
        inputClassName='w-full'
        appendTo='self'
      />
      {search.isFetching && <p className='text-sm'>Searching Kraken…</p>}
      {search.isError && (
        <div>
          <Message
            severity='error'
            text='Kraken coin search is temporarily unavailable. Your purchase details have not been lost.'
          />
          <Button
            type='button'
            label='Retry search'
            text
            size='small'
            onClick={() => void search.refetch()}
          />
        </div>
      )}
      {query &&
        search.isSuccess &&
        !search.isFetching &&
        search.data.length === 0 && (
          <Message
            severity='info'
            text={`No matching Kraken ${quote} pair. Try the coin ticker or change Paid with. Older trades can be added using CSV import.`}
          />
        )}
      <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
        Search common coin names or any Kraken ticker. Only AUD and USD
        purchases are supported. This does not place an order on Kraken.
      </p>
    </div>
  );
}
