"""The front door: any project can POST text to /index to remember it, or
POST a question to /search to get the closest matches back. Knows nothing
about Mile's domain models — pure text-in/text-out, so it's reusable as-is.
"""
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from embed import embed
from search import top_k_matches
from store import all_embeddings, delete_embedding, init_db, save_embedding


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RAG Service", version="1.0.0", lifespan=lifespan)


class IndexIn(BaseModel):
    source_type: str            # e.g. "feynman", "card" — free-form, caller's own vocabulary
    source_id: str
    discipline: Optional[str] = None
    text: str


class SearchIn(BaseModel):
    query: str
    discipline: Optional[str] = None
    top_k: int = 5


@app.post("/index")
def index(payload: IndexIn):
    vector = embed(payload.text)
    save_embedding(payload.source_type, payload.source_id, payload.discipline, payload.text, vector)
    return {"success": True}


@app.delete("/index/{source_type}/{source_id}")
def unindex(source_type: str, source_id: str):
    delete_embedding(source_type, source_id)
    return {"success": True}


@app.post("/search")
def search(payload: SearchIn):
    query_vector = embed(payload.query)
    candidates = all_embeddings(payload.discipline)
    return {"results": top_k_matches(query_vector, candidates, payload.top_k)}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8100)))
