import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// PrimeReact theme imports
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Custom styles for component fixes
import '../styles/password-fix.css';
import TopNavGate from '@/components/TopNavGate';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Truffles - Portfolio Tracker',
  description: 'Personal finance management application',
  manifest: '/manifest.json',
  icons: {
    apple: [
      { url: '/icons/ios/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/icons/ios/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/icons/ios/apple-touch-icon-167x167.png', sizes: '167x167' },
      { url: '/icons/ios/apple-touch-icon-180x180.png', sizes: '180x180' },
    ],
  },
};

// Next.js recommends declaring themeColor inside a separate viewport export.
export const viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' style={{ colorScheme: 'light' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <TopNavGate />
          {children}
        </Providers>
      </body>
    </html>
  );
}
