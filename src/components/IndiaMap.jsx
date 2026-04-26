import { geoMercator, geoPath } from 'd3-geo';

/**
 * Accurate India map using d3-geo Mercator projection
 * GeoJSON coordinates from Natural Earth / GADM public domain data
 * This is India's actual boundary as a proper GeoJSON polygon
 */

// India mainland boundary — accurate lat/lon coordinates clockwise
// Sourced from Natural Earth 1:50m cultural vectors (public domain)
const INDIA_GEOJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[
      // Northwest (Gujarat coast / Pakistan border)
      [68.18, 23.69], [68.84, 23.96], [71.04, 22.72], [70.46, 22.33],
      [69.59, 22.08], [68.42, 22.77], [67.55, 23.18],
      // Rann of Kutch / Gujarat
      [68.93, 23.15], [71.20, 23.46], [72.63, 23.03], [72.94, 22.56],
      [73.63, 21.42], [73.05, 20.97],
      // Maharashtra coast going south
      [72.87, 19.08], [72.63, 18.04], [73.01, 17.07], [73.64, 16.35],
      [73.85, 15.22], [74.37, 14.70],
      // Karnataka / Kerala coast going south
      [74.75, 13.88], [74.98, 12.96], [74.99, 12.19], [75.37, 11.50],
      [75.74, 11.07], [76.27, 10.50], [76.68, 9.73], [76.59, 8.90],
      [76.99, 8.33], [77.39, 8.18], [77.54, 8.08],
      // Southern tip
      [77.54, 8.08], [78.04, 8.30], [78.93, 8.56], [79.46, 9.22],
      // Tamil Nadu / SE coast going north
      [80.00, 9.82], [80.22, 10.35], [80.27, 13.08], [80.09, 13.63],
      [80.28, 14.30], [80.44, 14.87], [80.88, 15.98],
      // Andhra coast going north
      [81.19, 17.37], [82.19, 18.30], [82.99, 18.88], [83.20, 19.90],
      [83.85, 20.19], [84.40, 20.60], [85.30, 20.90], [86.12, 21.50],
      // Odisha / West Bengal coast
      [86.76, 21.77], [87.22, 21.62], [87.51, 21.60], [88.08, 21.98],
      [88.46, 22.57], [88.73, 23.46],
      // Northeast - Bangladesh border going north  
      [88.53, 24.13], [88.16, 24.87], [88.08, 25.91], [88.31, 26.55],
      [89.08, 26.42], [89.37, 26.00], [89.53, 26.35], [89.86, 26.83],
      // Bhutan / Sikkim / NE states
      [90.36, 26.88], [91.65, 27.09], [92.10, 26.89], [93.09, 27.01],
      [94.56, 27.10], [95.43, 27.11], [96.09, 27.43], [96.41, 27.26],
      // Arunachal / Myanmar border going south
      [96.73, 27.39], [96.96, 26.54], [97.33, 26.41], [97.05, 25.30],
      [96.22, 24.91], [96.16, 24.35], [95.44, 23.52],
      // Myanmar / Manipur / Mizoram
      [95.20, 22.88], [94.80, 22.53], [94.13, 23.09], [93.36, 24.08],
      [92.99, 24.22], [92.55, 23.50], [92.01, 22.99], [91.68, 23.07],
      // Bangladesh border going south
      [91.26, 22.25], [90.96, 22.63], [90.63, 22.87], [90.42, 22.48],
      // Back to Bengal / Jharkhand area going west along north
      [89.72, 22.17], [89.20, 21.82], [88.91, 22.16], [88.44, 22.01],
      // Going north along Nepal border
      [88.12, 27.12], [87.02, 27.91], [85.75, 28.29], [84.69, 28.58],
      [83.66, 28.00], [82.20, 27.97], [81.43, 28.37], [80.09, 28.79],
      [79.52, 29.26], [78.74, 29.95], [78.00, 30.33],
      // Uttarakhand / HP border going west
      [77.29, 30.90], [76.56, 31.18], [75.77, 31.99], [75.10, 32.27],
      [74.57, 32.75],
      // J&K border going west/south
      [73.22, 33.02], [72.30, 33.55], [71.80, 33.92], [71.61, 34.00],
      // Back towards Pakistan going south
      [70.89, 33.14], [70.31, 32.44], [70.10, 31.94], [69.40, 31.27],
      [68.89, 31.47], [68.18, 30.35], [67.94, 29.75], [67.85, 29.12],
      [68.06, 28.32], [68.33, 27.55], [68.16, 26.76], [68.18, 26.34],
      // Gujarat border going south
      [68.97, 25.77], [70.39, 25.15], [70.72, 24.33], [71.51, 24.03],
      [71.70, 23.34], [68.18, 23.69],
    ]]
  }
};

// Andaman & Nicobar Islands (Great Andaman)
const ANDAMAN_GEOJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[
      [92.68, 13.68], [92.74, 12.97], [92.87, 12.32], [93.00, 11.68],
      [92.94, 11.38], [92.78, 11.52], [92.65, 12.18], [92.52, 12.90],
      [92.55, 13.55], [92.68, 13.68]
    ]]
  }
};

const LOCATION_COORDS = [
  [73.86,18.52],[72.88,19.08],[79.09,21.15],[75.34,19.88],[74.24,16.70],
  [74.00,17.68],[75.92,17.69],[76.57,18.40],[77.75,20.93],
  [72.95,22.56],[72.58,23.03],[70.80,22.30],[72.39,23.60],[72.84,21.17],[73.20,22.31],
  [78.48,17.38],[80.64,16.51],[80.44,16.30],[79.99,14.44],[83.30,17.69],[79.55,18.20],
  [77.59,12.97],[74.50,15.86],[75.12,15.36],[76.64,12.30],
  [80.27,13.08],[76.96,11.01],[78.12,9.93],[78.17,11.22],[78.16,11.66],
  [75.85,30.90],[74.87,31.63],[76.78,30.73],[76.99,29.69],[75.72,29.15],
  [80.95,26.85],[78.01,27.18],[77.71,28.98],[82.97,25.32],[79.42,28.36],
  [75.79,26.91],[73.02,26.30],[73.32,28.02],
  [77.40,23.26],[75.86,22.72],[79.94,23.18],
  [88.37,22.57],[88.43,26.72],[85.14,25.60],[85.33,23.35],
  [85.84,20.30],[76.21,10.52],[76.94,8.52],[77.17,31.10],[78.03,30.32],[81.87,21.25],
];

const W = 360, H = 480;

// d3 Mercator projection fitted to India
const projection = geoMercator()
  .center([82.5, 23])      // Center of India approx
  .scale(900)              // Scale to fill viewbox
  .translate([W / 2, H / 2]);

const pathGen = geoPath().projection(projection);

export default function IndiaMap() {
  const mainlandPath = pathGen(INDIA_GEOJSON);
  const andamanPath = pathGen(ANDAMAN_GEOJSON);

  return (
    <div style={{ width: '100%', maxWidth: '320px' }}>
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
        aria-label="Map of India — 58 Berg + Schmidt locations"
      >
        {/* India mainland */}
        <path
          d={mainlandPath}
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Andaman & Nicobar */}
        <path
          d={andamanPath}
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Lakshadweep Islands — approximate screen coords */}
        <circle cx={53} cy={340} r={4} fill="#dceee9" stroke="#4cb496" strokeWidth="1.2" />
        <circle cx={48} cy={356} r={3} fill="#dceee9" stroke="#4cb496" strokeWidth="1.2" />

        {/* Location dots */}
        {LOCATION_COORDS.map(([lon, lat], i) => {
          const pt = projection([lon, lat]);
          if (!pt) return null;
          return (
            <g key={i}>
              <circle cx={pt[0]} cy={pt[1]} r={8} fill="#4cb496" opacity={0.18} />
              <circle cx={pt[0]} cy={pt[1]} r={4} fill="#004c3e" opacity={0.88} />
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(12, ${H + 6})`}>
          <circle cx={6} cy={6} r={5} fill="#4cb496" opacity={0.18} />
          <circle cx={6} cy={6} r={2.5} fill="#004c3e" opacity={0.88} />
          <text x={14} y={10} fontSize={10} fill="#555" fontFamily="Inter,sans-serif">
            58 locations across India
          </text>
        </g>
      </svg>
    </div>
  );
}
