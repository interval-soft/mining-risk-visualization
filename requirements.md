# Mining 3D Risk Visualization Platform  
## Phase 1 – Proof of Concept (POC)  
**Project Requirements Document (PRD)**

---

## 1. Purpose & Strategic Objective

The purpose of this project is to deliver a **web-based 3D visualization Proof of Concept** that demonstrates how operational and safety data in an **underground mining environment** can be visualized across **multiple vertical levels** in a clear, interactive, and extensible way.

The POC is designed to:
- Support **project acquisition and stakeholder buy-in**
- Demonstrate technical feasibility with **no existing 3D models**
- Establish a **future-proof data and visualization architecture**
- Avoid premature complexity (AI, ML, BIM, sensors) while remaining **AI-ready**

This phase is explicitly **not** a full production system.

---

## 2. Scope Definition

### 2.1 In Scope (Phase 1)

- Web-based 3D visualization of a **5-level underground mine**
- Procedurally generated 3D geometry (no CAD, BIM, or Blender)
- Data-driven visualization using structured JSON
- Risk-based color coding
- Activity icons per level
- Basic user interaction (hover, click, isolate)
- Clean, professional, mining-industry appropriate UI

### 2.2 Out of Scope (Explicitly Excluded)

- Machine learning or predictive AI
- Real-time sensor integration
- User authentication
- Backend databases
- BIM or IFC file ingestion
- Mobile native apps
- Multiplayer or collaboration features

---

## 3. Target Users

Primary users for the POC demonstration:
- Mining operations managers
- Safety managers
- Engineering leadership
- Executive stakeholders evaluating digital transformation

Secondary users (future phases):
- Control room operators
- Planning engineers
- Safety compliance teams

---

## 4. Conceptual Model

### 4.1 Physical Representation

The system represents **one vertical section of an underground gold mine** consisting of **five stacked levels** connected conceptually by shafts and ramps.

Each level is modeled as:
- A horizontal slab (box geometry)
- Vertically stacked on the Y-axis
- Clearly labeled with level number and function

### 4.2 Levels Overview

| Level | Depth | Function |
|------|------|---------|
| Level 1 | Surface / 0 m | Processing & logistics |
| Level 2 | −150 m | Haulage & crushing |
| Level 3 | −300 m | Active stoping |
| Level 4 | −450 m | Development & ground support |
| Level 5 | −600 m | Ventilation & pumping |

---

## 5. Data Model (Critical Contract)

The **JSON data structure is the core contract** between operational data and 3D visualization.

Claude Code must treat this schema as authoritative and extensible.

### 5.1 Top-Level Schema

json
{
  "timestamp": "ISO-8601",
  "levels": []
}

### 5.2 Level Object Schema

json
{
  "level": number,
  "name": string,
  "activities": []
}

### 5.3 Activity Object Schema

json
{
  "timestamp": "2026-01-20T09:00:00Z",
  "levels": [
    {
      "level": 3,
      "name": "Active Stoping",
      "activities": [
        { "name": "Blasting Operations", "risk": "high", "status": "planned" },
        { "name": "Explosive Magazine Handling", "risk": "high", "status": "active" }
      ]
    }
  ]
}

## 6. Risk Classification Logic

### 6.1 Activity-Level Risk

Each activity assigned to a level includes a predefined risk classification. Risk values are discrete and intentionally simple in Phase 1.

Allowed risk values:
- `low`
- `medium`
- `high`

Risk values are **data-driven**, not inferred, predicted, or calculated in Phase 1.

---

### 6.2 Level-Level Risk Resolution

The overall risk state of a level is determined by the **highest-risk activity present on that level**.

Resolution rules:
- If **any** activity has `risk = high` → level risk = **high**
- Else if **any** activity has `risk = medium` → level risk = **medium**
- Else → level risk = **low**

This rule must be:
- Deterministic
- Explainable
- Consistent across sessions

No probabilistic or AI-based logic is permitted in Phase 1.

---

### 6.3 Visual Mapping of Risk

Risk levels must be visually encoded in a way that is immediately understandable to mining professionals.

| Risk Level | Visual Color | Meaning |
|-----------|--------------|--------|
| High | Red | Immediate safety or operational concern |
| Medium | Amber / Yellow | Elevated attention required |
| Low | Green | Normal or routine activity |

Color mapping must be consistent across:
- Level geometry
- Activity icons
- Tooltips and UI indicators

---

## 7. Visual Design Requirements

### 7.1 3D Geometry Representation

Each mine level is represented as a simple 3D slab with the following properties:
- Rectangular box geometry
- Uniform width and depth across all levels
- Fixed vertical spacing between levels
- Centered alignment on the vertical axis
- No textures required in Phase 1

The geometry should communicate **structure**, not physical realism.

---

### 7.2 Level Labels

Each level must display:
- Level number
- Functional name (e.g. “Active Stoping”)

Labels must:
- Remain readable at common zoom levels
- Avoid visual clutter
- Update visibility appropriately when levels are isolated or hidden

---

### 7.3 Activity Icons

Activities are represented using icons positioned above or on the corresponding level slab.

Icon requirements:
- Billboarded (always facing the camera)
- Slight vertical offset above the slab surface
- Scaled consistently across all levels
- Tinted or bordered according to activity risk

Indicative icon mapping:
- Blasting Operations → explosion icon
- Diesel Equipment → truck icon
- Ground Support → bolt or anchor icon
- Confined Space Maintenance → warning icon
- Control Room / Admin → monitor icon

Icons may be SVG or PNG assets.

---

## 8. Interaction Requirements

### 8.1 Camera Interaction

The 3D scene must support:
- Orbit rotation around the mine stack
- Pan movement
- Zoom in and out
- A reset-to-default-view action

Camera controls should feel familiar to users with basic 3D or CAD exposure.

---

### 8.2 Hover Interaction

Hovering over a level or activity icon displays a tooltip containing:
- Level name and depth
- List of activities on that level
- Risk classification per activity
- Activity status (planned, active, completed)

Tooltips must:
- Appear quickly
- Not obstruct the main view
- Disappear cleanly when focus changes

---

### 8.3 Click Interaction

Clicking a level triggers isolation mode:
- Selected level is highlighted
- Non-selected levels are faded or hidden
- Camera may optionally reframe to the selected level

Clicking the same level again exits isolation mode and restores the full stack.

---

### 8.4 Filtering and Visibility Controls (Optional but Recommended)

If time permits, include basic UI controls to:
- Toggle visibility by risk level
- Toggle specific activity types
- Quickly identify all high-risk levels

Filtering must not modify the underlying data.

---

## 9. Technical Architecture

### 9.1 Frontend Stack

The application must be implemented using:
- Babylon.js **or**
- Three.js

Mandatory constraints:
- Plain HTML
- JavaScript (ES6 or later)
- No required backend services
- No framework dependencies required

The application must run entirely in a modern web browser.

---

### 9.2 Application Structure

Recommended high-level structure:
- Scene setup module
- Geometry generation module
- Data loading and parsing module
- Risk resolution logic module
- Interaction and UI module

Separation of concerns is required to support future extension.

---

### 9.3 Deployment Model

The application must:
- Be deployable as a static site
- Run locally via a simple web server
- Be compatible with static hosting platforms (e.g. GitHub Pages)

No build step is strictly required for Phase 1.

---

## 10. Non-Functional Requirements

- Initial load time under 3 seconds on standard hardware
- Smooth camera interaction at 60 FPS where possible
- Clear visibility on 1080p displays
- Graceful handling of missing or incomplete data
- No unhandled runtime errors

---

## 11. Extensibility Requirements

The system must be designed to support future phases without structural rewrite.

Planned extensions include:
- Time-based playback using the existing timestamp field
- Live data ingestion from operational systems
- AI-driven risk scoring and anomaly detection
- Natural language queries over mine state
- Replacement of procedural geometry with BIM or scanned models
- Support for open-pit mine layouts

---

## 12. Phase 1 Deliverables

The Phase 1 output consists of:
1. A fully functional web-based 3D application
2. Example JSON data files used by the application
3. A README explaining setup and execution
4. A hosted demo URL
5. A short screen recording or GIF demonstrating key interactions

---

## 13. Success Criteria

Phase 1 is considered successful if:
- Mining professionals immediately understand the spatial and risk context
- High-risk areas are visually obvious within seconds
- The application feels operational rather than experimental
- Stakeholders can clearly articulate next-phase value

---

## 14. Development Principles

The following principles guide all implementation decisions:
- Clarity over realism
- Determinism over intelligence
- Structure over visual polish
- Extensibility over premature optimization
- Trustworthiness for conservative, safety-critical industries

---

**End of Document**
