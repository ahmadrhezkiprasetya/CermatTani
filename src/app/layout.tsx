import type { Metadata, Viewport } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import '@/styles/tokens.css';
import '@/styles/global.css';
import { ClientRoot } from '@/components/ClientRoot';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fredoka',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CermatTani — Asisten Cermat Budidaya Tomat',
  description:
    'Aplikasi web (PWA) yang membantu petani dan pelaku urban farming menilai kematangan buah, mengenali penyakit, dan menduga kebutuhan pupuk tomat dari foto serta sensor IoT surya.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-cermo.svg',
    apple: '/icon-cermo.svg',
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
    <html
      lang="id"
      className={`${fredoka.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
