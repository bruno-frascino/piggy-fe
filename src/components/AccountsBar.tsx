'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import type { TradingAccount } from '@/lib/types';

interface AccountsBarProps {
  activeAccounts: TradingAccount[];
  closedAccounts: TradingAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onRenameAccount: (account: TradingAccount) => void;
  onCloseAccount: (account: TradingAccount) => void;
  onDeleteAccount: (account: TradingAccount) => void;
  onReopenAccount: (account: TradingAccount) => void;
  reopenPending?: boolean;
  deletePending?: boolean;
}

export default function AccountsBar({
  activeAccounts,
  closedAccounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onRenameAccount,
  onCloseAccount,
  onDeleteAccount,
  onReopenAccount,
  reopenPending = false,
  deletePending = false,
}: AccountsBarProps) {
  const switcherRef = useRef<Menu>(null);
  const actionMenuRef = useRef<Menu>(null);
  const [manageDialogVisible, setManageDialogVisible] = useState(false);

  const selectedAccount =
    activeAccounts.find(account => account.id === selectedAccountId) ?? null;

  const switcherItems: MenuItem[] = activeAccounts.map(account => ({
    label: account.name,
    icon: account.id === selectedAccountId ? 'pi pi-check' : undefined,
    command: () => onSelectAccount(account.id),
  }));

  const actionMenuItems: MenuItem[] = selectedAccount
    ? [
        {
          label: 'Rename',
          icon: 'pi pi-pencil',
          command: () => onRenameAccount(selectedAccount),
        },
        {
          label: 'Close',
          icon: 'pi pi-lock',
          command: () => onCloseAccount(selectedAccount),
        },
        {
          label: 'Delete permanently',
          icon: 'pi pi-trash',
          command: () => onDeleteAccount(selectedAccount),
        },
      ]
    : [];

  return (
    <div className='sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-2'>
        <div className='flex items-center flex-1 min-w-0'>
          {selectedAccount ? (
            <div className='inline-flex items-center rounded-full border bg-blue-600 text-white border-blue-600 transition select-none shrink-0 max-w-full'>
              <span className='min-h-11 pl-4 pr-2 flex items-center font-medium truncate'>
                {selectedAccount.name}
              </span>
              {activeAccounts.length > 1 && (
                <button
                  type='button'
                  onClick={e => switcherRef.current?.toggle(e)}
                  className='min-h-11 min-w-11 flex items-center justify-center border-l border-blue-500/50 text-white/85 hover:text-white'
                  aria-haspopup='true'
                  aria-label='Switch account'
                  title='Switch account'
                >
                  <i className='pi pi-chevron-down text-xs' />
                </button>
              )}
              <button
                type='button'
                onClick={e => actionMenuRef.current?.toggle(e)}
                className='min-h-11 min-w-11 flex items-center justify-center border-l border-blue-500/50 text-white/85 hover:text-white'
                title='Account actions'
                aria-haspopup='true'
                aria-label={`Actions for account ${selectedAccount.name}`}
              >
                <i className='pi pi-ellipsis-v text-xs' />
              </button>
            </div>
          ) : (
            <span className='text-sm text-gray-500 px-2'>
              No active account
            </span>
          )}
        </div>

        <Button
          type='button'
          icon='pi pi-plus'
          rounded
          severity='success'
          aria-label='Add Account'
          className='!w-11 !h-11 shrink-0'
          onClick={onAddAccount}
        />

        {closedAccounts.length > 0 && (
          <button
            type='button'
            onClick={() => setManageDialogVisible(true)}
            className='min-h-11 min-w-11 flex items-center justify-center text-gray-500 hover:text-blue-600 shrink-0'
            title='Manage closed accounts'
            aria-label='Manage closed accounts'
          >
            <i className='pi pi-cog' />
          </button>
        )}

        <Menu model={switcherItems} popup ref={switcherRef} />
        <Menu model={actionMenuItems} popup ref={actionMenuRef} />
      </div>

      <Dialog
        header='Closed Accounts'
        visible={manageDialogVisible}
        style={{ width: '480px', maxWidth: '95vw' }}
        modal
        onHide={() => setManageDialogVisible(false)}
      >
        {closedAccounts.length === 0 ? (
          <p className='text-sm text-gray-500'>No closed accounts.</p>
        ) : (
          <ul className='divide-y divide-gray-200'>
            {closedAccounts.map(account => (
              <li
                key={account.id}
                className='flex items-center justify-between py-3 gap-3'
              >
                <span className='text-sm text-gray-700 line-through'>
                  {account.name}
                </span>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    label='Reopen'
                    icon='pi pi-refresh'
                    size='small'
                    outlined
                    disabled={reopenPending}
                    onClick={() => onReopenAccount(account)}
                  />
                  <Button
                    type='button'
                    label='Delete'
                    icon='pi pi-trash'
                    size='small'
                    severity='danger'
                    outlined
                    disabled={deletePending}
                    onClick={() => onDeleteAccount(account)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
