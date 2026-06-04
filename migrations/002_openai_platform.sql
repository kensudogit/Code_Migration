-- OpenAI Platform metadata on conversion jobs

ALTER TABLE conversion_jobs ADD COLUMN IF NOT EXISTS prompt_tokens INT;
ALTER TABLE conversion_jobs ADD COLUMN IF NOT EXISTS completion_tokens INT;
ALTER TABLE conversion_jobs ADD COLUMN IF NOT EXISTS openai_request_id TEXT;
ALTER TABLE conversion_jobs ADD COLUMN IF NOT EXISTS warnings JSONB;

COMMENT ON COLUMN conversion_jobs.prompt_tokens IS 'OpenAI prompt token count';
COMMENT ON COLUMN conversion_jobs.completion_tokens IS 'OpenAI completion token count';
COMMENT ON COLUMN conversion_jobs.openai_request_id IS 'OpenAI response id (req_...)';
COMMENT ON COLUMN conversion_jobs.warnings IS 'Migration warnings from structured output';
