import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/auth.css';
import { ClientRoot } from '@/components/ClientRoot';

export const metadata: Metadata = {
  title: 'CermatTani — Asisten Cermat Budidaya Tanaman',
  description:
    'Aplikasi web (PWA) yang membantu petani dan pelaku urban farming menilai kematangan panen, mengenali penyakit daun & buah, serta menduga kebutuhan pupuk beragam tanaman dari foto dan sensor IoT surya.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/mascot/pak-cermat/03_petani_mengamati_tomat.png',
    apple: '/mascot/pak-cermat/03_petani_mengamati_tomat.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CermatTani',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#17803F' },
    { media: '(prefers-color-scheme: dark)', color: '#0C1713' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
