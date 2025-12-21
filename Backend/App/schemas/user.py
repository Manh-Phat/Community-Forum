from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def clean_username(cls, v: str):
        v=(v or "").strip()
        if len(v) < 3:
            raise ValueError("Username too short")
        return v[:50]

    @field_validator("password")
    @classmethod
    def clean_password(cls, v: str):
        if not v or len(v) < 6:
            raise ValueError("Password must be >= 6 chars")
        return v

class UserBaseOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str

    display_name: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    facebook_url: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserOut(UserBaseOut):
    pass

class UserMeOut(UserBaseOut):
    pass

class UserMeUpdate(BaseModel):
    display_name: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    facebook_url: Optional[str] = None
    avatar_url: Optional[str] = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
