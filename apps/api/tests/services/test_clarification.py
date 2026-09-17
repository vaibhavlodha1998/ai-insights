import pytest

from app.services.clarification import meaningful_words, needs_clarification


@pytest.mark.parametrize(
    "prompt",
    [
        "AI",
        "help",
        "tell me more",
        "explain this please",
        "what about it?",
        "hola, dime más",
        "aide moi",
        "erkläre mir das",
        "!!!???",
        "12345 678",
    ],
)
def test_vague_prompts_need_clarification(prompt: str) -> None:
    assert needs_clarification([prompt]) is True


@pytest.mark.parametrize(
    "prompt",
    [
        "How is AI changing healthcare?",
        "saving money tips",
        "¿Cómo está cambiando la IA la salud?",
        "Wie verändert KI die Medizin?",
    ],
)
def test_specific_prompts_do_not(prompt: str) -> None:
    assert needs_clarification([prompt]) is False


def test_follow_up_completes_an_earlier_vague_prompt() -> None:
    assert needs_clarification(["AI"]) is True
    assert needs_clarification(["AI", "in healthcare"]) is False


def test_meaningful_words_ignore_accents_case_and_fillers() -> None:
    assert meaningful_words("Tell me about Tecnología and the CLOUD") == [
        "tecnologia",
        "cloud",
    ]
