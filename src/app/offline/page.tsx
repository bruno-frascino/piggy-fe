export const metadata = {
  title: 'Offline | Truffles',
};

import OfflineActions from './ClientActions';

export default function OfflinePage() {
  return (
    <div className='auth-page'>
      <div className='empty-state surface-panel w-full max-w-md'>
        <i className='pi pi-wifi empty-state-icon' aria-hidden />
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
