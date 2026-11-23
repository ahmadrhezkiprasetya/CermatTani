import { Plant, ScanRecord, SensorSnapshot } from '../types/cermattani';
import { KNOWLEDGE_DISEASES, KNOWLEDGE_NUTRIENTS, RIPENESS_REFERENCE } from '../data/knowledgeBase';

interface CermoContext {
  plant: Plant | null;
  latestScan: ScanRecord | null;
  sensor: SensorSnapshot;
  lowConfidenceThreshold: number;
  tankLowThreshold: number;
}

/* F5.1–F5.4: Asisten tani Cermo
   - Menerima hasil scan terbaru sebagai konteks
   - Topik dibatasi budidaya tomat & hasil scan; di luar itu menolak dengan sopan
   - Organik lebih dulu, tidak menggurui, kalimat pendek
   - Tag "Saran, bukan keputusan akhir" ditampilkan oleh komponen chat pada setiap jawaban */
export function generateCermoReply(userText: string, ctx: CermoContext): string {
  const q = userText.toLowerCase().trim();

  // Guardrail topik di luar tomat / pertanian / sistem CermatTani (F5.2)
  const offTopicKeywords = [
    'politik',
    'presiden',
    'pilpres',
    'saham',
    'kripto',
    'crypto',
    'bitcoin',
    'bola',
    'sepakbola',
    'skor pertandingan',
    'pacar',
    'cinta',
    'film',
    'artis',
    'resep masakan',
    'sakit kepala',
    'obat manusia',
    'demam anak',
    'padi',
    'jagung',
    'durian',
    'sawit',
    'kopi',
    'koding',
    'matematika',
    'pr sekolah',
  ];

  const tomatoKeywords = [
    'tomat',
    'panen',
    'matang',
    'mentah',
    'scan',
    'hasil',
    'daun',
    'buah',
    'batang',
    'penyakit',
    'bercak',
    'busuk',
    'layu',
    'jamur',
    'hama',
    'pupuk',
    'hara',
    'nitrogen',
    'kalium',
    'kalsium',
    'npk',
    'kompos',
    'organik',
    'siram',
    'irigasi',
    'pompa',
    'tandon',
    'air',
    'kelembapan',
    'sensor',
    'surya',
    'baterai',
    'panel',
    'cuaca',
    'tanam',
    'kebun',
    'penyuluh',
    'halo',
    'hai',
    'terima kasih',
    'makasih',
  ];

  const isOffTopic =
    offTopicKeywords.some((kw) => q.includes(kw)) && !tomatoKeywords.some((kw) => q.includes(kw));

  if (isOffTopic) {
    if (q.includes('padi') || q.includes('jagung') || q.includes('durian') || q.includes('sawit') || q.includes('kopi')) {
      return 'Maaf ya, untuk versi ini aku Cermo baru fokus membantu budidaya tomat saja. Kalau ada pertanyaan soal buah, daun, pupuk, atau irigasi tomatmu, yuk tanya ke aku!';
    }
    return 'Maaf ya, aku Cermo cuma paham soal budidaya tomat, hasil scan, dan sensor kebunmu. Di luar topik itu aku belum bisa bantu. Mau cek jadwal panen atau kondisi tomatmu hari ini?';
  }

  // Sapaan singkat
  if (/^(halo|hai|pagi|siang|sore|malam|hi|hello)\b/.test(q) && q.length < 25) {
    return ctx.plant
      ? `Halo! Aku Cermo. Saat ini aku sedang memantau ${ctx.plant.nama}. Kamu bisa tanya arti hasil scan terakhir, jadwal panen, cara atasi penyakit secara organik, atau takaran pupuknya.`
      : 'Halo! Aku Cermo. Yuk pilih tanaman atau lakukan scan tomat dulu, nanti aku bantu jelaskan hasilnya.';
  }

  const scan = ctx.latestScan;
  const plant = ctx.plant;

  // Pertanyaan cepat 1: "Apa arti hasil ini?"
  if (q.includes('arti hasil') || q.includes('jelaskan hasil') || q.includes('maksud hasil')) {
    if (!scan || !plant) {
      return 'Belum ada hasil scan pada tanaman ini. Foto buah atau daun tomat dulu lewat tombol Scan, nanti langsung kujelaskan artinya.';
    }
    if (scan.tanpaBuahTerdeteksi) {
      return `Pada foto terakhir ${plant.nama}, Cermo belum menemukan buah tomat dengan jelas. Coba foto ulang di tempat lebih terang dengan jarak sekitar 20–40 cm dari buah ya.`;
    }
    const parts: string[] = [];
    if (scan.bagian === 'buah' && scan.tahapDominan) {
      const ref = RIPENESS_REFERENCE[scan.tahapDominan];
      parts.push(
        `Di ${plant.nama}, terdeteksi ${scan.jumlahBuah} buah dengan tahap dominan ${ref.label.toLowerCase()} (seberapa yakin Cermo: ${scan.keyakinan}%). Anjurannya: ${scan.anjuranPanen}${scan.estimasiHariMin !== null && scan.anjuranPanen === 'Tunggu' ? ` ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari lagi` : ''}.`
      );
      parts.push(
        `Perkiraan kasar bobot dari foto sekitar ${scan.estimasiBobotGram} gram (hanya sebagian tanaman yang terlihat).`
      );
    } else {
      parts.push(
        `Hasil scan ${scan.bagian} ${plant.nama} mengarah ke "${scan.penyakitUtamaNama}" (seberapa yakin Cermo: ${scan.keyakinan}%).`
      );
    }
    if (scan.keyakinan < ctx.lowConfidenceThreshold) {
      parts.push(
        `Karena keyakinannya di bawah ${ctx.lowConfidenceThreshold}%, sebaiknya foto ulang di cahaya terang dan konfirmasi juga ke penyuluh pertanian setempat.`
      );
    }
    return parts.join(' ');
  }

  // Pertanyaan cepat 2: "Kapan panen?"
  if (q.includes('kapan panen') || q.includes('panen') || q.includes('matang')) {
    if (!scan || !plant) {
      return 'Foto buah tomatmu dulu ya agar Cermo bisa memperkirakan hari panennya. Patokan umum: tomat setengah matang siap petik 2–4 hari lagi, tomat merah penuh bisa dipanen sekarang.';
    }
    if (scan.anjuranPanen === 'Panen sekarang') {
      return `Kabar baik! ${plant.nama} sudah masuk tahap matang (${scan.jumlahBuah} buah terdeteksi). Kamu bisa panen sekarang pada pagi atau sore hari agar buah tetap segar.`;
    }
    if (scan.estimasiHariMin !== null && scan.estimasiHariMax !== null) {
      return `Untuk ${plant.nama}, perkiraannya tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari lagi.${scan.estimasiDisesuaikanRiwayat ? ' Perkiraan ini sudah disesuaikan dari laju perubahan warna di riwayat scan sebelumnya.' : ''} Cek lagi 2 hari mendatang ya.`;
    }
    return `Scan terakhir ${plant.nama} adalah bagian ${scan.bagian}. Coba scan bagian buahnya supaya Cermo bisa menghitung estimasi hari panen.`;
  }

  // Pertanyaan cepat 3: "Pupuk apa?"
  if (q.includes('pupuk') || q.includes('hara') || q.includes('nutrisi') || q.includes('kuning')) {
    const nut = KNOWLEDGE_NUTRIENTS[scan?.dugaanHaraId || 'cukup'] || KNOWLEDGE_NUTRIENTS.cukup;
    const fase = plant?.fase || 'Berbuah';
    const labelSumber = ctx.sensor.sensorTersedia ? 'dengan data sensor (Simulasi)' : 'dugaan visual';
    return `Berdasarkan ${labelSumber} untuk fase ${fase}, statusnya "${nut.dugaan}". Pilihan organik dulu: ${nut.rekomendasiOrganik} Untuk acuan umum fase ${fase}: ${nut.dosisPerFase[fase]} Ingat ya, ini bukan pengganti uji tanah.`;
  }

  // Pertanyaan penyakit / organik / kimia
  if (q.includes('penyakit') || q.includes('bercak') || q.includes('busuk') || q.includes('layu') || q.includes('organik') || q.includes('obat') || q.includes('semprot')) {
    const dis = KNOWLEDGE_DISEASES[scan?.penyakitUtamaId || 'sehat'] || KNOWLEDGE_DISEASES.sehat;
    if (dis.id === 'sehat') {
      return `Dari scan terakhir, ${plant?.nama || 'tanamanmu'} terlihat sehat. Langkah pencegahan terbaik: ${dis.pencegahan[0]} ${dis.solusiOrganik[0]}`;
    }
    return `Untuk "${dis.penyakit}", coba cara organik dan budidaya lebih dulu: (1) ${dis.solusiOrganik[0]} (2) ${dis.solusiOrganik[1] || dis.pencegahan[0]} Opsi kimiawi hanya bila serangan meluas, dan wajib baca label produk serta konfirmasi ke penyuluh bila ragu.`;
  }

  // Pertanyaan irigasi / tandon / sensor / surya
  if (q.includes('tandon') || q.includes('siram') || q.includes('irigasi') || q.includes('pompa') || q.includes('sensor')) {
    const tandonMsg =
      ctx.sensor.levelTandonPersen < ctx.tankLowThreshold
        ? `Tandon tinggal ${ctx.sensor.levelTandonPersen}% (kritis). Pompa kutahan dulu supaya tidak kering.`
        : `Tandon saat ini ${ctx.sensor.levelTandonPersen}% (aman).`;
    return `${tandonMsg} Kelembapan tanah terbaca ${ctx.sensor.kelembapanTanah}% dan kelembapan udara ${ctx.sensor.kelembapanUdara}% (data Simulasi ESP32). Siram tomat di pangkal batang supaya daun tidak lembap lama.`;
  }

  if (q.includes('surya') || q.includes('baterai') || q.includes('panel') || q.includes('energi')) {
    return `Monitor energi (Simulasi INA219) saat ini menunjukkan baterai ${ctx.sensor.bateraiPersen}% (${ctx.sensor.teganganVolt} V, ${ctx.sensor.dayaWatt} W). Kalau baterai turun di bawah 20%, ESP32 otomatis masuk Mode hemat dan aku istirahat sebentar. Kamu juga bisa hitung ukuran panel di menu Energi surya.`;
  }

  return `Untuk ${plant?.nama || 'kebun tomatmu'}, saat ini kondisinya terpantau lewat riwayat scan dan sensor simulasi. Coba pilih salah satu pertanyaan cepat di bawah atau tanyakan spesifik soal panen, bercak daun, pupuk organik, atau penyiraman tomat ya!`;
}
