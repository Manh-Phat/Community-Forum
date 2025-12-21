from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from App.deps import get_db, require_admin
from App.models.thread import Thread
from App.models.comment import Comment
from App.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/threads", response_model=list[dict])
def admin_list_threads(
    status: str = Query(default="pending", pattern="^(pending|approved|all|deleted)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(Thread)
    if status == "pending":
        q = q.filter(Thread.is_deleted == False, Thread.is_approved == False)
    elif status == "approved":
        q = q.filter(Thread.is_deleted == False, Thread.is_approved == True)
    elif status == "deleted":
        q = q.filter(Thread.is_deleted == True)
    else:
        pass

    items = q.order_by(desc(Thread.created_at)).limit(200).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "author_id": t.author_id,
            "category": t.category,
            "tags": t.tags or [],
            "vote_score": t.vote_score,
            "views": t.views,
            "is_approved": t.is_approved,
            "is_locked": t.is_locked,
            "is_deleted": t.is_deleted,
            "created_at": t.created_at,
        }
        for t in items
    ]

@router.post("/threads/{thread_id}/approve")
def approve_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.is_approved = True
    db.add(t)
    db.commit()
    return {"message": "approved", "thread_id": thread_id}

@router.post("/threads/{thread_id}/reject")
def reject_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.is_deleted = True
    db.add(t)
    db.commit()
    return {"message": "rejected_deleted", "thread_id": thread_id}

@router.post("/threads/{thread_id}/lock")
def lock_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.is_locked = True
    db.add(t)
    db.commit()
    return {"message": "locked", "thread_id": thread_id}

@router.post("/threads/{thread_id}/unlock")
def unlock_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.is_locked = False
    db.add(t)
    db.commit()
    return {"message": "unlocked", "thread_id": thread_id}

@router.post("/threads/{thread_id}/restore")
def restore_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    t.is_deleted = False
    # restoring doesn't auto-approve; keep whatever flag
    db.add(t)
    db.commit()
    return {"message": "restored", "thread_id": thread_id}

@router.get("/comments", response_model=list[dict])
def admin_list_comments(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    items = db.query(Comment).order_by(desc(Comment.created_at)).limit(300).all()
    return [
        {
            "id": c.id,
            "thread_id": c.thread_id,
            "author_id": c.author_id,
            "parent_id": c.parent_id,
            "content": c.content,
            "is_deleted": c.is_deleted,
            "created_at": c.created_at,
        }
        for c in items
    ]

@router.post("/comments/{comment_id}/delete")
def admin_delete_comment(comment_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    c.is_deleted = True
    db.add(c)
    db.commit()
    return {"message": "deleted", "comment_id": comment_id}

@router.post("/users/{user_id}/role")
def set_role(user_id: int, role: str = Query(pattern="^(user|admin)$"), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.role = role
    db.add(u)
    db.commit()
    return {"message": "updated", "user_id": user_id, "role": role}
