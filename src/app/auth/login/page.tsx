'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { useLogin, useRestoreAccount } from '@/hooks/api';
import CoreHeader from '@/components/CoreHeader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingDeletionPurgeAfter, setPendingDeletionPurgeAfter] = useState<
    string | null
  >(null);
  const router = useRouter();
  const login = useLogin();
  const restore = useRestoreAccount();

  const handleRestore = async () => {
    setError('');

    try {
      await restore.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          'Could not restore your account. Please try again.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingDeletionPurgeAfter(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            code?: string;
            purgeAfter?: string | null;
          };
        };
      };

      if (error.response?.data?.code === 'accountPendingDeletion') {
        setPendingDeletionPurgeAfter(error.response.data.purgeAfter ?? '');
        return;
      }

      setError(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[--tr-bg] p-4'>
      <div className='w-full max-w-md'>
        {/* Logo/Header */}
        <CoreHeader description='Welcome back! Please sign in to your account.' />

        {/* Login Card */}
        <Card className='shadow-lg'>
          <form onSubmit={handleSubmit} className='space-y-6' noValidate>
            {/* Error Message */}
            {error && (
              <Message severity='error' text={error} className='w-full' />
            )}

            {pendingDeletionPurgeAfter !== null && (
              <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3'>
                <p className='text-sm font-semibold text-amber-950'>
                  This account is scheduled for deletion
                </p>
                <p className='text-sm leading-6 text-amber-900'>
                  {pendingDeletionPurgeAfter
                    ? `All your data will be permanently erased on ${new Date(
                        pendingDeletionPurgeAfter
                      ).toLocaleDateString('en-AU')}.`
                    : 'All your data will be permanently erased when the grace period ends.'}{' '}
                  Restore it now to keep everything.
                </p>
                <Button
                  type='button'
                  label='Restore my account'
                  icon='pi pi-refresh'
                  severity='warning'
                  size='small'
                  loading={restore.isPending}
                  onClick={handleRestore}
                />
              </div>
            )}

            {/* Email Field */}
            <div className='space-y-2'>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700'
              >
                Email Address
              </label>
              <InputText
                id='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='Enter your email'
                className='w-full'
                required
              />
            </div>

            {/* Password Field */}
            <div className='space-y-2'>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-700'
              >
                Password
              </label>
              <Password
                id='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Enter your password'
                className='w-full'
                feedback={false}
                toggleMask
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className='text-right'>
              <Link
                href='/auth/forgot-password'
                className='text-sm text-blue-600 hover:text-blue-800 hover:underline'
              >
                Forgot your password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type='submit'
              label='Sign In'
              icon='pi pi-sign-in'
              className='w-full'
              loading={login.isPending}
              disabled={login.isPending}
            />

            {/* Divider */}
            <Divider align='center'>
              <span className='text-gray-500 text-sm px-4'>
                Don&apos;t have an account?
              </span>
            </Divider>

            {/* Sign Up Link */}
            <div className='text-center'>
              <Link
                href='/auth/signup'
                className='text-blue-600 hover:text-blue-800 font-medium hover:underline'
              >
                Create a new account
              </Link>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div
          className='text-center mt-8 text-sm'
          style={{ color: 'var(--tr-text-3)' }}
        >
          <p>© 2026 Truffles. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
