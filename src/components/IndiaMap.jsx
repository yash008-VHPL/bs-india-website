import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

// World atlas topojson — filtered to India (feature code 356)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// 58 representative locations across India's key livestock states
const LOCATIONS = [
  // Maharashtra
  [73.86,18.52],[72.88,19.08],[79.09,21.15],[75.34,19.88],[73.79,19.99],[74.24,16.70],
  // Gujarat
  [72.58,23.03],[70.80,22.30],[72.39,23.60],[72.84,21.17],
  // Andhra Pradesh / Telangana
  [78.48,17.38],[80.64,16.51],[80.44,16.30],[79.99,14.44],[83.30,17.69],
  // Karnataka
  [77.59,12.97],[74.50,15.86],[75.12,15.36],[76.64,12.30],
  // Tamil Nadu
  [80.27,13.08],[76.96,11.01],[78.12,9.93],[78.17,11.22],
  // Kerala
  [76.21,10.52],[76.94,8.52],[75.78,11.26],
  // Punjab
  [75.85,30.90],[74.87,31.63],[76.78,30.73],
  // Haryana
  [76.99,29.69],[75.72,29.15],[77.02,28.46],
  // Uttar Pradesh
  [80.95,26.85],[78.01,27.18],[77.71,28.98],[82.97,25.32],[79.42,28.36],
  // Rajasthan
  [75.79,26.91],[73.02,26.30],[73.32,28.02],
  // Madhya Pradesh
  [77.40,23.26],[75.86,22.72],[79.94,23.18],
  // West Bengal
  [88.37,22.57],[88.43,26.72],
  // Bihar
  [85.14,25.60],[85.40,26.12],
  // Odisha
  [85.84,20.30],[84.79,20.95],
  // Himachal Pradesh
  [77.17,31.10],[76.52,32.10],
  // Uttarakhand
  [78.03,30.32],
  // Jharkhand
  [85.33,23.35],
  // Chhattisgarh
  [81.87,21.25],
  // Assam
  [91.74,26.14],
  // Pune (HQ)
  [73.86,18.52],
];

export default function IndiaMap() {
  return (
    <div style={{ width: '100%', maxWidth: '380px', background: 'transparent' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [82, 23],
          scale: 900,
        }}
        width={380}
        height={440}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter(geo => geo.id === '356') // India only
              .map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#d4ede6"
                  stroke="#4cb496"
                  strokeWidth={1.2}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#c0e4d8', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
          }
        </Geographies>

        {LOCATIONS.map(([lng, lat], i) => (
          <Marker key={i} coordinates={[lng, lat]}>
            <circle r={3.5} fill="#004c3e" opacity={0.82} />
            <circle r={6} fill="#4cb496" opacity={0.15} />
          </Marker>
        ))}
      </ComposableMap>

      <p style={{
        textAlign: 'center',
        fontSize: '0.72rem',
        color: '#5a7a72',
        marginTop: '6px',
        fontFamily: 'Inter,sans-serif',
      }}>
        58 locations across India
      </p>
    </div>
  );
}
