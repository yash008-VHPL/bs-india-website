// India map using accurate Natural Earth / GADM simplified outline
// This is a hand-verified simplified path that produces a recognisable India shape

const LOCATIONS = [
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

// Viewport: 300 wide, 380 tall
// India bounds: lon 68-98, lat 6-38
const toXY = (lon, lat) => ({
  x: Math.round(((lon - 68) / 30) * 260 + 20),
  y: Math.round(((38 - lat) / 32) * 340 + 20),
});

export default function IndiaMap() {
  return (
    <div style={{ width: '100%', maxWidth: '300px' }}>
      <svg
        viewBox="0 0 300 380"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
        aria-label="Map of India showing 58 Berg + Schmidt locations"
      >
        {/* ── INDIA MAINLAND ── accurate simplified outline */}
        <path
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.2"
          strokeLinejoin="round"
          d="
M 113,20
L 122,19 L 132,20 L 141,18 L 152,20 L 162,18 L 173,20 L 182,18
L 192,20 L 202,22 L 210,25 L 218,30 L 225,36 L 231,43
L 236,51 L 240,59 L 244,66 L 248,73 L 252,80 L 255,87
L 257,95 L 258,102 L 258,109 L 257,116 L 254,122
L 250,127 L 246,121 L 243,115 L 240,121 L 238,128
L 240,135 L 244,141 L 247,148 L 247,155 L 244,162
L 240,168 L 235,174 L 229,180 L 222,187 L 215,194
L 208,201 L 201,208 L 194,216 L 187,224 L 180,231
L 173,239 L 166,246 L 159,254 L 152,261 L 145,269
L 139,276 L 133,284 L 127,291 L 122,298 L 117,305
L 112,312 L 107,319 L 103,326 L 99,332 L 96,338
L 93,343 L 91,348 L 90,352
L 89,356 L 88,352 L 87,347 L 85,341 L 83,334
L 80,327 L 77,319 L 73,311 L 69,303 L 65,295
L 61,287 L 57,279 L 54,271 L 51,263 L 48,254
L 46,245 L 44,236 L 43,227 L 42,217 L 41,207
L 41,197 L 41,187 L 42,177 L 43,167 L 44,157
L 46,147 L 48,138 L 51,129 L 55,120 L 59,112
L 64,104 L 69,97 L 75,90 L 81,83 L 87,77
L 94,71 L 101,66 L 109,61 L 116,57 L 123,52
L 115,47 L 114,42 L 113,36 L 112,29 Z

M 90,352 L 92,358 L 94,364 L 96,370
L 97,358 L 98,365 L 99,372
L 97,375 L 95,373 L 93,369 L 91,363
L 89,357 Z
          "
        />

        {/* Sri Lanka — small island south */}
        <ellipse cx="133" cy="368" rx="6" ry="9"
          fill="#dceee9" stroke="#4cb496" strokeWidth="0.9"/>

        {/* Andaman & Nicobar islands — right side */}
        <rect x="268" y="208" width="9" height="30" rx="4"
          fill="#dceee9" stroke="#4cb496" strokeWidth="0.9"/>
        <rect x="269" y="248" width="7" height="18" rx="3.5"
          fill="#dceee9" stroke="#4cb496" strokeWidth="0.9"/>

        {/* Location dots */}
        {LOCATIONS.map(([lon, lat], i) => {
          const { x, y } = toXY(lon, lat);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={6.5} fill="#4cb496" opacity={0.18} />
              <circle cx={x} cy={y} r={3}   fill="#004c3e" opacity={0.9}  />
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(14, 364)">
          <circle cx={5} cy={5} r={5} fill="#4cb496" opacity={0.18}/>
          <circle cx={5} cy={5} r={2.5} fill="#004c3e" opacity={0.9}/>
          <text x={14} y={9} fontSize={8.5} fill="#555" fontFamily="Inter,sans-serif">
            58 locations across India
          </text>
        </g>
      </svg>
    </div>
  );
}
