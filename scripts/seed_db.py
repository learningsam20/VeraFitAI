#!/usr/bin/env python3
"""
Seed / Reset VeraFit Database from JSON files in data/
"""
import sys
import asyncio
from pathlib import Path

# Add project root to PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import init_db, AsyncSessionLocal
from backend.app.services.seed_data import seed_database

async def main():
    print("🌱 Initializing VeraFit database tables...")
    await init_db()
    
    print("📦 Ingesting seed data from data/ folder...")
    async with AsyncSessionLocal() as session:
        await seed_database(session, force_reset=True)
    
    print("✅ Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
