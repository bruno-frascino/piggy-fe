import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { themeBootstrap } from '@/lib/theme';

// PrimeReact theme imports
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Custom styles for component fixes
import '../styles/password-fix.css';
import '../styles/design-system.css';
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
    <html lang='en' suppressHydrationWarning>
      <head>
        <link rel='stylesheet' href='/themes/light.css' />
        <link
          id='truffles-dark-theme'
          rel='stylesheet'
          href='/themes/dark.css'
          media='not all'
          suppressHydrationWarning
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
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
