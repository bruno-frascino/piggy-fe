'use client';

import { useState } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import {
  useCreateWatchlist,
  useDeleteWatchlist,
  useRemoveWatchlistItem,
  useRenameWatchlist,
  useWatchlistDetail,
  useWatchlists,
} from '@/hooks/api';
import { useToast } from '@/lib/toast-context';
import type { Watchlist } from '@/lib/types';

function WatchlistItems({ watchlistId }: { watchlistId: string }) {
  const { data: detail, isLoading } = useWatchlistDetail(watchlistId);
  const { mutateAsync: removeItem } = useRemoveWatchlistItem();
  const { show: showToast } = useToast();

  if (isLoading) return <p className='text-sm text-gray-500'>Loading...</p>;
  if (!detail || detail.items.length === 0) {
    return <p className='text-sm text-gray-500'>No stocks added yet.</p>;
  }

  return (
    <div className='flex flex-col gap-2'>
      {detail.items.map(item => (
        <div
          key={item.id}
          className='flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0'
        >
          <div className='min-w-0'>
            <span className='font-semibold'>{item.symbol}</span>
            <span className='text-sm text-gray-500 ml-2 truncate'>
              {item.name}
            </span>
          </div>
          <Button
            icon='pi pi-times'
            rounded
            text
            severity='danger'
            aria-label={`Remove ${item.symbol}`}
            onClick={async () => {
              try {
                await removeItem({ watchlistId, itemId: item.id });
              } catch {
                showToast({
                  severity: 'error',
                  summary: 'Could not remove item',
                });
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** "My Watchlists" tab: create/rename/delete named watchlists and manage their items. */
export default function WatchlistsPanel() {
  const { data: watchlists, isLoading } = useWatchlists();
  const { mutateAsync: createWatchlist, isPending: creating } =
    useCreateWatchlist();
  const { mutateAsync: renameWatchlist } = useRenameWatchlist();
  const { mutateAsync: deleteWatchlist } = useDeleteWatchlist();
  const { show: showToast } = useToast();

  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<Watchlist | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createWatchlist(name);
      setNewName('');
    } catch {
      showToast({
        severity: 'error',
        summary: 'Could not create watchlist',
        detail: 'A watchlist with this name may already exist',
      });
    }
  }

  async function handleRename() {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameWatchlist({ id: renaming.id, name });
      setRenaming(null);
    } catch {
      showToast({ severity: 'error', summary: 'Could not rename watchlist' });
    }
  }

  async function handleDelete(watchlist: Watchlist) {
    try {
      await deleteWatchlist(watchlist.id);
    } catch {
      showToast({ severity: 'error', summary: 'Could not delete watchlist' });
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <InputText
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder='New watchlist name'
          className='flex-1'
        />
        <Button
          label='Create'
          icon='pi pi-plus'
          disabled={!newName.trim() || creating}
          onClick={handleCreate}
        />
      </div>

      {isLoading && <p className='text-sm text-gray-500'>Loading...</p>}
      {!isLoading && (watchlists ?? []).length === 0 && (
        <p className='text-sm text-gray-500 py-6 text-center'>
          You don&apos;t have any watchlists yet — create one above.
        </p>
      )}

      {(watchlists ?? []).length > 0 && (
        <Accordion>
          {(watchlists ?? []).map(watchlist => (
            <AccordionTab
              key={watchlist.id}
              header={
                <div className='flex items-center justify-between w-full pr-2'>
                  <span>
                    {watchlist.name}
                    {typeof watchlist.itemCount === 'number' && (
                      <span className='text-xs text-gray-400 ml-2'>
                        ({watchlist.itemCount})
                      </span>
                    )}
                  </span>
                  <span className='flex items-center gap-1'>
                    <Button
                      icon='pi pi-pencil'
                      rounded
                      text
                      aria-label={`Rename ${watchlist.name}`}
                      onClick={e => {
                        e.stopPropagation();
                        setRenaming(watchlist);
                        setRenameValue(watchlist.name);
                      }}
                    />
                    <Button
                      icon='pi pi-trash'
                      rounded
                      text
                      severity='danger'
                      aria-label={`Delete ${watchlist.name}`}
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(watchlist);
                      }}
                    />
                  </span>
                </div>
              }
            >
              <WatchlistItems watchlistId={watchlist.id} />
            </AccordionTab>
          ))}
        </Accordion>
      )}

      <Dialog
        header='Rename watchlist'
        visible={Boolean(renaming)}
        onHide={() => setRenaming(null)}
        style={{ width: '24rem', maxWidth: '95vw' }}
      >
        <div className='flex items-center gap-2'>
          <InputText
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            className='flex-1'
          />
          <Button label='Save' onClick={handleRename} />
        </div>
      </Dialog>
    </div>
  );
}
