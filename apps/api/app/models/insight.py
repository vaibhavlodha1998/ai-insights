import uuid

from sqlalchemy import Float, String, Text, Uuid
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Insight(Base):
    """Pre-generated "AI" output. The dummy provider matches prompts against these."""

    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    language: Mapped[str] = mapped_column(String(5), index=True)
    category: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(100))
    confidence: Mapped[float] = mapped_column(Float)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(50)))
    # Normalized (lowercase, accent-free) words that make a prompt match this insight
    keywords: Mapped[list[str]] = mapped_column(ARRAY(String(50)))
