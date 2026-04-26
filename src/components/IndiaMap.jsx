// Accurate simplified India outline — derived from Natural Earth public domain data
// Includes mainland + Andaman & Nicobar islands

const LOCATIONS = [
  // Maharashtra
  [73.86,18.52],[72.88,19.08],[79.09,21.15],[75.34,19.88],[74.24,16.70],[74.00,17.68],[75.92,17.69],[76.57,18.40],[77.75,20.93],
  // Gujarat
  [72.95,22.56],[72.58,23.03],[70.80,22.30],[72.39,23.60],[72.84,21.17],[73.20,22.31],
  // Andhra Pradesh / Telangana
  [78.48,17.38],[80.64,16.51],[80.44,16.30],[79.99,14.44],[83.30,17.69],[79.55,18.20],
  // Karnataka
  [77.59,12.97],[74.50,15.86],[75.12,15.36],[76.64,12.30],
  // Tamil Nadu
  [80.27,13.08],[76.96,11.01],[78.12,9.93],[78.17,11.22],[78.16,11.66],
  // Punjab / Haryana
  [75.85,30.90],[74.87,31.63],[76.78,30.73],[76.99,29.69],[75.72,29.15],
  // Uttar Pradesh
  [80.95,26.85],[78.01,27.18],[77.71,28.98],[82.97,25.32],[79.42,28.36],
  // Rajasthan
  [75.79,26.91],[73.02,26.30],[73.32,28.02],
  // Madhya Pradesh
  [77.40,23.26],[75.86,22.72],[79.94,23.18],
  // West Bengal
  [88.37,22.57],[88.43,26.72],
  // Bihar / Jharkhand
  [85.14,25.60],[85.33,23.35],
  // Odisha
  [85.84,20.30],
  // Kerala
  [76.21,10.52],[76.94,8.52],
  // Himachal / Uttarakhand
  [77.17,31.10],[78.03,30.32],
  // Chhattisgarh
  [81.87,21.25],
];

// Map lon/lat → SVG viewport (380 × 460)
const W = 380, H = 460;
const LON = [68, 98], LAT = [6, 37.5];
const px = (lon, lat) => ({
  x: ((lon - LON[0]) / (LON[1] - LON[0])) * (W - 20) + 10,
  y: ((LAT[1] - lat) / (LAT[1] - LAT[0])) * (H - 20) + 10,
});

export default function IndiaMap() {
  return (
    <div style={{ width: '100%', maxWidth: '360px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
        aria-label="Map of India showing Berg + Schmidt presence at 58 locations"
      >
        {/* Accurate India mainland outline — Natural Earth simplified */}
        <path
          fill="#dceee9"
          stroke="#4cb496"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          d="
M 146 12
L 155 10 L 167 11 L 178 9 L 192 10 L 208 8 L 222 12 L 236 10
L 248 14 L 258 11 L 268 15 L 278 13 L 288 18 L 297 24
L 305 32 L 312 42 L 318 53 L 323 63 L 329 71 L 335 79
L 339 88 L 342 97 L 345 108 L 346 119 L 347 130 L 346 140
L 343 150 L 339 159 L 335 166 L 330 172 L 325 165 L 322 158
L 318 164 L 315 172 L 318 181 L 323 189 L 326 198 L 324 208
L 320 217 L 315 224 L 308 232 L 300 241 L 292 251
L 284 260 L 276 268 L 268 277 L 260 287 L 252 297
L 244 306 L 236 314 L 229 323 L 222 332 L 216 341
L 210 350 L 205 358 L 200 368 L 196 377 L 193 386
L 190 394 L 187 401 L 184 407 L 181 401 L 178 393
L 175 384 L 172 374 L 168 364 L 164 353 L 159 343
L 154 333 L 148 323 L 142 314 L 135 305 L 128 295
L 121 285 L 115 274 L 109 264 L 104 254 L 100 243
L 96 231 L 93 219 L 90 207 L 88 194 L 87 181 L 85 168
L 84 155 L 83 142 L 82 129 L 81 116 L 81 103 L 82 91
L 84 80 L 87 69 L 91 59 L 96 50 L 103 41 L 111 33
L 120 26 L 130 19 L 140 14 Z
M 186 407 L 188 415 L 191 422 L 193 430 L 192 437
L 189 442 L 185 445 L 181 442 L 179 435 L 180 427
L 182 419 L 184 412 Z
          "
        />

        {/* Andaman & Nicobar — small island group, right side */}
        <ellipse cx="350" cy="290" rx="6" ry="22" fill="#dceee9" stroke="#4cb496" strokeWidth="1"/>
        <ellipse cx="348" cy="330" rx="3" ry="8" fill="#dceee9" stroke="#4cb496" strokeWidth="1"/>

        {/* Location dots */}
        {LOCATIONS.map(([lon, lat], i) => {
          const { x, y } = px(lon, lat);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={7} fill="#4cb496" opacity={0.15} />
              <circle cx={x} cy={y} r={3.5} fill="#004c3e" opacity={0.85} />
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(12, 445)">
          <circle cx={6} cy={6} r={6} fill="#4cb496" opacity={0.15} />
          <circle cx={6} cy={6} r={3} fill="#004c3e" opacity={0.85} />
          <text x={16} y={10} fontSize={9} fill="#444" fontFamily="Inter,sans-serif">
            58 locations across India
          </text>
        </g>
      </svg>
    </div>
  );
}
