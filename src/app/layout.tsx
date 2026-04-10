import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Lexica — Vocabulary Learning',
  description: 'Master vocabulary with spaced repetition.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0f0f0f] text-white min-h-screen font-sans antialiased">
        <AuthProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="page-enter">{children}</div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}