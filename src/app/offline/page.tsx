export const metadata = {
  title: 'Offline | Hamm Reserve',
};

import OfflineActions from './ClientActions';

export default function OfflinePage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6'>
      <div className='w-full max-w-md text-center bg-white shadow rounded-lg p-8'>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>
          You are offline
        </h1>
        <p className='text-gray-600 mb-6'>
          It looks like you lost your internet connection. You can continue
          browsing cached pages or try again once you are back online.
        </p>
        <OfflineActions />
      </div>
    </div>
  );
}
