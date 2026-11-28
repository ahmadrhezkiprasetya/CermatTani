"""
Persiapan Dataset YOLOv8 CermatTani v3.1 (27 Kelas: 3 Kematangan + 24 Penyakit & Hama)
--------------------------------------------------------------------------------------
Terintegrasi langsung dengan dataset Kaggle `vipoooool/new-plant-diseases-dataset` via `kagglehub`!

Cara pakai:
  1. Otomatis unduh dari Kaggle lalu susun dataset YOLOv8:
     python ml/yolov8/prepare_dataset.py --kaggle

  2. Atau pakai folder dataset lokal yang sudah diunduh sebelumnya:
     python ml/yolov8/prepare_dataset.py --source "C:/path/ke/new-plant-diseases-dataset"

  3. Opsional batasi jumlah gambar per kelas agar training cepat di laptop/Colab:
     python ml/yolov8/prepare_dataset.py --kaggle --max-per-class 400
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from pathlib import Path
from typing import Dict, List

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

# Pemetaan folder Kaggle `vipoooool/new-plant-diseases-dataset` (38 kelas) + dataset tambahan
# ke 27 kelas YOLOv8 CermatTani (`ml/yolov8/data.yaml`).
KAGGLE_FOLDER_TO_YOLO_ID: Dict[str, int] = {
    # --- Kematangan Buah (LaboroTomato / custom folder) ---
    "tomato_unripe": 0,
    "b_green": 0,
    "l_green": 0,
    "tomato_half_ripe": 1,
    "b_half_ripened": 1,
    "l_half_ripened": 1,
    "tomato_ripe": 2,
    "b_fully_ripened": 2,
    "l_fully_ripened": 2,
    # --- Kelas Sehat (Class 3) ---
    "tomato___healthy": 3,
    "pepper,_bell___healthy": 3,
    "potato___healthy": 3,
    "apple___healthy": 3,
    "cherry_(including_sour)___healthy": 3,
    "corn_(maize)___healthy": 3,
    "grape___healthy": 3,
    "peach___healthy": 3,
    "soybean___healthy": 3,
    "strawberry___healthy": 3,
    # --- Jamur & Bercak Daun ---
    "tomato___early_blight": 4,
    "potato___early_blight": 4,
    "tomato___late_blight": 5,
    "potato___late_blight": 5,
    "tomato___leaf_mold": 6,
    "tomato___septoria_leaf_spot": 7,
    "tomato___target_spot": 8,
    "corn_(maize)___cercospora_leaf_spot gray_leaf_spot": 4,
    "strawberry___leaf_scorch": 4,
    "grape___black_rot": 22,
    # --- Bakteri ---
    "tomato___bacterial_spot": 9,
    "pepper,_bell___bacterial_spot": 9,
    "peach___bacterial_spot": 9,
    "tomato___bacterial_speck": 10,
    "tomato___bacterial_canker": 11,
    # --- Embun Tepung & Embun Bulu ---
    "squash___powdery_mildew": 12,
    "cherry_(including_sour)___powdery_mildew": 12,
    "tomato___powdery_mildew": 12,
    "cucumber___downy_mildew": 13,
    "grape___leaf_blight_(isariopsis_leaf_spot)": 13,
    # --- Layu & Busuk Pangkal ---
    "tomato___fusarium_wilt": 14,
    "tomato___southern_blight": 15,
    # --- Virus ---
    "tomato___tomato_yellow_leaf_curl_virus": 16,
    "tomato___tomato_mosaic_virus": 17,
    "tomato___tomato_spotted_wilt_virus": 18,
    # --- Hama ---
    "tomato___spider_mites two-spotted_spider_mite": 19,
    "tomato___leaf_miner": 20,
    # --- Busuk Buah & Fisiologis ---
    "tomato___blossom_end_rot": 21,
    "tomato___anthracnose": 22,
    "tomato___bacterial_soft_rot": 23,
    "tomato___buckeye_rot": 24,
    "tomato___gray_mold": 25,
    "tomato___sunscald": 26,
}


def download_from_kaggle() -> Path:
    import kagglehub

    # Download latest version
    path = kagglehub.dataset_download("vipoooool/new-plant-diseases-dataset")
    print("Path to dataset files:", path)
    return Path(path)


def locate_split_roots(base_dir: Path) -> List[Path]:
    """Cari folder kelas gambar di dalam struktur Kaggle (train / valid / root)."""
    roots: List[Path] = []
    for candidate in base_dir.rglob("*"):
        if candidate.is_dir() and candidate.name.lower() in {"train", "valid"}:
            has_class_dirs = any(p.is_dir() for p in candidate.iterdir())
            if has_class_dirs:
                roots.append(candidate)
    if not roots:
        roots.append(base_dir)
    return roots


def prepare_yolo_dataset(
    source_dir: Path,
    output_dir: Path,
    max_per_class: int = 500,
    seed: int = 42,
) -> None:
    rng = random.Random(seed)
    roots = locate_split_roots(source_dir)
    print(f"Memindai folder dataset: {[str(r) for r in roots]}")

    per_class_files: Dict[int, List[Path]] = {}
    skipped_folders: List[str] = []

    for root in roots:
        for class_dir in sorted(root.iterdir()):
            if not class_dir.is_dir():
                continue
            key = class_dir.name.strip().lower()
            yolo_id = KAGGLE_FOLDER_TO_YOLO_ID.get(key)
            if yolo_id is None:
                skipped_folders.append(class_dir.name)
                continue
            imgs = [p for p in class_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
            per_class_files.setdefault(yolo_id, []).extend(imgs)

    for split in ("train", "val", "test"):
        (output_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (output_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    summary: Dict[int, Dict[str, int]] = {}
    total_copied = 0

    for yolo_id, files in sorted(per_class_files.items()):
        rng.shuffle(files)
        if max_per_class > 0:
            files = files[:max_per_class]

        n = len(files)
        n_train = int(n * 0.8)
        n_val = int(n * 0.1)
        splits = {
            "train": files[:n_train],
            "val": files[n_train : n_train + n_val],
            "test": files[n_train + n_val :],
        }
        summary[yolo_id] = {k: len(v) for k, v in splits.items()}

        for split_name, split_files in splits.items():
            for idx, src_img in enumerate(split_files):
                stem = f"cls{yolo_id:02d}_{idx:05d}"
                dst_img = output_dir / "images" / split_name / f"{stem}{src_img.suffix.lower()}"
                dst_lbl = output_dir / "labels" / split_name / f"{stem}.txt"
                shutil.copy2(src_img, dst_img)
                # Label bounding-box penuh (leaf/fruit classification -> detection box 0.5 0.5 0.92 0.92)
                dst_lbl.write_text(f"{yolo_id} 0.5 0.5 0.92 0.92\n", encoding="utf-8")
                total_copied += 1

    report_path = output_dir / "dataset_summary.json"
    report_path.write_text(
        json.dumps(
            {
                "source": "kaggle:vipoooool/new-plant-diseases-dataset",
                "total_images": total_copied,
                "classes_prepared": len(summary),
                "per_class_counts": summary,
                "unmapped_folders": sorted(set(skipped_folders)),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Selesai! Total {total_copied} gambar disusun ke {output_dir} ({len(summary)} kelas aktif).")
    print(f"Ringkasan tersimpan di: {report_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unduh Kaggle vipoooool/new-plant-diseases-dataset & konversi ke format YOLOv8 CermatTani."
    )
    parser.add_argument(
        "--kaggle",
        action="store_true",
        help="Unduh otomatis dataset terbaru via kagglehub ('vipoooool/new-plant-diseases-dataset').",
    )
    parser.add_argument(
        "--source",
        type=str,
        default="",
        help="Path folder lokal dataset jika sudah diunduh manual.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="ml/yolov8/dataset",
        help="Folder tujuan format YOLOv8 (default: ml/yolov8/dataset).",
    )
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=500,
        help="Maksimal gambar per kelas agar training seimbang (0 = semua gambar).",
    )
    args = parser.parse_args()

    if args.kaggle or not args.source:
        src_dir = download_from_kaggle()
    else:
        src_dir = Path(args.source)

    prepare_yolo_dataset(src_dir, Path(args.output), max_per_class=args.max_per_class)


if __name__ == "__main__":
    main()
