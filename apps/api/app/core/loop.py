import asyncio


def selector_loop_factory() -> asyncio.AbstractEventLoop:
    """Event loop for `uvicorn --loop app.core.loop:selector_loop_factory`.

    psycopg's async mode cannot run on the ProactorEventLoop that Windows uses
    by default, so local development on Windows needs a selector loop.
    """
    return asyncio.SelectorEventLoop()
