from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List

def _clean_tags(tags: Optional[List[str]]) -> List[str]:
    if not tags:
        return []
    clean=[]
    for t in tags:
        t=str(t).strip().lower()
        if not t:
            continue
        if len(t)>30:
            t=t[:30]
        if t not in clean:
            clean.append(t)
    return clean[:10]

class ThreadCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("title")
    @classmethod
    def title_len(cls, v: str):
        v=(v or "").strip()
        if len(v) < 3:
            raise ValueError("Title too short")
        return v[:200]

    @field_validator("content")
    @classmethod
    def content_len(cls, v: str):
        v=(v or "").strip()
        if len(v) < 1:
            raise ValueError("Content required")
        return v

    @field_validator("category")
    @classmethod
    def cat_clean(cls, v: Optional[str]):
        if not v:
            return None
        v=v.strip().lower()
        return v[:60]

    @field_validator("tags")
    @classmethod
    def tags_clean(cls, v):
        return _clean_tags(v)

class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("tags")
    @classmethod
    def tags_clean(cls, v):
        return _clean_tags(v)

class ThreadOut(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    category: Optional[str]
    tags: List[str]
    vote_score: int
    views: int
    is_approved: bool
    is_locked: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ThreadListOut(BaseModel):
    items: List[ThreadOut]
    page: int
    limit: int
    total: int
