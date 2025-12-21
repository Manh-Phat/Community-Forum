from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from App.deps import get_db, get_current_user
from App.models.thread import Thread
from App.models.user import User
from App.schemas.thread import ThreadCreate, ThreadUpdate, ThreadOut, ThreadListOut

router = APIRouter(prefix="/threads", tags=["threads"])

def _can_view(thread: Thread, user: User | None) -> bool:
    if thread.is_deleted:
        return False
    if thread.is_approved:
        return True
    # unapproved: only author or admin
    if not user:
        return False
    return user.role == "admin" or thread.author_id == user.id

@router.post("", response_model=ThreadOut)
def create_thread(
    data: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # user posts need moderation; admin auto-approve
    is_approved = True if current_user.role == "admin" else False

    t = Thread(
        title=data.title,
        content=data.content,
        author_id=current_user.id,
        category=data.category,
        tags=data.tags or [],
        is_approved=is_approved,
        is_locked=False,
        is_deleted=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.get("", response_model=ThreadListOut)
def list_threads(
    q: str | None = Query(default=None, description="search keyword"),
    tag: str | None = None,
    category: str | None = None,
    sort: str = Query(default="latest", pattern="^(latest|top)$"),
    page: int = 1,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    base = db.query(Thread).filter(Thread.is_deleted == False, Thread.is_approved == True)

    if q:
        like = f"%{q.strip()}%"
        base = base.filter(or_(Thread.title.ilike(like), Thread.content.ilike(like)))
    if category:
        base = base.filter(Thread.category == category.strip().lower())
    if tag:
        # tags is JSON array; easiest portable approach: text search on cast
        t = tag.strip().lower()
        base = base.filter(Thread.tags.contains([t]))

    total = base.count()
    if sort == "top":
        base = base.order_by(desc(Thread.vote_score), desc(Thread.created_at))
    else:
        base = base.order_by(desc(Thread.created_at))

    items = base.offset((page - 1) * limit).limit(limit).all()
    return ThreadListOut(items=items, page=page, limit=limit, total=total)

@router.get("/trending", response_model=ThreadListOut)
def trending(
    page: int = 1,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    # Compute trending in python (simple formula)
    import math
    from datetime import datetime, timezone

    page = max(page, 1)
    base = db.query(Thread).filter(Thread.is_deleted == False, Thread.is_approved == True).all()

    now = datetime.now(timezone.utc)

    def score(t: Thread) -> float:
        age_hours = max((now - t.created_at).total_seconds() / 3600.0, 0.0)
        return (t.vote_score * 2.0) + (math.log(t.views + 1, 10) * 3.0) - (age_hours * 0.15)

    ranked = sorted(base, key=score, reverse=True)
    total = len(ranked)
    start = (page - 1) * limit
    items = ranked[start:start + limit]
    return ThreadListOut(items=items, page=page, limit=limit, total=total)

@router.get("/mine", response_model=ThreadListOut)
def my_threads(
    page: int = 1,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page = max(page, 1)
    base = db.query(Thread).filter(Thread.author_id == current_user.id, Thread.is_deleted == False)
    total = base.count()
    items = base.order_by(desc(Thread.created_at)).offset((page - 1) * limit).limit(limit).all()
    return ThreadListOut(items=items, page=page, limit=limit, total=total)

@router.get("/{thread_id}", response_model=ThreadOut)
def get_thread(
    thread_id: int,
    db: Session = Depends(get_db),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted or not t.is_approved:
        raise HTTPException(status_code=404, detail="Thread not found")
    # increase views
    t.views = (t.views or 0) + 1
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.put("/{thread_id}", response_model=ThreadOut)
def update_thread(
    thread_id: int,
    data: ThreadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted:
        raise HTTPException(status_code=404, detail="Thread not found")

    if current_user.role != "admin" and t.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if t.is_locked and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Thread is locked")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(t, field, value)

    # edits by non-admin require re-approval
    if current_user.role != "admin":
        t.is_approved = False

    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.delete("/{thread_id}")
def delete_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted:
        raise HTTPException(status_code=404, detail="Thread not found")
    if current_user.role != "admin" and t.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    t.is_deleted = True
    db.add(t)
    db.commit()
    return {"message": "Thread deleted", "thread_id": thread_id}
