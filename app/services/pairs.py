"""Supported conversion directions."""

from enum import Enum


class Language(str, Enum):
    JAVA = "java"
    PYTHON = "python"
    TYPESCRIPT = "typescript"
    COBOL = "cobol"
    GO = "go"


class ConversionDirection(str, Enum):
    JAVA_TO_PYTHON = "java_to_python"
    PYTHON_TO_JAVA = "python_to_java"
    JAVA_TO_TYPESCRIPT = "java_to_typescript"
    TYPESCRIPT_TO_JAVA = "typescript_to_java"
    COBOL_TO_JAVA = "cobol_to_java"
    JAVA_TO_COBOL = "java_to_cobol"
    GO_TO_PYTHON = "go_to_python"
    PYTHON_TO_GO = "python_to_go"
    GO_TO_JAVA = "go_to_java"
    JAVA_TO_GO = "java_to_go"

    @property
    def source(self) -> Language:
        return Language(self.value.split("_to_")[0])

    @property
    def target(self) -> Language:
        return Language(self.value.split("_to_", 1)[1])

    @property
    def label(self) -> str:
        labels = {
            Language.JAVA: "Java",
            Language.PYTHON: "Python",
            Language.TYPESCRIPT: "TypeScript",
            Language.COBOL: "COBOL",
            Language.GO: "Go",
        }
        return f"{labels[self.source]} \u2192 {labels[self.target]}"


SUPPORTED_DIRECTIONS: list[ConversionDirection] = list(ConversionDirection)


def resolve_direction(source: Language, target: Language) -> ConversionDirection | None:
    key = f"{source.value}_to_{target.value}"
    try:
        return ConversionDirection(key)
    except ValueError:
        return None
