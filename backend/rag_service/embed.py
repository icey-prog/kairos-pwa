"""Turns text into a "fingerprint" (a vector of numbers) that captures meaning,
not exact words — two paraphrased sentences get similar fingerprints.

Model runs fully local on CPU, no API key, no network call. Loaded once and
reused (loading it takes a couple seconds, embedding a note takes ~10-50ms).
"""
from sentence_transformers import SentenceTransformer

# Multilingual (handles French notes) and small enough to run comfortably on CPU.
_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


def embed(text: str):
    """Returns a normalized float32 vector — normalized so that cosine
    similarity between two vectors is just their dot product (see search.py)."""
    model = _get_model()
    return model.encode(text, normalize_embeddings=True)
