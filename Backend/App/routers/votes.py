from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from App.deps import get_db, get_current_user
from App.models.vote import Vote
from App.models.thread import Thread
from App.models.user import User
from App.schemas.vote import VoteIn, VoteOut, MyVoteOut

router = APIRouter(prefix="", tags=["votes"])

@router.get("/threads/{thread_id}/vote/my", response_model=MyVoteOut)
def my_vote(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(Vote).filter(Vote.thread_id == thread_id, Vote.user_id == current_user.id).first()
    return MyVoteOut(thread_id=thread_id, value=v.value if v else None)

@router.post("/threads/{thread_id}/vote", response_model=VoteOut)
def vote(
    thread_id: int,
    payload: VoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted or not t.is_approved:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = db.query(Vote).filter(Vote.thread_id == thread_id, Vote.user_id == current_user.id).first()
    if existing:
        # adjust score
        if existing.value != payload.value:
            t.vote_score = (t.vote_score or 0) - existing.value + payload.value
            existing.value = payload.value
            db.add(existing)
    else:
        v = Vote(user_id=current_user.id, thread_id=thread_id, value=payload.value)
        db.add(v)
        t.vote_score = (t.vote_score or 0) + payload.value

    db.add(t)
    db.commit()
    return VoteOut(thread_id=thread_id, value=payload.value, vote_score=t.vote_score)

@router.delete("/threads/{thread_id}/vote", response_model=VoteOut)
def unvote(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted or not t.is_approved:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = db.query(Vote).filter(Vote.thread_id == thread_id, Vote.user_id == current_user.id).first()
    if not existing:
        return VoteOut(thread_id=thread_id, value=0, vote_score=t.vote_score or 0)

    t.vote_score = (t.vote_score or 0) - existing.value
    db.delete(existing)
    db.add(t)
    db.commit()
    return VoteOut(thread_id=thread_id, value=0, vote_score=t.vote_score)
