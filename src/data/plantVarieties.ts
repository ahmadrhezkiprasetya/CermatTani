export interface PlantVarietyOption {
  value: string;
  label: string;
  komoditas: string;
  bobotGram: number;
  category?: string;
  scientificName?: string;
  source?: 'katalog' | 'satudata_klaten' | 'gbif' | 'wikipedia' | 'custom';
  sourceLabel?: string;
}

export interface PlantVarietyGroup {
  group: string;
  items: PlantVarietyOption[];
}

export const CUSTOM_VARIETY_VALUE = '__custom__';
export const SATUDATA_KLATEN_RESOURCE_ID = '2f1f79ad-1dea-4afa-a4d9-2904ed51d67f';
export const SATUDATA_KLATEN_API_BASE = 'https://satudata.klaten.go.id/api/3/action/datastore_search';

export const PLANT_VARIETY_GROUPS: PlantVarietyGroup[] = [
  {
    group: 'Sayur Buah & Polong',
    items: [
      { value: 'Cabai Rawit', label: 'Cabai Rawit', komoditas: 'Cabai', bobotGram: 8, category: 'Sayur Buah' },
      { value: 'Cabai Besar', label: 'Cabai Besar', komoditas: 'Cabai', bobotGram: 20, category: 'Sayur Buah' },
      { value: 'Cabai Keriting', label: 'Cabai Keriting', komoditas: 'Cabai', bobotGram: 10, category: 'Sayur Buah' },
      { value: 'Tomat Servo F1', label: 'Tomat Servo F1', komoditas: 'Tomat', bobotGram: 85, category: 'Sayur Buah' },
      { value: 'Tomat Gustavi', label: 'Tomat Gustavi', komoditas: 'Tomat', bobotGram: 95, category: 'Sayur Buah' },
      { value: 'Tomat Ceri', label: 'Tomat Ceri', komoditas: 'Tomat', bobotGram: 25, category: 'Sayur Buah' },
      { value: 'Terung Ungu', label: 'Terung / Terong Ungu', komoditas: 'Terung', bobotGram: 180, category: 'Sayur Buah' },
      { value: 'Kacang Panjang', label: 'Kacang Panjang', komoditas: 'Kacang Panjang', bobotGram: 35, category: 'Sayur Buah' },
      { value: 'Buncis', label: 'Buncis', komoditas: 'Buncis', bobotGram: 20, category: 'Sayur Buah' },
      { value: 'Mentimun', label: 'Mentimun', komoditas: 'Mentimun', bobotGram: 160, category: 'Sayur Buah' },
      { value: 'Paprika', label: 'Paprika', komoditas: 'Paprika', bobotGram: 150, category: 'Sayur Buah' },
      { value: 'Pare', label: 'Pare / Paria', komoditas: 'Pare', bobotGram: 220, category: 'Sayur Buah' },
      { value: 'Labu Siam', label: 'Labu Siam', komoditas: 'Labu', bobotGram: 320, category: 'Sayur Buah' },
      { value: 'Oyong / Gambas', label: 'Oyong / Gambas', komoditas: 'Oyong', bobotGram: 200, category: 'Sayur Buah' },
      { value: 'Okra', label: 'Okra', komoditas: 'Okra', bobotGram: 25, category: 'Sayur Buah' },
    ],
  },
  {
    group: 'Sayur Daun & Bunga',
    items: [
      { value: 'Selada Keriting', label: 'Selada Keriting', komoditas: 'Selada', bobotGram: 150, category: 'Sayur Daun' },
      { value: 'Bayam Hijau', label: 'Bayam Hijau', komoditas: 'Bayam', bobotGram: 40, category: 'Sayur Daun' },
      { value: 'Kangkung Darat', label: 'Kangkung Darat', komoditas: 'Kangkung', bobotGram: 50, category: 'Sayur Daun' },
      { value: 'Pakcoy', label: 'Pakcoy', komoditas: 'Pakcoy', bobotGram: 120, category: 'Sayur Daun' },
      { value: 'Sawi Hijau / Caisim', label: 'Sawi Hijau / Caisim', komoditas: 'Sawi', bobotGram: 90, category: 'Sayur Daun' },
      { value: 'Kubis / Kol', label: 'Kubis / Kol', komoditas: 'Kubis', bobotGram: 900, category: 'Sayur Daun' },
      { value: 'Brokoli', label: 'Brokoli', komoditas: 'Brokoli', bobotGram: 350, category: 'Sayur Daun' },
      { value: 'Kembang Kol', label: 'Kembang Kol', komoditas: 'Kembang Kol', bobotGram: 450, category: 'Sayur Daun' },
      { value: 'Seledri', label: 'Seledri', komoditas: 'Seledri', bobotGram: 60, category: 'Sayur Daun' },
      { value: 'Daun Bawang', label: 'Daun Bawang', komoditas: 'Daun Bawang', bobotGram: 45, category: 'Sayur Daun' },
      { value: 'Kemangi', label: 'Kemangi', komoditas: 'Kemangi', bobotGram: 30, category: 'Sayur Daun' },
      { value: 'Kale', label: 'Kale', komoditas: 'Kale', bobotGram: 120, category: 'Sayur Daun' },
    ],
  },
  {
    group: 'Pangan, Palawija & Umbi',
    items: [
      { value: 'Padi Inpari', label: 'Padi Inpari', komoditas: 'Padi', bobotGram: 30, category: 'Pangan & Umbi' },
      { value: 'Jagung Manis', label: 'Jagung Manis', komoditas: 'Jagung', bobotGram: 250, category: 'Pangan & Umbi' },
      { value: 'Kentang Granola', label: 'Kentang Granola', komoditas: 'Kentang', bobotGram: 110, category: 'Pangan & Umbi' },
      { value: 'Bawang Merah', label: 'Bawang Merah', komoditas: 'Bawang Merah', bobotGram: 15, category: 'Pangan & Umbi' },
      { value: 'Bawang Putih', label: 'Bawang Putih', komoditas: 'Bawang Putih', bobotGram: 25, category: 'Pangan & Umbi' },
      { value: 'Wortel', label: 'Wortel', komoditas: 'Wortel', bobotGram: 120, category: 'Pangan & Umbi' },
      { value: 'Ubi Jalar', label: 'Ubi Jalar', komoditas: 'Ubi Jalar', bobotGram: 280, category: 'Pangan & Umbi' },
      { value: 'Singkong / Ubikayu', label: 'Singkong / Ubikayu', komoditas: 'Singkong', bobotGram: 600, category: 'Pangan & Umbi' },
      { value: 'Kedelai', label: 'Kedelai', komoditas: 'Kedelai', bobotGram: 20, category: 'Pangan & Umbi' },
      { value: 'Kacang Tanah', label: 'Kacang Tanah', komoditas: 'Kacang Tanah', bobotGram: 30, category: 'Pangan & Umbi' },
      { value: 'Kacang Hijau', label: 'Kacang Hijau', komoditas: 'Kacang Hijau', bobotGram: 20, category: 'Pangan & Umbi' },
    ],
  },
  {
    group: 'Buah-buahan Kebun',
    items: [
      { value: 'Melon', label: 'Melon', komoditas: 'Melon', bobotGram: 1500, category: 'Buah Kebun' },
      { value: 'Semangka', label: 'Semangka', komoditas: 'Semangka', bobotGram: 3500, category: 'Buah Kebun' },
      { value: 'Stroberi', label: 'Stroberi', komoditas: 'Stroberi', bobotGram: 20, category: 'Buah Kebun' },
      { value: 'Jeruk Siam', label: 'Jeruk Siam', komoditas: 'Jeruk', bobotGram: 120, category: 'Buah Kebun' },
      { value: 'Anggur', label: 'Anggur', komoditas: 'Anggur', bobotGram: 300, category: 'Buah Kebun' },
      { value: 'Mangga', label: 'Mangga', komoditas: 'Mangga', bobotGram: 400, category: 'Buah Kebun' },
      { value: 'Pisang', label: 'Pisang', komoditas: 'Pisang', bobotGram: 150, category: 'Buah Kebun' },
      { value: 'Pepaya California', label: 'Pepaya California', komoditas: 'Pepaya', bobotGram: 1200, category: 'Buah Kebun' },
      { value: 'Alpukat', label: 'Alpukat', komoditas: 'Alpukat', bobotGram: 350, category: 'Buah Kebun' },
      { value: 'Durian', label: 'Durian', komoditas: 'Durian', bobotGram: 2500, category: 'Buah Kebun' },
      { value: 'Jambu Kristal', label: 'Jambu Kristal', komoditas: 'Jambu', bobotGram: 280, category: 'Buah Kebun' },
      { value: 'Nanas', label: 'Nanas', komoditas: 'Nanas', bobotGram: 1100, category: 'Buah Kebun' },
      { value: 'Buah Naga', label: 'Buah Naga', komoditas: 'Buah Naga', bobotGram: 450, category: 'Buah Kebun' },
      { value: 'Apel', label: 'Apel', komoditas: 'Apel', bobotGram: 180, category: 'Buah Kebun' },
    ],
  },
  {
    group: 'Rempah, Obat (TOGA) & Perkebunan',
    items: [
      { value: 'Jahe Merah', label: 'Jahe Merah', komoditas: 'Jahe', bobotGram: 180, category: 'Rempah & Perkebunan' },
      { value: 'Kunyit', label: 'Kunyit', komoditas: 'Kunyit', bobotGram: 140, category: 'Rempah & Perkebunan' },
      { value: 'Lengkuas', label: 'Lengkuas', komoditas: 'Lengkuas', bobotGram: 200, category: 'Rempah & Perkebunan' },
      { value: 'Serai', label: 'Serai', komoditas: 'Serai', bobotGram: 80, category: 'Rempah & Perkebunan' },
      { value: 'Kopi Arabika', label: 'Kopi Arabika', komoditas: 'Kopi', bobotGram: 25, category: 'Rempah & Perkebunan' },
      { value: 'Kakao', label: 'Kakao / Cokelat', komoditas: 'Kakao', bobotGram: 400, category: 'Rempah & Perkebunan' },
      { value: 'Vanili', label: 'Vanili', komoditas: 'Vanili', bobotGram: 20, category: 'Rempah & Perkebunan' },
      { value: 'Lada', label: 'Lada / Merica', komoditas: 'Lada', bobotGram: 15, category: 'Rempah & Perkebunan' },
      { value: 'Tebu', label: 'Tebu', komoditas: 'Tebu', bobotGram: 1500, category: 'Rempah & Perkebunan' },
      { value: 'Tembakau', label: 'Tembakau', komoditas: 'Tembakau', bobotGram: 60, category: 'Rempah & Perkebunan' },
    ],
  },
  {
    group: 'Tanaman Hias & Pekarangan',
    items: [
      { value: 'Anggrek', label: 'Anggrek', komoditas: 'Anggrek', bobotGram: 50, category: 'Tanaman Hias' },
      { value: 'Mawar', label: 'Mawar', komoditas: 'Mawar', bobotGram: 40, category: 'Tanaman Hias' },
      { value: 'Monstera', label: 'Monstera', komoditas: 'Monstera', bobotGram: 100, category: 'Tanaman Hias' },
      { value: 'Aglonema', label: 'Aglonema', komoditas: 'Aglonema', bobotGram: 90, category: 'Tanaman Hias' },
      { value: 'Lidah Buaya', label: 'Lidah Buaya (Aloe Vera)', komoditas: 'Lidah Buaya', bobotGram: 250, category: 'Tanaman Hias' },
    ],
  },
];

export const ALL_VARIETY_OPTIONS: PlantVarietyOption[] = PLANT_VARIETY_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    ...item,
    category: item.category || g.group,
    source: 'katalog' as const,
    sourceLabel: 'Katalog',
  }))
);

export function estimateWeightForVariety(varietas: string): number {
  const clean = varietas.trim().toLowerCase();
  const exact = ALL_VARIETY_OPTIONS.find(
    (item) => item.value.toLowerCase() === clean || item.label.toLowerCase() === clean
  );
  if (exact) return exact.bobotGram;
  if (clean.includes('semangka')) return 3500;
  if (clean.includes('durian')) return 2500;
  if (clean.includes('melon') || clean.includes('tebu')) return 1500;
  if (clean.includes('pepaya') || clean.includes('nanas')) return 1100;
  if (clean.includes('kubis') || clean.includes('kol')) return 850;
  if (clean.includes('singkong')) return 600;
  if (clean.includes('mangga') || clean.includes('alpukat') || clean.includes('naga') || clean.includes('kakao')) return 380;
  if (clean.includes('jagung') || clean.includes('ubi') || clean.includes('jambu') || clean.includes('anggur')) return 260;
  if (clean.includes('terong') || clean.includes('terung') || clean.includes('timun') || clean.includes('mentimun') || clean.includes('apel')) return 170;
  if (clean.includes('selada') || clean.includes('paprika') || clean.includes('jahe') || clean.includes('kunyit')) return 150;
  if (clean.includes('pakcoy') || clean.includes('kentang') || clean.includes('jeruk') || clean.includes('wortel')) return 115;
  if (clean.includes('cabai') || clean.includes('cabe')) return 12;
  if (clean.includes('bawang')) return 18;
  if (clean.includes('ceri') || clean.includes('stroberi') || clean.includes('kacang')) return 25;
  if (clean.includes('bayam') || clean.includes('kangkung') || clean.includes('seledri')) return 45;
  return 85;
}

export function inferCommodityFromVariety(varietas: string): string {
  const clean = varietas.trim().toLowerCase();
  const exact = ALL_VARIETY_OPTIONS.find(
    (item) => item.value.toLowerCase() === clean || item.label.toLowerCase() === clean
  );
  if (exact) return exact.komoditas;
  if (clean.includes('cabai') || clean.includes('cabe')) return 'Cabai';
  if (clean.includes('tomat') || clean.includes('servo') || clean.includes('gustavi') || clean.includes('rampai')) {
    return 'Tomat';
  }
  if (clean.includes('terong') || clean.includes('terung')) return 'Terung';
  if (clean.includes('kacang panjang')) return 'Kacang Panjang';
  if (clean.includes('bawang merah')) return 'Bawang Merah';
  if (clean.includes('bawang putih')) return 'Bawang Putih';
  if (clean.includes('timun') || clean.includes('mentimun')) return 'Mentimun';
  if (clean.includes('kubis') || clean.includes('kol')) return 'Kubis';
  return varietas.trim().split(/[/\s]+/)[0] || 'Umum';
}
