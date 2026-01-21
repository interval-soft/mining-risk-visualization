-- AI Schema Migration: Phase 3 - Predictive Intelligence & Decision Support
-- Run this in Supabase SQL Editor

-- AI Insights: Anomalies and observations detected by AI
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    insight_type VARCHAR(50) NOT NULL,
    level_number INTEGER,
    severity VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    title VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    contributing_factors JSONB NOT NULL DEFAULT '[]',
    recommended_action TEXT,
    model_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_insights_level ON ai_insights(level_number);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_timestamp ON ai_insights(timestamp DESC);

-- AI Predictions: Future risk forecasts
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level_number INTEGER NOT NULL,
    prediction_window VARCHAR(20) NOT NULL,
    predicted_risk_score INTEGER NOT NULL,
    predicted_risk_band VARCHAR(10) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    contributing_factors JSONB NOT NULL DEFAULT '[]',
    explanation TEXT NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_predictions_level ON ai_predictions(level_number);
CREATE INDEX idx_ai_predictions_valid ON ai_predictions(valid_until);

-- Baselines: Learned "normal" patterns for anomaly detection
CREATE TABLE baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_type VARCHAR(50) NOT NULL,
    scope_key VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    sample_size INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(baseline_type, scope_key, version)
);
CREATE INDEX idx_baselines_type_scope ON baselines(baseline_type, scope_key);

-- AI Audit: Complete AI operation logging for compliance
CREATE TABLE ai_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation_type VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    latency_ms INTEGER NOT NULL,
    prompt_summary TEXT,
    output_summary TEXT,
    confidence DECIMAL(3,2),
    related_level INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT
);
CREATE INDEX idx_ai_audit_timestamp ON ai_audit(timestamp DESC);
CREATE INDEX idx_ai_audit_operation ON ai_audit(operation_type);

-- AI Feedback: Operator responses to AI outputs
CREATE TABLE ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID REFERENCES ai_insights(id) ON DELETE SET NULL,
    prediction_id UUID REFERENCES ai_predictions(id) ON DELETE SET NULL,
    feedback_type VARCHAR(20) NOT NULL,
    comment TEXT,
    operator_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_feedback_insight ON ai_feedback(insight_id);
CREATE INDEX idx_ai_feedback_prediction ON ai_feedback(prediction_id);

-- AI Queries Log: Natural language query history
CREATE TABLE ai_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    cited_data JSONB,
    model_id VARCHAR(100) NOT NULL,
    latency_ms INTEGER NOT NULL
);
CREATE INDEX idx_ai_queries_timestamp ON ai_queries(timestamp DESC);

-- AI Configuration: System-wide AI settings
CREATE TABLE ai_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO ai_config (key, value) VALUES
('enabled', 'true'),
('primary_model', '"anthropic/claude-sonnet-4"'),
('fallback_model', '"anthropic/claude-3-haiku"'),
('confidence_threshold', '0.6'),
('anomaly_sensitivity', '2.0'),
('prediction_windows', '["15_minutes", "1_hour", "1_shift"]');

-- Default baselines (will be refined as data accumulates)
-- These provide sensible starting points for anomaly detection
INSERT INTO baselines (baseline_type, scope_key, parameters, sample_size, version) VALUES
('sensor', 'methane_global', '{"mean": 0.5, "stdDev": 0.2, "percentiles": {"p5": 0.15, "p25": 0.35, "p50": 0.5, "p75": 0.65, "p95": 0.85}}', 100, 1),
('sensor', 'ventilation_global', '{"mean": 85, "stdDev": 12, "percentiles": {"p5": 60, "p25": 75, "p50": 85, "p75": 95, "p95": 105}}', 100, 1),
('event_frequency', 'proximity_alert', '{"mean": 2, "stdDev": 1.5, "percentiles": {"p5": 0, "p25": 1, "p50": 2, "p75": 3, "p95": 5}}', 50, 1);
