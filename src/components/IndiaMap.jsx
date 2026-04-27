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

const LEGEND = [
  { color: '#004c3e', label: 'Head Office' },
  { color: '#c0404a', label: 'Production / Warehouse' },
  { color: '#f59e0b', label: 'Partner / Distributor' },
  { color: '#4cb496', label: 'Agent (BDE)' },
];

const MAPS_EMBED_SRC =
  'https://www.google.com/maps/d/embed?mid=12GPpbIxdSWP-Mnty621NXPZJQkOpU4g';

export default function IndiaMap() {
  return (
    <div className="india-map-wrap">
      <iframe
        title="Berg+Schmidt India Locations"
        src={MAPS_EMBED_SRC}
        className="india-map-iframe"
        allowFullScreen={false}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

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

      <div className="india-map-legend">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="india-map-legend-item">
            <div className="india-map-legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
