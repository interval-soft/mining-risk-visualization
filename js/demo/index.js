/**
 * Demo Module - Living Demo Mode
 * 
 * Provides a realistic demo experience for client presentations with:
 * - Pre-loaded 48h of historical alerts and insights
 * - Live simulation ticker (new events every 30-60 seconds)
 * - Presenter trigger panel for dramatic scenarios
 * 
 * Activation: ?demo=true URL param or Ctrl+Shift+D
 */

export { DemoMode } from './DemoMode.js';
export { DemoDataProvider } from './DemoDataProvider.js';
export { LiveSimulator } from './LiveSimulator.js';
export { DemoTriggerPanel } from './DemoTriggerPanel.js';
export { DemoScenarios } from './DemoScenarios.js';
export { DemoAlertTemplates, DemoInsightTemplates } from './DemoAlertTemplates.js';
