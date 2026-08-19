'use client';
import { useEffect, useState } from 'react';
import { flushQueue } from '@/lib/offline';
import { useAuth } from '@/stores/auth';

/** Registers the service worker, shows an offline banner, and flushes the queue on reconnect. */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const token = useAuth((s) => s.accessToken) ?? undefined;

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); void flushQueue(token); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [token]);

  return (
    <>
      {!online && (
        <div className="bg-amber-500 px-4 py-1 text-center text-sm text-white">
          You’re offline — your work is saved and will sync when you reconnect.
        </div>
      )}
      {children}
    </>
  );
}
