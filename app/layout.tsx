import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roll20 시트 편집기',
  description: '코드 없이 Roll20 캐릭터 시트를 만들고 편집하는 블록 코딩 도구',
};

export const viewport: Viewport = {
  themeColor: '#fffafb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="h-full">
        {children}
        <Toaster
          position="top-center"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'var(--bg-elevated, #ffffff)',
              color: 'var(--text-primary, #3b222c)',
              border: '1px solid var(--border-default, #f0d4e0)',
              borderRadius: '16px',
              boxShadow: '0 10px 28px rgba(178, 84, 122, 0.16)',
              fontSize: '15px',
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
