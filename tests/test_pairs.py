"""Tests for conversion pair resolution."""

import pytest

from app.services.pairs import ConversionDirection, Language, resolve_direction


@pytest.mark.parametrize(
    "src,tgt,expected",
    [
        (Language.JAVA, Language.PYTHON, ConversionDirection.JAVA_TO_PYTHON),
        (Language.PYTHON, Language.JAVA, ConversionDirection.PYTHON_TO_JAVA),
        (Language.JAVA, Language.TYPESCRIPT, ConversionDirection.JAVA_TO_TYPESCRIPT),
        (Language.TYPESCRIPT, Language.JAVA, ConversionDirection.TYPESCRIPT_TO_JAVA),
        (Language.COBOL, Language.JAVA, ConversionDirection.COBOL_TO_JAVA),
        (Language.JAVA, Language.COBOL, ConversionDirection.JAVA_TO_COBOL),
        (Language.GO, Language.PYTHON, ConversionDirection.GO_TO_PYTHON),
        (Language.PYTHON, Language.GO, ConversionDirection.PYTHON_TO_GO),
        (Language.GO, Language.JAVA, ConversionDirection.GO_TO_JAVA),
        (Language.JAVA, Language.GO, ConversionDirection.JAVA_TO_GO),
    ],
)
def test_resolve_direction(src, tgt, expected):
    assert resolve_direction(src, tgt) == expected


def test_unsupported_pair():
    assert resolve_direction(Language.PYTHON, Language.COBOL) is None
