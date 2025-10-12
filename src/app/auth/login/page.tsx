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
import { useLogin } from '@/hooks/api';
import CoreHeader from '@/components/CoreHeader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='w-full max-w-md'>
        {/* Logo/Header */}
        <CoreHeader description='Welcome back! Please sign in to your account.' />

        {/* Login Card */}
        <Card className='shadow-lg'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Error Message */}
            {error && (
              <Message severity='error' text={error} className='w-full' />
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
        <div className='text-center mt-8 text-sm text-gray-500'>
          <p>© 2025 Hamm Reserve. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
