import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roll20 시트 빌더',
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
              background: '#ffffff',
              color: '#3d2932',
              border: '1px solid #ecd5de',
            },
          }}
        />
      </body>
    </html>
  );
}
