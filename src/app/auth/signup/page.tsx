'use client';

import { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignup } from '@/hooks/api';
import CoreHeader from '@/components/CoreHeader';

export default function SignupPage() {
  const router = useRouter();
  const signupMutation = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await signupMutation.mutateAsync({ name, email, password });

      setSuccess(
        'Account created successfully! Please check your email to verify your account.'
      );

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 'Signup failed. Please try again.'
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
                Create Account
              </h2>
              <p className='text-gray-600'>
                Join Hamm Reserve to start managing your money better
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

            {/* Name Field */}
            <div className='space-y-2'>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-gray-700'
              >
                Full Name
              </label>
              <InputText
                id='name'
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Enter your full name'
                className='w-full'
                required
              />
            </div>

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
                placeholder='Create a password'
                className='w-full'
                promptLabel='Choose a password'
                weakLabel='Too simple'
                mediumLabel='Average complexity'
                strongLabel='Complex password'
                toggleMask
                required
              />
            </div>

            {/* Confirm Password Field */}
            <div className='space-y-2'>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-gray-700'
              >
                Confirm Password
              </label>
              <Password
                id='confirmPassword'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder='Confirm your password'
                className='w-full'
                feedback={false}
                toggleMask
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type='submit'
              label={
                signupMutation.isPending
                  ? 'Creating Account...'
                  : 'Create Account'
              }
              className='w-full p-3 text-lg'
              loading={signupMutation.isPending}
              disabled={signupMutation.isPending || !!success}
            />

            {/* Login Link */}
            <div className='text-center pt-4 border-t border-gray-200'>
              <p className='text-sm text-gray-600'>
                Already have an account?{' '}
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

        {/* Footer */}
        <div className='text-center mt-8 text-sm text-gray-500'>
          <p>© 2025 Hamm Reserve. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
