// Exact replica of Berg+Schmidt's bs-mark-red.svg accent mark
// Shape: thick reverse-J — top flat, right vertical stroke, large semicircular bottom curve
// Positioning matches the global site: ::before, absolute, top: -30px, left: -20px
export default function Accent({ color = 'var(--accent-red)' }) {
  return (
    <span
      className="bs-accent-wrap"
      aria-hidden="true"
      style={{ position: 'relative', display: 'inline-block', width: 0, height: 0 }}
    >
      <svg
        className="bs-accent-svg"
        width="20"
        height="20"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: '-26px',
          left: '-4px',
          display: 'block',
          overflow: 'visible',
        }}
      >
        {/*
          The shape: a thick reverse-J
          - Top-right area is solid (the flat top)
          - Right vertical bar goes down
          - Bottom curves with large radius to the left (the ribbon sweep)
          
          Drawn as a filled path:
          Outer: top-left → top-right → down right side → sweep bottom-right → up inner right
          Inner cut: creates the L/J hollow
        */}
        <path
          d={`
            M 38 0
            L 100 0
            L 100 72
            Q 100 100 72 100
            Q 44 100 44 72
            L 44 38
            L 38 38
            Z
          `}
          fill={color}
        />
      </svg>
    </span>
  );
}
