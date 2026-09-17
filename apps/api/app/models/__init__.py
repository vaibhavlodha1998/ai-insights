"""Import every model module here so Alembic autogenerate can see its tables."""

from app.db.base import Base
from app.models.conversation import Conversation, PromptResponse
from app.models.insight import Insight

__all__ = ["Base", "Conversation", "Insight", "PromptResponse"]
