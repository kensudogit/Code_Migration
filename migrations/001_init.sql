-- Code Migration: conversion history and supported language pairs

CREATE TABLE IF NOT EXISTS conversion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    direction TEXT NOT NULL,
    source_code TEXT NOT NULL,
    result_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    model TEXT,
    token_estimate INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created ON conversion_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_direction ON conversion_jobs (direction);

COMMENT ON TABLE conversion_jobs IS 'AI code conversion job history';
