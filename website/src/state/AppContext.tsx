'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AppSettings,
  ChatMessage,
  DeviceInfo,
  Farm,
  FarmTask,
  GrowthPhase,
  HarvestEvent,
  IrrigationEvent,
  LiveAlertToast,
  NotificationItem,
  OfflineQueueItem,
  Plant,
  PlantPart,
  ReminderCategory,
  ReminderSchedule,
  ScanRecord,
  ScreenId,
  SensorPoint24h,
  SensorSnapshot,
  UserProfile,
} from '../types/cermattani';
import {
  INITIAL_CHAT,
  INITIAL_DEVICES,
  INITIAL_FARMS,
  INITIAL_HARVEST_EVENTS,
  INITIAL_IRRIGATION_EVENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PLANTS,
  INITIAL_SCANS,
  INITIAL_SENSOR_24H,
  INITIAL_SENSOR_SNAPSHOT,
  INITIAL_SETTINGS,
  INITIAL_TASKS,
  INITIAL_USER,
} from '../data/initialData';
import { runTomatoScanAnalysis } from '../utils/scanAnalyzer';

const STORAGE_KEY = 'cermattani_app_state_v1';
const FIRED_REMINDERS_KEY = 'cermattani_fired_reminders_v1';

function getLocalClockHHMM(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getLocalDateYmd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getReminderAlertMeta(kategori: ReminderCategory): {
  tipe: NotificationItem['tipe'];
  severity: LiveAlertToast['severity'];
  actionLabel: string;
  actionScreen: Exclude<ScreenId, 'landing'>;
} {
  switch (kategori) {
    case 'siram':
      return {
        tipe: 'siram',
        severity: 'info',
        actionLabel: 'Buka Lahan',
        actionScreen: 'lahan',
      };
    case 'cek_daun':
      return {
        tipe: 'penyakit',
        severity: 'warn',
        actionLabel: 'Scan Daun',
        actionScreen: 'scan',
      };
    case 'pupuk':
      return {
        tipe: 'pupuk',
        severity: 'info',
        actionLabel: 'Cek Tanaman',
        actionScreen: 'tanaman',
      };
    case 'panen':
    default:
      return {
        tipe: 'panen',
        severity: 'ok',
        actionLabel: 'Kalender Panen',
        actionScreen: 'kalender',
      };
  }
}

export const SCREEN_PATHS: Record<ScreenId, string> = {
  landing: '/',
  beranda: '/dashboard',
  scan: '/scan',
  tanaman: '/tanaman',
  kalender: '/kalender',
  lahan: '/lahan',
  energi: '/energi',
  cermo: '/cermo',
  pengaturan: '/pengaturan',
};

function pathnameToScreen(pathname: string | null): ScreenId {
  if (!pathname || pathname === '/') return 'landing';
  const clean = pathname.replace(/\/+$/, '');
  const entry = (Object.entries(SCREEN_PATHS) as [ScreenId, string][]).find(
    ([, path]) => path === clean
  );
  return entry ? entry[0] : 'beranda';
}

interface PersistedState {
  onboarded: boolean;
  user: UserProfile;
  farms: Farm[];
  activeFarmId: string;
  plants: Plant[];
  scans: ScanRecord[];
  devices: DeviceInfo[];
  sensor: SensorSnapshot;
  sensor24h: SensorPoint24h[];
  irrigationEvents: IrrigationEvent[];
  harvestEvents: HarvestEvent[];
  tasks: FarmTask[];
  chatMessages: ChatMessage[];
  notifications: NotificationItem[];
  settings: AppSettings;
  offlineQueue: OfflineQueueItem[];
}

function createDefaultState(onboarded = false): PersistedState {
  return {
    onboarded,
    user: INITIAL_USER,
    farms: INITIAL_FARMS,
    activeFarmId: INITIAL_FARMS[0].id,
    plants: INITIAL_PLANTS,
    scans: INITIAL_SCANS,
    devices: INITIAL_DEVICES,
    sensor: INITIAL_SENSOR_SNAPSHOT,
    sensor24h: INITIAL_SENSOR_24H,
    irrigationEvents: INITIAL_IRRIGATION_EVENTS,
    harvestEvents: INITIAL_HARVEST_EVENTS,
    tasks: INITIAL_TASKS,
    chatMessages: INITIAL_CHAT,
    notifications: INITIAL_NOTIFICATIONS,
    settings: INITIAL_SETTINGS,
    offlineQueue: [],
  };
}

const DUMMY_SCAN_IDS = new Set(['scan-1', 'scan-2', 'scan-3', 'scan-4', 'scan-5']);
const DUMMY_CHAT_IDS = new Set(['chat-1', 'chat-clean']);

function loadPersistedState(): PersistedState {
  if (typeof window === 'undefined') return createDefaultState(false);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState(false);
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const def = createDefaultState(false);

    // Bersihkan otomatis sisa data scan/chat dummy lama dari localStorage browser
    const cleanedScans = Array.isArray(parsed.scans)
      ? parsed.scans.filter(
        (s) =>
          s &&
          !DUMMY_SCAN_IDS.has(s.id) &&
          typeof s.fotoUrl === 'string' &&
          !s.fotoUrl.startsWith('data:image/svg+xml')
      )
      : def.scans;

    const cleanedChats = Array.isArray(parsed.chatMessages)
      ? parsed.chatMessages.filter((m) => m && !DUMMY_CHAT_IDS.has(m.id))
      : def.chatMessages;

    const cleanedNotifs = Array.isArray(parsed.notifications)
      ? parsed.notifications.filter((n) => n && n.id !== 'notif-2')
      : def.notifications;

    const mergedSettings: AppSettings = {
      ...def.settings,
      ...(parsed.settings || {}),
      jadwalPengingat:
        Array.isArray(parsed.settings?.jadwalPengingat) && parsed.settings.jadwalPengingat.length > 0
          ? parsed.settings.jadwalPengingat
          : def.settings.jadwalPengingat,
      peringatanOtomatisSensor:
        typeof parsed.settings?.peringatanOtomatisSensor === 'boolean'
          ? parsed.settings.peringatanOtomatisSensor
          : def.settings.peringatanOtomatisSensor,
      notifikasiBrowser:
        typeof parsed.settings?.notifikasiBrowser === 'boolean'
          ? parsed.settings.notifikasiBrowser
          : def.settings.notifikasiBrowser,
    };

    return {
      ...def,
      ...parsed,
      scans: cleanedScans,
      chatMessages: cleanedChats,
      notifications: cleanedNotifs,
      user: { ...def.user, ...(parsed.user || {}) },
      sensor: { ...def.sensor, ...(parsed.sensor || {}) },
      settings: mergedSettings,
    };
  } catch {
    return createDefaultState(false);
  }
}

interface AppContextValue {
  state: PersistedState;
  hydrated: boolean;
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  scanPreselectPart: PlantPart | null;
  scanPreselectPlantId: string | null;
  openScanWith: (part?: PlantPart, plantId?: string) => void;
  chatContextPlantId: string | null;
  openChatWithPlant: (plantId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFarm: Farm;
  activeFarmPlants: Plant[];
  unreadNotifCount: number;
  activeAlerts: LiveAlertToast[];
  pushAlert: (
    input: Omit<LiveAlertToast, 'id' | 'waktu'>,
    options?: { saveToHistory?: boolean; notifyBrowser?: boolean }
  ) => void;
  dismissAlert: (id: string) => void;
  clearAllNotifications: () => void;
  updateReminderSchedule: (id: string, patch: Partial<ReminderSchedule>) => void;
  addReminderSchedule: (input: {
    label: string;
    kategori: ReminderCategory;
    jam: string;
    catatan: string;
  }) => void;
  deleteReminderSchedule: (id: string) => void;
  triggerTestReminderAlert: (scheduleId?: string) => void;
  requestBrowserNotifications: () => Promise<boolean>;
  isOffline: boolean;
  completeOnboarding: (payload?: {
    userName?: string;
    farmName?: string;
    farmLocation?: string;
    plantName?: string;
    varietas?: string;
    tanggalTanam?: string;
    goToScan?: boolean;
  }) => void;
  reopenOnboarding: () => void;
  setActiveFarmId: (id: string) => void;
  addFarm: (nama: string, lokasi: string, luasLabel: string) => Farm;
  addPlant: (input: {
    farmId: string;
    nama: string;
    varietas: string;
    tanggalTanam: string;
    fase: GrowthPhase;
    bobotRataBuahGram?: number;
  }) => Plant;
  saveScan: (scan: ScanRecord) => void;
  enqueueOfflineScan: (item: Omit<OfflineQueueItem, 'id' | 'waktuAntre'>) => void;
  processOfflineQueue: () => Promise<number>;
  addHarvestEvent: (ev: Omit<HarvestEvent, 'id'>) => void;
  markHarvestActual: (id: string) => void;
  toggleTask: (id: string) => void;
  addTask: (judul: string, kategori: FarmTask['kategori'], waktuLabel: string) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'waktu'>) => void;
  clearChatMessages: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateSensor: (patch: Partial<SensorSnapshot>) => void;
  triggerManualPump: (turnOn: boolean) => { ok: boolean; message: string };
  linkTelegram: (chatIdInput?: string) => void;
  unlinkTelegram: () => void;
  regenerateTelegramCode: () => void;
  sendTestTelegramReminder: () => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  markAllNotificationsRead: () => void;
  resetDemoData: () => void;
  deleteAllUserData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [activeScreen, setActiveScreenState] = useState<ScreenId>(() => pathnameToScreen(pathname));

  const [state, setState] = useState<PersistedState>(() => createDefaultState(false));
  const [hydrated, setHydrated] = useState(false);
  const [scanPreselectPart, setScanPreselectPart] = useState<PlantPart | null>(null);
  const [scanPreselectPlantId, setScanPreselectPlantId] = useState<string | null>(null);
  const [chatContextPlantId, setChatContextPlantId] = useState<string | null>(INITIAL_PLANTS[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [browserOffline, setBrowserOffline] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<LiveAlertToast[]>([]);

  const alertTimersRef = useRef<Map<string, number>>(new Map());
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const prevSensorAlertsRef = useRef<{
    initialized: boolean;
    soilDry: boolean;
    tankLow: boolean;
    diseaseRisk: boolean;
    batteryLow: boolean;
  }>({
    initialized: false,
    soilDry: false,
    tankLow: false,
    diseaseRisk: false,
    batteryLow: false,
  });

  useEffect(() => {
    const timers = alertTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const dismissAlert = useCallback((id: string) => {
    const existingTimer = alertTimersRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      alertTimersRef.current.delete(id);
    }
    setActiveAlerts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushAlert = useCallback<AppContextValue['pushAlert']>(
    (input, options) => {
      const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const waktu = `${getLocalClockHHMM()} WIB`;
      const toast: LiveAlertToast = {
        id,
        waktu,
        ...input,
      };

      setActiveAlerts((prev) => [toast, ...prev].slice(0, 3));

      if (typeof window !== 'undefined') {
        const timeoutMs = input.severity === 'bad' ? 12000 : 9000;
        const timerId = window.setTimeout(() => {
          alertTimersRef.current.delete(id);
          setActiveAlerts((prev) => prev.filter((item) => item.id !== id));
        }, timeoutMs);
        alertTimersRef.current.set(id, timerId);

        if (
          options?.notifyBrowser !== false &&
          state.settings.notifikasiBrowser &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification(`CermatTani · ${input.judul}`, {
              body: input.isi,
              icon: '/mascot/pak-cermat/01.png',
            });
          } catch {
            // Abaikan bila perangkat memblokir Notification constructor
          }
        }
      }

      if (options?.saveToHistory !== false) {
        setState((prev) => ({
          ...prev,
          notifications: [
            {
              id: `notif-${id}`,
              judul: input.judul,
              isi: input.isi,
              waktu,
              tipe: input.tipe,
              dibaca: false,
              severity: input.severity,
              actionLabel: input.actionLabel,
              actionScreen: input.actionScreen,
            },
            ...prev.notifications,
          ].slice(0, 35),
        }));
      }
    },
    [state.settings.notifikasiBrowser]
  );

  // Sinkronkan URL saat direct load atau tombol Back/Forward browser ditekan
  useEffect(() => {
    setActiveScreenState(pathnameToScreen(pathname));
  }, [pathname]);

  useEffect(() => {
    const onPopState = () => {
      setActiveScreenState(pathnameToScreen(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Hydrate dari localStorage hanya di sisi klien (SSR-safe untuk Next.js)
  useEffect(() => {
    const loaded = loadPersistedState();
    setState(loaded);
    setChatContextPlantId(loaded.plants[0]?.id ?? null);
    setBrowserOffline(!navigator.onLine);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Abaikan quota error
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (state.settings.tema === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', state.settings.tema);
    }
  }, [state.settings.tema, hydrated]);

  useEffect(() => {
    const onOnline = () => setBrowserOffline(false);
    const onOffline = () => setBrowserOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const isOffline = browserOffline || state.settings.simulasikanOffline;

  // Navigasi instan 0 ms di sisi klien (tanpa server round-trip Next.js), tetap sinkron URL
  const setActiveScreen = useCallback((screen: ScreenId) => {
    setActiveScreenState(screen);
    if (typeof window !== 'undefined') {
      const targetPath = SCREEN_PATHS[screen];
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ screen }, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  // Evaluasi F10.1, F10.3 interlock tandon kritis, & F13.2 mode hemat baterai
  useEffect(() => {
    if (!hydrated) return;
    setState((prev) => {
      const { sensor, settings } = prev;
      const tankCritical = sensor.levelTandonPersen < settings.ambangTandonRendah;
      let nextPump = settings.pompaMenyala;
      let nextEvents = prev.irrigationEvents;

      if (tankCritical && settings.pompaMenyala) {
        nextPump = false;
      } else if (settings.irigasiOtomatis && !tankCritical) {
        if (sensor.kelembapanTanah < settings.ambangTanahBawah && !settings.pompaMenyala) {
          nextPump = true;
          const now = new Date().toISOString();
          nextEvents = [
            {
              id: `irr-${Date.now()}`,
              deviceId: sensor.deviceId,
              mulai: now,
              selesai: now,
              durasiMenit: Math.min(8, settings.durasiMaksPompaMenit),
              kelembapanAwal: sensor.kelembapanTanah,
              kelembapanAkhir: settings.ambangTanahAtas,
              mode: 'Otomatis' as const,
            },
            ...prev.irrigationEvents,
          ].slice(0, 12);
        } else if (sensor.kelembapanTanah >= settings.ambangTanahAtas && settings.pompaMenyala) {
          nextPump = false;
        }
      }

      const nextStatus: DeviceInfo['status'] =
        sensor.bateraiPersen <= settings.ambangBateraiHemat ? 'mode_hemat' : 'aktif';
      const statusChanged = prev.devices[0]?.status !== nextStatus;

      if (nextPump === settings.pompaMenyala && nextEvents === prev.irrigationEvents && !statusChanged) {
        return prev;
      }

      return {
        ...prev,
        settings: { ...settings, pompaMenyala: nextPump },
        irrigationEvents: nextEvents,
        devices: prev.devices.map((d, i) => (i === 0 ? { ...d, status: nextStatus } : d)),
      };
    });
  }, [
    hydrated,
    state.sensor.kelembapanTanah,
    state.sensor.levelTandonPersen,
    state.sensor.bateraiPersen,
    state.settings.irigasiOtomatis,
    state.settings.ambangTanahBawah,
    state.settings.ambangTanahAtas,
    state.settings.ambangTandonRendah,
    state.settings.ambangBateraiHemat,
  ]);

  const processOfflineQueue = async (): Promise<number> => {
    if (state.offlineQueue.length === 0) return 0;
    const items = [...state.offlineQueue];
    let count = 0;

    for (const item of items) {
      const plant = state.plants.find((p) => p.id === item.plantId) || state.plants[0];
      if (!plant) continue;
      const prevScans = state.scans.filter((s) => s.plantId === plant.id);
      try {
        const result = await runTomatoScanAnalysis({
          plant,
          bagian: item.bagian,
          fotoUrl: item.fotoUrl,
          sensorAvailable: state.sensor.sensorTersedia,
          lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
          previousPlantScans: prevScans,
        });
        setState((prev) => ({
          ...prev,
          scans: [result, ...prev.scans],
          offlineQueue: prev.offlineQueue.filter((q) => q.id !== item.id),
          notifications: [
            {
              id: `notif-sync-${Date.now()}`,
              judul: 'Antrean scan offline terkirim',
              isi: `Scan ${item.bagian} untuk ${plant.nama} sudah selesai diproses oleh AI.`,
              waktu: 'Baru saja',
              tipe: 'panen',
              dibaca: false,
            },
            ...prev.notifications,
          ],
        }));
        count++;
      } catch {
        // Biarkan tetap di antrean bila AI belum terjangkau
      }
    }
    return count;
  };

  useEffect(() => {
    if (hydrated && !isOffline && state.offlineQueue.length > 0) {
      void processOfflineQueue();
    }
  }, [isOffline, hydrated]);

  // Mesin penjadwal notifikasi real-time sesuai jam yang ditentukan (HH:MM)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;

    const loadFiredToday = (today: string) => {
      try {
        const raw = window.localStorage.getItem(FIRED_REMINDERS_KEY);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        const valid = Array.isArray(parsed)
          ? parsed.filter((k) => typeof k === 'string' && k.startsWith(`${today}|`))
          : [];
        firedRemindersRef.current = new Set(valid);
      } catch {
        firedRemindersRef.current = new Set();
      }
    };

    const persistFired = () => {
      try {
        window.localStorage.setItem(
          FIRED_REMINDERS_KEY,
          JSON.stringify(Array.from(firedRemindersRef.current))
        );
      } catch {
        // Abaikan quota error
      }
    };

    const checkSchedules = () => {
      const now = new Date();
      const today = getLocalDateYmd(now);
      const clock = getLocalClockHHMM(now);
      loadFiredToday(today);

      let updated = false;
      for (const item of state.settings.jadwalPengingat) {
        if (!item.aktif || item.jam !== clock) continue;
        const key = `${today}|${item.id}|${item.jam}`;
        if (firedRemindersRef.current.has(key)) continue;

        firedRemindersRef.current.add(key);
        updated = true;

        const meta = getReminderAlertMeta(item.kategori);
        pushAlert({
          judul: `Waktunya ${item.label}`,
          isi: item.catatan || `Jadwal pengingat pukul ${item.jam} WIB telah tiba.`,
          tipe: meta.tipe,
          severity: meta.severity,
          actionLabel: meta.actionLabel,
          actionScreen: meta.actionScreen,
        });
      }

      if (updated) persistFired();
    };

    checkSchedules();
    const intervalId = window.setInterval(checkSchedules, 10000);
    return () => window.clearInterval(intervalId);
  }, [hydrated, state.settings.jadwalPengingat, pushAlert]);

  // Pengawas alert otomatis sensor (hanya memicu saat kondisi baru masuk batas kritis/waspada)
  useEffect(() => {
    if (!hydrated) return;
    const soilDry = state.sensor.kelembapanTanah < state.settings.ambangTanahBawah;
    const tankLow = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;
    const diseaseRisk =
      state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;
    const batteryLow = state.sensor.bateraiPersen <= state.settings.ambangBateraiHemat;

    const prev = prevSensorAlertsRef.current;
    if (!prev.initialized) {
      prevSensorAlertsRef.current = {
        initialized: true,
        soilDry,
        tankLow,
        diseaseRisk,
        batteryLow,
      };
      return;
    }

    if (state.settings.peringatanOtomatisSensor) {
      if (soilDry && !prev.soilDry) {
        pushAlert({
          judul: `Waktunya Siram! Tanah kering (${state.sensor.kelembapanTanah}%)`,
          isi: `Kelembapan media turun di bawah batas ${state.settings.ambangTanahBawah}%. ${
            state.settings.irigasiOtomatis && !tankLow
              ? 'Pompa irigasi otomatis sudah diaktifkan.'
              : 'Segera cek irigasi di halaman Lahan.'
          }`,
          tipe: 'siram',
          severity: 'warn',
          actionLabel: 'Buka Lahan',
          actionScreen: 'lahan',
        });
      }
      if (tankLow && !prev.tankLow) {
        pushAlert({
          judul: `Peringatan Tandon Kritis (${state.sensor.levelTandonPersen}%)`,
          isi: `Air tandon di bawah ${state.settings.ambangTandonRendah}%. Pompa dikunci otomatis agar tidak kering—isi ulang tandon segera.`,
          tipe: 'tandon',
          severity: 'bad',
          actionLabel: 'Cek Tandon',
          actionScreen: 'lahan',
        });
      }
      if (diseaseRisk && !prev.diseaseRisk) {
        pushAlert({
          judul: `Waspada Risiko Jamur (${state.sensor.kelembapanUdara}% RH)`,
          isi: `Udara kebun sangat lembap (≥${state.settings.ambangKelembapanRisikoPenyakit}% RH). Periksa bercak daun bawah dan kurangi siram sore.`,
          tipe: 'penyakit',
          severity: 'warn',
          actionLabel: 'Scan Daun',
          actionScreen: 'scan',
        });
      }
      if (batteryLow && !prev.batteryLow) {
        pushAlert({
          judul: `Baterai Surya Rendah (${state.sensor.bateraiPersen}%)`,
          isi: `Perangkat masuk mode hemat daya (≤${state.settings.ambangBateraiHemat}%). Pastikan panel surya tidak tertutup bayangan.`,
          tipe: 'energi',
          severity: 'warn',
          actionLabel: 'Energi Surya',
          actionScreen: 'energi',
        });
      }
    }

    prevSensorAlertsRef.current = {
      initialized: true,
      soilDry,
      tankLow,
      diseaseRisk,
      batteryLow,
    };
  }, [
    hydrated,
    state.settings.peringatanOtomatisSensor,
    state.settings.irigasiOtomatis,
    state.settings.ambangTanahBawah,
    state.settings.ambangTandonRendah,
    state.settings.ambangKelembapanRisikoPenyakit,
    state.settings.ambangBateraiHemat,
    state.sensor.kelembapanTanah,
    state.sensor.levelTandonPersen,
    state.sensor.kelembapanUdara,
    state.sensor.bateraiPersen,
    pushAlert,
  ]);

  const activeFarm = useMemo(
    () => state.farms.find((f) => f.id === state.activeFarmId) || state.farms[0],
    [state.farms, state.activeFarmId]
  );

  const activeFarmPlants = useMemo(
    () => state.plants.filter((p) => p.farmId === activeFarm?.id),
    [state.plants, activeFarm]
  );

  const unreadNotifCount = useMemo(
    () => state.notifications.filter((n) => !n.dibaca).length,
    [state.notifications]
  );

  const openScanWith = (part?: PlantPart, plantId?: string) => {
    setScanPreselectPart(part ?? null);
    setScanPreselectPlantId(plantId ?? null);
    setActiveScreen('scan');
  };

  const openChatWithPlant = (plantId: string | null) => {
    setChatContextPlantId(plantId);
    setActiveScreen('cermo');
  };

  const completeOnboarding: AppContextValue['completeOnboarding'] = (payload) => {
    setState((prev) => {
      let nextFarms = prev.farms;
      let nextActiveFarmId = prev.activeFarmId;
      let nextPlants = prev.plants;
      let nextUser = prev.user;

      if (payload?.userName && payload.userName.trim()) {
        nextUser = { ...prev.user, nama: payload.userName.trim() };
      }

      if (payload?.farmName && payload.farmName.trim()) {
        const newFarmId = `farm-${Date.now()}`;
        const newFarm: Farm = {
          id: newFarmId,
          userId: nextUser.id,
          nama: payload.farmName.trim(),
          lokasi: payload.farmLocation?.trim() || 'Lahan utama',
          luasLabel: 'Kebun tomat',
        };
        nextFarms = [newFarm, ...prev.farms];
        nextActiveFarmId = newFarmId;

        if (payload.plantName && payload.plantName.trim()) {
          const newPlant: Plant = {
            id: `plant-${Date.now()}`,
            farmId: newFarmId,
            nama: payload.plantName.trim(),
            varietas: payload.varietas?.trim() || 'Servo F1',
            bobotRataBuahGram: payload.varietas?.toLowerCase().includes('ceri') ? 25 : 85,
            tanggalTanam: payload.tanggalTanam || new Date().toISOString().slice(0, 10),
            fase: 'Berbuah',
          };
          nextPlants = [newPlant, ...prev.plants];
        }
      }

      return {
        ...prev,
        onboarded: true,
        user: nextUser,
        farms: nextFarms,
        activeFarmId: nextActiveFarmId,
        plants: nextPlants,
      };
    });

    setActiveScreen(payload?.goToScan ? 'scan' : 'beranda');
  };

  const reopenOnboarding = () => {
    setState((prev) => ({ ...prev, onboarded: false }));
  };

  const setActiveFarmId = (id: string) => {
    setState((prev) => ({ ...prev, activeFarmId: id }));
  };

  const addFarm = (nama: string, lokasi: string, luasLabel: string): Farm => {
    const farm: Farm = {
      id: `farm-${Date.now()}`,
      userId: state.user.id,
      nama: nama.trim(),
      lokasi: lokasi.trim() || 'Lokasi kebun',
      luasLabel: luasLabel.trim() || 'Kebun tomat',
    };
    setState((prev) => ({
      ...prev,
      farms: [...prev.farms, farm],
      activeFarmId: farm.id,
    }));
    return farm;
  };

  const addPlant: AppContextValue['addPlant'] = (input) => {
    const plant: Plant = {
      id: `plant-${Date.now()}`,
      farmId: input.farmId,
      nama: input.nama.trim(),
      varietas: input.varietas.trim() || 'Servo F1',
      bobotRataBuahGram:
        input.bobotRataBuahGram || (input.varietas.toLowerCase().includes('ceri') ? 25 : 85),
      tanggalTanam: input.tanggalTanam,
      fase: input.fase,
    };
    setState((prev) => ({ ...prev, plants: [plant, ...prev.plants] }));
    return plant;
  };

  const saveScan = (scan: ScanRecord) => {
    setState((prev) => {
      const nextHarvests = [...prev.harvestEvents];
      const nextNotifs = [...prev.notifications];
      const plant = prev.plants.find((p) => p.id === scan.plantId);

      if (scan.bagian === 'buah' && scan.estimasiHariMin !== null && !scan.tanpaBuahTerdeteksi) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + scan.estimasiHariMin);
        const ymd = targetDate.toISOString().slice(0, 10);
        nextHarvests.unshift({
          id: `harv-${Date.now()}`,
          plantId: scan.plantId,
          tanggal: ymd,
          sumber: 'estimasi',
          catatan:
            scan.anjuranPanen === 'Panen sekarang'
              ? `${scan.jumlahBuah} buah matang siap dipetik`
              : `Estimasi tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari (${scan.jumlahBuah} buah)`,
          estimasiKg: Number((scan.estimasiBobotGram / 1000).toFixed(2)),
        });
      }

      if (scan.penyakitUtamaId !== 'sehat') {
        nextNotifs.unshift({
          id: `notif-scan-${Date.now()}`,
          judul: `Scan: ${scan.penyakitUtamaNama}`,
          isi: `${plant?.nama || 'Tanaman'} tersimpan di timeline. ${scan.keyakinanRendah ? 'Keyakinan rendah, konfirmasi ke penyuluh.' : 'Lihat solusi organik di hasil scan.'}`,
          waktu: `${getLocalClockHHMM()} WIB`,
          tipe: 'penyakit',
          dibaca: false,
          severity: 'warn',
          actionLabel: 'Lihat Tanaman',
          actionScreen: 'tanaman',
        });
      }

      return {
        ...prev,
        scans: [scan, ...prev.scans],
        harvestEvents: nextHarvests,
        notifications: nextNotifs.slice(0, 35),
      };
    });
    if (scan.penyakitUtamaId !== 'sehat') {
      const plant = state.plants.find((p) => p.id === scan.plantId);
      pushAlert(
        {
          judul: `Temuan Scan: ${scan.penyakitUtamaNama}`,
          isi: `${plant?.nama || 'Tanaman'} perlu perhatian. Cek rekomendasi organik dan pantau daun sekitar.`,
          tipe: 'penyakit',
          severity: 'warn',
          actionLabel: 'Lihat Tanaman',
          actionScreen: 'tanaman',
        },
        { saveToHistory: false }
      );
    }
    setChatContextPlantId(scan.plantId);
  };

  const enqueueOfflineScan: AppContextValue['enqueueOfflineScan'] = (item) => {
    setState((prev) => ({
      ...prev,
      offlineQueue: [
        ...prev.offlineQueue,
        {
          ...item,
          id: `queue-${Date.now()}`,
          waktuAntre: new Date().toISOString(),
        },
      ],
    }));
  };

  const addHarvestEvent: AppContextValue['addHarvestEvent'] = (ev) => {
    setState((prev) => ({
      ...prev,
      harvestEvents: [{ ...ev, id: `harv-${Date.now()}` }, ...prev.harvestEvents],
    }));
  };

  const markHarvestActual = (id: string) => {
    setState((prev) => ({
      ...prev,
      harvestEvents: prev.harvestEvents.map((h) =>
        h.id === id ? { ...h, sumber: 'aktual' } : h
      ),
    }));
  };

  const toggleTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, selesai: !t.selesai } : t)),
    }));
  };

  const addTask = (judul: string, kategori: FarmTask['kategori'], waktuLabel: string) => {
    setState((prev) => ({
      ...prev,
      tasks: [
        {
          id: `task-${Date.now()}`,
          farmId: prev.activeFarmId,
          judul: judul.trim(),
          kategori,
          waktuLabel,
          selesai: false,
        },
        ...prev.tasks,
      ],
    }));
  };

  const addChatMessage: AppContextValue['addChatMessage'] = (msg) => {
    setState((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        {
          ...msg,
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          waktu: new Date().toISOString(),
        },
      ],
    }));
  };

  const clearChatMessages = () => {
    setState((prev) => ({ ...prev, chatMessages: [] }));
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  };

  const updateSensor = (patch: Partial<SensorSnapshot>) => {
    setState((prev) => {
      const merged = { ...prev.sensor, ...patch, waktu: new Date().toISOString() };
      if (patch.jarakUltrasonikCm !== undefined) {
        const tinggi = merged.tinggiTandonCm || 100;
        merged.levelTandonPersen = Math.max(
          0,
          Math.min(100, Math.round(((tinggi - patch.jarakUltrasonikCm) / tinggi) * 100))
        );
      } else if (patch.levelTandonPersen !== undefined) {
        const tinggi = merged.tinggiTandonCm || 100;
        merged.jarakUltrasonikCm = Math.max(
          0,
          Math.round(tinggi * (1 - patch.levelTandonPersen / 100))
        );
      }
      if (patch.teganganVolt !== undefined || patch.arusMa !== undefined) {
        merged.dayaWatt = Number(((merged.teganganVolt * merged.arusMa) / 1000).toFixed(2));
      }
      return { ...prev, sensor: merged };
    });
  };

  const triggerManualPump = (turnOn: boolean): { ok: boolean; message: string } => {
    if (turnOn && state.sensor.levelTandonPersen < state.settings.ambangTandonRendah) {
      const msg = `Tandon tinggal ${state.sensor.levelTandonPersen}%. Pompa kutahan dulu supaya tidak kering.`;
      pushAlert({
        judul: 'Pompa Ditahan (Tandon Rendah)',
        isi: msg,
        tipe: 'tandon',
        severity: 'bad',
        actionLabel: 'Cek Lahan',
        actionScreen: 'lahan',
      });
      return {
        ok: false,
        message: msg,
      };
    }

    setState((prev) => {
      const now = new Date().toISOString();
      const nextMoisture = turnOn
        ? Math.min(prev.settings.ambangTanahAtas, prev.sensor.kelembapanTanah + 12)
        : prev.sensor.kelembapanTanah;
      const nextEvents = turnOn
        ? [
          {
            id: `irr-${Date.now()}`,
            deviceId: prev.sensor.deviceId,
            mulai: now,
            selesai: now,
            durasiMenit: Math.min(5, prev.settings.durasiMaksPompaMenit),
            kelembapanAwal: prev.sensor.kelembapanTanah,
            kelembapanAkhir: nextMoisture,
            mode: 'Manual' as const,
          },
          ...prev.irrigationEvents,
        ].slice(0, 12)
        : prev.irrigationEvents;

      return {
        ...prev,
        settings: { ...prev.settings, pompaMenyala: turnOn },
        irrigationEvents: nextEvents,
      };
    });

    return {
      ok: true,
      message: turnOn
        ? `Pompa dinyalakan manual (batas aman maks ${state.settings.durasiMaksPompaMenit} menit).`
        : 'Pompa dimatikan.',
    };
  };

  const linkTelegram = (chatIdInput?: string) => {
    void (async () => {
      try {
        const code = state.user.telegramLinkCode;
        const response = await fetch('/api/telegram/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, chatId: chatIdInput?.trim() || undefined }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal menghubungkan Telegram.');

        setState((prev) => ({
          ...prev,
          user: { ...prev.user, telegramChatId: result.chatId },
          notifications: [
            {
              id: `notif-tg-${Date.now()}`,
              judul: 'Bot Telegram tertaut',
              isi: `Pengingat panen aktif pukul ${prev.user.telegramReminderTime} WIB.`,
              waktu: 'Baru saja',
              tipe: 'telegram',
              dibaca: false,
            },
            ...prev.notifications,
          ],
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          notifications: [
            {
              id: `notif-tg-error-${Date.now()}`,
              judul: 'Telegram belum tertaut',
              isi: 'Gagal menghubungkan bot. Periksa Chat ID dan konfigurasi bot Telegram.',
              waktu: 'Baru saja',
              tipe: 'telegram',
              dibaca: false,
            },
            ...prev.notifications,
          ],
        }));
      }
    })();
  };

  const unlinkTelegram = () => {
    setState((prev) => ({ ...prev, user: { ...prev.user, telegramChatId: null } }));
  };

  const regenerateTelegramCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setState((prev) => ({ ...prev, user: { ...prev.user, telegramLinkCode: code } }));
  };

  const sendTestTelegramReminder = () => {
    const upcoming = state.harvestEvents[0];
    const plant = state.plants.find((p) => p.id === upcoming?.plantId);
    setState((prev) => ({
      ...prev,
      notifications: [
        {
          id: `notif-tg-test-${Date.now()}`,
          judul: 'Pesan Telegram terkirim (Uji)',
          isi: `Halo ${prev.user.nama}! Pengingat CermatTani (${prev.user.telegramReminderTime} WIB): ${plant?.nama || 'Tomat Servo #01'} dijadwalkan panen ${upcoming?.tanggal || 'hari ini'}.`,
          waktu: 'Baru saja',
          tipe: 'telegram',
          dibaca: false,
        },
        ...prev.notifications,
      ],
    }));
  };

  const updateUserProfile = (patch: Partial<UserProfile>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...patch } }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, dibaca: true })),
    }));
  };

  const clearAllNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
  };

  const updateReminderSchedule = (id: string, patch: Partial<ReminderSchedule>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        jadwalPengingat: prev.settings.jadwalPengingat.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      },
    }));
  };

  const addReminderSchedule: AppContextValue['addReminderSchedule'] = (input) => {
    const cleanLabel = input.label.trim();
    if (!cleanLabel) return;
    const newItem: ReminderSchedule = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: cleanLabel,
      kategori: input.kategori,
      jam: input.jam || '07:00',
      aktif: true,
      catatan: input.catatan.trim() || `Pengingat rutin pukul ${input.jam || '07:00'} WIB.`,
    };
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        jadwalPengingat: [...prev.settings.jadwalPengingat, newItem].sort((a, b) =>
          a.jam.localeCompare(b.jam)
        ),
      },
    }));
  };

  const deleteReminderSchedule = (id: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        jadwalPengingat: prev.settings.jadwalPengingat.filter((item) => item.id !== id),
      },
    }));
  };

  const triggerTestReminderAlert = (scheduleId?: string) => {
    const target =
      (scheduleId
        ? state.settings.jadwalPengingat.find((r) => r.id === scheduleId)
        : state.settings.jadwalPengingat.find((r) => r.aktif)) ||
      state.settings.jadwalPengingat[0];

    if (target) {
      const meta = getReminderAlertMeta(target.kategori);
      pushAlert({
        judul: `Pengingat: ${target.label} (${target.jam} WIB)`,
        isi: target.catatan || 'Waktunya menjalankan perawatan kebun sesuai jadwal yang ditentukan.',
        tipe: meta.tipe,
        severity: meta.severity,
        actionLabel: meta.actionLabel,
        actionScreen: meta.actionScreen,
      });
      return;
    }

    pushAlert({
      judul: 'Pengingat Siram Kebun',
      isi: 'Waktunya memeriksa kelembapan tanah dan menyiram bedengan tomat sesuai jadwal.',
      tipe: 'siram',
      severity: 'info',
      actionLabel: 'Buka Lahan',
      actionScreen: 'lahan',
    });
  };

  const requestBrowserNotifications = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      updateSettings({ notifikasiBrowser: true });
      return true;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      updateSettings({ notifikasiBrowser: granted });
      return granted;
    } catch {
      return false;
    }
  };

  const resetDemoData = () => {
    setState(createDefaultState(true));
    setActiveScreen('beranda');
  };

  const deleteAllUserData = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setState({
      ...createDefaultState(false),
      farms: [
        {
          id: 'farm-empty',
          userId: 'usr-1',
          nama: 'Kebun Baru',
          lokasi: 'Belum diisi',
          luasLabel: 'Kebun tomat',
        },
      ],
      activeFarmId: 'farm-empty',
      plants: [],
      scans: [],
      harvestEvents: [],
      tasks: [],
      notifications: [],
      chatMessages: [],
    });
    setActiveScreen('beranda');
  };

  return (
    <AppContext.Provider
      value={{
        state,
        hydrated,
        activeScreen,
        setActiveScreen,
        scanPreselectPart,
        scanPreselectPlantId,
        openScanWith,
        chatContextPlantId,
        openChatWithPlant,
        searchQuery,
        setSearchQuery,
        activeFarm,
        activeFarmPlants,
        unreadNotifCount,
        activeAlerts,
        pushAlert,
        dismissAlert,
        clearAllNotifications,
        updateReminderSchedule,
        addReminderSchedule,
        deleteReminderSchedule,
        triggerTestReminderAlert,
        requestBrowserNotifications,
        isOffline,
        completeOnboarding,
        reopenOnboarding,
        setActiveFarmId,
        addFarm,
        addPlant,
        saveScan,
        enqueueOfflineScan,
        processOfflineQueue,
        addHarvestEvent,
        markHarvestActual,
        toggleTask,
        addTask,
        addChatMessage,
        clearChatMessages,
        updateSettings,
        updateSensor,
        triggerManualPump,
        linkTelegram,
        unlinkTelegram,
        regenerateTelegramCode,
        sendTestTelegramReminder,
        updateUserProfile,
        markAllNotificationsRead,
        resetDemoData,
        deleteAllUserData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider');
  return ctx;
}
