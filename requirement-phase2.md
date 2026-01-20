# Mining 3D Risk Visualization Platform  
## Phase 2 – Operational Intelligence & Time-Based Risk  
**Project Requirements Document (PRD)**

---

## 1. Phase 2 Purpose & Objective

Phase 2 transforms the Phase 1 visualization POC into a **functional operational intelligence platform**.

The objective is to move from:
- static, fake, point-in-time data  

to:
- **time-aware**
- **risk-evolving**
- **decision-oriented**

Phase 2 must support real operational questions such as:
- What is the highest-risk level right now?
- Why is it high risk?
- What changed in the last 30 minutes?
- Can crews safely re-enter after a blast?

Phase 2 still avoids advanced ML but lays the **structural foundation for Phase 3 AI**.

---

## 2. Phase 2 Scope

### 2.1 In Scope

- Backend service and API
- Time-series data ingestion
- Event-based and snapshot-based data model
- Risk scoring engine (rules-based, explainable)
- Timeline playback in the 3D UI
- Alert generation and acknowledgement workflow
- Improved spatial context (ramps, shafts, zones)
- Deployment to a real staging environment

### 2.2 Out of Scope

- Machine learning models
- Predictive simulations
- Full incident management systems
- BIM or detailed mine geometry
- Mobile-native applications
- User roles and permissions beyond basic access

---

## 3. Users & Operational Roles

Primary Phase 2 users:
- Control room operators
- Safety supervisors
- Shift supervisors
- Mine planning engineers

Secondary users:
- Site managers
- Corporate HSE teams
- Digital transformation leads

---

## 4. System Architecture Overview

### 4.1 High-Level Architecture

- Frontend: Web-based 3D visualization (Babylon.js or Three.js)
- Backend: Node.js API service
- Database: PostgreSQL (TimescaleDB optional for time-series)
- Optional messaging layer: Redis (future-proofing)

All components must be deployable independently.

---

## 5. Data Architecture

Phase 2 introduces **time** as a first-class concept.

### 5.1 Core Data Types

- Snapshots: state of the mine at a point in time
- Events: discrete changes or incidents
- Measurements: sensor or telemetry readings
- Alerts: derived risk conditions

---

## 6. Data Models

### 6.1 Snapshot Schema

json
{
  "timestamp": "ISO-8601",
  "levels": [
    {
      "level": 3,
      "risk_score": 85,
      "activities": [
        {
          "name": "Blasting Operations",
          "status": "planned",
          "risk_score": 90
        }
      ]
    }
  ]
}

Snapshots are immutable and stored historically.

### 6.2 Event Schema

json
{
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "level": 3,
  "type": "blast_scheduled | blast_fired | gas_alert | permit_issued",
  "severity": "low | medium | high",
  "metadata": {}
}

Events trigger risk recalculation.

### 6.3 Measurement Schema

json
{
  "timestamp": "ISO-8601",
  "level": 5,
  "sensor_type": "O2 | CO | NOx | airflow | seismic",
  "value": number,
  "unit": string
}

Measurements may generate events or alerts.

### 6.4 Alert Schema

json
{
  "alert_id": "uuid",
  "timestamp": "ISO-8601",
  "level": 3,
  "risk_score": 92,
  "status": "active | acknowledged | resolved",
  "cause": "Post-blast gas above threshold",
  "explanation": "CO exceeded 50ppm for 12 minutes"
}

Alerts must always be explainable.

## 7. Risk Engine (Phase 2 Core)

### 7.1 Risk Scoring Model

Risk is calculated as a score from 0 to 100 at:
- activity level
- level level
- mine-wide level (aggregate)

Scores map to bands:
- 0–30 → low
- 31–70 → medium
- 71–100 → high

### 7.2 Example Risk Rules

The following table defines the **initial deterministic rule set** used by the Phase 2 risk engine.  
These rules are intentionally conservative, transparent, and aligned with standard underground mining safety practices.

Rules are evaluated continuously as new events or measurements are ingested.

| Condition | Risk Impact | Notes |
|---------|------------|------|
| Blast scheduled within 30 minutes | +40 | Pre-emptive escalation to enforce exclusion zones |
| Blast fired and re-entry not cleared | Force risk = 100 | Absolute lockout condition |
| Gas reading above threshold | +30 | Thresholds defined per site and gas type |
| Confined space activity without valid permit | +50 | Immediate high-risk condition |
| Proximity alarms exceed threshold in 15 minutes | +20 | Indicates unsafe people–equipment interaction |
| Seismic event above baseline | +25 | Especially relevant in development headings |
| Ventilation airflow below minimum | +20 | Sustained condition escalates risk |
| Unauthorized access to explosive magazine | Force risk = 100 | Critical safety breach |
| Equipment overspeed violations | +15 | Repeated violations compound risk |
| Crew exposure time exceeds limit | +20 | Applies to unsupported ground and high-risk zones |

Rules may be site-specific but must always remain:
- deterministic
- ordered
- logged
- explainable

No probabilistic weighting or learning behavior is permitted in Phase 2.

---

### 7.3 Rule Evaluation Order

Rules are evaluated in a fixed order to guarantee consistent outcomes.

Evaluation sequence:
1. Absolute lockout rules (force risk = 100)
2. Time-critical rules (blasting windows, re-entry)
3. Environmental rules (gas, ventilation, seismic)
4. Behavioral rules (proximity, overspeed, exposure time)

If a force-100 rule triggers, no further rules are evaluated for that level until the condition clears.

---

### 7.4 Risk Aggregation Logic

Risk scores are calculated as follows:
- Start from base score = 0
- Apply rule impacts sequentially
- Cap score at 100
- Persist score with contributing rule list

Each level risk score must include:
- final numeric score
- risk band
- list of triggering rules
- timestamp of last change

---

### 7.5 Risk Explanation Generation

For every calculated risk state, the system must generate a human-readable explanation.

Example:
> “Risk elevated to HIGH due to blast fired at 14:32 with re-entry not yet cleared and CO levels exceeding threshold for 12 minutes.”

Explanations must:
- reference concrete events or measurements
- include timestamps where relevant
- avoid technical jargon where possible

---

### 7.6 Rule Configuration

Risk rules must be configurable via:
- configuration files or database tables
- per-site threshold values
- enable/disable flags

Changes to rules must:
- not affect historical data
- be versioned
- be auditable

---

### 7.7 Audit & Traceability

Every risk calculation must be traceable.

The system must store:
- rule versions applied
- inputs used (events, measurements)
- resulting score and band
- explanation text

This is mandatory for safety-critical trust.

---

### 7.8 Failure & Edge Case Handling

The risk engine must handle:
- missing sensor data
- delayed events
- out-of-order timestamps

In such cases:
- risk must degrade conservatively
- uncertainty must increase risk rather than reduce it
- explanations must note missing data

---

### 7.9 Phase 2 Exit Criteria for Risk Engine

The risk engine is considered Phase 2 complete when:
- all rules execute deterministically
- explanations are visible in the UI
- historical playback reproduces identical scores
- stakeholders trust the outputs without manual recalculation

---

## 8. Timeline & Historical Playback

### 8.1 Time Model

Time is a first-class concept in Phase 2.

All system states must be reconstructable for any point in time using:
- snapshots (state at time T)
- events (changes between snapshots)
- measurements (continuous signals)

The system must support both:
- real-time view (now)
- historical reconstruction (then)

---

### 8.2 Timeline Controls

The UI must include a timeline component with:
- time scrubber (drag to move through time)
- play / pause
- playback speed (1x, 2x, 5x)
- jump-to-event shortcuts (blast fired, alert triggered)

---

### 8.3 Playback Behavior

When the user changes time:
- the 3D scene updates to the nearest valid snapshot
- active activities appear or disappear based on timestamps
- level colors update according to recalculated risk
- alerts update to their historical state

Playback must be deterministic and reproducible.

---

### 8.4 Temporal Resolution

Minimum supported resolutions:
- 1 minute for operational events
- 5 seconds for measurements (configurable)

Interpolation is not allowed in Phase 2.  
If data is missing, the UI must show the last known state and indicate uncertainty.

---

## 9. 3D Visualization Enhancements

### 9.1 Structural Context

To improve spatial comprehension without full mine models, the following must be added:
- vertical shafts connecting levels
- ramps between adjacent levels
- optional simple zone blocks within levels (north, south, headings)

All geometry remains procedural and lightweight.

---

### 9.2 Risk State Visualization

Risk evolution must be visually clear:
- smooth color transitions between risk bands
- pulse or glow effect when a level escalates to high risk
- visual lockout indicator for force-100 conditions

Visual effects must enhance comprehension, not distract.

---

### 9.3 Selection & Focus

When a level is selected:
- the camera may gently reframe
- connected ramps and shafts remain visible
- unrelated levels are dimmed

The user must never lose spatial orientation.

---

## 10. Alerts & Operator Workflow

### 10.1 Alert Lifecycle

Alerts follow a strict lifecycle:
1. Generated
2. Active
3. Acknowledged
4. Resolved

Alert state transitions must be timestamped and logged.

---

### 10.2 Alert Presentation

Alerts must be visible:
- in a dedicated UI panel
- on the 3D view via icons or highlights
- on the timeline as markers

Each alert displays:
- level
- severity
- cause
- explanation
- time since triggered

---

### 10.3 Operator Actions

Operators can:
- acknowledge alerts
- add a comment
- filter alerts by level, severity, time

No escalation, reassignment, or incident closure workflows are included in Phase 2.

---

## 11. Backend API Specification

### 11.1 Core Endpoints

Required endpoints:
- GET `/levels/current`
- GET `/levels/history?from=&to=`
- GET `/events?level=&from=&to=`
- GET `/alerts`
- POST `/alerts/{id}/acknowledge`

All endpoints must return explainable data.

---

### 11.2 Performance Constraints

- API response under 500 ms for current state
- Historical queries under 1 second for 24-hour windows
- Pagination required for large datasets

---

## 12. Data Storage & Retention

### 12.1 Database Requirements

- PostgreSQL required
- Time-series extensions optional
- All writes must be append-only

---

### 12.2 Retention Policy

Minimum retention:
- snapshots: 90 days
- events: 180 days
- alerts: permanent (Phase 2)

Retention must be configurable.

---

## 13. Deployment & Environments

### 13.1 Environments

Required environments:
- local development
- staging

Production is out of scope for Phase 2.

---

### 13.2 Configuration

- all configuration via environment variables
- no hard-coded thresholds
- secrets managed outside source control

---

## 14. Phase 2 Deliverables

The Phase 2 delivery includes:
1. Backend API service
2. Database schema and migrations
3. Risk engine with configurable rules
4. Updated frontend with timeline and alerts
5. Demo dataset covering at least 24 hours
6. Staging deployment
7. Updated documentation and diagrams

---

## 15. Phase 2 Acceptance Criteria

Phase 2 is accepted when:
- current and historical risk states match expected outputs
- explanations are understandable by non-technical users
- alerts behave consistently across time playback
- system remains stable under missing or delayed data

---

## 16. Phase 3 Readiness Gate

Phase 3 may only begin if:
- historical data is clean and complete
- risk scoring is trusted by operators
- explanations are routinely used
- no manual overrides are required

If these conditions are not met, Phase 2 must be extended.

---

## 17. Development Principles (Phase 2)

- Determinism before intelligence
- Explainability before automation
- Safety before aesthetics
- Architecture before optimization
- Trust before ambition

---

**End of Phase 2 PRD**