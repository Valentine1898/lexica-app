"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') { setLoading(false); return; }
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (!data.user) router.push('/login');
      else setLoading(false);
    });
  }, [pathname]);

  if (loading && pathname !== '/login') return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return <>{children}</>;
}