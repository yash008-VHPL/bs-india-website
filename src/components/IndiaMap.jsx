import { useEffect, useRef } from 'react';

/**
 * Interactive India presence map using Leaflet.js + OpenStreetMap tiles.
 * Location data sourced directly from company Budget decks 2026-27.
 *
 * Categories:
 *  - Head Office (Pune)
 *  - Production / Warehouse (Nellore)
 *  - Partner / Distributor locations
 *  - Agent (BDE field team) locations
 */

const LOCATIONS = [
  // HEAD OFFICE
  { name: 'Pune', role: 'Head Office', type: 'hq',
    note: 'Berg+Schmidt India HQ & inventory hub',
    lat: 18.5204, lng: 73.8567 },

  // PRODUCTION / WAREHOUSE
  { name: 'Nellore', role: 'Production & Warehouse', type: 'production',
    note: 'South India dispatch centre; warehouse facility',
    lat: 14.4426, lng: 79.9865 },

  // PARTNER / DISTRIBUTOR LOCATIONS
  { name: 'Amritsar', role: 'Distributor — Punjab', type: 'partner',
    note: 'Appointed distributor for Punjab region', lat: 31.6340, lng: 74.8723 },
  { name: 'Jaipur', role: 'Distributor — Rajasthan', type: 'partner',
    note: 'Appointed distributor for Rajasthan region', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad', role: 'Distributor — Gujarat', type: 'partner',
    note: 'Appointed distributor for Gujarat region', lat: 23.0225, lng: 72.5714 },
  { name: 'Mumbai', role: 'Distributor — Maharashtra', type: 'partner',
    note: 'Appointed distributor for Maharashtra region', lat: 19.0760, lng: 72.8777 },

  // AGENT / BDE LOCATIONS — North Zone
  { name: 'Chandigarh', role: 'Agent — North Zone', type: 'agent', lat: 30.7333, lng: 76.7794 },
  { name: 'Karnal', role: 'Agent — North Zone', type: 'agent', lat: 29.6857, lng: 76.9905 },
  { name: 'Moga', role: 'Agent — North Zone', type: 'agent', lat: 30.8181, lng: 75.1730 },
  { name: 'Jalandhar', role: 'Agent — North Zone', type: 'agent', lat: 31.3260, lng: 75.5762 },
  { name: 'Hissar', role: 'Agent — North Zone', type: 'agent', lat: 29.1492, lng: 75.7217 },
  { name: 'Bhatinda', role: 'Agent — North Zone', type: 'agent', lat: 30.2110, lng: 74.9455 },
  { name: 'Jammu', role: 'Agent — North Zone', type: 'agent', lat: 32.7266, lng: 74.8570 },

  // AGENT / BDE LOCATIONS — West-Central Zone
  { name: 'Jodhpur', role: 'Agent — West-Central Zone', type: 'agent', lat: 26.2389, lng: 73.0243 },
  { name: 'Indore', role: 'Agent — West-Central Zone', type: 'agent', lat: 22.7196, lng: 75.8577 },
  { name: 'Nagaur', role: 'Agent — West-Central Zone', type: 'agent', lat: 27.2027, lng: 73.7289 },
  { name: 'Mehsana', role: 'Agent — West-Central Zone', type: 'agent', lat: 23.5880, lng: 72.3693 },
  { name: 'Jabalpur', role: 'Agent — West-Central Zone', type: 'agent', lat: 23.1815, lng: 79.9864 },

  // AGENT / BDE LOCATIONS — West Zone
  { name: 'Kolhapur', role: 'Agent — West Zone', type: 'agent', lat: 16.7050, lng: 74.2433 },
  { name: 'Ahmednagar', role: 'Agent — West Zone', type: 'agent', lat: 19.0952, lng: 74.7496 },
  { name: 'Sangamner', role: 'Agent — West Zone', type: 'agent', lat: 19.5728, lng: 74.2095 },
  { name: 'Baramati', role: 'Agent — West Zone', type: 'agent', lat: 18.1518, lng: 74.5773 },
  { name: 'Solapur', role: 'Agent — West Zone', type: 'agent', lat: 17.6599, lng: 75.9064 },
];

const STYLE = {
  hq:         { color: '#004c3e', label: '★', radius: 14, zIndex: 1000 },
  production: { color: '#c0404a', label: '⚙', radius: 12, zIndex: 900  },
  partner:    { color: '#f59e0b', label: '◆', radius: 10, zIndex: 800  },
  agent:      { color: '#4cb496', label: '●', radius: 8,  zIndex: 700  },
};

const LEGEND = [
  { type: 'hq',         label: 'Head Office' },
  { type: 'production', label: 'Production / Warehouse' },
  { type: 'partner',    label: 'Partner / Distributor' },
  { type: 'agent',      label: 'Agent (BDE)' },
];

export default function IndiaMap() {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (instanceRef.current || !mapRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS then initialise map
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      if (instanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [22.5, 78.5],
        zoom: 5,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      instanceRef.current = map;

      // OpenStreetMap tiles — reputable, open, no API key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add markers
      LOCATIONS.forEach(loc => {
        const s = STYLE[loc.type];
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${s.radius * 2}px; height:${s.radius * 2}px;
            background:${s.color}; border-radius:50%;
            border:2.5px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,.35);
            display:flex; align-items:center; justify-content:center;
            font-size:${s.radius * 0.85}px; color:#fff; font-weight:700;
            cursor:pointer;
          ">${s.label}</div>`,
          iconSize: [s.radius * 2, s.radius * 2],
          iconAnchor: [s.radius, s.radius],
          popupAnchor: [0, -s.radius - 4],
        });

        L.marker([loc.lat, loc.lng], { icon, zIndexOffset: s.zIndex })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px;">
              <div style="font-weight:700;font-size:14px;color:#004c3e;margin-bottom:4px;">${loc.name}</div>
              <div style="font-size:12px;font-weight:600;color:${s.color};margin-bottom:${loc.note ? '4px' : '0'}">${loc.role}</div>
              ${loc.note ? `<div style="font-size:11px;color:#555;">${loc.note}</div>` : ''}
            </div>
          `, { maxWidth: 220 });
      });
    };
    document.head.appendChild(script);

    return () => { /* map cleaned up if component unmounts */ };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '480px', borderRadius: '8px',
          border: '1px solid var(--border)', overflow: 'hidden' }}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 12, zIndex: 1000,
        background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(4px)',
        borderRadius: '6px', padding: '10px 14px',
        boxShadow: '0 2px 10px rgba(0,0,0,.15)',
        border: '1px solid rgba(0,0,0,.08)',
      }}>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{
              width: STYLE[type].radius * 2, height: STYLE[type].radius * 2,
              background: STYLE[type].color, borderRadius: '50%',
              border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', fontWeight: 500, color: '#333' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
