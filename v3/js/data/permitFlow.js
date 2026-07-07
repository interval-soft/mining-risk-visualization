/**
 * Permit lifecycle state machine — Set To Work §5 / §6.2 of the Worley
 * PTW Procedure (RevB). SINGLE SOURCE shared by the browser (button
 * visibility, optimistic transitions) and /api/v3/action (server-side
 * validation). Pure JS, no dependencies.
 *
 * Roles: WA Work Authority · AA Area Authority · PI Permit Issuer ·
 * PA Performing Authority.
 */

export const ACTIONS = {
    review: {
        from: ['requested'], to: 'reviewed',
        roles: ['AA', 'PI'],
        label: 'Mark reviewed',
        icon: 'ph-magnifying-glass',
        sign: ['AA'],
        event: 'reviewed — RAMS/TRA & SIMOPS checked (§5.3)'
    },
    verify: {
        from: ['reviewed'], to: 'verified',
        roles: ['PA', 'AA', 'PI'],
        label: 'Record joint site verification',
        icon: 'ph-users-three',
        sign: [],
        event: 'joint site inspection recorded (§5.4)'
    },
    authorise: {
        from: ['verified'], to: 'authorised',
        roles: ['WA'],
        label: 'Authorise (WA + AA + PI)',
        icon: 'ph-stamp',
        sign: ['WA', 'AA', 'PI'],
        event: 'authorised — 3 signatures recorded (§6.2.1)'
    },
    accept: {
        from: ['authorised'], to: 'issued',
        roles: ['PA'],
        label: 'Accept & set to work',
        icon: 'ph-play-circle',
        sign: ['PA'],
        event: 'accepted by PA — set to work (§5.6)'
    },
    revalidate: {
        from: ['issued'], to: 'issued',
        roles: ['PI'],
        label: 'Daily revalidation',
        icon: 'ph-arrow-clockwise',
        sign: [],
        stamp: 'revalidated_at',
        event: 'daily revalidation (§6.2.2)'
    },
    suspend: {
        from: ['issued'], to: 'suspended',
        roles: ['PI', 'AA'],
        label: 'Suspend…',
        icon: 'ph-pause-circle',
        sign: [],
        needsReason: true,
        event: 'SUSPENDED (§6.2.4)'
    },
    resume: {
        from: ['suspended'], to: 'issued',
        roles: ['WA'],
        label: 'Revalidate suspended (WA+AA+PI)',
        icon: 'ph-play-circle',
        sign: ['WA', 'AA', 'PI'],
        event: 'suspended permit revalidated — 3 approvals (§6.2.4)'
    },
    close: {
        from: ['issued'], to: 'closed',
        roles: ['PA', 'PI'],
        label: 'Close permit',
        icon: 'ph-check-square-offset',
        sign: [],
        event: 'closed — work complete, area safe & tidy (§5.8)'
    },
    withdraw: {
        from: ['requested', 'reviewed', 'verified', 'authorised'], to: 'withdrawn',
        roles: ['PI'],
        label: 'Withdraw request',
        icon: 'ph-x-circle',
        sign: [],
        needsReason: true,
        event: 'withdrawn (§6.2.4)'
    }
};

/** Actions available for a permit in `status` to a given persona. */
export function actionsFor(status, role) {
    return Object.entries(ACTIONS)
        .filter(([, a]) => a.from.includes(status) && a.roles.includes(role))
        .map(([id, a]) => ({ id, ...a }));
}

/** Forward steps of the approval chain — these feed the "My approvals" queue. */
const FORWARD = ['review', 'verify', 'authorise', 'accept', 'resume'];

/** Which statuses await a given persona (drives the "My approvals" queue). */
export function awaitingRole(role) {
    const statuses = new Set();
    for (const id of FORWARD) {
        const a = ACTIONS[id];
        if (a.roles.includes(role)) for (const s of a.from) statuses.add(s);
    }
    return statuses;
}

/**
 * Validate and apply a transition to a permit object (pure — returns a new
 * object). Throws with a §-referenced message when the move is illegal.
 * Used verbatim on both client (optimistic) and server (authoritative).
 */
export function applyTransition(permit, actionId, { role, name, reason, now = Date.now() }) {
    const action = ACTIONS[actionId];
    if (!action) throw new Error(`Unknown action: ${actionId}`);
    if (!action.from.includes(permit.status)) {
        throw new Error(`${actionId} not allowed from status "${permit.status}"`);
    }
    if (!action.roles.includes(role)) {
        throw new Error(`${actionId} requires role ${action.roles.join(' or ')} — acting as ${role}`);
    }
    if (action.needsReason && !reason) {
        throw new Error('A reason is required (§6.2.4)');
    }

    // Demo signatory identities used when an action stamps signatures without a
    // caller-supplied name. A real deployment resolves these from the signed-in
    // user. NOTE: the same map is duplicated in permitSeed.js (seeded events) —
    // keep the two in sync.
    const NAMES = { WA: 'P. Sinclair', AA: 'G. Latham', PI: 'B. Kavanagh' };
    const signatures = { ...(typeof permit.signatures === 'string'
        ? JSON.parse(permit.signatures) : permit.signatures || {}) };
    for (const r of action.sign) {
        signatures[r.toLowerCase()] = {
            name: r === role ? (name || NAMES[r] || role) : (NAMES[r] || r),
            ts: new Date(now).toISOString()
        };
    }

    const next = {
        ...permit,
        status: action.to,
        signatures,
        updated_at: new Date(now).toISOString()
    };
    if (action.stamp === 'revalidated_at') next.revalidated_at = new Date(now).toISOString();
    if (reason) next.description = reason;

    const event = {
        ts: now,
        permit_no: permit.permit_no,
        actor_role: role,
        action: action.event + (reason ? ` — ${reason}` : '')
    };
    return { permit: next, event };
}
