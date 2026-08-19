'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Branding { name?: string; logoUrl?: string; bannerUrl?: string; tagline?: string; primaryColor?: string }

/** Shows the school's banner + logo on the dashboard once an admin has set them. */
export function SchoolBanner() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data } = useQuery({ queryKey: ['branding-banner'], queryFn: () => api.get<Branding>('/branding', token), enabled: !!token });
  if (!data || (!data.bannerUrl && !data.logoUrl && !data.tagline)) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200">
      <div className="relative flex h-28 items-end" style={data.bannerUrl ? { backgroundImage: `url(${data.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(90deg, ${data.primaryColor || '#0E7C5A'}, #0a5d43)` }}>
        <div className="flex items-center gap-3 p-4">
          {data.logoUrl ? <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-xl border-2 border-white object-cover" /> : null}
          <div className="text-white drop-shadow"><p className="text-lg font-bold">{data.name}</p>{data.tagline && <p className="text-sm opacity-90">{data.tagline}</p>}</div>
        </div>
      </div>
    </div>
  );
}
