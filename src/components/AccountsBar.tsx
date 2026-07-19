'use client';

import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
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
  const menuRef = useRef<Menu>(null);
  const [menuAccount, setMenuAccount] = useState<TradingAccount | null>(null);
  const [manageDialogVisible, setManageDialogVisible] = useState(false);

  const openMenu = (event: ReactMouseEvent, account: TradingAccount) => {
    setMenuAccount(account);
    menuRef.current?.toggle(event);
  };

  const menuItems: MenuItem[] = menuAccount
    ? [
        {
          label: 'Rename',
          icon: 'pi pi-pencil',
          command: () => onRenameAccount(menuAccount),
        },
        {
          label: 'Close',
          icon: 'pi pi-lock',
          command: () => onCloseAccount(menuAccount),
        },
        {
          label: 'Delete permanently',
          icon: 'pi pi-trash',
          command: () => onDeleteAccount(menuAccount),
        },
      ]
    : [];

  return (
    <div className='sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto px-4 py-2 flex items-center gap-2'>
        <div className='flex items-center gap-2 flex-wrap flex-1 min-w-0'>
          {activeAccounts.map(account => {
            const isSelected = selectedAccountId === account.id;
            return (
              <div
                key={account.id}
                className={`inline-flex items-center rounded-full border transition select-none shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => onSelectAccount(account.id)}
                  className='min-h-11 px-4 flex items-center'
                  aria-pressed={isSelected}
                >
                  {account.name}
                </button>
                <button
                  type='button'
                  onClick={e => openMenu(e, account)}
                  className={`min-h-11 min-w-11 flex items-center justify-center border-l ${
                    isSelected
                      ? 'border-blue-500/50 text-white/85 hover:text-white'
                      : 'border-gray-300 text-gray-500 hover:text-blue-600'
                  }`}
                  title='Account actions'
                  aria-haspopup='true'
                  aria-label={`Actions for account ${account.name}`}
                >
                  <i className='pi pi-ellipsis-v text-xs' />
                </button>
              </div>
            );
          })}
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

        <Menu
          model={menuItems}
          popup
          ref={menuRef}
          onHide={() => setMenuAccount(null)}
        />
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
