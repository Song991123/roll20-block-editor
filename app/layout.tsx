import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roll20 Block Editor',
  description: '블록 코딩으로 Roll20 커스텀 시트를 만드는 도구',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
