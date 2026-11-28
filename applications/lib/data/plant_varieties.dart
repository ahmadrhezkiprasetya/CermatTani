class PlantVarietyOption {
  const PlantVarietyOption({
    required this.value,
    required this.label,
    required this.category,
    required this.komoditas,
    required this.bobotGram,
    this.scientificName,
    this.source = 'katalog',
    this.sourceLabel = 'Katalog',
  });

  final String value;
  final String label;
  final String category;
  final String komoditas;
  final int bobotGram;
  final String? scientificName;
  final String source; // 'katalog' | 'satudata_klaten' | 'gbif' | 'wikipedia'
  final String sourceLabel;
}

const String kCustomVarietyValue = '__custom__';
const String kSatuDataKlatenResourceId = '2f1f79ad-1dea-4afa-a4d9-2904ed51d67f';
const String kSatuDataKlatenApiBase = 'https://satudata.klaten.go.id/api/3/action/datastore_search';

const List<PlantVarietyOption> kPlantVarietyCatalog = [
  // Sayur Buah & Polong
  PlantVarietyOption(value: 'Cabai Rawit', label: 'Cabai Rawit', category: 'Sayur Buah', komoditas: 'Cabai', bobotGram: 8),
  PlantVarietyOption(value: 'Cabai Besar', label: 'Cabai Besar', category: 'Sayur Buah', komoditas: 'Cabai', bobotGram: 20),
  PlantVarietyOption(value: 'Cabai Keriting', label: 'Cabai Keriting', category: 'Sayur Buah', komoditas: 'Cabai', bobotGram: 10),
  PlantVarietyOption(value: 'Tomat Servo F1', label: 'Tomat Servo F1', category: 'Sayur Buah', komoditas: 'Tomat', bobotGram: 85),
  PlantVarietyOption(value: 'Tomat Gustavi', label: 'Tomat Gustavi', category: 'Sayur Buah', komoditas: 'Tomat', bobotGram: 95),
  PlantVarietyOption(value: 'Tomat Ceri', label: 'Tomat Ceri', category: 'Sayur Buah', komoditas: 'Tomat', bobotGram: 25),
  PlantVarietyOption(value: 'Terung Ungu', label: 'Terung / Terong Ungu', category: 'Sayur Buah', komoditas: 'Terung', bobotGram: 180),
  PlantVarietyOption(value: 'Kacang Panjang', label: 'Kacang Panjang', category: 'Sayur Buah', komoditas: 'Kacang Panjang', bobotGram: 35),
  PlantVarietyOption(value: 'Buncis', label: 'Buncis', category: 'Sayur Buah', komoditas: 'Buncis', bobotGram: 20),
  PlantVarietyOption(value: 'Mentimun', label: 'Mentimun', category: 'Sayur Buah', komoditas: 'Mentimun', bobotGram: 160),
  PlantVarietyOption(value: 'Paprika', label: 'Paprika', category: 'Sayur Buah', komoditas: 'Paprika', bobotGram: 150),
  PlantVarietyOption(value: 'Pare', label: 'Pare / Paria', category: 'Sayur Buah', komoditas: 'Pare', bobotGram: 220),
  PlantVarietyOption(value: 'Labu Siam', label: 'Labu Siam', category: 'Sayur Buah', komoditas: 'Labu', bobotGram: 320),
  PlantVarietyOption(value: 'Oyong / Gambas', label: 'Oyong / Gambas', category: 'Sayur Buah', komoditas: 'Oyong', bobotGram: 200),
  PlantVarietyOption(value: 'Okra', label: 'Okra', category: 'Sayur Buah', komoditas: 'Okra', bobotGram: 25),
  // Sayur Daun & Bunga
  PlantVarietyOption(value: 'Selada Keriting', label: 'Selada Keriting', category: 'Sayur Daun', komoditas: 'Selada', bobotGram: 150),
  PlantVarietyOption(value: 'Bayam Hijau', label: 'Bayam Hijau', category: 'Sayur Daun', komoditas: 'Bayam', bobotGram: 40),
  PlantVarietyOption(value: 'Kangkung Darat', label: 'Kangkung Darat', category: 'Sayur Daun', komoditas: 'Kangkung', bobotGram: 50),
  PlantVarietyOption(value: 'Pakcoy', label: 'Pakcoy', category: 'Sayur Daun', komoditas: 'Pakcoy', bobotGram: 120),
  PlantVarietyOption(value: 'Sawi Hijau / Caisim', label: 'Sawi Hijau / Caisim', category: 'Sayur Daun', komoditas: 'Sawi', bobotGram: 90),
  PlantVarietyOption(value: 'Kubis / Kol', label: 'Kubis / Kol', category: 'Sayur Daun', komoditas: 'Kubis', bobotGram: 900),
  PlantVarietyOption(value: 'Brokoli', label: 'Brokoli', category: 'Sayur Daun', komoditas: 'Brokoli', bobotGram: 350),
  PlantVarietyOption(value: 'Kembang Kol', label: 'Kembang Kol', category: 'Sayur Daun', komoditas: 'Kembang Kol', bobotGram: 450),
  PlantVarietyOption(value: 'Seledri', label: 'Seledri', category: 'Sayur Daun', komoditas: 'Seledri', bobotGram: 60),
  PlantVarietyOption(value: 'Daun Bawang', label: 'Daun Bawang', category: 'Sayur Daun', komoditas: 'Daun Bawang', bobotGram: 45),
  PlantVarietyOption(value: 'Kemangi', label: 'Kemangi', category: 'Sayur Daun', komoditas: 'Kemangi', bobotGram: 30),
  PlantVarietyOption(value: 'Kale', label: 'Kale', category: 'Sayur Daun', komoditas: 'Kale', bobotGram: 120),
  // Pangan, Palawija & Umbi
  PlantVarietyOption(value: 'Padi Inpari', label: 'Padi Inpari', category: 'Pangan & Umbi', komoditas: 'Padi', bobotGram: 30),
  PlantVarietyOption(value: 'Jagung Manis', label: 'Jagung Manis', category: 'Pangan & Umbi', komoditas: 'Jagung', bobotGram: 250),
  PlantVarietyOption(value: 'Kentang Granola', label: 'Kentang Granola', category: 'Pangan & Umbi', komoditas: 'Kentang', bobotGram: 110),
  PlantVarietyOption(value: 'Bawang Merah', label: 'Bawang Merah', category: 'Pangan & Umbi', komoditas: 'Bawang Merah', bobotGram: 15),
  PlantVarietyOption(value: 'Bawang Putih', label: 'Bawang Putih', category: 'Pangan & Umbi', komoditas: 'Bawang Putih', bobotGram: 25),
  PlantVarietyOption(value: 'Wortel', label: 'Wortel', category: 'Pangan & Umbi', komoditas: 'Wortel', bobotGram: 120),
  PlantVarietyOption(value: 'Ubi Jalar', label: 'Ubi Jalar', category: 'Pangan & Umbi', komoditas: 'Ubi Jalar', bobotGram: 280),
  PlantVarietyOption(value: 'Singkong / Ubikayu', label: 'Singkong / Ubikayu', category: 'Pangan & Umbi', komoditas: 'Singkong', bobotGram: 600),
  PlantVarietyOption(value: 'Kedelai', label: 'Kedelai', category: 'Pangan & Umbi', komoditas: 'Kedelai', bobotGram: 20),
  PlantVarietyOption(value: 'Kacang Tanah', label: 'Kacang Tanah', category: 'Pangan & Umbi', komoditas: 'Kacang Tanah', bobotGram: 30),
  PlantVarietyOption(value: 'Kacang Hijau', label: 'Kacang Hijau', category: 'Pangan & Umbi', komoditas: 'Kacang Hijau', bobotGram: 20),
  // Buah Kebun
  PlantVarietyOption(value: 'Melon', label: 'Melon', category: 'Buah Kebun', komoditas: 'Melon', bobotGram: 1500),
  PlantVarietyOption(value: 'Semangka', label: 'Semangka', category: 'Buah Kebun', komoditas: 'Semangka', bobotGram: 3500),
  PlantVarietyOption(value: 'Stroberi', label: 'Stroberi', category: 'Buah Kebun', komoditas: 'Stroberi', bobotGram: 20),
  PlantVarietyOption(value: 'Jeruk Siam', label: 'Jeruk Siam', category: 'Buah Kebun', komoditas: 'Jeruk', bobotGram: 120),
  PlantVarietyOption(value: 'Anggur', label: 'Anggur', category: 'Buah Kebun', komoditas: 'Anggur', bobotGram: 300),
  PlantVarietyOption(value: 'Mangga', label: 'Mangga', category: 'Buah Kebun', komoditas: 'Mangga', bobotGram: 400),
  PlantVarietyOption(value: 'Pisang', label: 'Pisang', category: 'Buah Kebun', komoditas: 'Pisang', bobotGram: 150),
  PlantVarietyOption(value: 'Pepaya California', label: 'Pepaya California', category: 'Buah Kebun', komoditas: 'Pepaya', bobotGram: 1200),
  PlantVarietyOption(value: 'Alpukat', label: 'Alpukat', category: 'Buah Kebun', komoditas: 'Alpukat', bobotGram: 350),
  PlantVarietyOption(value: 'Durian', label: 'Durian', category: 'Buah Kebun', komoditas: 'Durian', bobotGram: 2500),
  PlantVarietyOption(value: 'Jambu Kristal', label: 'Jambu Kristal', category: 'Buah Kebun', komoditas: 'Jambu', bobotGram: 280),
  PlantVarietyOption(value: 'Nanas', label: 'Nanas', category: 'Buah Kebun', komoditas: 'Nanas', bobotGram: 1100),
  PlantVarietyOption(value: 'Buah Naga', label: 'Buah Naga', category: 'Buah Kebun', komoditas: 'Buah Naga', bobotGram: 450),
  PlantVarietyOption(value: 'Apel', label: 'Apel', category: 'Buah Kebun', komoditas: 'Apel', bobotGram: 180),
  // Rempah, TOGA & Perkebunan
  PlantVarietyOption(value: 'Jahe Merah', label: 'Jahe Merah', category: 'Rempah & Perkebunan', komoditas: 'Jahe', bobotGram: 180),
  PlantVarietyOption(value: 'Kunyit', label: 'Kunyit', category: 'Rempah & Perkebunan', komoditas: 'Kunyit', bobotGram: 140),
  PlantVarietyOption(value: 'Lengkuas', label: 'Lengkuas', category: 'Rempah & Perkebunan', komoditas: 'Lengkuas', bobotGram: 200),
  PlantVarietyOption(value: 'Serai', label: 'Serai', category: 'Rempah & Perkebunan', komoditas: 'Serai', bobotGram: 80),
  PlantVarietyOption(value: 'Kopi Arabika', label: 'Kopi Arabika', category: 'Rempah & Perkebunan', komoditas: 'Kopi', bobotGram: 25),
  PlantVarietyOption(value: 'Kakao', label: 'Kakao / Cokelat', category: 'Rempah & Perkebunan', komoditas: 'Kakao', bobotGram: 400),
  PlantVarietyOption(value: 'Vanili', label: 'Vanili', category: 'Rempah & Perkebunan', komoditas: 'Vanili', bobotGram: 20),
  PlantVarietyOption(value: 'Lada', label: 'Lada / Merica', category: 'Rempah & Perkebunan', komoditas: 'Lada', bobotGram: 15),
  PlantVarietyOption(value: 'Tebu', label: 'Tebu', category: 'Rempah & Perkebunan', komoditas: 'Tebu', bobotGram: 1500),
  PlantVarietyOption(value: 'Tembakau', label: 'Tembakau', category: 'Rempah & Perkebunan', komoditas: 'Tembakau', bobotGram: 60),
  // Tanaman Hias & Pekarangan
  PlantVarietyOption(value: 'Anggrek', label: 'Anggrek', category: 'Tanaman Hias', komoditas: 'Anggrek', bobotGram: 50),
  PlantVarietyOption(value: 'Mawar', label: 'Mawar', category: 'Tanaman Hias', komoditas: 'Mawar', bobotGram: 40),
  PlantVarietyOption(value: 'Monstera', label: 'Monstera', category: 'Tanaman Hias', komoditas: 'Monstera', bobotGram: 100),
  PlantVarietyOption(value: 'Aglonema', label: 'Aglonema', category: 'Tanaman Hias', komoditas: 'Aglonema', bobotGram: 90),
  PlantVarietyOption(value: 'Lidah Buaya', label: 'Lidah Buaya (Aloe Vera)', category: 'Tanaman Hias', komoditas: 'Lidah Buaya', bobotGram: 250),
];

int estimateWeightForVariety(String varietas) {
  final clean = varietas.trim().toLowerCase();
  for (final item in kPlantVarietyCatalog) {
    if (item.value.toLowerCase() == clean || item.label.toLowerCase() == clean) {
      return item.bobotGram;
    }
  }
  if (clean.contains('semangka')) return 3500;
  if (clean.contains('durian')) return 2500;
  if (clean.contains('melon') || clean.contains('tebu')) return 1500;
  if (clean.contains('pepaya') || clean.contains('nanas')) return 1100;
  if (clean.contains('kubis') || clean.contains('kol')) return 850;
  if (clean.contains('singkong')) return 600;
  if (clean.contains('mangga') || clean.contains('alpukat') || clean.contains('naga')) return 380;
  if (clean.contains('jagung') || clean.contains('ubi') || clean.contains('jambu') || clean.contains('anggur')) return 260;
  if (clean.contains('terong') || clean.contains('terung') || clean.contains('timun') || clean.contains('mentimun')) return 170;
  if (clean.contains('selada') || clean.contains('paprika') || clean.contains('jahe')) return 150;
  if (clean.contains('pakcoy') || clean.contains('kentang') || clean.contains('jeruk')) return 115;
  if (clean.contains('cabai') || clean.contains('cabe')) return 12;
  if (clean.contains('bawang')) return 18;
  if (clean.contains('ceri') || clean.contains('stroberi') || clean.contains('kacang')) return 25;
  if (clean.contains('bayam') || clean.contains('kangkung')) return 45;
  return 85;
}

String inferCommodityFromVariety(String varietas) {
  final clean = varietas.trim().toLowerCase();
  for (final item in kPlantVarietyCatalog) {
    if (item.value.toLowerCase() == clean || item.label.toLowerCase() == clean) {
      return item.komoditas;
    }
  }
  if (clean.contains('cabai') || clean.contains('cabe')) return 'Cabai';
  if (clean.contains('tomat') || clean.contains('servo') || clean.contains('gustavi') || clean.contains('rampai')) {
    return 'Tomat';
  }
  if (clean.contains('terong') || clean.contains('terung')) return 'Terung';
  if (clean.contains('kacang panjang')) return 'Kacang Panjang';
  if (clean.contains('bawang merah')) return 'Bawang Merah';
  if (clean.contains('bawang putih')) return 'Bawang Putih';
  if (clean.contains('kubis') || clean.contains('kol')) return 'Kubis';
  final parts = varietas.trim().split(RegExp(r'[/\s]+'));
  return parts.isNotEmpty && parts.first.isNotEmpty ? parts.first : 'Umum';
}
