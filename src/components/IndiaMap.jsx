import './IndiaMap.css';

const MAPS_EMBED_SRC =
  'https://www.google.com/maps/d/embed?mid=12GPpbIxdSWP-Mnty621NXPZJQkOpU4g';

const HEADER_H = 60; // px height of Google My Maps profile bar to hide

const LEGEND = [
  {
    color: '#1e7e34',
    label: 'Head Office',
    icon: 'star',
  },
  {
    color: '#8B2222',
    label: 'Production / Warehouse',
    icon: 'pin',
  },
];

function StarIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
        stroke="#fff"
        strokeWidth="1"
      />
    </svg>
  );
}

function PinIcon({ color }) {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" style={{ flexShrink: 0 }}>
      <path
        d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z"
        fill={color}
        stroke="#fff"
        strokeWidth="1"
      />
      <circle cx="7" cy="7" r="2.5" fill="#fff" />
    </svg>
  );
}

export default function IndiaMap() {
  return (
    <div className="india-map-wrap">

      {/* Map — clips the Google My Maps profile bar (photo + name) */}
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

      {/* Legend — sits below the map, clean and readable */}
      <div className="india-map-legend">
        <span className="india-map-legend-title">Map key</span>
        {LEGEND.map(({ color, label, icon }) => (
          <div key={label} className="india-map-legend-item">
            {icon === 'star'
              ? <StarIcon color={color} />
              : <PinIcon color={color} />
            }
            <span>{label}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
