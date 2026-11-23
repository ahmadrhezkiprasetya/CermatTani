'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppSettings,
  ChatMessage,
  DeviceInfo,
  Farm,
  FarmTask,
  GrowthPhase,
  HarvestEvent,
  IrrigationEvent,
  NotificationItem,
  OfflineQueueItem,
  Plant,
  PlantPart,
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

export const SCREEN_PATHS: Record<ScreenId, string> = {
  beranda: '/',
  scan: '/scan',
  tanaman: '/tanaman',
  kalender: '/kalender',
  lahan: '/lahan',
  energi: '/energi',
  cermo: '/cermo',
  pengaturan: '/pengaturan',
};

function pathnameToScreen(pathname: string | null): ScreenId {
  if (!pathname || pathname === '/') return 'beranda';
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

function loadPersistedState(): PersistedState {
  if (typeof window === 'undefined') return createDefaultState(false);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState(false);
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const def = createDefaultState(false);
    return {
      ...def,
      ...parsed,
      user: { ...def.user, ...(parsed.user || {}) },
      sensor: { ...def.sensor, ...(parsed.sensor || {}) },
      settings: { ...def.settings, ...(parsed.settings || {}) },
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
  const router = useRouter();
  const pathname = usePathname();
  const activeScreen = pathnameToScreen(pathname);

  const [state, setState] = useState<PersistedState>(() => createDefaultState(false));
  const [hydrated, setHydrated] = useState(false);
  const [scanPreselectPart, setScanPreselectPart] = useState<PlantPart | null>(null);
  const [scanPreselectPlantId, setScanPreselectPlantId] = useState<string | null>(null);
  const [chatContextPlantId, setChatContextPlantId] = useState<string | null>(INITIAL_PLANTS[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [browserOffline, setBrowserOffline] = useState(false);

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

  const setActiveScreen = (screen: ScreenId) => {
    router.push(SCREEN_PATHS[screen]);
  };

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
      const result = await runTomatoScanAnalysis({
        plant,
        bagian: item.bagian,
        fotoUrl: item.fotoUrl,
        presetId: item.presetId,
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
            isi: `Scan ${item.bagian} untuk ${plant.nama} sudah selesai diproses otomatis.`,
            waktu: 'Baru saja',
            tipe: 'panen',
            dibaca: false,
          },
          ...prev.notifications,
        ],
      }));
      count++;
    }
    return count;
  };

  useEffect(() => {
    if (hydrated && !isOffline && state.offlineQueue.length > 0) {
      void processOfflineQueue();
    }
  }, [isOffline, hydrated]);

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
    router.push('/scan');
  };

  const openChatWithPlant = (plantId: string | null) => {
    setChatContextPlantId(plantId);
    router.push('/cermo');
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

    router.push(payload?.goToScan ? '/scan' : '/');
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
          waktu: 'Baru saja',
          tipe: 'penyakit',
          dibaca: false,
        });
      }

      return {
        ...prev,
        scans: [scan, ...prev.scans],
        harvestEvents: nextHarvests,
        notifications: nextNotifs,
      };
    });
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
      return {
        ok: false,
        message: `Tandon tinggal ${state.sensor.levelTandonPersen}%. Pompa kutahan dulu supaya tidak kering.`,
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

  const resetDemoData = () => {
    setState(createDefaultState(true));
    router.push('/');
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
      chatMessages: [
        {
          id: 'chat-clean',
          plantId: null,
          peran: 'cermo',
          isi: 'Semua data lokal sudah dihapus. Halo lagi! Aku Cermo, siap mulai dari awal bersamamu.',
          waktu: new Date().toISOString(),
        },
      ],
    });
    router.push('/');
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
