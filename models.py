from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class MoodLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: int = Field(ge=1, le=5)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


class MoodLogCreate(SQLModel):
    score: int = Field(ge=1, le=5)
    notes: Optional[str] = None


class XpTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    amount: int
    reason: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


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
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(SQLModel):
    title: str
    resources: Optional[str] = None
    target_minutes: int = Field(default=90, ge=1)
    reminder_time: Optional[datetime] = None


class AddTimePayload(SQLModel):
    minutes: int = Field(ge=1)
