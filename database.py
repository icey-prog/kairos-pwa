import sqlite3
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./neuro_kaizen.db"
DB_PATH = "./neuro_kaizen.db"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _migrate()


def _migrate():
    """Add new columns to existing DB without dropping data."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(task)")}
    if "category" not in existing:
        cur.execute("ALTER TABLE task ADD COLUMN category TEXT")
    if "scheduled_date" not in existing:
        cur.execute("ALTER TABLE task ADD COLUMN scheduled_date TEXT")
    conn.commit()
    conn.close()


def get_session():
    with Session(engine) as session:
        yield session
