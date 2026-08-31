"""SQLAlchemy engine/session setup.

Connects through Supabase's Supavisor transaction pooler (IPv4-compatible,
unlike Supabase's IPv6-only direct connection). Transaction pooling mode
multiplexes a physical connection per transaction, so server-side prepared
statements must be disabled and client-side pooling left to the pooler
itself (NullPool) rather than pooled again here.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import settings


def _psycopg3_url(url: str) -> str:
    """Force the psycopg3 driver — SQLAlchemy defaults postgresql:// to psycopg2."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


engine = create_engine(
    _psycopg3_url(settings.database_url),
    poolclass=NullPool,
    connect_args={"prepare_threshold": None},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
