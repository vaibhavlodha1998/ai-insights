"""Decides, before any AI call, whether a prompt has enough to work with."""

from collections.abc import Sequence

from app.services.text import normalize, tokenize

MIN_PROMPT_LENGTH = 5
MIN_MEANINGFUL_WORDS = 2

# Words that carry no subject on their own (en, es, fr, de), stored normalized
_FILLER_WORDS = frozenset(
    tokenize(
        """
        a an the and or but of to in on at for with about from by is are was be it
        this that these those me my i you we us your what which who why how when
        where can could would should do does tell give show explain help more info
        information something anything stuff things thing please question hi hello
        hey ok okay thanks
        el la los las un una y o de del en con por para sobre que como cual es son
        me mi yo tu dime dame explica ayuda mas informacion algo cosas hola gracias
        le les une des et ou du au aux avec pour sur est sont moi je tu dis donne
        explique aide plus quelque chose choses bonjour merci quoi comment pourquoi
        der die das ein eine und oder von zu im mit fur uber ist sind mir ich du
        sag gib erklare hilfe mehr etwas dinge hallo danke was wie warum
        """
    )
)


def meaningful_words(text: str) -> list[str]:
    return [
        word
        for word in tokenize(text)
        if word not in _FILLER_WORDS and len(word) > 1 and not word.isdigit()
    ]


def needs_clarification(prompts: Sequence[str]) -> bool:
    """True when the pending turns of a conversation, taken together, lack a subject.

    `prompts` is every prompt still waiting for an answer, oldest first, including
    the one just submitted. Joining them lets a short follow-up ("in healthcare")
    complete an earlier vague prompt ("AI").
    """
    combined = " ".join(prompt.strip() for prompt in prompts).strip()
    if len(normalize(combined)) < MIN_PROMPT_LENGTH:
        return True
    return len(meaningful_words(combined)) < MIN_MEANINGFUL_WORDS
