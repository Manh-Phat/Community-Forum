from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean, func
from App.database import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)  # nested

    content = Column(Text, nullable=False)

    # moderation / soft delete
    is_deleted = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=True)  # comments auto-approved for demo

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
