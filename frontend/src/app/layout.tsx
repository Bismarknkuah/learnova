import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/lib/queryClient';
import { OfflineProvider } from '@/components/OfflineProvider';
import '@/styles/globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Learnova — Learn smarter',
  description: 'AI-powered educational super-platform for West Africa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body>
        <Providers><OfflineProvider>{children}</OfflineProvider></Providers>
      </body>
    </html>
  );
}
