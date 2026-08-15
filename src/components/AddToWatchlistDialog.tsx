'use client';

import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useState } from 'react';
import {
  useAddWatchlistItem,
  useCreateWatchlist,
  useWatchlists,
} from '@/hooks/api';
import { useToast } from '@/lib/toast-context';
import type { ScreenerResult } from '@/lib/types';

interface AddToWatchlistDialogProps {
  visible: boolean;
  stock: ScreenerResult | null;
  onHide: () => void;
}

/** Lets the user add a screened stock to an existing watchlist or a brand-new one. */
export default function AddToWatchlistDialog({
  visible,
  stock,
  onHide,
}: AddToWatchlistDialogProps) {
  const { data: watchlists } = useWatchlists();
  const { mutateAsync: addItem, isPending: addPending } = useAddWatchlistItem();
  const { mutateAsync: createWatchlist, isPending: createPending } =
    useCreateWatchlist();
  const { show: showToast } = useToast();
  const [newWatchlistName, setNewWatchlistName] = useState('');

  if (!stock) return null;

  async function handleAdd(watchlistId: string) {
    if (!stock) return;
    try {
      await addItem({
        watchlistId,
        item: {
          symbol: stock.symbol,
          exchangeCode: stock.exchange ?? '',
          name: stock.name,
          sector: stock.sector ?? undefined,
          industry: stock.industry ?? undefined,
          marketCap: stock.marketCap ?? undefined,
        },
      });
      showToast({
        severity: 'success',
        summary: 'Added to watchlist',
        detail: `${stock.symbol} added`,
      });
      onHide();
    } catch {
      showToast({
        severity: 'error',
        summary: 'Could not add stock',
        detail: 'Please try again',
      });
    }
  }

  async function handleCreateAndAdd() {
    const name = newWatchlistName.trim();
    if (!name) return;
    try {
      const created = await createWatchlist(name);
      if (created) {
        await handleAdd(created.id);
        setNewWatchlistName('');
      }
    } catch {
      showToast({
        severity: 'error',
        summary: 'Could not create watchlist',
        detail: 'Please try again',
      });
    }
  }

  return (
    <Dialog
      header={`Add ${stock.symbol} to watchlist`}
      visible={visible}
      onHide={onHide}
      style={{ width: '28rem', maxWidth: '95vw' }}
    >
      <div className='flex flex-col gap-2'>
        {(watchlists ?? []).length === 0 && (
          <p className='text-sm text-gray-500'>
            You don&apos;t have any watchlists yet.
          </p>
        )}
        {(watchlists ?? []).map(watchlist => (
          <Button
            key={watchlist.id}
            label={watchlist.name}
            className='!justify-start'
            outlined
            disabled={addPending}
            onClick={() => handleAdd(watchlist.id)}
          />
        ))}

        <div className='flex items-center gap-2 mt-3'>
          <InputText
            value={newWatchlistName}
            onChange={e => setNewWatchlistName(e.target.value)}
            placeholder='New watchlist name'
            className='flex-1'
          />
          <Button
            label='Create & add'
            icon='pi pi-plus'
            disabled={!newWatchlistName.trim() || createPending || addPending}
            onClick={handleCreateAndAdd}
          />
        </div>
      </div>
    </Dialog>
  );
}
