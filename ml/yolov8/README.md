# Paket Dataset YOLOv8 CermatTani v3.1 (Kaggle `vipoooool/new-plant-diseases-dataset`)

Paket ini menyediakan konfigurasi training **YOLOv8 (27 kelas)** yang terhubung langsung ke dataset publik Kaggle **`vipoooool/new-plant-diseases-dataset`** (87.000+ citra penyakit daun & tanaman) melalui `kagglehub`, sinkron 1-ke-1 dengan katalog penyakit di Website Next.js, Mobile Flutter, dan seed SQL Supabase.

## 1. Instalasi Dependensi Python
```bash
pip install -r ml/yolov8/requirements.txt
```

## 2. Unduh Dataset Resmi dari Kaggle (`kagglehub`)
Gunakan skrip bawaan yang memakai `kagglehub.dataset_download("vipoooool/new-plant-diseases-dataset")`:
```bash
python ml/yolov8/download_kaggle_dataset.py
```

Atau langsung unduh **sekaligus susun otomatis** ke struktur `ml/yolov8/dataset/{images,labels}/{train,val,test}`:
```bash
python ml/yolov8/prepare_dataset.py --kaggle --max-per-class 500
```

> Untuk menggunakan seluruh 87.000+ gambar tanpa batas per kelas, jalankan `--max-per-class 0`.

## 3. Mulai Training Model YOLOv8
```bash
yolo detect train data=ml/yolov8/data.yaml model=yolov8n.pt epochs=60 imgsz=640 batch=16 name=cermattani_v3
```

## 4. Ekspor ke TFLite (Android) atau ONNX (Server)
```bash
yolo export model=runs/detect/cermattani_v3/weights/best.pt format=tflite
yolo export model=runs/detect/cermattani_v3/weights/best.pt format=onnx
```

## File dalam Folder Ini
- `data.yaml` — Definisi 27 kelas YOLOv8 (`0–2` kematangan buah, `3–26` 24 kelas penyakit, busuk buah, virus, hama & gangguan fisiologis).
- `class_catalog.json` — Pemetaan 1-ke-1 kelas YOLOv8 ke ID dataset aplikasi & nama ilmiah patogen.
- `download_kaggle_dataset.py` — Skrip unduh langsung via `kagglehub.dataset_download("vipoooool/new-plant-diseases-dataset")`.
- `prepare_dataset.py` — Konverter otomatis struktur Kaggle (`train`/`valid`) ke format `images/` + `labels/` YOLOv8.
- `requirements.txt` — Dependensi (`kagglehub`, `ultralytics`, `Pillow`, `PyYAML`).
