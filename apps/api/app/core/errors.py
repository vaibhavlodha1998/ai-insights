import logging
from collections.abc import Mapping, Sequence
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.error import ErrorBody, ErrorResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Expected failure raised from services, rendered as the standard error body."""

    status_code = 400
    code = "BAD_REQUEST"

    def __init__(self, message: str, *, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


def error_code(status_code: int) -> str:
    """`404` -> `NOT_FOUND`, `405` -> `METHOD_NOT_ALLOWED`."""
    try:
        phrase = HTTPStatus(status_code).phrase
    except ValueError:
        return "ERROR"
    return phrase.upper().replace(" ", "_").replace("-", "_")


def validation_error(errors: Sequence[Mapping[str, Any]]) -> tuple[int, str, str]:
    """Status, code and message for a request validation failure.

    Schemas raise `PydanticCustomError("SOME_CODE", "message")` for errors the client
    should be able to tell apart; the first error reported decides the response.
    """
    first = errors[0] if errors else {}
    error_type = str(first.get("type", ""))
    if error_type == "json_invalid":
        return 400, "INVALID_JSON", "Request body is not valid JSON"
    if error_type == "missing" and tuple(first.get("loc", ())) == ("body",):
        return 422, "INVALID_BODY", "Request body must be a JSON object"
    if error_type.isupper():
        return 422, error_type, str(first.get("msg", ""))
    return 422, "VALIDATION_ERROR", "Request validation failed"


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            request_id=getattr(request.state, "request_id", None),
            details=jsonable_encoder(details),
        )
    )
    return JSONResponse(body.model_dump(), status_code=status_code, headers=headers)


async def handle_app_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return error_response(request, exc.status_code, exc.code, exc.message, exc.details)


async def handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    detail_is_message = isinstance(exc.detail, str)
    return error_response(
        request,
        exc.status_code,
        error_code(exc.status_code),
        exc.detail if detail_is_message else HTTPStatus(exc.status_code).phrase,
        None if detail_is_message else exc.detail,
        headers=exc.headers,
    )


async def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    # Drop the echoed input: it can be large and may contain sensitive values
    errors = [
        {key: value for key, value in error.items() if key != "input"}
        for error in exc.errors()
    ]
    status_code, code, message = validation_error(errors)
    return error_response(request, status_code, code, message, errors)


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Details stay in the logs; clients only get the request id to quote
    logger.error("Unhandled error", exc_info=exc)
    return error_response(request, 500, "INTERNAL_ERROR", "Internal server error")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
