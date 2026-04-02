from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlmodel import Session, func, select

from database import create_db_and_tables, get_session
from models import (
    AddTimePayload,
    FeynmanNote,
    FeynmanNoteCreate,
    MoodLog,
    MoodLogCreate,
    Reward,
    RewardCreate,
    SpacedCard,
    SpacedCardCreate,
    SpacedCardUpdate,
    Task,
    TaskCreate,
    XpTransaction,
    XpTransactionCreate,
)


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Neuro-Kaizen API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# --- MOOD ---

@app.post("/api/mood", response_model=MoodLog, status_code=201)
@limiter.limit("20/minute")
def create_mood_log(request: Request, payload: MoodLogCreate, session: Session = Depends(get_session)):
    entry = MoodLog.model_validate(payload)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


# --- XP ---

@app.get("/api/xp/balance")
def get_xp_balance(session: Session = Depends(get_session)):
    result = session.exec(select(func.sum(XpTransaction.amount))).one()
    return {"balance": result or 0}


@app.post("/api/xp", response_model=XpTransaction, status_code=201)
@limiter.limit("20/minute")
def create_xp_transaction(request: Request, payload: XpTransactionCreate, session: Session = Depends(get_session)):
    tx = XpTransaction.model_validate(payload)
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return tx


# --- REWARDS ---

@app.get("/api/rewards", response_model=List[Reward])
def list_active_rewards(session: Session = Depends(get_session)):
    rewards = session.exec(select(Reward).where(Reward.is_active)).all()
    return rewards


@app.post("/api/rewards", response_model=Reward, status_code=201)
def create_reward(payload: RewardCreate, session: Session = Depends(get_session)):
    reward = Reward.model_validate(payload)
    session.add(reward)
    session.commit()
    session.refresh(reward)
    return reward


@app.post("/api/rewards/redeem/{reward_id}")
@limiter.limit("10/minute")
def redeem_reward(request: Request, reward_id: int, session: Session = Depends(get_session)):
    # Lock the table for the duration of this transaction so concurrent
    # requests cannot both pass the balance check and double-spend XP.
    with session.begin_nested():
        reward = session.get(Reward, reward_id)
        if not reward or not reward.is_active:
            raise HTTPException(status_code=404, detail="Reward not found or inactive.")

        # Re-read balance inside the nested transaction to prevent TOCTOU.
        balance_result = session.exec(select(func.sum(XpTransaction.amount))).one()
        balance = balance_result or 0

        if balance < reward.cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient XP. Balance: {balance}, Required: {reward.cost}.",
            )

        tx = XpTransaction(amount=-reward.cost, reason=f"Redeemed reward: {reward.title}")
        session.add(tx)

    session.commit()

    return {
        "success": True,
        "reward": reward.title,
        "xp_spent": reward.cost,
        "new_balance": balance - reward.cost,
    }


# --- TASKS ---

@app.post("/api/tasks", response_model=Task, status_code=201)
def create_task(payload: TaskCreate, session: Session = Depends(get_session)):
    task = Task.model_validate(payload)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.get("/api/tasks", response_model=List[Task])
def list_active_tasks(session: Session = Depends(get_session)):
    """Tasks where spent_minutes < target_minutes (active feed)."""
    tasks = session.exec(
        select(Task).where(Task.spent_minutes < Task.target_minutes)
    ).all()
    return tasks


@app.get("/api/tasks/completed", response_model=List[Task])
def list_completed_tasks(session: Session = Depends(get_session)):
    """Tasks where spent_minutes >= target_minutes (archive)."""
    tasks = session.exec(
        select(Task).where(Task.spent_minutes >= Task.target_minutes)
    ).all()
    return tasks


@app.patch("/api/tasks/{task_id}/add_time", response_model=Task)
def add_time_to_task(
    task_id: int,
    payload: AddTimePayload,
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.spent_minutes += payload.minutes
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


# --- FEYNMAN NOTES ---

@app.get("/api/feynman", response_model=List[FeynmanNote])
def list_feynman_notes(session: Session = Depends(get_session)):
    return session.exec(select(FeynmanNote)).all()


@app.post("/api/feynman", response_model=FeynmanNote, status_code=201)
def create_feynman_note(payload: FeynmanNoteCreate, session: Session = Depends(get_session)):
    note = FeynmanNote.model_validate(payload)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@app.put("/api/feynman/{note_id}", response_model=FeynmanNote)
def update_feynman_note(note_id: int, payload: FeynmanNoteCreate, session: Session = Depends(get_session)):
    note = session.get(FeynmanNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(note, key, value)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@app.delete("/api/feynman/{note_id}")
def delete_feynman_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(FeynmanNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    session.delete(note)
    session.commit()
    return {"success": True}


# --- SPACED REPETITION ---

@app.get("/api/spaced-cards", response_model=List[SpacedCard])
def list_spaced_cards(due_only: bool = False, session: Session = Depends(get_session)):
    query = select(SpacedCard)
    if due_only:
        query = query.where(SpacedCard.next_review_date <= datetime.now(timezone.utc))
    return session.exec(query).all()


@app.post("/api/spaced-cards", response_model=SpacedCard, status_code=201)
def create_spaced_card(payload: SpacedCardCreate, session: Session = Depends(get_session)):
    card = SpacedCard.model_validate(payload)
    if not card.next_review_date:
        card.next_review_date = datetime.now(timezone.utc)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@app.put("/api/spaced-cards/{card_id}", response_model=SpacedCard)
def update_spaced_card(card_id: int, payload: SpacedCardUpdate, session: Session = Depends(get_session)):
    card = session.get(SpacedCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    data = payload.model_dump()
    for key, value in data.items():
        setattr(card, key, value)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card
