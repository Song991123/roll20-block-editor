import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

// Pretendard variable font (OFL 1.1) — Korean + Latin coverage in one variable file.
// Loaded via jsdelivr CDN's dynamic-subset CSS so only used glyphs are downloaded.
// CSS variable --font-sans drives the family stack and includes a system-ui fallback.

export const metadata: Metadata = {
  title: 'Roll20 시트 빌더',
  description: '코드 없이 만드는 Roll20 캐릭터 시트 — 블록 코딩 + 한국어 친화',
};

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="h-full">
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#262626',
              color: '#ECECEC',
              border: '1px solid #303030',
            },
          }}
        />
      </body>
    </html>
  );
}
