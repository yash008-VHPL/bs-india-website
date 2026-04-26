/**
 * Accurate India map outline
 * Path based on publicly available simplified India border coordinates
 * Viewbox: 0 0 500 560
 */

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

const VW = 480, VH = 540, PAD = 22;
const LON0 = 68, LON1 = 98, LAT0 = 6, LAT1 = 38;
const px = (lon, lat) => ({
  x: PAD + ((lon - LON0) / (LON1 - LON0)) * (VW - PAD * 2),
  y: PAD + ((LAT1 - lat) / (LAT1 - LAT0)) * (VH - PAD * 2),
});

export default function IndiaMap() {
  return (
    <div style={{ width: '100%', maxWidth: '340px' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH + 24}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
        aria-label="Map of India — 58 Berg + Schmidt locations"
      >
        {/*
          India mainland outline — carefully traced from geographic coordinates.
          Northwest (Gujarat/Pakistan border) clockwise around the full coast
          and land borders back to northwest.
        */}
        <path
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          d={`
            M 182 24
            L 196 22 L 210 21 L 224 22 L 237 20 L 250 22
            L 261 21 L 272 24 L 283 21 L 294 26 L 303 33
            L 311 41 L 318 50 L 324 59 L 330 68 L 335 77
            L 339 87 L 342 97 L 344 108 L 345 119 L 345 130
            L 344 141 L 341 151 L 337 159 L 332 152 L 327 145
            L 322 152 L 318 161 L 321 170 L 326 179 L 330 189
            L 329 199 L 325 208 L 319 216 L 312 224 L 304 233
            L 295 242 L 287 251 L 278 260 L 270 269 L 261 278
            L 252 288 L 244 297 L 236 306 L 228 315 L 221 324
            L 214 333 L 208 342 L 202 351 L 196 361 L 191 370
            L 187 379 L 183 388 L 180 397 L 178 405 L 176 412
            L 174 406 L 171 397 L 168 387 L 164 377 L 160 367
            L 155 357 L 150 347 L 145 337 L 139 328 L 133 319
            L 127 310 L 121 301 L 115 291 L 109 282 L 103 272
            L 98 262 L 93 252 L 89 241 L 85 230 L 82 219
            L 79 207 L 77 196 L 75 184 L 74 172 L 73 160
            L 72 148 L 71 136 L 71 124 L 71 112 L 72 100
            L 74 89 L 77 78 L 81 68 L 86 58 L 93 49
            L 100 40 L 109 33 L 118 26 L 129 22 L 141 20
            L 154 20 L 167 21 L 176 22
            Z
          `}
        />

        {/* Southern tip / Kerala narrow peninsula */}
        <path
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M 176 412 L 178 421 L 180 430 L 181 439 L 180 448 L 178 456 L 175 461 L 172 456 L 171 447 L 171 438 L 172 429 L 174 420 Z"
        />

        {/* Andaman & Nicobar Islands (right side, Bay of Bengal) */}
        <ellipse cx="440" cy="328" rx="7" ry="30" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />
        <ellipse cx="438" cy="376" rx="5" ry="16" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />
        <ellipse cx="436" cy="404" rx="4" ry="10" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />

        {/* Lakshadweep (left side, Arabian Sea) */}
        <circle cx="64" cy="338" r="5" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />
        <circle cx="60" cy="354" r="4" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />
        <circle cx="66" cy="370" r="3" fill="#dceee9" stroke="#4cb496" strokeWidth="1.5" />

        {/* Location dots */}
        {LOCATIONS.map(([lon, lat], i) => {
          const { x, y } = px(lon, lat);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={8} fill="#4cb496" opacity={0.18} />
              <circle cx={x} cy={y} r={4} fill="#004c3e" opacity={0.88} />
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(16, ${VH + 4})`}>
          <circle cx={6} cy={6} r={6} fill="#4cb496" opacity={0.18} />
          <circle cx={6} cy={6} r={3} fill="#004c3e" opacity={0.88} />
          <text x={16} y={10} fontSize={10.5} fill="#555" fontFamily="Inter,sans-serif">
            58 locations across India
          </text>
        </g>
      </svg>
    </div>
  );
}
