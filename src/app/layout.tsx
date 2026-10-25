import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@xyflow/react/dist/style.css';
import { AssistantHost } from '@/components/assistant';
export const metadata: Metadata = {
  title: 'FORK — Find your financial flow',
  description:
    'Understand your money. Make your next move with confidence. Financial intelligence for the moments that matter.',
  applicationName: 'FORK',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'FORK',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/fork-192.png',
  },
};
export const viewport: Viewport = {
  themeColor: '#26371e',
  colorScheme: 'dark',
  viewportFit: 'cover',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AssistantHost />
      </body>
    </html>
  );
}
