import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const LOTTIE_URL = '/bs-logo.json';

// The + cross shape — exact path from bs-ani-nutri-logo.json Lottie file
// Layer 0, Group 1, Path 1: 7 vertices, fill #4CB496 (brand green)
// ViewBox centered at origin (-35,-35 to 35,35 with padding)
// The top-right corner (segment from v6 to v0) has a cubic bezier curve
// Control points: (30.15,-18.849) and (18.848,-30.15)
const PlusIcon = ({ color, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="-35 -35 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    <path
      d="M 4.956,-30.15 L -30.15,-30.15 L -30.15,-5.314 L 5.313,-5.314 L 5.313,30.15 L 30.15,30.15 L 30.15,-4.957 C 30.15,-18.849 18.848,-30.15 4.956,-30.15 Z"
      fill={color}
    />
  </svg>
);

export default function Logo({ size = 'sm', white = false, animate = false }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!animate || !containerRef.current) return;
    let cancelled = false;
    fetch(LOTTIE_URL)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data || !containerRef.current) return;
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: data,
        });
        const drive = () => {
          if (!animRef.current) return;
          const pct = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
          animRef.current.goToAndStop(pct * animRef.current.totalFrames, true);
        };
        animRef.current.goToAndStop(0, true);
        window.addEventListener('scroll', drive, { passive: true });
        return () => window.removeEventListener('scroll', drive);
      })
      .catch(() => {});
    return () => { cancelled = true; animRef.current?.destroy(); };
  }, [animate]);

  if (animate) {
    return <div ref={containerRef} style={{ width: 200, height: 62 }} aria-label="Berg+Schmidt Animal Nutrition" />;
  }

  const s = size === 'sm' ? 0.78 : size === 'lg' ? 1.3 : 1;
  const tc = white ? '#fff' : '#004c3e';
  const gc = white ? '#7dd4b8' : '#4cb496';
  const dc = white ? 'rgba(255,255,255,.65)' : '#5a7a72';
  
  // Font size for Berg/Schmidt text
  const fs = s * 1.32;
  // Plus icon size — matches capital letter height of surrounding text
  const plusPx = fs * 16 * 0.85; // em to px approx

  return (
    <div style={{ lineHeight: 1.15, userSelect: 'none' }}>
      <div style={{
        fontWeight: 800,
        fontSize: `${fs}rem`,
        letterSpacing: '-.02em',
        color: tc,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        <span>Berg</span>
        <PlusIcon color={gc} size={plusPx} />
        <span>Schmidt</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: `${s * 0.98}rem`, color: gc, letterSpacing: '0.01em' }}>
        Animal Nutrition
      </div>
      <div style={{ fontWeight: 400, fontSize: `${s * 0.7}rem`, color: dc, marginTop: `${s * 1}px` }}>
        For extra performance.
      </div>
    </div>
  );
}
