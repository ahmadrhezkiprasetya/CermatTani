'use client';

import React, { useEffect } from 'react';
import { AppProvider, useApp } from '@/state/AppContext';
import { AppShell } from '@/components/AppShell';
import { LandingScreen } from '@/screens/LandingScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ScanScreen } from '@/screens/ScanScreen';
import { PlantsScreen } from '@/screens/PlantsScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { LandScreen } from '@/screens/LandScreen';
import { SolarScreen } from '@/screens/SolarScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ScreenId } from '@/types/cermattani';

const APP_SCREEN_MAP: Record<Exclude<ScreenId, 'landing'>, React.ComponentType> = {
  beranda: DashboardScreen,
  scan: ScanScreen,
  tanaman: PlantsScreen,
  kalender: CalendarScreen,
  lahan: LandScreen,
  energi: SolarScreen,
  cermo: ChatScreen,
  pengaturan: SettingsScreen,
};

const InnerShell: React.FC = () => {
  const { state, hydrated, activeScreen } = useApp();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

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
          color: 'var(--ink-soft)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          fontWeight: 600,
        }}
      >
        <span className="loading-pulse">Memuat CermatTani...</span>
      </div>
    );
  }

  // Halaman publik terpadu — transisi halus tanpa sidebar aplikasi
  if (activeScreen === 'landing') {
    return (
      <div key="landing" className="screen-transition">
        <LandingScreen />
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <div key="onboarding" className="screen-transition">
        <OnboardingScreen />
      </div>
    );
  }

  const ActiveScreen = APP_SCREEN_MAP[activeScreen] || DashboardScreen;

  return (
    <AppShell>
      <div
        key={activeScreen}
        className={`screen-transition ${activeScreen === 'cermo' ? 'chat-screen-host' : ''}`}
      >
        <ActiveScreen />
      </div>
    </AppShell>
  );
};

export const ClientRoot: React.FC<{ children?: React.ReactNode }> = () => (
  <AppProvider>
    <InnerShell />
  </AppProvider>
);
