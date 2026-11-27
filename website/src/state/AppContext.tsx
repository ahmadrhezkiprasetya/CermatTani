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
import { KNOWLEDGE_DISEASES, KNOWLEDGE_NUTRIENTS, RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { estimateWeightForVariety, inferCommodityFromVariety } from '../data/plantVarieties';
import {
  getSupabaseAccessToken,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
import { cermatSupabaseRepo, isUuid } from '@/lib/supabase/repository';

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
  actionScreen: Exclude<ScreenId, 'landing' | 'login'>;
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
  login: '/login',
  beranda: '/dashboard',
  scan: '/scan',
  tanaman: '/tanaman',
  kalender: '/kalender',
  lahan: '/lahan',
  simulasi: '/simulasi',
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

interface TelegramActionResult {
  ok: boolean;
  message: string;
  code?: string;
  botUrl?: string;
  expiresAt?: string;
  connected?: boolean;
  chatId?: string | null;
  username?: string | null;
}

async function getTelegramAuthorizationHeader(): Promise<string> {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Silakan masuk ke akun CermatTani terlebih dahulu.');
  return `Bearer ${accessToken}`;
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
  authUser: { id: string; email: string } | null;
  authReady: boolean;
  dbSyncStatus: { state: 'idle' | 'syncing' | 'ok' | 'error'; message: string };
  refreshSupabaseSync: () => Promise<void>;
  postLoginScreen: ScreenId | null;
  openLogin: (targetAfterLogin?: ScreenId) => void;
  signInAccount: (email: string, password: string) => Promise<void>;
  registerAccount: (input: {
    nama: string;
    email: string;
    password: string;
    namaKebun?: string;
    lokasiKebun?: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOutAccount: () => Promise<void>;
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  scanPreselectPart: PlantPart | null;
  scanPreselectPlantId: string | null;
  openScanWith: (part?: PlantPart, plantId?: string) => void;
  chatContextPlantId: string | null;
  chatContextScan: ScanRecord | null;
  pendingChatQuestion: string | null;
  openChatWithPlant: (plantId: string | null) => void;
  openChatWithScan: (scan: ScanRecord, initialQuestion?: string) => void;
  clearPendingChatQuestion: () => void;
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
  linkTelegram: () => Promise<TelegramActionResult>;
  refreshTelegramConnection: () => Promise<TelegramActionResult>;
  unlinkTelegram: () => Promise<TelegramActionResult>;
  sendTestTelegramReminder: () => Promise<{ ok: boolean; message: string }>;
  shareScanToTelegram: (scan: ScanRecord) => Promise<{ ok: boolean; message: string }>;
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
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [dbSyncStatus, setDbSyncStatus] = useState<{
    state: 'idle' | 'syncing' | 'ok' | 'error';
    message: string;
  }>({ state: 'idle', message: '' });
  const [postLoginScreen, setPostLoginScreen] = useState<ScreenId | null>(null);
  const sensorSyncTimerRef = useRef<number | null>(null);
  const [scanPreselectPart, setScanPreselectPart] = useState<PlantPart | null>(null);
  const [scanPreselectPlantId, setScanPreselectPlantId] = useState<string | null>(null);
  const [chatContextPlantId, setChatContextPlantId] = useState<string | null>(INITIAL_PLANTS[0]?.id ?? null);
  const [chatContextScan, setChatContextScan] = useState<ScanRecord | null>(null);
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);
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

      // Maksimal 1 alert aktif sekaligus agar tidak pernah menumpuk / menutupi layar;
      // semua riwayat tetap tersimpan di panel lonceng notifikasi.
      alertTimersRef.current.forEach((oldTimer) => window.clearTimeout(oldTimer));
      alertTimersRef.current.clear();
      setActiveAlerts([toast]);

      if (typeof window !== 'undefined') {
        const timeoutMs = input.severity === 'bad' ? 5500 : 4500;
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
        const notifItem: NotificationItem = {
          id: `notif-${id}`,
          judul: input.judul,
          isi: input.isi,
          waktu,
          tipe: input.tipe,
          dibaca: false,
          severity: input.severity,
          actionLabel: input.actionLabel,
          actionScreen: input.actionScreen,
        };
        setState((prev) => ({
          ...prev,
          notifications: [notifItem, ...prev.notifications].slice(0, 35),
        }));
        if (authUser && isSupabaseConfigured) {
          void cermatSupabaseRepo
            .insertNotification({
              judul: notifItem.judul,
              isi: notifItem.isi,
              waktu: notifItem.waktu,
              tipe: notifItem.tipe,
              dibaca: false,
              severity: notifItem.severity,
              actionLabel: notifItem.actionLabel,
              actionScreen: notifItem.actionScreen,
            })
            .catch(() => {});
        }
      }
    },
    [state.settings.notifikasiBrowser, authUser]
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

  // Muat seluruh 14 tabel Supabase berelasi milik akun yang login
  const hydrateFromSupabaseAccount = useCallback(
    async (starterOpts?: { nama?: string; namaKebun?: string; lokasiKebun?: string }) => {
      if (!isSupabaseConfigured) return;
      setDbSyncStatus({ state: 'syncing', message: 'Menyinkronkan 14 tabel akun Supabase...' });
      try {
        const starterRes = await cermatSupabaseRepo.ensureStarterWorkspace(starterOpts);
        const bundle = await cermatSupabaseRepo.fetchAccountBundle();
        if (!bundle || !bundle.profile) {
          if (starterRes.error) {
            setDbSyncStatus({ state: 'error', message: starterRes.error });
          } else {
            setDbSyncStatus({ state: 'idle', message: '' });
          }
          return;
        }

        const combinedError = starterRes.error || bundle.syncError;
        setState((prev) => {
          const nextFarms = bundle.farms.length > 0 ? bundle.farms : prev.farms;
          const nextActiveFarmId =
            nextFarms.find((f) => f.id === prev.activeFarmId)?.id || nextFarms[0]?.id || prev.activeFarmId;
          const nextPlants = bundle.plants.length > 0 ? bundle.plants : prev.plants;
          const nextDevices = bundle.devices.length > 0 ? bundle.devices : prev.devices;
          const nextDeviceId = nextDevices[0]?.id || prev.sensor.deviceId;
          const nextSensor: SensorSnapshot = {
            ...prev.sensor,
            deviceId: nextDeviceId,
            ...(bundle.latestSensor || {}),
          };

          return {
            ...prev,
            onboarded: true,
            user: bundle.profile!,
            farms: nextFarms,
            activeFarmId: nextActiveFarmId,
            plants: nextPlants,
            scans: bundle.scans,
            harvestEvents: bundle.harvestEvents,
            chatMessages: bundle.chatMessages,
            devices: nextDevices,
            sensor: nextSensor,
            sensor24h: bundle.sensor24h.length >= 2 ? bundle.sensor24h : prev.sensor24h,
            irrigationEvents:
              bundle.irrigationEvents.length > 0 ? bundle.irrigationEvents : prev.irrigationEvents,
            tasks: bundle.tasks.length > 0 ? bundle.tasks : prev.tasks,
            notifications: bundle.notifications.length > 0 ? bundle.notifications : prev.notifications,
            settings: {
              ...prev.settings,
              ...(bundle.profileSettings.tema ? { tema: bundle.profileSettings.tema } : {}),
              ...(bundle.profileSettings.ambangKeyakinanRendah !== undefined
                ? { ambangKeyakinanRendah: bundle.profileSettings.ambangKeyakinanRendah }
                : {}),
              ...(bundle.profileSettings.notifikasiBrowser !== undefined
                ? { notifikasiBrowser: bundle.profileSettings.notifikasiBrowser }
                : {}),
              ...(bundle.profileSettings.peringatanOtomatisSensor !== undefined
                ? { peringatanOtomatisSensor: bundle.profileSettings.peringatanOtomatisSensor }
                : {}),
              ...Object.fromEntries(
                Object.entries(bundle.deviceSettings).filter(([, v]) => v !== undefined)
              ),
              ...(bundle.reminderSchedules.length > 0
                ? { jadwalPengingat: bundle.reminderSchedules }
                : {}),
            },
          };
        });
        if (bundle.plants[0]?.id) {
          setChatContextPlantId(bundle.plants[0].id);
        }

        if (combinedError) {
          setDbSyncStatus({ state: 'error', message: combinedError });
        } else {
          setDbSyncStatus({ state: 'ok', message: 'Tersinkron penuh ke 14 tabel Supabase' });
        }
      } catch (err) {
        setDbSyncStatus({
          state: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Gagal menyinkronkan akun ke Supabase. Periksa koneksi & file SQL 08.',
        });
      }
    },
    []
  );

  const refreshSupabaseSync = useCallback(async () => {
    await hydrateFromSupabaseAccount();
  }, [hydrateFromSupabaseAccount]);

  // Sinkronkan sesi Auth Supabase saat pertama kali halaman dibuka & saat login/logout terjadi
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setAuthReady(true);
      return;
    }

    let alive = true;
    sb.auth
      .getSession()
      .then(async ({ data }) => {
        if (!alive) return;
        const user = data.session?.user;
        if (user) {
          setAuthUser({ id: user.id, email: user.email || '' });
          await hydrateFromSupabaseAccount();
        } else {
          setAuthUser(null);
        }
      })
      .finally(() => {
        if (alive) setAuthReady(true);
      });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const user = session?.user;
      if (user) {
        setAuthUser({ id: user.id, email: user.email || '' });
      } else {
        setAuthUser(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromSupabaseAccount]);

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

  const openLogin = useCallback(
    (targetAfterLogin?: ScreenId) => {
      if (targetAfterLogin && targetAfterLogin !== 'landing' && targetAfterLogin !== 'login') {
        setPostLoginScreen(targetAfterLogin);
      } else {
        setPostLoginScreen('beranda');
      }
      setActiveScreen('login');
    },
    [setActiveScreen]
  );

  const signInAccount = useCallback(
    async (email: string, password: string) => {
      const res = await cermatSupabaseRepo.signIn(email, password);
      if (res.user) {
        setAuthUser({ id: res.user.id, email: res.user.email || email });
        await hydrateFromSupabaseAccount();
        const dest = postLoginScreen && postLoginScreen !== 'login' ? postLoginScreen : 'beranda';
        setPostLoginScreen(null);
        setActiveScreen(dest);
      }
    },
    [hydrateFromSupabaseAccount, postLoginScreen, setActiveScreen]
  );

  const registerAccount: AppContextValue['registerAccount'] = useCallback(
    async (input) => {
      const res = await cermatSupabaseRepo.signUp(input.email, input.password, input.nama);
      if (res.session && res.user) {
        setAuthUser({ id: res.user.id, email: res.user.email || input.email });
        await hydrateFromSupabaseAccount({
          nama: input.nama,
          namaKebun: input.namaKebun,
          lokasiKebun: input.lokasiKebun,
        });
        const dest = postLoginScreen && postLoginScreen !== 'login' ? postLoginScreen : 'beranda';
        setPostLoginScreen(null);
        setActiveScreen(dest);
        return { needsEmailConfirmation: false };
      }
      return { needsEmailConfirmation: true };
    },
    [hydrateFromSupabaseAccount, postLoginScreen, setActiveScreen]
  );

  const signOutAccount = useCallback(async () => {
    await cermatSupabaseRepo.signOut();
    setAuthUser(null);
    setChatContextScan(null);
    setPendingChatQuestion(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setState(createDefaultState(false));
    setActiveScreen('landing');
  }, [setActiveScreen]);

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

  const forwardToTelegram = useCallback(
    (payload: {
      chatId: string | null;
      kind: 'test' | 'reminder' | 'alert' | 'scan';
      title: string;
      message: string;
      lines?: string[];
    }) => {
      if (!payload.chatId || isOffline || typeof window === 'undefined') return;
      void (async () => {
        const authorization = await getTelegramAuthorizationHeader();
        const response = await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authorization },
          body: JSON.stringify({
            kind: payload.kind,
            title: payload.title,
            message: payload.message,
            lines: payload.lines,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          console.error('Gagal mengirim notifikasi Telegram:', result?.error || response.statusText);
        }
      })().catch((error: unknown) => {
        console.error('Tidak dapat mengautentikasi pengiriman Telegram:', error);
      });
    },
    [isOffline]
  );

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
        const remBody = item.catatan || `Jadwal pengingat pukul ${item.jam} WIB telah tiba.`;
        pushAlert({
          judul: `Waktunya ${item.label}`,
          isi: remBody,
          tipe: meta.tipe,
          severity: meta.severity,
          actionLabel: meta.actionLabel,
          actionScreen: meta.actionScreen,
        });
        forwardToTelegram({
          chatId: state.user.telegramChatId,
          kind: 'reminder',
          title: `Pengingat Kebun · ${item.label} (${item.jam} WIB)`,
          message: remBody,
          lines: [`Kebun aktif: ${state.farms.find((f) => f.id === state.activeFarmId)?.nama || 'Kebun Utama'}`],
        });
      }

      if (updated) persistFired();
    };

    checkSchedules();
    const intervalId = window.setInterval(checkSchedules, 10000);
    return () => window.clearInterval(intervalId);
  }, [hydrated, state.settings.jadwalPengingat, state.user.telegramChatId, state.farms, state.activeFarmId, pushAlert, forwardToTelegram]);

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
        const msg = `Kelembapan media turun di bawah batas ${state.settings.ambangTanahBawah}%. ${state.settings.irigasiOtomatis && !tankLow
          ? 'Pompa irigasi otomatis sudah diaktifkan.'
          : 'Segera cek irigasi di halaman Lahan.'
          }`;
        pushAlert({
          judul: `Waktunya Siram! Tanah kering (${state.sensor.kelembapanTanah}%)`,
          isi: msg,
          tipe: 'siram',
          severity: 'warn',
          actionLabel: 'Buka Lahan',
          actionScreen: 'lahan',
        });
        forwardToTelegram({
          chatId: state.user.telegramChatId,
          kind: 'alert',
          title: `Tanah Kering (${state.sensor.kelembapanTanah}%)`,
          message: msg,
        });
      }
      if (tankLow && !prev.tankLow) {
        const msg = `Air tandon di bawah ${state.settings.ambangTandonRendah}%. Pompa dikunci otomatis agar tidak kering—isi ulang tandon segera.`;
        pushAlert({
          judul: `Peringatan Tandon Kritis (${state.sensor.levelTandonPersen}%)`,
          isi: msg,
          tipe: 'tandon',
          severity: 'bad',
          actionLabel: 'Cek Tandon',
          actionScreen: 'lahan',
        });
        forwardToTelegram({
          chatId: state.user.telegramChatId,
          kind: 'alert',
          title: `Tandon Air Kritis (${state.sensor.levelTandonPersen}%)`,
          message: msg,
        });
      }
      if (diseaseRisk && !prev.diseaseRisk) {
        const msg = `Udara kebun sangat lembap (≥${state.settings.ambangKelembapanRisikoPenyakit}% RH). Periksa bercak daun bawah dan kurangi siram sore.`;
        pushAlert({
          judul: `Waspada Risiko Jamur (${state.sensor.kelembapanUdara}% RH)`,
          isi: msg,
          tipe: 'penyakit',
          severity: 'warn',
          actionLabel: 'Scan Daun',
          actionScreen: 'scan',
        });
        forwardToTelegram({
          chatId: state.user.telegramChatId,
          kind: 'alert',
          title: `Risiko Jamur Meningkat (${state.sensor.kelembapanUdara}% RH)`,
          message: msg,
        });
      }
      if (batteryLow && !prev.batteryLow) {
        const msg = `Perangkat masuk mode hemat daya (≤${state.settings.ambangBateraiHemat}%). Pastikan panel surya tidak tertutup bayangan.`;
        pushAlert({
          judul: `Baterai Surya Rendah (${state.sensor.bateraiPersen}%)`,
          isi: msg,
          tipe: 'energi',
          severity: 'warn',
          actionLabel: 'Energi Surya',
          actionScreen: 'energi',
        });
        forwardToTelegram({
          chatId: state.user.telegramChatId,
          kind: 'alert',
          title: `Baterai Surya Rendah (${state.sensor.bateraiPersen}%)`,
          message: msg,
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
    state.user.telegramChatId,
    pushAlert,
    forwardToTelegram,
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
    if (chatContextScan && chatContextScan.plantId !== plantId) {
      setChatContextScan(null);
    }
    setActiveScreen('cermo');
  };

  const openChatWithScan = (scan: ScanRecord, initialQuestion?: string) => {
    setChatContextPlantId(scan.plantId);
    setChatContextScan(scan);
    const trimmed = initialQuestion?.trim();
    if (trimmed) {
      setPendingChatQuestion(trimmed);
    }
    setActiveScreen('cermo');
  };

  const clearPendingChatQuestion = useCallback(() => {
    setPendingChatQuestion(null);
  }, []);

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
          luasLabel: 'Kebun hortikultura',
        };
        nextFarms = [newFarm, ...prev.farms];
        nextActiveFarmId = newFarmId;

        if (payload.plantName && payload.plantName.trim()) {
          const cleanVar = payload.varietas?.trim() || 'Cabai Rawit';
          const newPlant: Plant = {
            id: `plant-${Date.now()}`,
            farmId: newFarmId,
            nama: payload.plantName.trim(),
            varietas: cleanVar,
            bobotRataBuahGram: estimateWeightForVariety(cleanVar),
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
    const tempId = `farm-${Date.now()}`;
    const farm: Farm = {
      id: tempId,
      userId: state.user.id,
      nama: nama.trim(),
      lokasi: lokasi.trim() || 'Lokasi kebun',
      luasLabel: luasLabel.trim() || 'Kebun hortikultura',
    };
    setState((prev) => ({
      ...prev,
      farms: [...prev.farms, farm],
      activeFarmId: farm.id,
    }));

    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo
        .createFarm({ nama: farm.nama, lokasi: farm.lokasi, luasLabel: farm.luasLabel })
        .then((created) => {
          if (!created) return;
          setState((prev) => ({
            ...prev,
            farms: prev.farms.map((f) => (f.id === tempId ? created : f)),
            activeFarmId: prev.activeFarmId === tempId ? created.id : prev.activeFarmId,
          }));
        })
        .catch(() => { });
    }
    return farm;
  };

  const addPlant: AppContextValue['addPlant'] = (input) => {
    const tempId = `plant-${Date.now()}`;
    const cleanVar = input.varietas.trim() || 'Cabai Rawit';
    const plant: Plant = {
      id: tempId,
      farmId: input.farmId,
      nama: input.nama.trim(),
      varietas: cleanVar,
      bobotRataBuahGram: input.bobotRataBuahGram || estimateWeightForVariety(cleanVar),
      tanggalTanam: input.tanggalTanam,
      fase: input.fase,
    };
    setState((prev) => ({ ...prev, plants: [plant, ...prev.plants] }));

    if (authUser && isSupabaseConfigured && isUuid(input.farmId)) {
      void cermatSupabaseRepo
        .createPlant({
          farmId: input.farmId,
          nama: plant.nama,
          komoditas: inferCommodityFromVariety(cleanVar),
          varietas: plant.varietas,
          tanggalTanam: plant.tanggalTanam,
          fase: plant.fase,
          bobotRataBuahGram: plant.bobotRataBuahGram,
        })
        .then((created) => {
          if (!created) return;
          setState((prev) => ({
            ...prev,
            plants: prev.plants.map((p) => (p.id === tempId ? created : p)),
          }));
        })
        .catch(() => { });
    }
    return plant;
  };

  const saveScan = (scan: ScanRecord) => {
    let createdHarvestPayload: Omit<HarvestEvent, 'id'> | null = null;
    const isRipenessScan =
      scan.fokusOutput === 'kematangan' || (!scan.fokusOutput && scan.bagian === 'buah');
    if (isRipenessScan && scan.estimasiHariMin !== null && !scan.tanpaBuahTerdeteksi) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + scan.estimasiHariMin);
      createdHarvestPayload = {
        plantId: scan.plantId,
        tanggal: targetDate.toISOString().slice(0, 10),
        sumber: 'estimasi',
        catatan:
          scan.anjuranPanen === 'Panen sekarang'
            ? `${scan.jumlahBuah} buah matang siap dipetik`
            : `Estimasi tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari (${scan.jumlahBuah} buah)`,
        estimasiKg: Number((scan.estimasiBobotGram / 1000).toFixed(2)),
      };
    }

    setState((prev) => {
      const nextHarvests = [...prev.harvestEvents];
      const nextNotifs = [...prev.notifications];
      const plant = prev.plants.find((p) => p.id === scan.plantId);

      if (createdHarvestPayload) {
        nextHarvests.unshift({
          id: `harv-${Date.now()}`,
          ...createdHarvestPayload,
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

    // Simpan otomatis ke tabel `scans` (+ Storage `scan-photos`) & `harvest_events` di Supabase per akun!
    if (authUser && isSupabaseConfigured && isUuid(scan.plantId)) {
      void (async () => {
        try {
          const fotoPath = await cermatSupabaseRepo.uploadScanPhotoDataUrl(
            scan.plantId,
            scan.fotoUrl
          );
          const inserted = await cermatSupabaseRepo.insertScan(scan, fotoPath);
          if (inserted?.id) {
            setState((prev) => ({
              ...prev,
              scans: prev.scans.map((s) => (s.id === scan.id ? { ...s, id: inserted.id } : s)),
            }));
          }
          if (createdHarvestPayload) {
            await cermatSupabaseRepo.insertHarvestEvent(createdHarvestPayload);
          }
        } catch {
          // Tetap tersimpan lokal
        }
      })();
    }

    if (scan.penyakitUtamaId !== 'sehat') {
      const plant = state.plants.find((p) => p.id === scan.plantId);
      const dis = KNOWLEDGE_DISEASES[scan.penyakitUtamaId];
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
      forwardToTelegram({
        chatId: state.user.telegramChatId,
        kind: 'scan',
        title: `Temuan Penyakit: ${dis?.penyakit || scan.penyakitUtamaNama}`,
        message: `Tanaman ${plant?.nama || 'Kebun'} (${plant?.varietas || ''}) terdeteksi indikasi penyakit (keyakinan ${scan.keyakinan}%).`,
        lines: [
          ...(dis?.solusiOrganik.slice(0, 2).map((s) => `Solusi organik: ${s}`) || []),
          'Buka CermatTani untuk diskusi lanjutan dengan Chatbot Cermo.',
        ],
      });
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
    const tempId = `harv-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      harvestEvents: [{ ...ev, id: tempId }, ...prev.harvestEvents],
    }));
    if (authUser && isSupabaseConfigured && isUuid(ev.plantId)) {
      void cermatSupabaseRepo
        .insertHarvestEvent(ev)
        .then((inserted) => {
          if (!inserted?.id) return;
          setState((prev) => ({
            ...prev,
            harvestEvents: prev.harvestEvents.map((h) =>
              h.id === tempId ? { ...h, id: inserted.id } : h
            ),
          }));
        })
        .catch(() => { });
    }
  };

  const markHarvestActual = (id: string) => {
    setState((prev) => ({
      ...prev,
      harvestEvents: prev.harvestEvents.map((h) =>
        h.id === id ? { ...h, sumber: 'aktual' } : h
      ),
    }));
    if (authUser && isSupabaseConfigured && isUuid(id)) {
      void cermatSupabaseRepo.markHarvestActual(id).catch(() => { });
    }
  };

  const toggleTask = (id: string) => {
    let nextDone: boolean | null = null;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        nextDone = !t.selesai;
        return { ...t, selesai: !t.selesai };
      }),
    }));
    if (authUser && isSupabaseConfigured && isUuid(id) && nextDone !== null) {
      void cermatSupabaseRepo.toggleFarmTask(id, nextDone).catch(() => {});
    }
  };

  const addTask = (judul: string, kategori: FarmTask['kategori'], waktuLabel: string) => {
    const cleanJudul = judul.trim();
    if (!cleanJudul) return;
    const tempId = `task-${Date.now()}`;
    const farmId = state.activeFarmId;
    setState((prev) => ({
      ...prev,
      tasks: [
        {
          id: tempId,
          farmId: prev.activeFarmId,
          judul: cleanJudul,
          kategori,
          waktuLabel,
          selesai: false,
        },
        ...prev.tasks,
      ],
    }));
    if (authUser && isSupabaseConfigured && isUuid(farmId)) {
      void cermatSupabaseRepo
        .createFarmTask(farmId, { judul: cleanJudul, kategori, waktuLabel })
        .then((created) => {
          if (!created) return;
          setState((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === tempId ? created : t)),
          }));
        })
        .catch(() => {});
    }
  };

  const addChatMessage: AppContextValue['addChatMessage'] = (msg) => {
    const tempId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        {
          ...msg,
          id: tempId,
          waktu: new Date().toISOString(),
        },
      ],
    }));
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo
        .insertChatMessage(msg.plantId, msg.peran, msg.isi)
        .then((inserted) => {
          if (!inserted?.id) return;
          setState((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.map((m) =>
              m.id === tempId ? { ...m, id: inserted.id } : m
            ),
          }));
        })
        .catch(() => { });
    }
  };

  const clearChatMessages = () => {
    setState((prev) => ({ ...prev, chatMessages: [] }));
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo.clearUserChats().catch(() => { });
    }
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    if (authUser && isSupabaseConfigured) {
      if (
        patch.tema !== undefined ||
        patch.ambangKeyakinanRendah !== undefined ||
        patch.notifikasiBrowser !== undefined ||
        patch.peringatanOtomatisSensor !== undefined
      ) {
        void cermatSupabaseRepo
          .updateProfile({
            tema: patch.tema,
            ambangKeyakinanRendah: patch.ambangKeyakinanRendah,
            notifikasiBrowser: patch.notifikasiBrowser,
            peringatanOtomatisSensor: patch.peringatanOtomatisSensor,
          })
          .catch(() => {});
      }

      const activeDeviceId = state.devices[0]?.id || state.sensor.deviceId;
      if (
        isUuid(activeDeviceId) &&
        (patch.irigasiOtomatis !== undefined ||
          patch.pompaMenyala !== undefined ||
          patch.ambangTanahBawah !== undefined ||
          patch.ambangTanahAtas !== undefined ||
          patch.durasiMaksPompaMenit !== undefined ||
          patch.ambangKelembapanRisikoPenyakit !== undefined ||
          patch.ambangTandonRendah !== undefined ||
          patch.ambangBateraiHemat !== undefined)
      ) {
        void cermatSupabaseRepo
          .updateDeviceSettings(activeDeviceId, {
            irigasiOtomatis: patch.irigasiOtomatis,
            pompaMenyala: patch.pompaMenyala,
            ambangTanahBawah: patch.ambangTanahBawah,
            ambangTanahAtas: patch.ambangTanahAtas,
            durasiMaksPompaMenit: patch.durasiMaksPompaMenit,
            ambangKelembapanRisikoPenyakit: patch.ambangKelembapanRisikoPenyakit,
            ambangTandonRendah: patch.ambangTandonRendah,
            ambangBateraiHemat: patch.ambangBateraiHemat,
          })
          .catch(() => {});
      }
    }
  };

  const updateSensor = (patch: Partial<SensorSnapshot>) => {
    let snapshotToSync: SensorSnapshot | null = null;
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
      snapshotToSync = merged;
      return { ...prev, sensor: merged };
    });

    if (authUser && isSupabaseConfigured && typeof window !== 'undefined') {
      const deviceId = state.devices[0]?.id || state.sensor.deviceId;
      if (isUuid(deviceId)) {
        if (sensorSyncTimerRef.current !== null) {
          window.clearTimeout(sensorSyncTimerRef.current);
        }
        sensorSyncTimerRef.current = window.setTimeout(() => {
          sensorSyncTimerRef.current = null;
          if (snapshotToSync) {
            void cermatSupabaseRepo.insertSensorReading(deviceId, snapshotToSync).catch(() => {});
          }
        }, 1200);
      }
    }
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

    const now = new Date().toISOString();
    const nextMoisture = turnOn
      ? Math.min(state.settings.ambangTanahAtas, state.sensor.kelembapanTanah + 12)
      : state.sensor.kelembapanTanah;
    const durasiMenit = Math.min(5, state.settings.durasiMaksPompaMenit);
    const activeDeviceId = state.devices[0]?.id || state.sensor.deviceId;

    setState((prev) => {
      const nextEvents = turnOn
        ? [
          {
            id: `irr-${Date.now()}`,
            deviceId: activeDeviceId,
            mulai: now,
            selesai: now,
            durasiMenit,
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

    if (authUser && isSupabaseConfigured && isUuid(activeDeviceId)) {
      void cermatSupabaseRepo.updateDeviceSettings(activeDeviceId, { pompaMenyala: turnOn }).catch(() => {});
      if (turnOn) {
        void cermatSupabaseRepo
          .insertIrrigationEvent(activeDeviceId, {
            mulai: now,
            selesai: now,
            durasiMenit,
            kelembapanAwal: state.sensor.kelembapanTanah,
            kelembapanAkhir: nextMoisture,
            mode: 'Manual',
            simulasi: state.sensor.simulasi,
          })
          .catch(() => {});
      }
    }

    return {
      ok: true,
      message: turnOn
        ? `Pompa dinyalakan manual (batas aman maks ${state.settings.durasiMaksPompaMenit} menit).`
        : 'Pompa dimatikan.',
    };
  };

  const linkTelegram = useCallback(async (): Promise<TelegramActionResult> => {
    try {
      const authorization = await getTelegramAuthorizationHeader();
      const response = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { Authorization: authorization },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.code || !result?.botUrl) {
        return { ok: false, message: result?.error || 'Gagal membuat kode tautan Telegram.' };
      }

      setState((prev) => ({
        ...prev,
        user: { ...prev.user, telegramLinkCode: result.code },
      }));

      return {
        ok: true,
        message: 'Kode tautan dibuat dan berlaku selama 10 menit.',
        code: result.code,
        botUrl: result.botUrl,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal membuat kode tautan Telegram.',
      };
    }
  }, []);

  const refreshTelegramConnection = useCallback(async (): Promise<TelegramActionResult> => {
    try {
      const authorization = await getTelegramAuthorizationHeader();
      const response = await fetch('/api/telegram/link', {
        headers: { Authorization: authorization },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, message: result?.error || 'Gagal memeriksa koneksi Telegram.' };
      }

      const chatId = result.connected && result.chatId ? String(result.chatId) : null;
      const code = result.code || '';
      setState((prev) => {
        if (prev.user.telegramChatId === chatId && prev.user.telegramLinkCode === code) return prev;
        return {
          ...prev,
          user: { ...prev.user, telegramChatId: chatId, telegramLinkCode: code },
        };
      });

      return {
        ok: true,
        message: result.connected ? 'Telegram sudah terhubung.' : 'Status koneksi Telegram diperbarui.',
        connected: Boolean(result.connected),
        chatId: result.chatId ? String(result.chatId) : null,
        username: result.username || null,
        code: result.code || undefined,
        botUrl: result.botUrl || undefined,
        expiresAt: result.expiresAt || undefined,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal memeriksa koneksi Telegram.',
      };
    }
  }, []);

  const unlinkTelegram = useCallback(async (): Promise<TelegramActionResult> => {
    try {
      const authorization = await getTelegramAuthorizationHeader();
      const response = await fetch('/api/telegram/link', {
        method: 'DELETE',
        headers: { Authorization: authorization },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, message: result?.error || 'Gagal memutus koneksi Telegram.' };
      }

      setState((prev) => ({
        ...prev,
        user: { ...prev.user, telegramChatId: null, telegramLinkCode: '' },
      }));
      return { ok: true, message: 'Koneksi Telegram berhasil diputus.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal memutus koneksi Telegram.',
      };
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !authUser) return;
    void refreshTelegramConnection().then((result) => {
      if (!result.ok) console.error('Gagal menyinkronkan koneksi Telegram:', result.message);
    });
  }, [authUser?.id, hydrated, refreshTelegramConnection]);

  useEffect(() => {
    if (!hydrated || !authReady || authUser) return;
    setState((prev) => {
      if (!prev.user.telegramChatId && !prev.user.telegramLinkCode) return prev;
      return {
        ...prev,
        user: { ...prev.user, telegramChatId: null, telegramLinkCode: '' },
      };
    });
  }, [authReady, authUser, hydrated]);

  const sendTestTelegramReminder = async (): Promise<{ ok: boolean; message: string }> => {
    const chatId = state.user.telegramChatId;
    if (!chatId) {
      return { ok: false, message: 'Tautkan akun Telegram terlebih dulu sebelum uji kirim.' };
    }
    const upcoming = state.harvestEvents.find((e) => e.sumber === 'estimasi') || state.harvestEvents[0];
    const plant = state.plants.find((p) => p.id === upcoming?.plantId) || state.plants[0];
    const title = 'Uji Pengingat CermatTani';
    const msg = `Halo ${state.user.nama}! Koneksi Bot Telegram CermatTani aktif. Pengingat harian dijadwalkan pukul ${state.user.telegramReminderTime} WIB.`;
    const lines = [
      `Kebun aktif: ${activeFarm?.nama || 'Kebun Utama'}`,
      upcoming
        ? `Jadwal panen terdekat: ${plant?.nama || 'Tanaman'} (${upcoming.tanggal}) — ${upcoming.catatan}`
        : `Tanaman terpantau: ${plant?.nama || 'Tanaman Kebun'}`,
      `Kondisi lahan: Tanah ${state.sensor.kelembapanTanah}% · Tandon ${state.sensor.levelTandonPersen}% · Baterai ${state.sensor.bateraiPersen}%`,
    ];

    try {
      const authorization = await getTelegramAuthorizationHeader();
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ kind: 'test', title, message: msg, lines }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: data?.error || 'Gagal mengirim pesan uji ke Telegram.' };
      }
      setState((prev) => ({
        ...prev,
        notifications: [
          {
            id: `notif-tg-test-${Date.now()}`,
            judul: 'Pesan uji Telegram terkirim',
            isi: `Pesan nyata sudah dikirim ke Chat ID ${chatId}. Cek aplikasi Telegram kamu.`,
            waktu: `${getLocalClockHHMM()} WIB`,
            tipe: 'telegram',
            dibaca: false,
          },
          ...prev.notifications,
        ],
      }));
      return { ok: true, message: 'Pesan uji berhasil dikirim! Cek chat Bot Telegram kamu sekarang.' };
    } catch {
      return { ok: false, message: 'Koneksi ke server Telegram terputus.' };
    }
  };

  const shareScanToTelegram = async (
    scan: ScanRecord
  ): Promise<{ ok: boolean; message: string }> => {
    const chatId = state.user.telegramChatId;
    if (!chatId) {
      return {
        ok: false,
        message: 'Akun Telegram belum tertaut. Buka menu Pengaturan → Pengingat Telegram untuk menyambungkan dulu ya.',
      };
    }

    const plant = state.plants.find((p) => p.id === scan.plantId);
    const plantLabel = plant ? `${plant.nama} (${plant.varietas})` : 'Tanaman Kebun';
    const fokus = scan.fokusOutput || (scan.tahapDominan ? 'kematangan' : 'penyakit');
    let title = `Laporan Scan · ${plantLabel}`;
    let message = '';
    const lines: string[] = [];

    if (fokus === 'penyakit') {
      const dis = KNOWLEDGE_DISEASES[scan.penyakitUtamaId] || KNOWLEDGE_DISEASES.sehat;
      title = `Hasil Scan Penyakit · ${dis.penyakit}`;
      message = `Tanaman: ${plantLabel} (Keyakinan ${scan.keyakinan}%). Penyebab: ${dis.penyebab}`;
      dis.solusiOrganik.slice(0, 2).forEach((s) => lines.push(`Organik dulu: ${s}`));
      if (dis.pencegahan[0]) lines.push(`Pencegahan: ${dis.pencegahan[0]}`);
    } else if (fokus === 'kematangan' && scan.tahapDominan) {
      const rip = RIPENESS_REFERENCE[scan.tahapDominan];
      title = `Hasil Scan Panen · ${rip.label} (${scan.anjuranPanen})`;
      message = `Tanaman: ${plantLabel} · ${scan.jumlahBuah} buah (perkiraan ~${scan.estimasiBobotGram} g, keyakinan ${scan.keyakinan}%).`;
      lines.push(
        scan.anjuranPanen === 'Panen sekarang'
          ? 'Anjuran: Panen sekarang (pagi atau sore hari).'
          : `Estimasi siap petik: ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari lagi.`
      );
      lines.push(`Pasca panen: ${rip.penangananPascaPanen}`);
      if (scan.penyakitRinganId && KNOWLEDGE_DISEASES[scan.penyakitRinganId]) {
        lines.push(`Catatan ringan: ${KNOWLEDGE_DISEASES[scan.penyakitRinganId].penyakit}`);
      }
    } else if (fokus === 'hara') {
      const nut = KNOWLEDGE_NUTRIENTS[scan.dugaanHaraId] || KNOWLEDGE_NUTRIENTS.cukup;
      title = `Hasil Scan Hara · ${nut.dugaan}`;
      message = `Tanaman: ${plantLabel} (Keyakinan ${scan.keyakinan}%). ${nut.gejala}`;
      lines.push(`Organik dulu: ${nut.rekomendasiOrganik}`);
      lines.push(`Dosis fase ${plant?.fase || 'Berbuah'}: ${nut.dosisPerFase[plant?.fase || 'Berbuah']}`);
      lines.push('Catatan: Bukan pengganti uji tanah.');
    } else {
      title = `Hasil Scan · ${plantLabel}`;
      message = scan.ringkasanAi || 'Objek tanaman belum terdeteksi jelas — coba foto ulang di tempat terang.';
    }

    try {
      const authorization = await getTelegramAuthorizationHeader();
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ kind: 'scan', title, message, lines }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: data?.error || 'Gagal mengirim hasil scan ke Telegram.' };
      }
      return { ok: true, message: 'Ringkasan hasil scan berhasil dikirim ke Telegram kamu!' };
    } catch {
      return { ok: false, message: 'Gagal terhubung ke server Telegram.' };
    }
  };

  const updateUserProfile = (patch: Partial<UserProfile>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...patch } }));
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo
        .updateProfile({
          nama: patch.nama,
          peran: patch.peran,
          telegramReminderTime: patch.telegramReminderTime,
        })
        .catch(() => { });
    }
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, dibaca: true })),
    }));
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo.markAllNotificationsRead().catch(() => {});
    }
  };

  const clearAllNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo.clearUserNotifications().catch(() => {});
    }
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
    if (authUser && isSupabaseConfigured && isUuid(id)) {
      void cermatSupabaseRepo.updateReminderSchedule(id, patch).catch(() => {});
    }
  };

  const addReminderSchedule: AppContextValue['addReminderSchedule'] = (input) => {
    const cleanLabel = input.label.trim();
    if (!cleanLabel) return;
    const tempId = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const newItem: ReminderSchedule = {
      id: tempId,
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
    if (authUser && isSupabaseConfigured) {
      void cermatSupabaseRepo
        .createReminderSchedule({
          label: newItem.label,
          kategori: newItem.kategori,
          jam: newItem.jam,
          aktif: true,
          catatan: newItem.catatan,
        })
        .then((created) => {
          if (!created) return;
          setState((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              jadwalPengingat: prev.settings.jadwalPengingat.map((item) =>
                item.id === tempId ? created : item
              ),
            },
          }));
        })
        .catch(() => {});
    }
  };

  const deleteReminderSchedule = (id: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        jadwalPengingat: prev.settings.jadwalPengingat.filter((item) => item.id !== id),
      },
    }));
    if (authUser && isSupabaseConfigured && isUuid(id)) {
      void cermatSupabaseRepo.deleteReminderSchedule(id).catch(() => {});
    }
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
          luasLabel: 'Kebun hortikultura',
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
        authUser,
        authReady,
        dbSyncStatus,
        refreshSupabaseSync,
        postLoginScreen,
        openLogin,
        signInAccount,
        registerAccount,
        signOutAccount,
        activeScreen,
        setActiveScreen,
        scanPreselectPart,
        scanPreselectPlantId,
        openScanWith,
        chatContextPlantId,
        chatContextScan,
        pendingChatQuestion,
        openChatWithPlant,
        openChatWithScan,
        clearPendingChatQuestion,
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
        refreshTelegramConnection,
        unlinkTelegram,
        sendTestTelegramReminder,
        shareScanToTelegram,
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
