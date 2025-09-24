'use client';

import { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import Link from 'next/link';
import { useForgotPassword } from '@/hooks/api';
import CoreHeader from '@/components/CoreHeader';

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync({ email });

      setSuccess(
        'Password reset instructions have been sent to your email address.'
      );
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          'Failed to send reset instructions. Please try again.'
      );
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo/Header */}
        <CoreHeader />

        <Card className='shadow-lg'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Header */}
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                Reset Password
              </h2>
              <p className='text-gray-600'>
                Enter your email address and we&apos;ll send you instructions to
                reset your password
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Message severity='error' text={error} className='w-full' />
            )}

            {/* Success Message */}
            {success && (
              <Message severity='success' text={success} className='w-full' />
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
                placeholder='Enter your email address'
                className='w-full'
                required
                disabled={!!success}
              />
            </div>

            {/* Submit Button */}
            <Button
              type='submit'
              label={
                forgotPasswordMutation.isPending
                  ? 'Sending...'
                  : 'Send Reset Instructions'
              }
              className='w-full p-3 text-lg'
              loading={forgotPasswordMutation.isPending}
              disabled={forgotPasswordMutation.isPending || !!success}
            />

            {/* Back to Login Link */}
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

            {/* Sign Up Link */}
            <div className='text-center'>
              <p className='text-sm text-gray-600'>
                Don&apos;t have an account?{' '}
                <Link
                  href='/auth/signup'
                  className='text-blue-600 hover:text-blue-800 font-medium hover:underline'
                >
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className='text-center mt-8 text-sm text-gray-500'>
          <p>© 2025 Hamm Reserve. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
