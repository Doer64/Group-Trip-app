import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'GroupTrip - Democratic Group Trip Planning',
  description:
    'Propose, discover, and vote on attractions with your friends and family for your next group getaway.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="w-full border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
            <p>GroupTrip • Democratic Group Trip Planning</p>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
