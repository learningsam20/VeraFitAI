#!/usr/bin/env python3
"""Generate aligned product images for every garment in data/seed_garments.json."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "seed_garments.json"

sys.path.insert(0, str(ROOT))
from backend.app.services.garment_images import garment_image_data_uri  # noqa: E402


def main():
    if not SEED.exists():
        print(f"seed file not found: {SEED}", file=sys.stderr)
        sys.exit(1)
    with open(SEED, "r", encoding="utf-8") as f:
        garments = json.load(f)
    for g in garments:
        g["image_url"] = garment_image_data_uri(g["category"], g["color_hex"])
    with open(SEED, "w", encoding="utf-8") as f:
        json.dump(garments, f, indent=2, ensure_ascii=False)
    print(f"updated {len(garments)} garments in {SEED.name}")


if __name__ == "__main__":
    main()
