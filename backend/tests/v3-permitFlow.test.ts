import { describe, it, expect } from 'vitest';
import { ACTIONS, actionsFor, applyTransition } from '../../v3/js/data/permitFlow.js';

const issued = () => ({
    permit_no: 'PTW-2026-0142', status: 'issued',
    signatures: { wa: { name: 'P. Sinclair', ts: '2026-08-30T04:00:00.000Z' } },
    description: 'Fire watch posted'
});

describe('daily shift sign-off (§5.8 — work site left safe and secure)', () => {
    it('is offered to the Performing Authority on an issued permit', () => {
        expect(actionsFor('issued', 'PA').map(a => a.id)).toContain('shift_signoff');
    });

    it('stamps signed_off_at and keeps the permit issued', () => {
        const now = Date.UTC(2026, 7, 30, 17, 0, 0);
        const { permit, event } = applyTransition(issued(), 'shift_signoff', { role: 'PA', now });
        expect(permit.status).toBe('issued');
        expect(permit.signed_off_at).toBe(new Date(now).toISOString());
        expect(event.actor_role).toBe('PA');
        expect(event.action).toMatch(/§5\.8/);
        expect(event.action).toMatch(/safe/i);
    });

    it('does not alter signatures or the description', () => {
        const before = issued();
        const { permit } = applyTransition(before, 'shift_signoff', { role: 'PA' });
        expect(permit.signatures).toEqual(before.signatures);
        expect(permit.description).toBe(before.description);
    });

    it('is refused before the permit is issued', () => {
        expect(() => applyTransition({ ...issued(), status: 'authorised' }, 'shift_signoff', { role: 'PA' }))
            .toThrow(/not allowed/);
    });

    it('is refused to roles other than the PA', () => {
        expect(() => applyTransition(issued(), 'shift_signoff', { role: 'PI' }))
            .toThrow(/PA/);
    });

    it('is not an approval-chain step (never feeds the My approvals queue)', () => {
        expect(ACTIONS.shift_signoff.sign).toEqual([]);
    });
});
