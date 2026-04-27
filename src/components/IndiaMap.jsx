import './IndiaMap.css';

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

// Legend colours match actual Google My Maps pin colours:
// HQ = green star, Production = dark red pin
const LEGEND = [
  { color: '#004c3e', label: 'Head Office', shape: 'star' },
  { color: '#8B2222', label: 'Production / Warehouse', shape: 'circle' },
  { color: '#f59e0b', label: 'Partner / Distributor', shape: 'circle' },
  { color: '#4cb496', label: 'Agent (BDE)', shape: 'circle' },
];

const MAPS_EMBED_SRC =
  'https://www.google.com/maps/d/embed?mid=12GPpbIxdSWP-Mnty621NXPZJQkOpU4g';

// Height of the Google My Maps header bar (profile picture + title)
const HEADER_H = 60;

export default function IndiaMap() {
  return (
    <div className="india-map-wrap">

      {/* Clip the profile picture header out of view */}
      <div className="india-map-clip">
        <iframe
          title="Berg+Schmidt India Locations"
          src={MAPS_EMBED_SRC}
          className="india-map-iframe"
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ marginTop: `-${HEADER_H}px` }}
        />
      </div>

      {/* Location cards */}
      <div className="india-map-cards">
        {LOCATIONS.map(loc => (
          <a key={loc.name} href={loc.mapsUrl} target="_blank" rel="noreferrer"
            className="india-map-card" style={{ borderLeftColor: loc.color }}>
            <div className="india-map-card-dot" style={{ background: loc.color }} />
            <div>
              <div className="india-map-card-name">{loc.name}</div>
              <div className="india-map-card-addr">{loc.address}</div>
              <div className="india-map-card-note">{loc.note}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Legend — all same size, correctly colour-coded to match map */}
      <div className="india-map-legend">
        {LEGEND.map(({ color, label, shape }) => (
          <div key={label} className="india-map-legend-item">
            {shape === 'star'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              : <div className="india-map-legend-dot" style={{ background: color }} />
            }
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
