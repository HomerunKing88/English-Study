import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'English OS',
  description:
    'Your personal English operating system — curriculum, memory, and spaced repetition around ChatGPT Voice.',
  applicationName: 'English OS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'English OS',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        <div className="mx-auto flex min-h-dvh max-w-content flex-col px-4 pb-28 pt-6 sm:pb-8">
          <main className="flex-1">{children}</main>
        </div>
        <Nav />
      </body>
    </html>
  );
}
