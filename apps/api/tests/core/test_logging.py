import json
import logging

from app.core.logging import JsonFormatter, RequestIdFilter, request_id_var


def make_record(**extra: object) -> logging.LogRecord:
    record = logging.makeLogRecord(
        {"name": "app.test", "levelno": logging.INFO, "levelname": "INFO"}
    )
    record.msg = "hello %s"
    record.args = ("world",)
    record.__dict__.update(extra)
    return record


def test_filter_adds_current_request_id() -> None:
    token = request_id_var.set("req-1")
    try:
        record = make_record()
        RequestIdFilter().filter(record)
    finally:
        request_id_var.reset(token)

    assert record.__dict__["request_id"] == "req-1"


def test_filter_defaults_outside_a_request() -> None:
    record = make_record()
    RequestIdFilter().filter(record)

    assert record.__dict__["request_id"] == "-"


def test_json_formatter_includes_extras() -> None:
    record = make_record(request_id="req-2", status_code=201)

    payload = json.loads(JsonFormatter().format(record))

    assert payload["message"] == "hello world"
    assert payload["level"] == "INFO"
    assert payload["logger"] == "app.test"
    assert payload["request_id"] == "req-2"
    assert payload["status_code"] == 201
    assert "timestamp" in payload
