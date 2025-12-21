from sqlalchemy import Column, Integer, UniqueConstraint, ForeignKey
from App.database import Base

class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "thread_id", name="uq_user_thread_vote"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    value = Column(Integer, nullable=False)  # 1 hoặc -1
