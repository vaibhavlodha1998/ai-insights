import re
import unicodedata

_WORD = re.compile(r"\w+")


def normalize(text: str) -> str:
    """Lowercase and strip accents, so "Tecnología" and "tecnologia" compare equal."""
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def tokenize(text: str) -> list[str]:
    return _WORD.findall(normalize(text))
