'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/state/AppContext';
import { AppShell } from '@/components/AppShell';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

const InnerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, hydrated } = useApp();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Di mode development (next dev), bersihkan Service Worker & cache lama agar tidak bentrok dengan HMR/chunks
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    // Di mode produksi, aktifkan Service Worker PWA untuk dukungan offline-baca
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
        }}
      >
        Memuat CermatTani...
      </div>
    );
  }

  if (!state.onboarded) {
    return <OnboardingScreen />;
  }

  return <AppShell>{children}</AppShell>;
};

export const ClientRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    <InnerShell>{children}</InnerShell>
  </AppProvider>
);
