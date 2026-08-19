import { Sidebar } from '@/components/Sidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { AuthGuard } from '@/components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50/60 lg:flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
        <ChatbotWidget />
      </div>
    </AuthGuard>
  );
}
