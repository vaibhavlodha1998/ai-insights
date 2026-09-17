import uuid
from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from app.core.languages import SUPPORTED_LANGUAGES, LanguageCode
from app.schemas.base import CamelModel

MAX_PROMPT_LENGTH = 2000
PAGE_SIZE = 10

CLARIFICATION_MESSAGE = "Please provide more details"


class PromptRequest(CamelModel):
    # Clients must send exactly the camelCase fields, nothing else
    model_config = ConfigDict(extra="forbid", validate_by_name=False)

    prompt: str = Field(examples=["How is AI changing healthcare?"])
    target_language: LanguageCode = Field(examples=["en"])
    context_id: uuid.UUID | None = Field(
        default=None,
        description="Continue the conversation a previous response started",
    )

    @model_validator(mode="before")
    @classmethod
    def check_in_order(cls, data: Any) -> Any:
        """Runs before field validation so the first problem decides the error code."""
        if not isinstance(data, dict):
            raise PydanticCustomError(
                "INVALID_BODY", "Request body must be a JSON object"
            )

        prompt = data.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise PydanticCustomError("PROMPT_REQUIRED", "Prompt is required")
        if len(prompt.strip()) > MAX_PROMPT_LENGTH:
            raise PydanticCustomError(
                "PROMPT_TOO_LONG",
                "Prompt must be at most {max_length} characters",
                {"max_length": MAX_PROMPT_LENGTH},
            )

        language = data.get("targetLanguage")
        if language is None or language == "":
            raise PydanticCustomError(
                "LANGUAGE_REQUIRED", "Target language is required"
            )
        if not isinstance(language, str) or language not in SUPPORTED_LANGUAGES:
            raise PydanticCustomError(
                "INVALID_LANGUAGE",
                "Target language is not supported",
                {"supported": sorted(SUPPORTED_LANGUAGES)},
            )
        return data

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, value: str) -> str:
        return value.strip()

    @field_validator("context_id", mode="before")
    @classmethod
    def check_context_id(cls, value: Any) -> Any:
        if value is None:
            return None
        try:
            return uuid.UUID(str(value))
        except ValueError:
            raise PydanticCustomError(
                "INVALID_CONTEXT_ID", "Context id must be a valid UUID"
            ) from None


class InsightOut(CamelModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    category: str
    source: str
    confidence: float
    tags: list[str]


class Pagination(CamelModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next_page: bool


class InsightsPage(CamelModel):
    response_id: uuid.UUID
    insights: list[InsightOut]
    pagination: Pagination


class NeedsClarificationResponse(CamelModel):
    status: Literal["NEEDS_CLARIFICATION"] = "NEEDS_CLARIFICATION"
    message: str = CLARIFICATION_MESSAGE
    context_id: uuid.UUID


class SuccessResponse(InsightsPage):
    status: Literal["SUCCESS"] = "SUCCESS"
    context_id: uuid.UUID


PromptResult = Annotated[
    NeedsClarificationResponse | SuccessResponse, Field(discriminator="status")
]
