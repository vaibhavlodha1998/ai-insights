from typing import Any

from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str
    request_id: str | None = None
    details: Any = None


class ErrorResponse(BaseModel):
    """Body of every error response: `{"error": {"code", "message", ...}}`."""

    error: ErrorBody
