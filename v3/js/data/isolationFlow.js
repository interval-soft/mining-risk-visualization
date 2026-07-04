/**
 * Isolation (ICC) rules — §8 of the Worley PTW Procedure.
 * SINGLE SOURCE shared by browser and /api/v3/isolation.
 *
 * The golden rule (§8.1.1): an isolation cannot be removed until every
 * Permit to Work linked to it is signed off as complete and the SAP has
 * authorised removal. STT (§8.8) and proving dead (§8.15.2) are phase 2.
 */

export const ISOLATION_ACTIONS = {
    apply: {
        from: ['planned'], to: 'applied',
        roles: ['SAP'],
        label: 'Apply isolation (LOTO)',
        icon: 'ph-lock-key',
        event: 'isolation applied — locked, tagged, integrity confirmed (§8.10)'
    },
    remove: {
        from: ['applied'], to: 'removed',
        roles: ['SAP'],
        label: 'Remove isolation (de-isolate)',
        icon: 'ph-lock-key-open',
        guard: 'noOpenPermits',
        event: 'de-isolated — all linked permits closed, SAP authorised (§8.12)'
    }
};

const OPEN = ['requested', 'reviewed', 'verified', 'authorised', 'issued', 'suspended'];

/** Permits currently linked to an ICC and not yet finished. */
export function openLinkedPermits(isolation, permits) {
    return permits.filter(p => p.icc_no === isolation.icc_no && OPEN.includes(p.status));
}

/**
 * Validate and apply an isolation action (pure). Throws with §-referenced
 * messages on violations — including the §8.1.1 de-isolation guard.
 */
export function applyIsolationTransition(isolation, actionId, { role, permits = [], now = Date.now() }) {
    const action = ISOLATION_ACTIONS[actionId];
    if (!action) throw new Error(`Unknown isolation action: ${actionId}`);
    if (!action.from.includes(isolation.status)) {
        throw new Error(`${actionId} not allowed from status "${isolation.status}"`);
    }
    if (!action.roles.includes(role)) {
        throw new Error(`${actionId} requires role ${action.roles.join(' or ')} — acting as ${role}`);
    }
    if (action.guard === 'noOpenPermits') {
        const open = openLinkedPermits(isolation, permits);
        if (open.length) {
            throw new Error(
                `De-isolation blocked (§8.1.1): permit${open.length > 1 ? 's' : ''} ` +
                `${open.map(p => p.permit_no).join(', ')} still linked to ${isolation.icc_no}. ` +
                `Close the permit${open.length > 1 ? 's' : ''} and return the lockbox key first.`);
        }
    }

    const next = { ...isolation, status: action.to };
    if (action.to === 'removed') { next.lockbox_key = null; next.key_holder = null; }

    return {
        isolation: next,
        event: {
            ts: now,
            permit_no: isolation.icc_no,   // shown in the shared audit feed
            actor_role: role,
            action: action.event
        }
    };
}
