import json
import logging
import logging.config
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings

# Set per request by RequestContextMiddleware; "-" outside a request
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

# Attributes every LogRecord has (plus uvicorn's ANSI-coloured duplicate of the
# message); anything else was passed via `extra=` and is kept
_RECORD_ATTRS = set(vars(logging.makeLogRecord({}))) | {
    "message",
    "request_id",
    "color_message",
}


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line, including any `extra=` fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        payload.update(
            {k: v for k, v in vars(record).items() if k not in _RECORD_ATTRS}
        )
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(settings: Settings) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {
                "text": {
                    "format": "%(asctime)s %(levelname)-8s %(name)s "
                    "[%(request_id)s] %(message)s"
                },
                "json": {"()": JsonFormatter},
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": settings.LOG_FORMAT,
                    "filters": ["request_id"],
                }
            },
            "root": {"level": settings.LOG_LEVEL, "handlers": ["console"]},
            "loggers": {
                # Route uvicorn through the root handler so it shares the format
                "uvicorn": {"handlers": [], "propagate": True},
                "uvicorn.error": {"handlers": [], "propagate": True},
                # RequestContextMiddleware already logs each request with its id
                "uvicorn.access": {"handlers": [], "propagate": False},
            },
        }
    )
