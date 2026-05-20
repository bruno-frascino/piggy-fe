'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from 'primereact/card';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useResetPassword } from '@/hooks/api';
import CoreHeader from '@/components/CoreHeader';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const resetPassword = useResetPassword();

  useEffect(() => {
    if (!token) {
      setError(
        'This reset link is invalid or has expired. Please request a new one.'
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await resetPassword.mutateAsync({ token: token!, password });
      setSuccess('Password updated successfully. Redirecting to sign in…');
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e.response?.data?.message ||
          'This reset link is invalid or has expired. Please request a new one.'
      );
    }
  };

  return (
    <div className='min-h-screen bg-[--tr-bg] flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <CoreHeader />

        <Card className='shadow-lg'>
          <form onSubmit={handleSubmit} className='space-y-6' noValidate>
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                Set New Password
              </h2>
              <p className='text-gray-600'>
                Choose a strong password for your account.
              </p>
            </div>

            {error && (
              <Message severity='error' text={error} className='w-full' />
            )}
            {success && (
              <Message severity='success' text={success} className='w-full' />
            )}

            <div className='space-y-2'>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-700'
              >
                New Password
              </label>
              <Password
                id='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Enter new password'
                className='w-full'
                inputClassName='w-full'
                panelClassName='w-full'
                appendTo='self'
                promptLabel='Choose a password'
                weakLabel='Too simple'
                mediumLabel='Average complexity'
                strongLabel='Complex password'
                toggleMask
                disabled={!token || !!success}
              />
            </div>

            <div className='space-y-2'>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-gray-700'
              >
                Confirm New Password
              </label>
              <Password
                id='confirmPassword'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder='Confirm new password'
                className='w-full'
                feedback={false}
                toggleMask
                disabled={!token || !!success}
              />
            </div>

            <Button
              type='submit'
              label={resetPassword.isPending ? 'Updating…' : 'Update Password'}
              className='w-full'
              loading={resetPassword.isPending}
              disabled={!token || resetPassword.isPending || !!success}
            />

            <div className='text-center pt-4 border-t border-gray-200'>
              <p className='text-sm text-gray-600'>
                Remember your password?{' '}
                <Link
                  href='/auth/login'
                  className='text-blue-600 hover:text-blue-800 font-medium hover:underline'
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </Card>

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

// useSearchParams requires a Suspense boundary in Next.js App Router
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
