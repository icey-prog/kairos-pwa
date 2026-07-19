"""The comparator: given a query fingerprint, finds the closest ones already
in the drawer. Brute-force — at a few hundred/thousand notes this runs in a
few milliseconds, no index (FAISS/HNSW) needed.
"""
import numpy as np


def top_k_matches(query_vector, candidates: list[dict], k: int = 5) -> list[dict]:
    if not candidates:
        return []
    matrix = np.stack([c["vector"] for c in candidates])
    scores = matrix @ np.asarray(query_vector, dtype=np.float32)  # dot product == cosine (vectors are normalized)
    order = np.argsort(scores)[::-1][:k]
    return [
        {
            "source_type": candidates[i]["source_type"],
            "source_id": candidates[i]["source_id"],
            "discipline": candidates[i]["discipline"],
            "chunk_text": candidates[i]["chunk_text"],
            "score": float(scores[i]),
        }
        for i in order
    ]
