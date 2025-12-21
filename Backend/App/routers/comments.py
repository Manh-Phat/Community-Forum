from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc

from App.deps import get_db, get_current_user
from App.models.thread import Thread
from App.models.comment import Comment
from App.models.user import User
from App.schemas.comment import CommentCreate, CommentUpdate, CommentOut, CommentTreeOut

router = APIRouter(prefix="", tags=["comments"])

def build_tree(comments: list[Comment]) -> list[CommentTreeOut]:
    by_id: dict[int, CommentTreeOut] = {}
    roots: list[CommentTreeOut] = []

    for c in comments:
        node = CommentTreeOut.model_validate(c, from_attributes=True)
        node.children = []
        by_id[c.id] = node

    for c in comments:
        node = by_id[c.id]
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots

@router.get("/threads/{thread_id}/comments", response_model=list[CommentTreeOut])
def list_comments(thread_id: int, db: Session = Depends(get_db)):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted or not t.is_approved:
        raise HTTPException(status_code=404, detail="Thread not found")

    comments = (
        db.query(Comment)
        .filter(Comment.thread_id == thread_id, Comment.is_deleted == False, Comment.is_approved == True)
        .order_by(asc(Comment.created_at))
        .all()
    )
    return build_tree(comments)

@router.post("/threads/{thread_id}/comments", response_model=CommentOut)
def create_comment(
    thread_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Thread).filter(Thread.id == thread_id).first()
    if not t or t.is_deleted or not t.is_approved:
        raise HTTPException(status_code=404, detail="Thread not found")
    if t.is_locked:
        raise HTTPException(status_code=403, detail="Thread is locked")

    if data.parent_id:
        parent = db.query(Comment).filter(Comment.id == data.parent_id, Comment.thread_id == thread_id).first()
        if not parent or parent.is_deleted:
            raise HTTPException(status_code=400, detail="Parent comment not found")

    c = Comment(
        thread_id=thread_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content,
        is_deleted=False,
        is_approved=True,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.put("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int,
    data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c or c.is_deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    if current_user.role != "admin" and c.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    c.content = data.content
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c or c.is_deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    if current_user.role != "admin" and c.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    c.is_deleted = True
    db.add(c)
    db.commit()
    return {"message": "Comment deleted", "comment_id": comment_id}
