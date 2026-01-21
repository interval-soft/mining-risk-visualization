# Mining 3D Risk Visualization Platform  
## Phase 3 – Predictive Intelligence & Decision Support  
**Project Requirements Document (PRD)**

---

## 1. Phase 3 Purpose & Strategic Objective

Phase 3 introduces **true intelligence** into the platform.

The objective is not automation for its own sake, but to:
- anticipate risk before it becomes critical
- detect abnormal patterns operators do not notice
- support faster, safer, and more consistent decisions
- reduce cognitive load in control rooms

Phase 3 must **augment human judgment**, not replace it.

---

## 2. Core Philosophy of Phase 3

Phase 3 AI must be:
- explainable
- conservative
- assistive
- auditable
- reversible

No black-box decisions.
No autonomous actions.
No opaque scores without explanation.

---

## 3. Phase 3 Scope

### 3.1 In Scope

- AI-driven anomaly detection
- Predictive risk escalation
- Baseline behavior modeling
- Natural language query interface
- Decision support recommendations
- Confidence scoring and uncertainty awareness
- AI explanations surfaced directly in the UI

### 3.2 Out of Scope

- Fully autonomous control actions
- Self-modifying rules without human approval
- Replacement of operators
- Safety-critical actuation (ventilation, blasting, dispatch)
- Regulatory reporting automation

---

## 4. AI Use Cases (Concrete, Mining-Relevant)

Phase 3 AI must support **specific operational questions**.

### 4.1 Anomaly Detection

Detect patterns such as:
- gas levels rising faster than historical norm
- repeated proximity alarms in same zone
- unusual crew dwell time in unsupported headings
- abnormal equipment behavior before failure

An anomaly is defined as:
> behavior that deviates significantly from historical baseline under similar conditions

---

### 4.2 Predictive Risk Escalation

Predict likelihood of future risk within a defined horizon:
- next 15 minutes
- next hour
- next shift

Examples:
- probability of post-blast re-entry delay
- likelihood of ventilation non-compliance
- probability of escalation from medium to high risk

Predictions must always include:
- confidence level
- explanation
- contributing factors

---

### 4.3 Baseline Modeling

The system must learn:
- what “normal” looks like per level
- per shift type
- per activity type
- per time of day

Baselines must be:
- adaptive
- versioned
- reviewable by humans

---

### 4.4 Decision Support (Not Automation)

AI may suggest:
- delaying re-entry
- increasing monitoring
- escalating supervision
- reviewing permits
- prioritizing inspections

AI must never:
- issue commands
- block operations
- override human decisions

---

## 5. AI Architecture Overview

### 5.1 High-Level Components

- Feature extraction layer
- Baseline modeling engine
- Anomaly detection models
- Predictive models
- Explanation generation layer
- Human feedback loop

---

### 5.2 Model Types (Preferred)

Preferred approaches:
- statistical baselines
- time-series models
- probabilistic models
- lightweight neural networks where justified

Deep learning is optional and must be justified.

---

## 6. Data Inputs for AI

AI operates exclusively on **Phase 2 outputs**.

Inputs include:
- historical snapshots
- event sequences
- sensor time series
- risk scores
- operator acknowledgements
- operator comments

No raw sensor ingestion bypassing Phase 2.

---

## 7. AI Provider Integration (Phase 3)

### 7.1 Provider Choice

Phase 3 will use OpenRouter as the LLM gateway.  
All LLM calls must route through the backend. The frontend must never hold or transmit the OpenRouter API key.

OpenRouter Base URL: `https://openrouter.ai/api/v1`  
Chat completions endpoint: `POST /chat/completions` (OpenAI compatible)

### 7.2 Authentication and Headers

All requests must include:
- `Authorization: Bearer <OPENROUTER_API_KEY>`

Optional but recommended headers:
- `HTTP-Referer: <APP_URL>`
- `X-Title: <APP_NAME>`

These identify the application in OpenRouter.  

### 7.3 Model Selection

The system must support configurable models:
- PRIMARY_MODEL for normal AI insights
- FALLBACK_MODEL when PRIMARY_MODEL fails
- FAST_MODEL for lightweight chat and summarization

Model IDs must be stored in config, not hard-coded.

The backend should optionally query:
- `GET /models` to validate configured model IDs at startup

### 7.4 Rate Limit and Failure Handling

The AI layer must gracefully handle:
- rate limits
- timeouts
- provider failures
- invalid model IDs

On AI failure:
- the platform must fall back to Phase 2 deterministic behavior
- UI must label AI insights as unavailable
- no operational workflow may be blocked

If a rate limit is hit:
- retry with exponential backoff
- or fail over to FALLBACK_MODEL
- or degrade to FAST_MODEL for partial response

OpenRouter rate limits for free tier and free-model variants must be respected in testing and demos.

### 7.5 Logging and Audit

All AI outputs must be auditable. The system must store:
- prompt inputs (or redacted version)
- model used
- timestamp
- output
- latency
- confidence (if produced)
- related level, event IDs, and alert IDs
- user feedback (agree/dismiss)

Logs must be immutable and separated from raw secrets.

### 7.6 Data Minimization

Only send the minimum required context to the LLM:
- summarized level state
- relevant event window
- relevant measurement summaries
- recent alerts
- baseline references

Do not send raw high-frequency sensor streams unless explicitly needed.

### 7.7 Streaming Support (Optional)

If supported in implementation, the backend may stream tokens to the frontend for:
- natural language queries
- long explanations
- summarization

Streaming must not be required for Phase 3 acceptance.

## 8. AI Outputs

### 8.1 Anomaly Output Schema

json
{
  "anomaly_id": "uuid",
  "timestamp": "ISO-8601",
  "level": 4,
  "type": "ventilation_anomaly",
  "severity": "medium",
  "confidence": 0.82,
  "explanation": "Airflow dropped 35% faster than historical average for this level and time",
  "recommended_action": "Increase monitoring"
}

## 8.2 Predictive Risk Output Schema

json
{
  "level": 3,
  "prediction_window": "60_minutes",
  "predicted_risk_score": 88,
  "confidence": 0.76,
  "factors": [
    "blast scheduled",
    "elevated gas trend",
    "historical delay pattern"
  ]
}

## 9. Explainability Requirements

Explainability is mandatory for all AI-driven outputs in Phase 3.

No AI output is considered valid unless it can be clearly understood and interrogated by a human operator.

Each AI-generated insight must include:
- a plain-language explanation
- a list of contributing factors
- a confidence score
- a clear reference to historical data or patterns used

Explanations must be written for operational users, not data scientists.

---

### 9.1 Explanation Content Rules

Every explanation must:
- reference concrete events, measurements, or trends
- include relevant timestamps or time windows
- avoid abstract AI terminology
- avoid probabilistic jargon unless clearly explained

Bad example:
> “The model detected an anomaly with high confidence.”

Acceptable example:
> “Airflow on Level 5 dropped 35% faster than the normal pattern observed during the last 20 similar shifts.”

---

### 9.2 Confidence Representation

All AI outputs must include a confidence score between 0 and 1.

Confidence must represent:
- strength of pattern match
- amount of historical data available
- stability of contributing signals

Confidence must never be hidden.

Low confidence must be explicitly visible to the user.

---

### 9.3 Traceability to Source Data

For each AI insight, the system must allow the user to:
- inspect the underlying events
- inspect the measurements involved
- see historical comparisons used

Traceability must be accessible directly from the UI.

---

## 10. Natural Language Query Interface

### 10.1 Purpose

The natural language interface allows users to interrogate the system without navigating complex dashboards.

It is strictly a **read-only analytical interface**.

---

### 10.2 Supported Query Types

Supported queries include:
- “Why is Level 3 high risk right now?”
- “What changed in the last 30 minutes?”
- “Show anomalies related to ventilation”
- “What is most likely to escalate next?”
- “Summarize risk evolution for this shift”

The system must reject unsupported or unsafe queries gracefully.

---

### 10.3 Query Constraints

Natural language queries must:
- never modify system state
- never change risk scores
- never trigger operational actions
- always cite the data used in the response

Responses must be grounded in stored data, not speculation.

---

## 11. Human-in-the-Loop Feedback

### 11.1 Operator Feedback Actions

Operators must be able to:
- agree with an AI insight
- dismiss an AI insight
- add a comment explaining their reasoning

Feedback must be optional but encouraged.

---

### 11.2 Feedback Usage

Feedback is used to:
- refine baseline models
- adjust sensitivity thresholds
- improve explanation clarity

Feedback must never:
- instantly retrain models
- retroactively change historical outputs
- bypass deterministic safety logic

---

## 12. UI Enhancements for Phase 3

### 12.1 AI Visual Indicators

AI-driven insights must be visually distinct but not intrusive.

Indicators may include:
- subtle AI badges on levels
- confidence meters
- anomaly markers on the timeline
- predictive overlays representing future states

All predictive visuals must be clearly labeled as “forecast” or “prediction”.

---

### 12.2 AI Insight Panel

Each AI insight must be explorable in detail.

The insight panel must show:
- what was detected or predicted
- why it matters
- contributing signals
- confidence level
- similar historical cases
- operator feedback history (if any)

---

## 13. Governance & Safety Controls

### 13.1 AI Enablement Controls

AI features must be:
- toggleable at system level
- configurable per site
- configurable per feature category

AI-assisted outputs must always be clearly labeled.

---

### 13.2 Audit and Compliance

The system must log:
- model identifiers and versions
- input data windows
- outputs generated
- confidence scores
- operator interactions

Logs must be immutable and reviewable.

---

## 14. Non-Functional Requirements

- AI inference time under 2 seconds for standard queries
- No blocking of operational workflows
- Graceful degradation when AI services are unavailable
- Deterministic fallback to Phase 2 behavior

AI failure must never reduce system safety.

---

## 15. Phase 3 Deliverables

Phase 3 delivery includes:
1. AI services integrated via OpenRouter
2. Baseline models trained and validated
3. Anomaly detection operational
4. Predictive risk engine operational
5. Natural language query interface
6. Explainability UI components
7. Operator feedback loop
8. Updated technical and governance documentation

---

## 16. Phase 3 Success Criteria

Phase 3 is successful if:
- operators trust AI insights and consult explanations
- false positives are manageable and understood
- decision-making time is reduced
- risk escalation is anticipated earlier than in Phase 2
- stakeholders see measurable safety and operational value

---

## 17. Long-Term Evolution (Post Phase 3)

Potential future extensions include:
- cross-site learning
- scenario simulation and training replay
- AI-assisted regulatory reporting
- integration with planning and scheduling tools

These are explicitly out of scope for Phase 3.

---

## 18. Final Guiding Principles

- Humans remain accountable
- AI remains assistive
- Safety remains paramount
- Trust outweighs novelty
- Intelligence must earn operational acceptance

---

**End of Phase 3 PRD**