"""Stdout and stderr setup for consoles that cannot encode emoji."""

import sys


def configure_stdio() -> None:
    """Keep emoji status lines from raising UnicodeEncodeError.

    The classic Windows console uses a code page such as cp1252, which
    cannot encode emoji. Replacing unencodable characters lets startup
    and tests finish. UTF-8 terminals already encode these characters.
    """
    for stream in (sys.stdout, sys.stderr):
        if stream is None:
            continue
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(errors="replace")
        except (OSError, ValueError):
            continue
