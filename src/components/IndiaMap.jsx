import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import map from './indiaMapData.json';
import './IndiaMap.css';

/* Segment key used by /contact to pre-fill the enquiry form. */
const SEGMENT_BY_KIND = {
  company: 'company',
  dairy: 'dairy',
  poultry: 'poultry',
  commodity: 'commodity',
};

/* Theme colours (mirrors CSS custom properties) */
const C_COMPANY = '#004c3e';  // --green-dark
const C_DAIRY = '#4cb496';    // --green
const C_POULTRY = '#c0404a';  // --accent-red
const C_COMMODITY = '#c8841a';// amber — Commodity Business Division

/* Final on-map marker positions. A few coincident / clustered cities are
   nudged a couple of px so every pin stays legible; the number keys the
   legend below. [x, y] are in the SVG's projected coordinate space. */
const POS = {
  'c:Head Office': [131, 349],
  'c:Shivane (Pune)': [124, 360],
  'c:Nagpur': [215, 304],
  'c:Kolhapur': [137, 380],
  'c:Kolkata (W. outskirts)': [354, 272],
  'c:Badlapur': [118, 330],
  'd:Ludhiana': [156, 130],
  'd:Jaipur': [162, 206],
  'd:Ahmedabad': [111, 272],
  'd:Indore': [163, 277],
  'd:Kolhapur': [148, 386],
  'p:Namakkal': [200, 475],
  'p:Bengaluru': [191, 444],
  'p:Hyderabad': [205, 369],
  'p:Anaparthy': [261, 376],
  'p:Ludhiana': [170, 130],
  'p:Pune': [141, 357],
  'p:Bhubaneswar': [322, 319],
  'p:Kolkata': [369, 285],
  'p:Kathmandu (Nepal)': [314, 192],
};

/* Build an ordered, numbered marker list from the data file.
   Position lookups are guarded: an unmatched key is skipped (with a warning)
   rather than crashing the page on destructure. */
function buildMarkers() {
  const out = [];
  let n = 0;
  const add = (key, props) => {
    const p = POS[key];
    if (!p) {
      if (typeof console !== 'undefined') console.warn('IndiaMap: no position for', key);
      return;
    }
    n += 1;
    out.push({ n, x: p[0], y: p[1], ...props });
  };
  map.company.forEach(([role, city]) => {
    const key = 'c:' + (role === 'Head Office' ? 'Head Office' : city);
    add(key, { color: C_COMPANY, kind: 'company', city, detail: role });
  });
  map.dairy.forEach(([name, city, cover]) => {
    add('d:' + city, { color: C_DAIRY, kind: 'dairy', city, detail: name, cover });
  });
  map.poultry.forEach(([name, city, cover]) => {
    const proposed = name.toLowerCase().includes('proposed');
    add('p:' + city, { color: C_POULTRY, kind: 'poultry', city, detail: name, cover, proposed });
  });
  // Commodity reps carry explicit [x, y] (cities repeat, so positions are inline)
  (map.commodity || []).forEach(([name, city, cover, x, y]) => {
    n += 1;
    out.push({ n, x, y, color: C_COMMODITY, kind: 'commodity', city, detail: name, cover });
  });
  return out;
}

const MARKERS = buildMarkers();

function Marker({ m, active, setActive }) {
  const on = active === m.n;
  const r = on ? 8.5 : 6.2;
  return (
    <g
      className="im-marker"
      onMouseEnter={() => setActive(m.n)}
      onMouseLeave={() => setActive(null)}
      onClick={() => setActive(on ? null : m.n)}
    >
      {on && <circle cx={m.x} cy={m.y} r={r + 3} className="im-halo" />}
      <circle
        cx={m.x}
        cy={m.y}
        r={r}
        fill={m.proposed ? '#ffffff' : m.color}
        stroke={m.proposed ? m.color : '#ffffff'}
        strokeWidth={m.proposed ? 1.4 : 1.2}
        strokeDasharray={m.proposed ? '2.4 1.6' : undefined}
      />
      <text
        x={m.x}
        y={m.y}
        className="im-num"
        fill={m.proposed ? m.color : '#ffffff'}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {m.n}
      </text>
    </g>
  );
}

function LegendBlock({ title, color, items, active, setActive, onEnquire }) {
  return (
    <div className="im-leg-block">
      <div className="im-leg-head">
        <span className="im-leg-swatch" style={{ background: color }} />
        {title}
      </div>
      <ul className="im-leg-list">
        {items.map((m) => (
          <li
            key={m.n}
            className={'im-leg-row' + (active === m.n ? ' is-active' : '')}
            role="button"
            tabIndex={0}
            title={`Enquire about ${m.city}`}
            onMouseEnter={() => setActive(m.n)}
            onMouseLeave={() => setActive(null)}
            onClick={() => onEnquire(m)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEnquire(m); } }}
          >
            <span
              className="im-leg-badge"
              style={m.proposed
                ? { background: '#fff', color: m.color, border: `1.5px dashed ${m.color}` }
                : { background: m.color, color: '#fff' }}
            >
              <span>{m.n}</span>
            </span>
            <span className="im-leg-txt">
              <strong>{m.city}</strong>
              {m.kind === 'company' ? (
                <em>{m.detail}</em>
              ) : m.proposed ? (
                <em>Coming soon{m.cover ? ` · ${m.cover}` : ''}</em>
              ) : (
                <em>{m.detail}{m.cover ? ` · ${m.cover}` : ''}</em>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IndiaMap() {
  const [active, setActive] = useState(null);
  const navigate = useNavigate();
  const company = MARKERS.filter((m) => m.kind === 'company');
  const dairy = MARKERS.filter((m) => m.kind === 'dairy');
  const poultry = MARKERS.filter((m) => m.kind === 'poultry');
  const commodity = MARKERS.filter((m) => m.kind === 'commodity');

  const handleEnquire = (m) => {
    const params = new URLSearchParams();
    params.set('segment', SEGMENT_BY_KIND[m.kind] || 'general');
    if (m.city) params.set('city', m.city);
    if (m.detail) params.set('detail', m.detail);
    navigate(`/contact?${params.toString()}#contact-form`);
  };

  return (
    <div className="india-map-wrap">
      <svg
        className="india-map-svg"
        viewBox={map.viewBox}
        role="img"
        aria-label="Berg+Schmidt India — locations and distribution network"
      >
        {/* Neighbouring countries — faint context outlines */}
        <g className="im-neighbors">
          {Object.values(map.neighbors).flat().map((d, i) => (
            <path key={'n' + i} d={d} />
          ))}
        </g>
        {/* India — state boundaries */}
        <g className="im-states">
          {map.states.map((d, i) => (
            <path key={'s' + i} d={d} />
          ))}
        </g>
        {/* India — national outline */}
        <g className="im-outline">
          {map.outline.map((d, i) => (
            <path key={'o' + i} d={d} />
          ))}
        </g>
        {/* Markers */}
        <g>
          {MARKERS.map((m) => (
            <Marker key={m.n} m={m} active={active} setActive={setActive} />
          ))}
        </g>
      </svg>

      <div className="india-map-legend">
        <LegendBlock title="Hightech Energy Feeds Locations" color={C_COMPANY} items={company} active={active} setActive={setActive} onEnquire={handleEnquire} />
        <LegendBlock title="Dairy Feed Supplement Representatives" color={C_DAIRY} items={dairy} active={active} setActive={setActive} onEnquire={handleEnquire} />
        <LegendBlock title="Poultry Feed Supplement Representatives" color={C_POULTRY} items={poultry} active={active} setActive={setActive} onEnquire={handleEnquire} />
        <LegendBlock title="Commodity Business Division Representatives" color={C_COMMODITY} items={commodity} active={active} setActive={setActive} onEnquire={handleEnquire} />
      </div>
    </div>
  );
}
