import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from app.db.base import Base


class Conversation(Base):
    """A thread of prompts sharing a `contextId`."""

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    # Set in Python: now() is the same for every row in a transaction, which would
    # make the order of a conversation's turns ambiguous
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
    )


class PromptResponse(Base):
    """One submitted prompt and what the API answered."""

    __tablename__ = "prompt_responses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    prompt: Mapped[str] = mapped_column(Text)
    target_language: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(String(30))
    # Matched insights in ranked order; pages are slices of this list
    insight_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(Uuid))
    # Set in Python: now() is the same for every row in a transaction, which would
    # make the order of a conversation's turns ambiguous
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
