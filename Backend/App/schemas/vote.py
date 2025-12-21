from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional

class VoteIn(BaseModel):
    value: int

    @field_validator("value")
    @classmethod
    def validate_vote(cls, v: int):
        if v not in (-1, 1):
            raise ValueError("Vote must be -1 or 1")
        return v

class VoteOut(BaseModel):
    thread_id: int
    value: int
    vote_score: int
    model_config = ConfigDict(from_attributes=True)

class MyVoteOut(BaseModel):
    thread_id: int
    value: Optional[int] = None
