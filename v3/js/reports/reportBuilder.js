/**
 * Deterministic document generation — Control of Work reports.
 *
 * Pure functions that turn live console state into pdfmake document
 * definitions, then a client-side PDF the user downloads. NO AI, NO network:
 * the PDF is assembled entirely in the browser from data already on screen,
 * and pdfmake is vendored under /v3/vendor/ — nothing leaves the network.
 * This is the security-friendly counterpart to the AI assistant.
 *
 * Three documents, all traceable to the RevB procedure:
 *   permitCertificate — the issued permit (Appendix I + §6.2.1 signatures)
 *   simopsBrief       — the §6.4 daily look-ahead
 *   shiftHandover     — state snapshot at shift change
 */

import { SITE, PERMIT_TYPES, PERMIT_STATUS, ROLES } from '../config.js';

const PROC_REF = 'Worley PTW Procedure 215000-00190-000-HS-PRO-00002 Rev B';

// ---------- pdfmake lazy loader (vendored, one-time) ----------

let _pdfMakePromise = null;
function loadPdfMake() {
    if (window.pdfMake?.createPdf) return Promise.resolve(window.pdfMake);
    if (_pdfMakePromise) return _pdfMakePromise;
    const inject = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`load ${src}`));
        document.head.appendChild(s);
    });
    _pdfMakePromise = inject('/v3/vendor/pdfmake.min.js')
        .then(() => inject('/v3/vendor/vfs_fonts.js'))
        .then(() => window.pdfMake);
    return _pdfMakePromise;
}

/** Build the PDF and trigger a direct download. */
export async function downloadReport(docDefinition, filename) {
    const pdfMake = await loadPdfMake();
    pdfMake.createPdf(docDefinition).download(filename);
}

// ---------- shared formatting ----------

const S = (v) => (v == null ? '' : String(v));

const fmtDateTime = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-GB',
            { timeZone: SITE.timeZone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return S(iso); }
};

const nowStamp = () => new Date().toLocaleString('en-GB',
    { timeZone: SITE.timeZone, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const parseMaybe = (v) => (typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return {}; } })() : (v || {}));

const COLORS = { ink: '#1e2226', muted: '#5c646b', line: '#c9ced4', high: '#c0392b', medium: '#b8860b', accent: '#1f6f8b' };

function header(title, subtitle) {
    return [
        {
            columns: [
                { text: 'HMCCP · Control of Work', style: 'brand' },
                { text: nowStamp() + ' UK', style: 'stamp', alignment: 'right' }
            ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 1, lineColor: COLORS.line }] },
        { text: title, style: 'h1', margin: [0, 10, 0, 0] },
        subtitle ? { text: subtitle, style: 'sub' } : null
    ].filter(Boolean);
}

function footer() {
    return (currentPage, pageCount) => ({
        margin: [40, 0, 40, 20],
        columns: [
            { text: `${PROC_REF}  ·  retained per §9.1 (3-year)  ·  demonstration — illustrative sample data`, style: 'foot' },
            { text: `${currentPage} / ${pageCount}`, style: 'foot', alignment: 'right' }
        ]
    });
}

function sectionTitle(text) {
    return { text, style: 'h2', margin: [0, 14, 0, 4] };
}

function kvTable(rows) {
    return {
        table: { widths: [130, '*'], body: rows.map(([k, v]) => [{ text: k, style: 'k' }, { text: S(v), style: 'v' }]) },
        layout: 'noBorders', margin: [0, 2, 0, 0]
    };
}

const STYLES = {
    brand: { fontSize: 11, bold: true, color: COLORS.ink, characterSpacing: 0.5 },
    stamp: { fontSize: 8, color: COLORS.muted },
    h1: { fontSize: 17, bold: true, color: COLORS.ink },
    sub: { fontSize: 9, color: COLORS.muted, margin: [0, 2, 0, 0] },
    h2: { fontSize: 11, bold: true, color: COLORS.accent },
    k: { fontSize: 9, color: COLORS.muted, margin: [0, 2, 0, 2] },
    v: { fontSize: 9, color: COLORS.ink, margin: [0, 2, 0, 2] },
    th: { fontSize: 8, bold: true, color: '#ffffff', fillColor: '#3a4048', margin: [2, 3, 2, 3] },
    td: { fontSize: 8, color: COLORS.ink, margin: [2, 3, 2, 3] },
    foot: { fontSize: 7, color: COLORS.muted },
    badge: { fontSize: 9, bold: true }
};

const base = (content) => ({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 46],
    content,
    footer: footer(),
    styles: STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 9, color: COLORS.ink }
});

function dataRow(cells) { return cells.map(c => ({ text: S(c), style: 'td' })); }
function headRow(cells) { return cells.map(c => ({ text: S(c), style: 'th' })); }

// ---------- 1. Permit certificate ----------

export function permitCertificate(permit, { isolations = [] } = {}) {
    const t = PERMIT_TYPES[permit.type] || { label: permit.type, validity: '' };
    const st = PERMIT_STATUS[permit.status] || { label: permit.status };
    const sigs = parseMaybe(permit.signatures);
    const atts = parseMaybe(permit.attachments);
    const linkedIso = isolations.filter(i => i.icc_no && i.icc_no === permit.icc_no);

    const sigBody = [headRow(['Role', 'Authority', 'Name', 'Signed'])];
    for (const r of ROLES) {
        const s = sigs[r.id.toLowerCase()];
        sigBody.push(dataRow([r.id, r.name || '', s ? s.name : '— pending —', s ? fmtDateTime(s.ts) : '—']));
    }

    const attEntries = Object.entries(atts);
    const attBody = [headRow(['Document', 'Status'])];
    for (const [k, v] of attEntries) attBody.push(dataRow([S(k).replace(/_/g, ' '), v ? 'provided' : 'MISSING']));
    const missing = attEntries.filter(([, v]) => !v).map(([k]) => S(k).replace(/_/g, ' '));

    const content = [
        ...header('Permit to Work — Certificate', `${permit.permit_no}  ·  ${st.label.toUpperCase()}`),
        sectionTitle('Permit details'),
        kvTable([
            ['Permit number', permit.permit_no],
            ['Type (§4.1)', `${t.label} · max validity ${t.validity}`],
            ['Construction Work Area', permit.cwa],
            ['Description of work', permit.title],
            ['Contractor', permit.contractor],
            ['Performing Authority', permit.performing_authority],
            ['Valid from', fmtDateTime(permit.valid_from)],
            ['Valid to', fmtDateTime(permit.valid_to)],
            ...(permit.revalidated_at ? [['Last revalidated (§6.2.2)', fmtDateTime(permit.revalidated_at)]] : [])
        ]),
        sectionTitle('Approval chain (§6.2.1)'),
        { table: { headerRows: 1, widths: [40, '*', '*', 120], body: sigBody }, layout: tableLayout() },
        sectionTitle('Supporting documents (§4.2)'),
        { table: { headerRows: 1, widths: ['*', 100], body: attBody }, layout: tableLayout() },
        missing.length
            ? { text: `Permit INVALID until provided: ${missing.join(', ')} (§4.2)`, style: 'v', color: COLORS.high, margin: [0, 4, 0, 0] }
            : { text: 'All mandatory documents present (§4.2).', style: 'v', margin: [0, 4, 0, 0] }
    ];

    if (linkedIso.length) {
        content.push(sectionTitle('Linked isolations (§8)'));
        const body = [headRow(['ICC', 'Type', 'Status', 'Lockbox / key holder'])];
        for (const i of linkedIso) body.push(dataRow([i.icc_no, i.type, S(i.status).toUpperCase(), i.lockbox_key ? `${i.lockbox_key} · ${i.key_holder || ''}` : '—']));
        content.push({ table: { headerRows: 1, widths: [70, '*', 70, '*'], body }, layout: tableLayout() });
    }
    if (permit.description) {
        content.push(sectionTitle('Notes'));
        content.push({ text: permit.description, style: 'v' });
    }
    return base(content);
}

// ---------- 2. Daily SIMOPS brief ----------

export function simopsBrief(state) {
    const permits = state.permits || [];
    const conflicts = state.conflicts || [];
    const live = permits.filter(p => p.status === 'issued');
    const high = conflicts.filter(c => c.severity === 'high').length;
    const medium = conflicts.filter(c => c.severity !== 'high').length;
    const today = new Date().toLocaleDateString('en-GB',
        { timeZone: SITE.timeZone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const content = [
        ...header('Daily SIMOPS Brief — Line of Sight (§6.4)', today),
        sectionTitle('Summary'),
        kvTable([
            ['Live permits', String(live.length)],
            ['Interactions flagged', `${conflicts.length}  (${high} high · ${medium} medium)`]
        ]),
        sectionTitle('Interactions')
    ];

    if (!conflicts.length) {
        content.push({ text: 'No simultaneous-operation interactions detected among live and upcoming permits.', style: 'v' });
    } else {
        const body = [headRow(['Severity', 'Interaction', 'Permits', 'Area', 'Apart', 'Control advice (§6.3)'])];
        for (const c of conflicts) {
            body.push([
                { text: S(c.severity).toUpperCase(), style: 'td', bold: true, color: c.severity === 'high' ? COLORS.high : COLORS.medium },
                { text: S(c.label), style: 'td' },
                { text: (c.permits || []).join(', '), style: 'td' },
                { text: S(c.cwa), style: 'td' },
                { text: c.distanceM != null ? `${c.distanceM} m` : '—', style: 'td' },
                { text: S(c.advice), style: 'td' }
            ]);
        }
        content.push({ table: { headerRows: 1, widths: [42, 90, 74, 60, 30, '*'], body }, layout: tableLayout() });
    }

    content.push(sectionTitle('Live permits in scope'));
    const pb = [headRow(['Permit', 'Type', 'Area', 'Valid to'])];
    for (const p of live) pb.push(dataRow([p.permit_no, (PERMIT_TYPES[p.type] || {}).label || p.type, p.cwa, fmtDateTime(p.valid_to)]));
    content.push({ table: { headerRows: 1, widths: [78, '*', 60, 130], body: pb }, layout: tableLayout() });

    return base(content);
}

// ---------- 3. Shift handover ----------

export function shiftHandover(state) {
    const now = Date.now();
    const permits = state.permits || [];
    const conflicts = state.conflicts || [];
    const isolations = state.isolations || [];
    const issued = permits.filter(p => p.status === 'issued');
    const expiring = issued.filter(p => new Date(p.valid_to).getTime() - now < 2 * 3600e3);
    const inApproval = permits.filter(p => ['requested', 'reviewed', 'verified', 'authorised'].includes(p.status));
    const suspended = permits.filter(p => p.status === 'suspended');
    const liveIso = isolations.filter(i => ['applied', 'sanction_to_test'].includes(i.status));
    // multi-day permits needing daily revalidation this shift (§6.2.2)
    const revalDue = issued.filter(p => {
        const spanH = (new Date(p.valid_to) - new Date(p.valid_from)) / 3600e3;
        return spanH > 24;
    });

    const listTable = (rows, cols, widths) => rows.length
        ? { table: { headerRows: 1, widths, body: [headRow(cols), ...rows] }, layout: tableLayout() }
        : { text: 'None.', style: 'v' };

    const content = [
        ...header('Shift Handover Report', `As at ${nowStamp()} UK`),
        sectionTitle(`Active permits — set to work (${issued.length})`),
        listTable(issued.map(p => dataRow([p.permit_no, (PERMIT_TYPES[p.type] || {}).label || p.type, p.cwa, fmtDateTime(p.valid_to)])),
            ['Permit', 'Type', 'Area', 'Valid to'], [78, '*', 60, 130]),

        sectionTitle(`Expiring within 2 hours (${expiring.length})`),
        listTable(expiring.map(p => dataRow([p.permit_no, p.cwa, fmtDateTime(p.valid_to)])),
            ['Permit', 'Area', 'Valid to'], [78, 60, '*']),

        sectionTitle(`Revalidation due this shift — §6.2.2 (${revalDue.length})`),
        listTable(revalDue.map(p => dataRow([p.permit_no, p.cwa, p.revalidated_at ? `last ${fmtDateTime(p.revalidated_at)}` : 'not yet revalidated'])),
            ['Permit', 'Area', 'Status'], [78, 60, '*']),

        sectionTitle(`Open SIMOPS interactions (${conflicts.length})`),
        listTable(conflicts.map(c => [
            { text: S(c.severity).toUpperCase(), style: 'td', bold: true, color: c.severity === 'high' ? COLORS.high : COLORS.medium },
            { text: S(c.label), style: 'td' }, { text: (c.permits || []).join(', '), style: 'td' }, { text: S(c.cwa), style: 'td' }
        ]), ['Severity', 'Interaction', 'Permits', 'Area'], [42, '*', 90, 60]),

        sectionTitle(`Live isolations — ICC (${liveIso.length})`),
        listTable(liveIso.map(i => dataRow([i.icc_no, i.type, i.lockbox_key ? `${i.lockbox_key} · ${i.key_holder || ''}` : '—', S(i.description).slice(0, 60)])),
            ['ICC', 'Type', 'Lockbox / key', 'Description'], [70, 70, 110, '*']),

        sectionTitle(`In approval (${inApproval.length}) · Suspended (${suspended.length})`),
        listTable([...inApproval, ...suspended].map(p => dataRow([p.permit_no, (PERMIT_STATUS[p.status] || {}).label || p.status, p.cwa, p.title])),
            ['Permit', 'State', 'Area', 'Description'], [78, 80, 55, '*'])
    ];
    return base(content);
}

// zebra table layout, header fill from cell style
function tableLayout() {
    return {
        fillColor: (rowIndex) => (rowIndex === 0 ? null : (rowIndex % 2 === 0 ? '#f4f6f8' : null)),
        hLineWidth: () => 0.5, vLineWidth: () => 0,
        hLineColor: () => COLORS.line,
        paddingTop: () => 3, paddingBottom: () => 3
    };
}
