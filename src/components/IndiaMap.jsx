/**
 * Berg+Schmidt India — Locations map
 * Uses Google Maps embed iframe (no API key required, no tile-blocking issues)
 * Currently showing: Head Office (Pune) + Production/Warehouse (Nellore)
 * 
 * To add all locations later: replace the src URL with a Google My Maps embed URL.
 * Instructions for generating that URL are in the Company page comment below.
 */

const LOCATIONS = [
  {
    name: 'Head Office — Pune',
    type: 'hq',
    address: 'Pune, Maharashtra',
    note: 'Headquarters & inventory hub',
    color: '#004c3e',
    mapsUrl: 'https://maps.google.com/?q=Pune,Maharashtra,India',
  },
  {
    name: 'Production & Warehouse — Nellore',
    type: 'production',
    address: 'Nellore, Andhra Pradesh',
    note: 'South India dispatch facility',
    color: '#c0404a',
    mapsUrl: 'https://maps.google.com/?q=Nellore,Andhra+Pradesh,India',
  },
];

const LEGEND = [
  { color: '#004c3e', label: 'Head Office' },
  { color: '#c0404a', label: 'Production / Warehouse' },
  { color: '#f59e0b', label: 'Partner / Distributor' },
  { color: '#4cb496', label: 'Agent (BDE)' },
];

// Google Maps embed — shows both Pune and Nellore with a zoom level that fits both.
// No API key required. Replace with a Google My Maps embed URL when ready.
const MAPS_EMBED_SRC =
  'https://maps.google.com/maps?q=India&t=m&z=5&ie=UTF8&output=embed';

export default function IndiaMap() {
  return (
    <div style={{ position: 'relative', width: '100%', fontFamily: 'Inter, sans-serif' }}>

      {/* Google Maps iframe */}
      <div style={{ position: 'relative', width: '100%', height: '460px',
        borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <iframe
          title="Berg+Schmidt India Locations"
          src={MAPS_EMBED_SRC}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {/* Pin overlays — positioned absolutely over the map */}
        {/* Pune: roughly 45% from left, 58% from top at India zoom 5 */}
        <div style={pinStyle(44, 57, '#004c3e')} title="Head Office — Pune">
          <span style={pinDot('#004c3e')}>HQ</span>
          <div style={pinLabel}>Pune</div>
        </div>
        {/* Nellore: roughly 52% from left, 72% from top */}
        <div style={pinStyle(52, 71, '#c0404a')} title="Production — Nellore">
          <span style={pinDot('#c0404a')}>⚙</span>
          <div style={pinLabel}>Nellore</div>
        </div>
      </div>

      {/* Location cards below the map */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {LOCATIONS.map(loc => (
          <a
            key={loc.name}
            href={loc.mapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, minWidth: 220,
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px',
              background: '#fff',
              border: `1px solid ${loc.color}22`,
              borderLeft: `4px solid ${loc.color}`,
              borderRadius: '0 6px 6px 0',
              textDecoration: 'none',
              transition: 'box-shadow .2s',
            }}
          >
            <div style={{
              width: 10, height: 10, minWidth: 10,
              borderRadius: '50%', background: loc.color, marginTop: 4,
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#111' }}>{loc.name}</div>
              <div style={{ fontSize: '.78rem', color: '#555', marginTop: 2 }}>{loc.address}</div>
              <div style={{ fontSize: '.72rem', color: '#888', marginTop: 2 }}>{loc.note}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
        marginTop: 14, padding: '10px 14px',
        background: '#f7f9f8', borderRadius: 6,
        border: '1px solid var(--border)',
      }}>
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 12, height: 12,
              borderRadius: '50%',
              background: color,
              border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#444', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper style functions
const pinStyle = (leftPct, topPct, color) => ({
  position: 'absolute',
  left: `${leftPct}%`,
  top: `${topPct}%`,
  transform: 'translate(-50%, -50%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  pointerEvents: 'none', zIndex: 10,
});

const pinDot = (color) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28,
  background: color, borderRadius: '50%',
  border: '2.5px solid #fff',
  boxShadow: '0 2px 6px rgba(0,0,0,.4)',
  fontSize: 10, fontWeight: 700, color: '#fff',
});

const pinLabel = {
  marginTop: 3,
  background: 'rgba(255,255,255,.92)',
  padding: '1px 5px',
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 600,
  color: '#222',
  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
  whiteSpace: 'nowrap',
};
