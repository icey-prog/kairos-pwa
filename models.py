from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class MoodLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: int = Field(ge=1, le=5)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = Field(default=None, max_length=1000)


class MoodLogCreate(SQLModel):
    score: int = Field(ge=1, le=5)
    notes: Optional[str] = Field(default=None, max_length=1000)


class XpTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    amount: int
    reason: str = Field(max_length=200)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class XpTransactionCreate(SQLModel):
    amount: int
    reason: str = Field(max_length=200)


class Reward(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    cost: int = Field(ge=0)
    is_active: bool = Field(default=True)


class RewardCreate(SQLModel):
    title: str = Field(max_length=200)
    cost: int = Field(ge=0)


# --- TASK ---

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    resources: Optional[str] = Field(default=None, max_length=2000)  # JSON-encoded list stored as text
    target_minutes: int = Field(default=90, ge=1)
    spent_minutes: int = Field(default=0, ge=0)
    reminder_time: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskCreate(SQLModel):
    title: str = Field(max_length=200)
    resources: Optional[str] = Field(default=None, max_length=2000)
    target_minutes: int = Field(default=90, ge=1)
    reminder_time: Optional[datetime] = None


class AddTimePayload(SQLModel):
    minutes: int = Field(ge=1)


# --- FEYNMAN NOTES ---

class FeynmanNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discipline: str = Field(max_length=100)
    topic: str = Field(max_length=200)
    simple_explanation: str = Field(max_length=2000)
    analogies: Optional[str] = Field(default=None, max_length=2000)
    gaps: Optional[str] = Field(default=None, max_length=2000)
    refined_explanation: Optional[str] = Field(default=None, max_length=2000)
    mastery_level: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FeynmanNoteCreate(SQLModel):
    discipline: str = Field(max_length=100)
    topic: str = Field(max_length=200)
    simple_explanation: str = Field(max_length=2000)
    analogies: Optional[str] = Field(default=None, max_length=2000)
    gaps: Optional[str] = Field(default=None, max_length=2000)
    refined_explanation: Optional[str] = Field(default=None, max_length=2000)
    mastery_level: int = 0


# --- SPACED REPETITION (SM-2) ---

class SpacedCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discipline: str = Field(max_length=100)
    front: str = Field(max_length=500)
    back: str = Field(max_length=2000)
    interval: int = Field(default=0)
    repetition: int = Field(default=0)
    easiness_factor: float = Field(default=2.5)
    next_review_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SpacedCardCreate(SQLModel):
    discipline: str = Field(max_length=100)
    front: str = Field(max_length=500)
    back: str = Field(max_length=2000)
    interval: int = 0
    repetition: int = 0
    easiness_factor: float = 2.5
    next_review_date: Optional[datetime] = None


class SpacedCardUpdate(SQLModel):
    interval: int
    repetition: int
    easiness_factor: float
    next_review_date: datetime
