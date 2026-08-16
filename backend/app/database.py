from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.app.config import settings

DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Ensure parent directory exists for SQLite files (e.g. data/verafit.db)
if "sqlite" in DATABASE_URL:
    url_path = DATABASE_URL.split("sqlite+aiosqlite:///")[-1]
    if url_path.startswith("./"):
        root_dir = Path(__file__).resolve().parent.parent.parent
        db_path = root_dir / url_path[2:]
        db_path.parent.mkdir(parents=True, exist_ok=True)
    elif not url_path.startswith(":memory:"):
        db_path = Path(url_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
