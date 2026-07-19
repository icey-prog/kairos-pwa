"""The drawer: keeps each fingerprint next to its original text in SQLite.

Separate database file from Mile's own DB — this service knows nothing about
FeynmanNote/SpacedCard, only generic (source_type, source_id, text). That's
what makes it reusable by any future project: it just needs to send text in
and get matches back.
"""
import os
import sqlite3
from datetime import datetime, timezone

import numpy as np

_db_dir = os.environ.get("DB_DIR", ".")
os.makedirs(_db_dir, exist_ok=True)
DB_PATH = os.path.join(_db_dir, "rag.db")


def _connect():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = _connect()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            discipline TEXT,
            chunk_text TEXT NOT NULL,
            vector BLOB NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(source_type, source_id)
        )
    """)
    conn.commit()
    conn.close()


def save_embedding(source_type: str, source_id: str, discipline: str | None, chunk_text: str, vector) -> None:
    """Upsert: re-indexing the same (source_type, source_id) replaces the old entry."""
    conn = _connect()
    conn.execute(
        """INSERT INTO embeddings (source_type, source_id, discipline, chunk_text, vector, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(source_type, source_id) DO UPDATE SET
             discipline = excluded.discipline,
             chunk_text = excluded.chunk_text,
             vector = excluded.vector,
             created_at = excluded.created_at""",
        (source_type, source_id, discipline, chunk_text,
         np.asarray(vector, dtype=np.float32).tobytes(),
         datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def delete_embedding(source_type: str, source_id: str) -> None:
    conn = _connect()
    conn.execute("DELETE FROM embeddings WHERE source_type = ? AND source_id = ?", (source_type, source_id))
    conn.commit()
    conn.close()


def all_embeddings(discipline: str | None = None) -> list[dict]:
    conn = _connect()
    if discipline:
        rows = conn.execute(
            "SELECT source_type, source_id, discipline, chunk_text, vector FROM embeddings WHERE discipline = ?",
            (discipline,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT source_type, source_id, discipline, chunk_text, vector FROM embeddings"
        ).fetchall()
    conn.close()
    return [
        {
            "source_type": r[0],
            "source_id": r[1],
            "discipline": r[2],
            "chunk_text": r[3],
            "vector": np.frombuffer(r[4], dtype=np.float32),
        }
        for r in rows
    ]
