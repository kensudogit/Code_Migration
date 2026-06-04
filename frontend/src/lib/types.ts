export type Language = 'java' | 'python' | 'typescript' | 'cobol'

export type DirectionId =
  | 'java_to_python'
  | 'python_to_java'
  | 'java_to_typescript'
  | 'typescript_to_java'
  | 'cobol_to_java'
  | 'java_to_cobol'

export type DirectionInfo = {
  id: DirectionId
  label: string
  source: Language
  target: Language
}

export type HealthResponse = {
  ok: boolean
  postgres: boolean
  ai_enabled: boolean
  railway?: boolean
  openai_configured?: boolean
}

export type TokenUsage = {
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
}

export type ConvertResponse = {
  job_id: string | null
  direction: DirectionId
  source_language: Language
  target_language: Language
  source_code?: string
  result_code: string
  model: string
  mock: boolean
  warnings: string[]
  notes: string | null
  usage: TokenUsage | null
  request_id: string | null
}

export type JobSummary = {
  id: string
  direction: string
  source_language: string
  target_language: string
  status: string
  model: string | null
  created_at: string
  completed_at: string | null
}

export type JobDetail = JobSummary & {
  source_code: string
  result_code: string | null
  error_message: string | null
  warnings?: string[] | null
  progress?: string | null
  mock?: boolean
  notes?: string | null
  openai_request_id?: string | null
}

export const LANG_META: Record<Language, { label: string; color: string; icon: string }> = {
  java: { label: 'Java', color: '#f89820', icon: 'Jv' },
  python: { label: 'Python', color: '#3776ab', icon: '??' },
  typescript: { label: 'TypeScript', color: '#3178c6', icon: 'TS' },
  cobol: { label: 'COBOL', color: '#0051a5', icon: 'CB' },
}

export const SAMPLE_CODE: Partial<Record<DirectionId, string>> = {
  java_to_python: `public class Greeter {
    private final String name;

    public Greeter(String name) {
        this.name = name;
    }

    public String greet() {
        return "Hello, " + name;
    }
}`,
  python_to_java: `from dataclasses import dataclass

@dataclass
class Greeter:
    name: str

    def greet(self) -> str:
        return f"Hello, {self.name}"`,
  java_to_typescript: `public record User(String id, String email) {
    public boolean isValid() {
        return email != null && email.contains("@");
    }
}`,
  cobol_to_java: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. CALC-INT.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-A PIC 9(3) VALUE 100.
       01 WS-B PIC 9(3) VALUE 25.
       01 WS-SUM PIC 9(4).
       PROCEDURE DIVISION.
           ADD WS-A TO WS-B GIVING WS-SUM.
           DISPLAY WS-SUM.
           STOP RUN.`,
}
