/**
 * Grounding digest of the Worley PTW Procedure
 * 215000-00190-000-HS-PRO-00002 RevB — Heidelberg Materials Carbon
 * Capture Project (HMCCP), Padeswood.
 *
 * Faithful §-referenced summary used as LLM context so the Control of
 * Work assistant answers with the client's own rules and citations.
 */

export const PROCEDURE_DIGEST = `
PTW PROCEDURE DIGEST — HMCCP Padeswood (doc 215000-00190-000-HS-PRO-00002 RevB)

LIFE SAVING RULES (§1.4): Work Authorisation — work with a valid permit when required. Energy Isolation — verify isolation and zero energy before work begins.

ROLES (§2, App A-G):
- WA Work Authority: senior Worley person (Construction/Commissioning Manager), approves ALL work, chairs daily SIMOPS/planning meeting.
- AA Area Authority: verifies plant/equipment readiness, isolation integrity, work site location; coordinates SIMOPS in their area.
- PI Permit Issuer: manages the permit office, reviews RAMS/SIMOPS/supporting docs, issues permits, maintains the Permit Tracker and lockbox keys, closes permits.
- PR Permit Requestor (contractor): raises the request with complete scope + supporting docs.
- PA Performing Authority: accepts the permit, conducts toolbox talk/POWRA, supervises, stops unsafe work; may hold several permits only if risk-based and approved by WA+AA+PI.
- PW Permit Worker: works under the permit, signs acknowledgement.
- SAP Senior Authorised Person / AI Authorised Isolator (electrical LV / process-mechanical): apply and remove isolations, confirm zero energy, own the ICC.
- AGT Authorised Gas Tester: performs atmospheric testing, recorded on the PTW (§6.5).
APPROVAL FLOW (§2, §6.2.1): WA → AA → PI must all sign BEFORE the PA is asked to accept and sign on. No work without a fully approved and issued permit.

PERMIT TYPES & VALIDITY (§4.1): Cold Work 7 days; Hot Work early works/civil 7 days; Hot Work construction 24 hours; Confined Space Entry 1 operational shift; Excavation 7 days; Excavation (Piling) 7 days. 7-day permits are revalidated DAILY by the PI countersigned by the oncoming PA (§6.2.2). Any change in scope, location, conditions or SIMOPS requires cancellation and re-issue.

MANDATORY ATTACHMENTS (§4.2) — the permit is INVALID without them: RAMS (submitted ≥14 working days prior, §4.3.1); TRA; POWRA/Take5 at the work front; ICC for any energy isolation; grid maps for ground works; approved Lift Plan (≥14 days, reviewed by the Worley appointed person) for complex/heavy lifts; utility clearance/service drawings for excavation. Permit requests ≥24 h in advance (§4.3.3); construction permits 7 days' notice (§4.3.4).

SET TO WORK LIFECYCLE (§5): 1 Plan (scope, RAMS J-14) → 2 Prepare (PTW + RAMS/TRA) → 3 Review by AA/PI (SIMOPS impact, isolations, schedule) → 4 Verify: JOINT site inspection PA+AA+PI → 5 Authorise WA+AA+PI, recorded in the tracker → 6 Issue & Execute (PA toolbox talk, POWRA, supervision) → 7 Monitor (PI+AA ongoing) → 8 Close (PA+PI jointly, work site safe and tidy). If the AA, PI or PA leaves site, the permit is returned to the permit office and reissued.

WITHDRAWAL & SUSPENSION (§6.2.4): permits are withdrawn on emergency alarm (restart only after "All Clear" + PI re-approval); on significant scope change (new permit after re-assessment); when the Safe System of Work is not followed. A suspended permit is revalidated ONLY with approval of the three Worley signatories (WA, AA, PI).

CRITICAL CONTROLS (§6.3): Lifting — only planned lifts per lift plan, exclusion zone established, crane inspection/tagging. Breaking containment — depressurise, drain, double-isolate, CO₂ gas test, spill containment. Hot Work — fire watch during and 30 min post-work (PA or delegate stays 1 h per App D), combustibles removed, extinguisher on hand. Confined Space — entry permit, gas monitoring, continuous standby person, rescue equipment, entry log; entry secured when vacated (§7.5).

SIMOPS (§6.4): daily look-ahead / Line of Sight meeting reviews live permits and requests, identifies simultaneous operations, evaluates CUMULATIVE risk, confirms supervision coverage and emergency readiness. The PI verifies interacting activities are identified and conflicts avoided or controlled (App C.11).

EXCAVATION (§7.1): underground services identified/marked before work (blue cones/barriers); CAT scan where drawings are ambiguous (§7.1.3); piling pre-work checklist by the PA (rig exclusion zone, pile location pin verified); spoil ≥2 m from the excavation edge, height ≤50% of depth.

ENERGY ISOLATION (§8): isolations implemented to the highest reasonably practicable standard. ICC (Isolation Confirmation Certificate) completed by the SAP; lockbox key issued to the PA; DE-ISOLATION ONLY when every linked PTW is signed off complete and the SAP authorises removal (§8.1.1, §8.12). Four isolation types: process, electrical, instruments & controls, mechanical (§8.2). LOTO locks + red/white "Do Not Operate" tags with point number, ICC number, equipment, reason, isolator name (§8.11). All isolations and de-isolations cross-checked by a second person except low-consequence cases (§8.7). Sanction To Test (STT §8.8) allows temporary re-energising for testing: other permits on the isolated system are suspended for the test. Drawing mark-up colours (§8.9): process red=closed/spade, green=open, blue=bleed; electrical red=energised, green=de-energised, yellow=earth. Proving dead with an approved test lamp/two-pole voltage detector proved before and after use — multimeters and voltage sticks NOT accepted (§8.10.3, §8.15.2). Positive isolation (spool removal, spade, spectacle plate) required for confined space entry, long-term isolations, HP/LP interfaces, hot work on hydrocarbon systems (§8.14.1). Isolations on the existing Heidelberg cement plant are controlled by Heidelberg Plant Operations under their own Control of Work (§8.4).

RECORDS (§9.1): permits and isolation certificates retained minimum 3 YEARS; the Permit Coordinator maintains a daily PTW register. Everyone has the authority to stop unsafe work (App A.9).
`;
