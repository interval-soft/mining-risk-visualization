-- ============================================================================
-- Migration: Enable RLS for Demo Mode
-- Created: 2026-01-29
-- Purpose: Enable Row-Level Security on all public tables with permissive
--          policies to silence Supabase linter warnings during demo phase.
--
-- ⚠️  WARNING: These are DEMO-ONLY policies that allow unrestricted access.
--              Replace with production policies before going live.
-- ============================================================================

-- ==========================
-- REAL-TIME DATA TABLES
-- ==========================

-- Alerts table
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_alerts_all" ON public.alerts
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_alerts_all" ON public.alerts IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_events_all" ON public.events
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_events_all" ON public.events IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Measurements table
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_measurements_all" ON public.measurements
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_measurements_all" ON public.measurements IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- ==========================
-- AI SYSTEM TABLES
-- ==========================

-- AI Insights table
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_insights_all" ON public.ai_insights
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_insights_all" ON public.ai_insights IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- AI Predictions table
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_predictions_all" ON public.ai_predictions
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_predictions_all" ON public.ai_predictions IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- AI Queries table
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_queries_all" ON public.ai_queries
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_queries_all" ON public.ai_queries IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- AI Feedback table
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_feedback_all" ON public.ai_feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_feedback_all" ON public.ai_feedback IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- AI Config table
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_config_all" ON public.ai_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_config_all" ON public.ai_config IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- AI Audit table
ALTER TABLE public.ai_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_ai_audit_all" ON public.ai_audit
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_ai_audit_all" ON public.ai_audit IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- ==========================
-- SNAPSHOT TABLES
-- ==========================

-- Snapshots table
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_snapshots_all" ON public.snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_snapshots_all" ON public.snapshots IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Snapshot Levels table
ALTER TABLE public.snapshot_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_snapshot_levels_all" ON public.snapshot_levels
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_snapshot_levels_all" ON public.snapshot_levels IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Snapshot Activities table
ALTER TABLE public.snapshot_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_snapshot_activities_all" ON public.snapshot_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_snapshot_activities_all" ON public.snapshot_activities IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- ==========================
-- RISK MANAGEMENT TABLES
-- ==========================

-- Risk Rules table
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_risk_rules_all" ON public.risk_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_risk_rules_all" ON public.risk_rules IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Risk Audit table
ALTER TABLE public.risk_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_risk_audit_all" ON public.risk_audit
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_risk_audit_all" ON public.risk_audit IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- Baselines table
ALTER TABLE public.baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_baselines_all" ON public.baselines
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "demo_baselines_all" ON public.baselines IS
  'DEMO ONLY: Allows all operations. Replace with role-based policies for production.';


-- ==========================
-- VERIFICATION
-- ==========================

-- Query to verify all RLS is enabled (run this to check)
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   'alerts', 'events', 'measurements',
--   'ai_insights', 'ai_predictions', 'ai_queries', 'ai_feedback', 'ai_config', 'ai_audit',
--   'snapshots', 'snapshot_levels', 'snapshot_activities',
--   'risk_rules', 'risk_audit', 'baselines'
-- )
-- ORDER BY tablename;
