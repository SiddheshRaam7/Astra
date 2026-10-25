import type { Metadata } from 'next';
import './globals.css';
import '@xyflow/react/dist/style.css';
import { AssistantHost } from '@/components/assistant';
export const metadata: Metadata = {
  title: 'FORK — Find your financial flow',
  description:
    'Understand your money. Make your next move with confidence. Financial intelligence for the moments that matter.',
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
