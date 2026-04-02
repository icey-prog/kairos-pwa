from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class MoodLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: int = Field(ge=1, le=5)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None


class MoodLogCreate(SQLModel):
    score: int = Field(ge=1, le=5)
    notes: Optional[str] = None


class XpTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    amount: int
    reason: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class XpTransactionCreate(SQLModel):
    amount: int
    reason: str


class Reward(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    cost: int = Field(ge=0)
    is_active: bool = Field(default=True)


class RewardCreate(SQLModel):
    title: str
    cost: int = Field(ge=0)


# --- TASK ---

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    resources: Optional[str] = Field(default=None)          # JSON-encoded list stored as text
    target_minutes: int = Field(default=90, ge=1)
    spent_minutes: int = Field(default=0, ge=0)
    reminder_time: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskCreate(SQLModel):
    title: str
    resources: Optional[str] = None
    target_minutes: int = Field(default=90, ge=1)
    reminder_time: Optional[datetime] = None


class AddTimePayload(SQLModel):
    minutes: int = Field(ge=1)


# --- FEYNMAN NOTES ---

class FeynmanNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discipline: str
    topic: str
    simple_explanation: str
    analogies: Optional[str] = None
    gaps: Optional[str] = None
    refined_explanation: Optional[str] = None
    mastery_level: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FeynmanNoteCreate(SQLModel):
    discipline: str
    topic: str
    simple_explanation: str
    analogies: Optional[str] = None
    gaps: Optional[str] = None
    refined_explanation: Optional[str] = None
    mastery_level: int = 0


# --- SPACED REPETITION (SM-2) ---

class SpacedCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discipline: str
    front: str
    back: str
    interval: int = Field(default=0)
    repetition: int = Field(default=0)
    easiness_factor: float = Field(default=2.5)
    next_review_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SpacedCardCreate(SQLModel):
    discipline: str
    front: str
    back: str
    interval: int = 0
    repetition: int = 0
    easiness_factor: float = 2.5
    next_review_date: Optional[datetime] = None


class SpacedCardUpdate(SQLModel):
    interval: int
    repetition: int
    easiness_factor: float
    next_review_date: datetime
