'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { clearClientSession } from '@/lib/session';
import { usePrivacy } from '@/lib/privacy-context';
import {
  useCurrentUser,
  useDeleteCurrentUser,
  useUpdateCurrentUser,
} from '@/hooks/api';

const POPULAR_CURRENCY_OPTIONS = [
  { label: 'USD - US Dollar', value: 'USD' },
  { label: 'EUR - Euro', value: 'EUR' },
  { label: 'JPY - Japanese Yen', value: 'JPY' },
  { label: 'GBP - British Pound', value: 'GBP' },
  { label: 'CNY - Chinese Yuan', value: 'CNY' },
  { label: 'AUD - Australian Dollar', value: 'AUD' },
  { label: 'CAD - Canadian Dollar', value: 'CAD' },
  { label: 'CHF - Swiss Franc', value: 'CHF' },
  { label: 'INR - Indian Rupee', value: 'INR' },
  { label: 'BRL - Brazilian Real', value: 'BRL' },
];

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hide: hidePrivacy } = usePrivacy();
  const { data: user, isLoading } = useCurrentUser();
  const updateUser = useUpdateCurrentUser();
  const deleteUser = useDeleteCurrentUser();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('AUD');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setBaseCurrency((user.baseCurrency ?? 'AUD').toUpperCase());
  }, [user]);

  const profileDirty = useMemo(() => {
    if (!user) return false;
    return (
      name.trim() !== (user.name ?? '').trim() ||
      baseCurrency.trim().toUpperCase() !==
        (user.baseCurrency ?? 'AUD').trim().toUpperCase()
    );
  }, [user, name, baseCurrency]);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const nextName = name.trim();
    const nextCurrency = baseCurrency.trim().toUpperCase();

    if (!nextName) {
      setProfileError('Name is required.');
      return;
    }

    if (!/^[A-Z]{3}$/.test(nextCurrency)) {
      setProfileError('Base currency must be a 3-letter code (e.g. USD).');
      return;
    }

    try {
      await updateUser.mutateAsync({
        name: nextName,
        baseCurrency: nextCurrency,
      });
      setProfileSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setProfileError(
        error.response?.data?.message || 'Unable to update profile.'
      );
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      await updateUser.mutateAsync({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPasswordError(
        error.response?.data?.message || 'Unable to update password.'
      );
    }
  };

  const onDeleteAccount = async (password: string) => {
    setDeleteError('');

    try {
      await deleteUser.mutateAsync(password);
      hidePrivacy();
      await clearClientSession(queryClient);
      router.replace('/auth/login?deleted=1');
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = error.response?.status ?? 0;
      setDeleteError(
        status >= 500
          ? 'Could not delete your account. Please try again.'
          : (error.response?.data?.message ??
              'Could not delete your account. Please try again.')
      );
    }
  };

  return (
    <main className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto p-5 space-y-5'>
      <Card>
        <h2 className='text-2xl font-semibold text-gray-900 mb-2'>
          Account Settings
        </h2>
        <p className='text-sm text-gray-600'>
          Manage your personal details and password.
        </p>
      </Card>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-5'>
        <Card>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Profile Details
          </h3>

          {isLoading && <p className='text-sm text-gray-500'>Loading...</p>}

          {!isLoading && !user && (
            <Message
              severity='warn'
              text='Unable to load user profile. Please sign in again.'
            />
          )}

          {user && (
            <form className='space-y-4' onSubmit={onSaveProfile} noValidate>
              {profileError && (
                <Message
                  severity='error'
                  text={profileError}
                  className='w-full'
                />
              )}
              {profileSuccess && (
                <Message
                  severity='success'
                  text={profileSuccess}
                  className='w-full'
                />
              )}

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Email
                </label>
                <InputText value={user.email} disabled className='w-full' />
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Name
                </label>
                <InputText
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className='w-full'
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Base Currency
                </label>
                <Dropdown
                  value={baseCurrency}
                  options={POPULAR_CURRENCY_OPTIONS}
                  onChange={e => setBaseCurrency(String(e.value ?? ''))}
                  optionLabel='label'
                  optionValue='value'
                  className='w-full'
                  placeholder='Select base currency'
                />
                <p className='text-xs text-gray-500'>
                  Choose from 10 popular currencies.
                </p>
              </div>

              <Button
                type='submit'
                label='Save Profile'
                icon='pi pi-save'
                loading={updateUser.isPending}
                disabled={updateUser.isPending || !profileDirty}
              />
            </form>
          )}
        </Card>

        <Card>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Change Password
          </h3>

          <form className='space-y-4' onSubmit={onChangePassword} noValidate>
            {passwordError && (
              <Message
                severity='error'
                text={passwordError}
                className='w-full'
              />
            )}
            {passwordSuccess && (
              <Message
                severity='success'
                text={passwordSuccess}
                className='w-full'
              />
            )}

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>
                Current Password
              </label>
              <Password
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                feedback={false}
                toggleMask
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>
                New Password
              </label>
              <Password
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                feedback={false}
                toggleMask
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>
                Confirm New Password
              </label>
              <Password
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                feedback={false}
                toggleMask
                className='w-full'
              />
            </div>

            <Button
              type='submit'
              label='Update Password'
              icon='pi pi-lock'
              loading={updateUser.isPending}
              disabled={updateUser.isPending}
            />
          </form>
        </Card>
      </div>

      {user && (
        <Card>
          <h3 className='text-lg font-semibold text-red-700 mb-1'>
            Delete Account
          </h3>
          <p className='text-sm text-gray-600 mb-4'>
            Permanently remove your Truffles account and everything in it. You
            can restore it by signing in within 30 days.
          </p>
          <Button
            type='button'
            label='Delete account'
            icon='pi pi-trash'
            severity='danger'
            outlined
            onClick={() => {
              setDeleteError('');
              setShowDeleteDialog(true);
            }}
          />
        </Card>
      )}

      <DeleteAccountDialog
        visible={showDeleteDialog && !!user}
        email={user?.email ?? ''}
        loading={deleteUser.isPending}
        error={deleteError}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={onDeleteAccount}
      />
    </main>
  );
}
