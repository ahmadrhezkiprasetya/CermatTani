"""
Unduh Dataset Penyakit Tanaman Kaggle (vipoooool/new-plant-diseases-dataset)
untuk training YOLOv8 CermatTani v3.1.

Jalankan:
  pip install -r ml/yolov8/requirements.txt
  python ml/yolov8/download_kaggle_dataset.py
"""

from pathlib import Path
import kagglehub


def download_kaggle_plant_diseases() -> Path:
    # Download latest version from Kaggle Hub
    path = kagglehub.dataset_download("vipoooool/new-plant-diseases-dataset")
    print("Path to dataset files:", path)
    return Path(path)


if __name__ == "__main__":
    dataset_path = download_kaggle_plant_diseases()
    # Tampilkan struktur sub-folder utama untuk verifikasi cepat
    for child in sorted(dataset_path.rglob("*")):
        if child.is_dir() and child.name.lower() in {"train", "valid", "test"}:
            count = sum(1 for p in child.iterdir() if p.is_dir())
            print(f"  - Ditemukan folder '{child.name}' ({count} sub-kelas): {child}")
