from sqlalchemy import Column, Integer, String, Text
from App.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # user | admin

    # ✅ Profile fields (để /users/me PUT lưu được)
    display_name = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    facebook_url = Column(String(255), nullable=True)
    avatar_url = Column(String(255), nullable=True)
