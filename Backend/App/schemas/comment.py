from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None

    @field_validator("content")
    @classmethod
    def content_clean(cls, v: str):
        v=(v or "").strip()
        if not v:
            raise ValueError("Content required")
        return v

class CommentUpdate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_clean(cls, v: str):
        v=(v or "").strip()
        if not v:
            raise ValueError("Content required")
        return v

class CommentOut(BaseModel):
    id: int
    thread_id: int
    author_id: int
    parent_id: Optional[int]
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CommentTreeOut(CommentOut):
    children: List["CommentTreeOut"] = []

CommentTreeOut.model_rebuild()
