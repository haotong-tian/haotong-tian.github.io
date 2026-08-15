/* ──────────────────────────────────────────────────────────────
   Yellowstone trip planner
   ────────────────────────────────────────────────────────────── */

const DAYS = [1, 2, 3, 4];
const SLOTS = [
    { key: 'morning',   label: 'Morning',   time: '6am – 12pm' },
    { key: 'afternoon', label: 'Afternoon', time: '12pm – 6pm' },
    { key: 'evening',   label: 'Evening',   time: '6pm – 10pm' },
];
const DAY_META = {
    1: { label: 'Day 1', sub: 'Full day' },
    2: { label: 'Day 2', sub: 'Full day' },
    3: { label: 'Day 3', sub: 'Full day' },
    4: { label: 'Day 4', sub: 'Until departure' },
};
const STORE_KEY = 'yellowstone-plan-v1';
const TOTAL_SLOTS = DAYS.length * SLOTS.length - 1;   // day 4 evening is the flight home

const cellKey = (day, slot) => `d${day}-${slot}`;
const isDisabled = (day, slot) => day === 4 && slot === 'evening';

const BY_ID = Object.fromEntries(ATTRACTIONS.map(a => [a.id, a]));
const REGION_LABEL = Object.fromEntries(REGIONS.map(r => [r.key, r.label]));

const RES_LABEL = {
    none: 'No reservation',
    rec:  'Plan ahead',
    req:  'Reservation required',
};

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const DAY_COLOR = { 1: css('--day1'), 2: css('--day2'), 3: css('--day3'), 4: css('--day4') };
const ACCENT = css('--accent') || '#1D6A3A';

/* ── State ─────────────────────────────────────────────────── */

let plan = loadPlan();
let activeRegion = 'all';
let query = '';
let pinnedId = null;
let hoverId = null;
let pickId = null;          // card waiting for a slot via the "+" button

function blankPlan() {
    const blank = {};
    DAYS.forEach(d => SLOTS.forEach(s => { if (!isDisabled(d, s.key)) blank[cellKey(d, s.key)] = []; }));
    return blank;
}

function adopt(saved) {
    const p = blankPlan();
    if (saved && typeof saved === 'object') {
        Object.keys(p).forEach(k => {
            if (Array.isArray(saved[k])) p[k] = saved[k].filter(id => BY_ID[id]);
        });
    }
    return p;
}

/* The plan lives in three places at once: localStorage (autosave), the URL hash
   (shareable + survives a crashed browser), and an exportable .json file. */
function encodePlan(p) {
    return Object.keys(p).filter(k => p[k].length).map(k => k + ':' + p[k].join(',')).join(';');
}
function decodePlan(str) {
    const out = {};
    str.split(';').filter(Boolean).forEach(chunk => {
        const i = chunk.indexOf(':');
        if (i < 0) return;
        out[chunk.slice(0, i)] = chunk.slice(i + 1).split(',').filter(Boolean);
    });
    return out;
}

function loadPlan() {
    const m = location.hash.match(/[#&]plan=([^&]*)/);
    if (m) {
        try {
            const fromUrl = adopt(decodePlan(decodeURIComponent(m[1])));
            if (Object.values(fromUrl).some(a => a.length)) return fromUrl;
        } catch (e) { /* malformed link — fall through to local storage */ }
    }
    try {
        return adopt(JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch (e) {
        return blankPlan();
    }
}

function savePlan() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(plan)); } catch (e) { /* private mode */ }
    const enc = encodePlan(plan);
    history.replaceState(null, '', enc ? '#plan=' + encodeURIComponent(enc)
                                       : location.pathname + location.search);
}

function cellOf(id) {
    for (const k of Object.keys(plan)) if (plan[k].includes(id)) return k;
    return null;
}
const dayOf = id => { const k = cellOf(id); return k ? Number(k[1]) : 0; };

function assign(id, key, index) {
    const from = cellOf(id);
    if (from) plan[from] = plan[from].filter(x => x !== id);
    const arr = plan[key];
    if (typeof index === 'number' && index >= 0 && index <= arr.length) arr.splice(index, 0, id);
    else arr.push(id);
    savePlan();
    renderAll();
}
function unassign(id) {
    const from = cellOf(id);
    if (!from) return;
    plan[from] = plan[from].filter(x => x !== id);
    savePlan();
    renderAll();
}

/* ── Filtering ─────────────────────────────────────────────── */

function visibleList() {
    const q = query.trim().toLowerCase();
    return ATTRACTIONS.filter(a => {
        if (activeRegion !== 'all' && a.region !== activeRegion) return false;
        if (!q) return true;
        return (a.name + ' ' + a.what + ' ' + REGION_LABEL[a.region] + ' ' + (a.resNote || ''))
            .toLowerCase().includes(q);
    });
}

/* ── Map ───────────────────────────────────────────────────── */

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [-110.52, 44.62],
    zoom: 8.4,
    minZoom: 5,
    maxZoom: 15,
    attributionControl: false,
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();

const popup = new maplibregl.Popup({
    closeButton: false, closeOnClick: false, offset: 14, maxWidth: '240px',
});

let mapReady = false;
let hoverFid = null;

function spotsGeoJSON() {
    return {
        type: 'FeatureCollection',
        features: ATTRACTIONS.map((a, i) => ({
            type: 'Feature',
            id: i,
            geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
            properties: { id: a.id, name: a.name, day: dayOf(a.id), time: a.time },
        })),
    };
}

function routesGeoJSON() {
    const features = [];
    DAYS.forEach(d => {
        const coords = [];
        SLOTS.forEach(s => {
            const k = cellKey(d, s.key);
            (plan[k] || []).forEach(id => {
                const a = BY_ID[id];
                if (a) coords.push([a.lng, a.lat]);
            });
        });
        if (coords.length >= 2) {
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords },
                properties: { day: d },
            });
        }
    });
    return { type: 'FeatureCollection', features };
}

map.on('load', () => {
    map.addSource('routes', { type: 'geojson', data: routesGeoJSON() });
    map.addSource('spots', { type: 'geojson', data: spotsGeoJSON() });

    map.addLayer({
        id: 'routes', type: 'line', source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': ['match', ['get', 'day'],
                1, DAY_COLOR[1], 2, DAY_COLOR[2], 3, DAY_COLOR[3], 4, DAY_COLOR[4], ACCENT],
            'line-width': 2,
            'line-opacity': 0.75,
            'line-dasharray': [2, 1.6],
        },
    });

    map.addLayer({
        id: 'spots', type: 'circle', source: 'spots',
        paint: {
            'circle-radius': [
                'case',
                ['boolean', ['feature-state', 'hover'], false], 10,
                ['>', ['get', 'day'], 0], 7,
                5,
            ],
            'circle-color': ['match', ['get', 'day'],
                1, DAY_COLOR[1], 2, DAY_COLOR[2], 3, DAY_COLOR[3], 4, DAY_COLOR[4], ACCENT],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': [
                'case', ['boolean', ['feature-state', 'hover'], false], 2.4, 1.5,
            ],
            'circle-opacity': 0.95,
        },
    });

    map.addLayer({
        id: 'spot-labels', type: 'symbol', source: 'spots',
        filter: ['>', ['get', 'day'], 0],
        layout: {
            'text-field': ['concat', 'D', ['to-string', ['get', 'day']]],
            'text-font': ['Noto Sans Bold'],
            'text-size': 9.5,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-padding': 1,
        },
        paint: {
            'text-color': '#0D1B3E',
            'text-halo-color': '#FAFAF7',
            'text-halo-width': 1.6,
        },
    });

    map.on('mousemove', 'spots', e => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features[0].properties.id;
        if (id !== hoverId) { setHover(id, true); highlightCard(id, true); }
    });
    map.on('mouseleave', 'spots', () => {
        map.getCanvas().style.cursor = '';
        setHover(pinnedId, true);
        highlightCard(pinnedId, false);
    });
    map.on('click', 'spots', e => {
        const id = e.features[0].properties.id;
        pinnedId = pinnedId === id ? null : id;
        setHover(pinnedId || null, true);
        renderCards();
    });
    map.on('click', e => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ['spots'] });
        if (!hit.length && pinnedId) { pinnedId = null; setHover(null, true); renderCards(); }
    });

    mapReady = true;
    fitTo(ATTRACTIONS.filter(a => OUTSIDE.indexOf(a.region) < 0), 0);
    syncMap();
});

// Regions that sit well outside Yellowstone — excluded from the default framing.
const OUTSIDE = ['gateway', 'airport', 'teton'];

function fitTo(list, duration) {
    if (!mapReady || !list.length) return;
    const b = new maplibregl.LngLatBounds();
    list.forEach(a => b.extend([a.lng, a.lat]));
    map.fitBounds(b, {
        padding: { top: 40, bottom: 52, left: 40, right: 52 },
        duration: duration === undefined ? 800 : duration,
        maxZoom: 10.5,
    });
}

function syncMap() {
    if (!mapReady) return;
    map.getSource('spots').setData(spotsGeoJSON());
    map.getSource('routes').setData(routesGeoJSON());

    const ids = visibleList().map(a => a.id);
    const shown = ['any', ['in', ['get', 'id'], ['literal', ids]], ['>', ['get', 'day'], 0]];
    map.setFilter('spots', shown);
    map.setFilter('spot-labels', ['all', ['>', ['get', 'day'], 0]]);
}

function setHover(id, fromMap) {
    hoverId = id || null;

    if (mapReady && hoverFid !== null) {
        map.setFeatureState({ source: 'spots', id: hoverFid }, { hover: false });
        hoverFid = null;
    }
    if (!hoverId) { popup.remove(); return; }

    const a = BY_ID[hoverId];
    if (!a) { popup.remove(); return; }

    const idx = ATTRACTIONS.indexOf(a);
    if (mapReady) {
        map.setFeatureState({ source: 'spots', id: idx }, { hover: true });
        hoverFid = idx;
    }

    const d = dayOf(a.id);
    const where = d ? `Day ${d} · ${slotLabelOf(a.id)}` : REGION_LABEL[a.region];
    popup.setLngLat([a.lng, a.lat])
        .setHTML(`<div class="pop-name">${esc(a.name)}</div>
                  <div class="pop-meta">${esc(a.time)} &nbsp;·&nbsp; ${esc(where)}</div>`)
        .addTo(map);

    if (!fromMap && mapReady && !map.getBounds().contains([a.lng, a.lat])) {
        map.easeTo({ center: [a.lng, a.lat], duration: 700 });
    }
}

function slotLabelOf(id) {
    const k = cellOf(id);
    if (!k) return '';
    const s = SLOTS.find(s => k.endsWith(s.key));
    return s ? s.label : '';
}

/* ── Cards ─────────────────────────────────────────────────── */

const cardsEl = document.getElementById('cards');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderChips() {
    const el = document.getElementById('region-chips');
    const items = [{ key: 'all', label: 'All regions' }].concat(REGIONS);
    el.innerHTML = items.map(r =>
        `<button class="chip${activeRegion === r.key ? ' active' : ''}" data-region="${r.key}">${esc(r.label)}</button>`
    ).join('');
    el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
        activeRegion = b.dataset.region;
        renderChips(); renderCards(); syncMap();
        fitTo(activeRegion === 'all'
            ? ATTRACTIONS.filter(a => OUTSIDE.indexOf(a.region) < 0)
            : ATTRACTIONS.filter(a => a.region === activeRegion));
    }));
}

function renderCards() {
    const list = visibleList();
    document.getElementById('filter-count').textContent =
        `${list.length} of ${ATTRACTIONS.length} shown`;

    if (!list.length) {
        cardsEl.innerHTML = `<div class="empty-msg">Nothing matches that search.</div>`;
        return;
    }

    let html = '';
    let lastRegion = null;
    list.forEach(a => {
        if (a.region !== lastRegion) {
            lastRegion = a.region;
            html += `<div class="region-head">${esc(REGION_LABEL[a.region])}</div>`;
        }
        const d = dayOf(a.id);
        const closed = a.status === 'closed';
        html += `
        <article class="card${d ? ' scheduled' : ''}${pinnedId === a.id ? ' pinned' : ''}${closed ? ' is-closed' : ''}"
                 data-id="${a.id}" data-drag-id="${a.id}">
            <button class="add-btn" data-add="${a.id}" title="Add to schedule">${d ? 'Move' : '+ Plan'}</button>
            <div class="card-top">
                <h3>${esc(a.name)}</h3>
                ${d ? `<span class="day-badge d${d}">D${d} · ${esc(slotLabelOf(a.id).slice(0, 3).toUpperCase())}</span>` : ''}
            </div>
            <p class="what">${esc(a.what)}</p>
            <div class="meta">
                <span class="tag time">${esc(a.time)}</span>
                <span class="tag res-${a.res}">${esc(RES_LABEL[a.res])}</span>
                ${closed ? `<span class="tag closed">Currently closed</span>` : ''}
            </div>
            <p class="note">${esc(closed ? a.statusNote : a.resNote)}</p>
        </article>`;
    });
    cardsEl.innerHTML = html;

    cardsEl.querySelectorAll('.card').forEach(card => {
        const id = card.dataset.id;
        card.addEventListener('mouseenter', () => { if (!dragging) setHover(id); });
        card.addEventListener('mouseleave', () => { if (!dragging) setHover(pinnedId); });
        card.addEventListener('click', e => {
            if (e.target.closest('.add-btn')) return;
            pinnedId = pinnedId === id ? null : id;
            setHover(pinnedId);
            renderCards();
        });
    });
    cardsEl.querySelectorAll('.add-btn').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        openPicker(b.dataset.add);
    }));
}

function highlightCard(id, scroll) {
    cardsEl.querySelectorAll('.card.hot').forEach(c => c.classList.remove('hot'));
    if (!id) return;
    const el = cardsEl.querySelector(`.card[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('hot');
    if (scroll) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > window.innerHeight - 10) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

/* ── Schedule board ────────────────────────────────────────── */

const boardEl = document.getElementById('board');

const cellHours = key => (plan[key] || []).reduce((s, id) => s + (BY_ID[id] ? BY_ID[id].hours : 0), 0);
const fmtH = h => (Math.round(h * 10) / 10) + ' h';

function renderBoard() {
    let head = '<thead><tr><th class="slot-th"></th>';
    DAYS.forEach(d => {
        const total = SLOTS.reduce((s, sl) => s + (isDisabled(d, sl.key) ? 0 : cellHours(cellKey(d, sl.key))), 0);
        head += `<th>
            <div class="day-title"><span class="day-dot" style="background:${DAY_COLOR[d]}"></span>${DAY_META[d].label}</div>
            <div class="day-sub">${DAY_META[d].sub}${total ? ' · ' + fmtH(total) : ''}</div>
        </th>`;
    });
    head += '</tr></thead>';

    let body = '<tbody>';
    SLOTS.forEach(sl => {
        body += `<tr><th class="slot-th">${sl.label}<span class="slot-time">${sl.time}</span></th>`;
        DAYS.forEach(d => {
            if (isDisabled(d, sl.key)) {
                body += `<td class="cell disabled"><div class="cell-note">Departure</div></td>`;
                return;
            }
            const key = cellKey(d, sl.key);
            const items = plan[key] || [];
            body += `<td class="cell" data-cell="${key}">`;
            if (!items.length) {
                body += `<div class="cell-drop-hint">Drop here</div>`;
            } else {
                items.forEach(id => {
                    const a = BY_ID[id];
                    if (!a) return;
                    body += `<div class="chip-item" data-drag-id="${a.id}" data-id="${a.id}"
                                  style="border-left-color:${DAY_COLOR[d]}">
                        <span class="ci-name">${esc(a.name)}<span class="ci-time">${esc(a.time)}</span></span>
                        <button class="ci-x" data-remove="${a.id}" title="Remove">&times;</button>
                    </div>`;
                });
                body += `<div class="cell-hours">${fmtH(cellHours(key))}</div>`;
            }
            body += '</td>';
        });
        body += '</tr>';
    });
    body += '</tbody>';

    boardEl.innerHTML = head + body;

    boardEl.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        unassign(b.dataset.remove);
    }));
    boardEl.querySelectorAll('.chip-item').forEach(c => {
        const id = c.dataset.id;
        c.addEventListener('mouseenter', () => { if (!dragging) setHover(id); });
        c.addEventListener('mouseleave', () => { if (!dragging) setHover(pinnedId); });
    });

    const scheduled = Object.values(plan).reduce((s, arr) => s + arr.length, 0);
    document.getElementById('plan-count').textContent =
        scheduled ? `${scheduled} stop${scheduled === 1 ? '' : 's'} planned` : 'nothing planned yet';
}

/* ── Stats ─────────────────────────────────────────────────── */

function renderStats() {
    const scheduled = Object.values(plan).reduce((s, arr) => s + arr.length, 0);
    const hours = Object.keys(plan).reduce((s, k) => s + cellHours(k), 0);
    const used = Object.keys(plan).filter(k => plan[k].length).length;
    document.getElementById('map-stats').innerHTML = [
        { v: ATTRACTIONS.length, l: 'Attractions' },
        { v: scheduled, l: 'Scheduled' },
        { v: fmtH(hours), l: 'Planned time' },
        { v: `${TOTAL_SLOTS - used}`, l: 'Slots open' },
    ].map(s => `<div class="map-stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join('');
}

/* ── Quick-drop grid ───────────────────────────────────────── */

const qdEl = document.getElementById('quick-drop');
const qdGrid = document.getElementById('qd-grid');

function renderQuickDrop() {
    let html = '<div></div>';
    DAYS.forEach(d => {
        html += `<div class="qd-head"><i style="background:${DAY_COLOR[d]}"></i>D${d}</div>`;
    });
    SLOTS.forEach(sl => {
        html += `<div class="qd-lab">${sl.label}</div>`;
        DAYS.forEach(d => {
            if (isDisabled(d, sl.key)) { html += `<div class="qd-cell disabled">—</div>`; return; }
            const key = cellKey(d, sl.key);
            const n = (plan[key] || []).length;
            html += `<div class="qd-cell" data-cell="${key}">${n ? n : ''}</div>`;
        });
    });
    qdGrid.innerHTML = html;
    qdGrid.querySelectorAll('[data-cell]').forEach(c => c.addEventListener('click', () => {
        if (!pickId) return;
        assign(pickId, c.dataset.cell);
        closePicker();
    }));
}

function boardInView() {
    const r = boardEl.getBoundingClientRect();
    return r.top < window.innerHeight - 140 && r.bottom > 140;
}
function showQuickDrop(label) {
    document.getElementById('qd-label').textContent = label || '';
    qdEl.classList.add('show');
}
function hideQuickDrop() { qdEl.classList.remove('show'); }

function openPicker(id) {
    pickId = id;
    renderQuickDrop();
    showQuickDrop(BY_ID[id] ? BY_ID[id].name : '');
    setTimeout(() => document.addEventListener('click', outsidePicker, { once: true }), 0);
}
function closePicker() { pickId = null; hideQuickDrop(); }
function outsidePicker(e) {
    if (!pickId) return;
    if (qdEl.contains(e.target)) {
        setTimeout(() => document.addEventListener('click', outsidePicker, { once: true }), 0);
        return;
    }
    closePicker();
}

/* ── Pointer drag engine (mouse + touch) ───────────────────── */

let dragging = false;
let drag = null;
let autoScrollRAF = null;
let lastPoint = { x: 0, y: 0 };

document.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button')) return;
    const handle = e.target.closest('[data-drag-id]');
    if (!handle) return;

    drag = {
        id: handle.dataset.dragId,
        startX: e.clientX, startY: e.clientY,
        pointerId: e.pointerId,
        ghost: null, target: null,
    };
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragEnd);
});

function onDragMove(e) {
    if (!drag) return;
    lastPoint = { x: e.clientX, y: e.clientY };

    if (!dragging) {
        const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
        if (Math.hypot(dx, dy) < 7) return;
        startDrag();
    }
    e.preventDefault();
    positionGhost(e.clientX, e.clientY);
    updateDropTarget(e.clientX, e.clientY);
}

function startDrag() {
    dragging = true;
    document.body.classList.add('dragging');
    popup.remove();

    const a = BY_ID[drag.id];
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.textContent = a ? a.name : '';
    document.body.appendChild(g);
    drag.ghost = g;

    if (!boardInView()) { renderQuickDrop(); showQuickDrop(a ? a.name : ''); }
    autoScrollRAF = requestAnimationFrame(autoScrollStep);
}

function positionGhost(x, y) {
    if (drag.ghost) { drag.ghost.style.left = x + 'px'; drag.ghost.style.top = y + 'px'; }
}

function updateDropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el ? el.closest('[data-cell]') : null;
    if (cell === drag.target) return;
    if (drag.target) drag.target.classList.remove('over');
    drag.target = cell;
    if (cell) cell.classList.add('over');
}

function autoScrollStep() {
    if (!dragging) return;
    const pad = 90, speed = 16;
    if (lastPoint.y < pad) window.scrollBy(0, -speed);
    else if (lastPoint.y > window.innerHeight - pad) window.scrollBy(0, speed);

    // The board may scroll into view mid-drag — swap the helper grid out when it does.
    if (boardInView()) hideQuickDrop();
    else if (drag) { showQuickDrop(BY_ID[drag.id] ? BY_ID[drag.id].name : ''); }

    autoScrollRAF = requestAnimationFrame(autoScrollStep);
}

function onDragEnd(e) {
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragEnd);

    if (dragging) {
        const x = e.clientX, y = e.clientY;
        const el = document.elementFromPoint(x, y);
        const cell = el ? el.closest('[data-cell]') : null;

        if (cell) {
            assign(drag.id, cell.dataset.cell);
        } else if (el && el.closest('.cards-col') && cellOf(drag.id)) {
            unassign(drag.id);            // dragged back out to the library
        }
        if (drag.target) drag.target.classList.remove('over');

        if (drag.ghost) drag.ghost.remove();
        document.body.classList.remove('dragging');
        cancelAnimationFrame(autoScrollRAF);
        hideQuickDrop();
        dragging = false;
    }
    drag = null;
}

/* ── Actions ───────────────────────────────────────────────── */

document.getElementById('search').addEventListener('input', e => {
    query = e.target.value;
    renderCards(); syncMap();
});

document.getElementById('btn-print').addEventListener('click', () => window.print());

function flash(btn, msg) {
    const original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = msg;
    setTimeout(() => btn.textContent = original, 1800);
}

document.getElementById('btn-share').addEventListener('click', async () => {
    const btn = document.getElementById('btn-share');
    const enc = encodePlan(plan);
    if (!enc) { flash(btn, 'Nothing planned yet'); return; }
    const url = location.origin + location.pathname + '#plan=' + encodeURIComponent(enc);
    try {
        await navigator.clipboard.writeText(url);
        flash(btn, 'Link copied');
    } catch (e) {
        window.prompt('Copy this link:', url);
    }
});

document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, saved: new Date().toISOString(), plan }, null, 2)],
        { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yellowstone-plan.json';
    a.click();
    URL.revokeObjectURL(a.href);
});

const fileInput = document.getElementById('file-import');
document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const data = JSON.parse(r.result);
            plan = adopt(data.plan || data);
            savePlan(); renderAll();
            flash(document.getElementById('btn-import'), 'Restored');
        } catch (e) {
            alert("That file doesn't look like a saved Yellowstone plan.");
        }
        fileInput.value = '';
    };
    r.readAsText(f);
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('Clear the whole schedule?')) return;
    Object.keys(plan).forEach(k => plan[k] = []);
    savePlan(); renderAll();
});

document.getElementById('btn-copy').addEventListener('click', async () => {
    const lines = ['Yellowstone — 3½ day plan', ''];
    DAYS.forEach(d => {
        lines.push(`${DAY_META[d].label} (${DAY_META[d].sub})`);
        SLOTS.forEach(sl => {
            if (isDisabled(d, sl.key)) return;
            const items = plan[cellKey(d, sl.key)] || [];
            if (!items.length) return;
            lines.push(`  ${sl.label}:`);
            items.forEach(id => {
                const a = BY_ID[id];
                if (a) lines.push(`    · ${a.name} — ${a.time}${a.res === 'req' ? ' (reservation required)' : ''}`);
            });
        });
        lines.push('');
    });
    const text = lines.join('\n');
    const btn = document.getElementById('btn-copy');
    try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
    } catch (err) {
        window.prompt('Copy your plan:', text);
        btn.textContent = 'Copy as text';
        return;
    }
    setTimeout(() => btn.textContent = 'Copy as text', 1600);
});

window.addEventListener('resize', () => { if (mapReady) map.resize(); });

/* ── Boot ──────────────────────────────────────────────────── */

function renderAll() {
    renderCards();
    renderBoard();
    renderStats();
    renderQuickDrop();
    syncMap();
}

renderChips();
renderAll();
