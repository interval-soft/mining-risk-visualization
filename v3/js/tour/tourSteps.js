/**
 * Guided tour content — HMCCP Control of Work console.
 *
 * Each step: { id, chapter, target, title, html, narration, before }
 * - id         → also names the narration file /v3/assets/tour/<id>.mp3
 * - target     → CSS selector, array of selectors (union spotlight), or null
 *                (centered card, no spotlight)
 * - narration  → the spoken text; generated to MP3 by v3/tools/gen-tour-audio.mjs.
 *                Square-bracket [tags] are DELIVERY DIRECTIONS for the TTS
 *                (performed, never spoken — verified by transcription).
 *                KEEP IN SYNC: rerun the generator + bump AUDIO_VERSION in
 *                TourEngine.js after editing narration.
 * - before(app)→ drives the real UI ahead of the step (persona, panels, map).
 *                Must be defensive: the tour must survive a failed map.
 *
 * This module is imported by BOTH the browser (TourEngine) and the node
 * audio generator — keep it pure ESM, no top-level DOM access.
 */

const $ = (id) => document.getElementById(id);

function setPersona(app, code) {
    const sel = $('persona-select');
    if (!sel || sel.value === code) return;
    sel.value = code;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function closeDetail(app) {
    $('detail-panel')?.classList.remove('open');
    if (app) app.selectedPermitNo = null;   // otherwise the store poll re-opens it
}

export const TOUR_STEPS = [

    // ---------------- Chapter 1 — Welcome ----------------
    {
        id: 'welcome',
        chapter: 'Welcome',
        target: null,
        title: 'HMCCP Control of Work',
        html: `This console is a working digital version of the Worley <b>Permit to Work
               Procedure RevB</b> (215000-00190-000-HS-PRO-00002) for the Heidelberg Materials
               Carbon Capture Project at Padeswood. Every rule, role and validity is
               <b>faithful to that document</b>, and the tour cites its sections (§) as we go.<br><br>
               <b>Two things to keep in mind for this demo.</b> First, the permits, isolations
               and events shown are <b>illustrative sample data</b> from a small database we
               set up for the demonstration — not live site data. Second, this is designed as
               a <b>layer on top of the permit system you already use, not a replacement</b>:
               in a live deployment it would read your permits, isolations and SIMOPS straight
               from your system of record and present them here.<br><br>
               <span class="tour-hint">Tip: turn your sound on — each step is narrated.</span>`,
        narration: `[warmly] Welcome to the HMCCP Control of Work console. … This is a working digital version of the Worley Permit to Work Procedure, Revision B, for the Padeswood carbon capture project. Every rule, role and validity is faithful to that document, [slightly emphatic] and this tour cites its sections as we go. … [candid] Two things to keep in mind for this demonstration. First, the permits, isolations and events you will see are illustrative sample data, from a small database we set up for the demo — not live site data. … [clear] Second, this console is designed as a layer on top of the permit system you already use — not a replacement. In a live deployment, it would read your permits, isolations and simops directly from your system of record, and present them here.`,
        before: async (app) => { closeDetail(app); setPersona(app, 'PI'); app.mapManager?.resetView(); }
    },
    {
        id: 'site',
        chapter: 'Welcome',
        target: '#map',
        title: 'The site',
        html: `You are looking at the Padeswood site. The coloured polygons are the
               project's <b>Construction Work Areas</b> — the zoning and colour coding of
               the project's own Appendix H drawing, placed indicatively for this demo.
               Every permit pins to its zone. Click any coloured CWA at any time to see
               what it is.`,
        narration: `[calm] You are looking at the Padeswood site. The coloured polygons are the project's construction work areas — the same zoning and colour coding as the project's own Appendix H drawing, [aside] placed indicatively for this demonstration. … Every permit you will see is pinned to its zone. Feel free to click any coloured area at any time to see what it is.`,
        before: async (app) => { closeDetail(app); app.mapManager?.resetView(); }
    },
    {
        id: 'map-controls',
        chapter: 'Welcome',
        target: '.map-toolbar',
        title: 'Map controls',
        html: `<b>CWA zones</b> toggles the zone fills. <b>Reset view</b> returns to the
               default framing. <b>Isolations</b> and <b>Daily SIMOPS</b> open the two
               operational registers — we will visit both in a minute.`,
        narration: `[brisk but friendly] The map toolbar. CWA zones toggles the zone fills. Reset view returns to the default framing. … Isolations, and Daily SIMOPS, open the two operational registers. We will visit both in a minute.`
    },
    {
        id: 'clock',
        chapter: 'Welcome',
        target: '#site-clock',
        title: 'Site time',
        html: `The console runs on UK site time. The demo scenario is anchored to
               <b>today's 07:00 shift start</b>, so every validity countdown, revalidation
               deadline and expiry you see is live — whenever you open it.`,
        narration: `[matter-of-fact] The console runs on UK site time, and the demo scenario anchors itself to today's seven a m shift start. … [pleased] So every validity countdown, revalidation deadline and expiry you see is live — whenever you open the console.`
    },

    // ---------------- Chapter 2 — Permit board ----------------
    {
        id: 'kpis',
        chapter: 'Permit board',
        target: '#kpi-band',
        title: 'Five live indicators',
        html: `The KPI band is the control-room heartbeat: <b>permits active</b>,
               <b>pending review</b>, <b>expiring within 2 hours</b>, <b>high-severity SIMOPS
               conflicts</b> and <b>live isolations</b>. They recompute from the same data
               the map and board use — one source of truth.`,
        narration: `[steady] The K P I band is the control room heartbeat: permits active, pending review, permits expiring within two hours, high severity simultaneous operations conflicts, and live isolations. … All five recompute from the same data the map and the board use. [confident] One source of truth.`,
        before: async (app) => { closeDetail(app); }
    },
    {
        id: 'board',
        chapter: 'Permit board',
        target: '#permit-board',
        title: 'The permit board',
        html: `Every permit on site, grouped by lifecycle state: <b>Issued</b>,
               <b>Authorised awaiting acceptance</b>, <b>In approval (§5)</b>,
               <b>Suspended</b> and <b>recently Closed</b>. The colour chip is the permit
               type — the same colour coding as the paper forms (§4.1). Live permits show
               a countdown to expiry.`,
        narration: `[calm] The permit board lists every permit on site, grouped by lifecycle state: issued, authorised awaiting acceptance, in approval, suspended, and recently closed. … The colour chip is the permit type — the same colour coding as the paper forms — and live permits show a countdown to expiry.`
    },
    {
        id: 'validity',
        chapter: 'Permit board',
        target: '#board-legend',
        title: 'Validity is not negotiable',
        html: `Each permit type carries the maximum validity from <b>§4.1</b> — for example
               hot work is limited to a shift and must be revalidated daily up to seven
               days. The system computes the window automatically when a permit is
               requested; nobody gets to type their own expiry date.`,
        narration: `Each permit type carries its maximum validity from section four point one. Hot work, for example, is limited to a shift and must be revalidated daily, up to seven days. … The system computes the validity window automatically. [wry] Nobody gets to type their own expiry date.`
    },

    // ---------------- Chapter 3 — Lifecycle ----------------
    {
        id: 'detail',
        chapter: 'Lifecycle',
        target: '#detail-panel',
        title: 'Anatomy of a permit',
        html: `PTW-0133 — a confined-space entry inside the absorber. The detail shows the
               full <b>signature chain WA → AA → PI → PA (§6.2.1)</b> with names and
               timestamps, the <b>document checklist (§4.2)</b> — RAMS, TRA, gas test — and
               the validity window. A permit with missing documents is invalid and the
               system says so.`,
        narration: `[engaged] Here is the anatomy of a permit. This one is a confined space entry inside the absorber. … The detail panel shows the full signature chain — work applicant, area authority, permit issuer, then performing authority — as required by section six point two point one. Below it, the document checklist and the validity window. [firm] A permit with missing documents is invalid, and the system says so.`,
        before: async (app) => { app.selectPermit('PTW-2026-0133', { flyTo: true }); }
    },
    {
        id: 'personas',
        chapter: 'Lifecycle',
        target: '#persona-select',
        title: 'Roles, not logins',
        html: `The procedure defines distinct roles — <b>WA</b> (Work Applicant),
               <b>AA</b> (Area Authority), <b>PI</b> (Permit Issuer), <b>PA</b> (Performing
               Authority) and <b>SAP</b> (Senior Authorised Person). In production these are
               separate signed-in users, with delegation and escalation. For this demo you
               switch roles here with one click, and the whole console re-evaluates what YOU
               are allowed to do.`,
        narration: `The procedure defines distinct roles: work applicant, area authority, permit issuer, performing authority, and senior authorised person. … In production these are separate signed in users, with delegation and escalation. For this demonstration you switch roles with this selector, [slightly emphatic] and the whole console re evaluates what you are allowed to do.`
    },
    {
        id: 'approvals',
        chapter: 'Lifecycle',
        target: '#approvals-list',
        title: 'My approvals queue',
        html: `We just switched you to <b>Area Authority</b>. This queue now shows only the
               permits waiting for an AA signature — the console routes work to the role
               that owes the next signature, exactly as the §6.2.1 chain prescribes.`,
        narration: `[conspiratorial] We just switched you to area authority. … The my approvals queue now shows only the permits waiting for an area authority signature. The console routes work to whichever role owes the next signature — exactly as the approval chain prescribes.`,
        before: async (app) => { setPersona(app, 'AA'); closeDetail(app); }
    },
    {
        id: 'actions',
        chapter: 'Lifecycle',
        target: '#detail-panel',
        title: 'Actions follow the procedure',
        html: `PTW-0147 has just been requested. As AA you see exactly one action:
               <b>Review</b>. Try it if you like — the transition is validated twice, in
               the browser and on the server, against the §5 state machine. Illegal moves
               are rejected with the procedure section that forbids them, and suspensions
               or withdrawals demand a written reason.`,
        narration: `This permit has just been requested. As area authority you are offered exactly one action: review. [inviting] Feel free to try it. … Every transition is validated twice — in the browser and on the server — against the section five state machine. Illegal moves are rejected with the procedure section that forbids them, and suspensions demand a written reason.`,
        before: async (app) => { app.selectPermit('PTW-2026-0147', { flyTo: false }); }
    },
    {
        id: 'newpermit',
        chapter: 'Lifecycle',
        target: '#btn-new-permit',
        title: 'Requesting a permit',
        html: `<b>New permit</b> opens the digital version of the Appendix I request form:
               type, CWA, mandatory attachments, and a location picked directly on the map.
               The §4.3.3 twenty-four-hour notice rule and the per-type document list are
               enforced at submission.`,
        narration: `The new permit button opens the digital version of the appendix I request form: permit type, construction work area, mandatory attachments, and a location picked directly on the map. … The twenty four hour notice rule and the per type document list are enforced at submission.`
    },

    // ---------------- Chapter 4 — Daily obligations ----------------
    {
        id: 'revalidation',
        chapter: 'Daily obligations',
        target: '#event-list',
        title: 'The site has a rhythm',
        html: `The audit feed on the right records everything — and it never forgets the
               daily duties: at each shift start, multi-day permits need their
               <b>§6.2.2 revalidation</b>. You can see this morning's revalidation of
               PTW-0138 in the feed. Every signature, suspension and AI answer lands here
               and is kept for the §9.1 three-year retention.`,
        narration: `[calm] The audit feed records everything — and it never forgets the daily duties. At each shift start, multi day permits need their daily revalidation, under section six point two point two. You can see this morning's revalidation right there in the feed. … Every signature, suspension and A I interaction lands here, retained for three years.`,
        before: async (app) => { closeDetail(app); }
    },
    {
        id: 'expiry',
        chapter: 'Daily obligations',
        target: '#detail-panel',
        title: 'Expiry is automatic',
        html: `PTW-0142 ran past its validity window: the console flagged it
               <b>EXPIRED</b> on its own — no human vigilance required. Work under an
               expired permit must stop; the AA can suspend or the chain can re-issue.
               Suspension and resumption follow <b>§6.2.4</b> and always carry a reason.`,
        narration: `Permits expire on their own. … This hot work permit ran past its validity window, and the console flagged it expired automatically — no human vigilance required. Work under an expired permit must stop. Suspension and resumption follow section six point two point four, and always carry a written reason.`,
        before: async (app) => { app.selectPermit('PTW-2026-0142', { flyTo: false }); }
    },

    // ---------------- Chapter 5 — SIMOPS ----------------
    {
        id: 'simops',
        chapter: 'SIMOPS',
        target: '#detail-panel',
        title: 'Simultaneous operations, computed',
        html: `The <b>Daily SIMOPS</b> register implements §6.4: a geometric engine crosses
               every live and upcoming permit pair — hot work near confined-space entry,
               work parties inside lift exclusion zones, adjacent ground disturbance,
               cumulative density per CWA. <b>HIGH</b> means both permits are live right
               now; <b>MEDIUM</b> flags tomorrow's problem for today's look-ahead meeting.
               Each card carries the §6.3 control advice.`,
        narration: `[focused] The daily simops register implements section six point four. A geometric engine crosses every live and upcoming permit pair: hot work near confined space entry, work parties inside lift exclusion zones, adjacent ground disturbance, and cumulative density per area. … High severity means both permits are live right now. [measured] Medium flags tomorrow's problem — for today's look ahead meeting.`,
        before: async (app) => { app.showSimopsPanel(); }
    },
    {
        id: 'simops-map',
        chapter: 'SIMOPS',
        target: '#map',
        title: 'Conflicts drawn on the ground',
        html: `The same conflict, on the map: pulsing rings around both work fronts and a
               dashed interaction line. Today's HIGH is a welder and a confined-space crew
               <b>in the same absorber</b> — zero metres apart. This is detected before
               anyone lights a torch, not discovered in the morning meeting.`,
        narration: `Here is the same conflict, drawn on the ground: pulsing rings around both work fronts, and a dashed interaction line. … [serious] Today's high severity case is a welder and a confined space crew in the same absorber. Zero metres apart. … The system detects this before anyone lights a torch — not after.`,
        before: async (app) => {
            const c = (app.store.state.conflicts || []).find(x => x.severity === 'high');
            if (c) app.mapManager?.flyToConflict(c);
        }
    },

    // ---------------- Chapter 6 — Isolations ----------------
    {
        id: 'icc',
        chapter: 'Isolations',
        target: '#detail-panel',
        title: 'The ICC register',
        html: `Section 8 of the procedure — energy isolations. Each <b>Isolation
               Confirmation Certificate</b> lists its points with the §8.9 tag colours
               (red process, green electrical, blue instrument), the <b>lockbox and key
               holder (§8.3)</b>, and the permits that depend on it. Isolation points are
               pinned on the map like permits. This is a focused first slice of Section 8 —
               the full lock-out/tag-out and proving-dead workflow would come in a later phase.`,
        narration: `[calm] Section eight of the procedure covers energy isolations. Each isolation confirmation certificate lists its isolation points, with the standard tag colours: red for process, green for electrical, blue for instrument. … It tracks the lockbox and key holder, and the permits that depend on the isolation. … [aside] This is a focused first slice of section eight — the full lock out, tag out and proving dead workflow would come in a later phase.`,
        before: async (app) => { app.showIsolationPanel(); }
    },
    {
        id: 'guard',
        chapter: 'Isolations',
        target: '#detail-panel',
        title: 'The §8.1.1 guard',
        html: `We switched you to <b>SAP</b> — the only role allowed to apply or remove
               isolations. Try removing an isolation that still protects an open permit:
               the console blocks it and names the permit, enforcing <b>§8.1.1</b> — an
               isolation must never be lifted while work that relies on it is live. This
               is the kind of error paper cannot catch.`,
        narration: `We switched you to senior authorised person — the only role allowed to apply or remove isolations. Try removing an isolation that still protects an open permit: … the console blocks the action, and names the permit. … Section eight point one point one: an isolation must never be lifted while work that relies on it is live. This is the kind of error paper cannot catch.`,
        before: async (app) => { setPersona(app, 'SAP'); app.showIsolationPanel(); }
    },

    // ---------------- Chapter 7 — AI assistant ----------------
    {
        id: 'ai',
        chapter: 'AI assistant',
        target: '#ask-box',
        title: 'An assistant that reads the procedure',
        html: `The AI is grounded on <b>two sources at once</b>: the live console state —
               every permit, conflict and isolation you just saw — and the full text
               digest of the RevB procedure. It answers like a control-room advisor and
               <b>cites the § sections</b> that drive each answer.<br><br>
               <b>On security:</b> in a live deployment this would run as a <b>local, on-premise
               model</b> (for example Gemma) with <b>no connection to the outside world</b> —
               no permit data ever leaves your network. Every question and answer is written
               to the audit trail.`,
        narration: `[warming up] The assistant is grounded on two sources at once: the live console state — every permit, conflict and isolation you just saw — and the full text of the Rev B procedure itself. … It answers like a control room advisor, and cites the sections behind each answer. … [reassuring] And on security: in a live deployment, this would run as a local model, on your own hardware — for example Gemma — with no connection to the outside world. No permit data ever leaves your network. … Every question and answer is written to the audit trail.`,
        before: async (app) => { setPersona(app, 'PI'); closeDetail(app); }
    },
    {
        id: 'ai-live',
        chapter: 'AI assistant',
        target: '#ask-box',
        title: 'Watch it answer',
        html: `We just asked: <i>“Can I start hot work in CWA-0620 right now?”</i> — the
               live answer arrives in a couple of seconds. Expect a hard <b>NO</b>, on
               three § grounds: an expired hot-work permit, an incomplete approval chain,
               and the live SIMOPS conflict in that very area.`,
        narration: `[anticipatory] We just asked the assistant whether hot work can start in area zero six two zero, right now. The live answer arrives in a couple of seconds. … Expect a hard no — on three grounds from the procedure: an expired hot work permit, an incomplete approval chain, [pointed] and the live simops conflict in that very area.`,
        before: async (app) => {
            const input = $('ask-input'), form = $('ask-form');
            if (input && form) {
                input.value = 'Can I start hot work in CWA-0620 right now?';
                form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    },

    // ---------------- Chapter 8 — Wrap-up ----------------
    {
        id: 'controls',
        chapter: 'Wrap-up',
        target: ['#btn-reset-scenario', '#data-source'],
        title: 'Demo controls',
        html: `<b>Reset scenario</b> re-seeds the demo, re-anchored to today's 07:00 shift —
               break anything you like, it comes back. Everything you do is persisted with a
               full <b>§9.1 audit trail</b>; if the data layer is ever unreachable the console
               falls back to a self-contained sample scenario, so the demo never breaks.`,
        narration: `Two practical controls before you explore. Reset scenario re seeds the demo, re anchored to today's shift — [amused] break anything you like, it comes back. … Everything you do is persisted, with a full audit trail. And if the data layer is ever unreachable, the console falls back to a self contained sample scenario — [confident] so the demo never breaks.`,
        before: async (app) => { closeDetail(app); }
    },
    {
        id: 'finish',
        chapter: 'Wrap-up',
        target: null,
        title: 'Over to you',
        html: `That is the whole loop: <b>request → approve → work → monitor → close</b>,
               with SIMOPS, isolations and an AI advisor enforcing the same RevB document
               your teams already know. Replay any chapter from the menu below, or relaunch
               the tour any time with the <b>Tour</b> button on the map.<br><br>
               <span class="tour-hint">Switch personas, click zones, ask the AI hard
               questions — then hit Reset scenario.</span>`,
        narration: `[warm, wrapping up] And that is the whole loop: request, approve, work, monitor, close — with simultaneous operations, isolations, and an A I advisor, all enforcing the same Rev B document your teams already know. … Replay any chapter from the menu, or relaunch the tour any time with the tour button on the map. [inviting] The console is yours: switch personas, click zones, ask the A I hard questions... then hit reset scenario.`,
        before: async (app) => { setPersona(app, 'PI'); closeDetail(app); app.mapManager?.resetView(); }
    }
];
