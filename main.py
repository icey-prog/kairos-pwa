from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from sqlmodel import Session, func, select

from database import create_db_and_tables, get_session
from models import (
    AddTimePayload,
    MoodLog,
    MoodLogCreate,
    Reward,
    RewardCreate,
    Task,
    TaskCreate,
    XpTransaction,
    XpTransactionCreate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Neuro-Kaizen API", version="1.0.0", lifespan=lifespan)


# --- MOOD ---

@app.post("/api/mood", response_model=MoodLog, status_code=201)
def create_mood_log(payload: MoodLogCreate, session: Session = Depends(get_session)):
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
def create_xp_transaction(payload: XpTransactionCreate, session: Session = Depends(get_session)):
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
def redeem_reward(reward_id: int, session: Session = Depends(get_session)):
    reward = session.get(Reward, reward_id)
    if not reward or not reward.is_active:
        raise HTTPException(status_code=404, detail="Reward not found or inactive.")

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
    session.refresh(tx)

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
