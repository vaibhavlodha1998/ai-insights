from typing import Literal, get_args

LanguageCode = Literal["en", "es", "fr", "de"]

SUPPORTED_LANGUAGES: frozenset[str] = frozenset(get_args(LanguageCode))
