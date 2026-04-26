import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const LOTTIE_URL = '/bs-logo.json';

/**
 * Berg+Schmidt brand cross — TWO-COLOR design.
 * 
 * The + in Berg+Schmidt is composed of TWO J-hook shapes rotated 180° from each other:
 * 
 * Shape 1 (teal #5fc296): The exact path from the Lottie "Unbenannt-2 Outlines" layer
 *   M 4.956,-30.15 L -30.15,-30.15 L -30.15,-5.314 L 5.313,-5.314 L 5.313,30.15
 *   L 30.15,30.15 L 30.15,-4.957 C 30.15,-18.849 18.848,-30.15 4.956,-30.15 Z
 * 
 * Shape 2 (dark green #14483c): Same path rotated 180° (x,y → -x,-y)
 *   M -4.956,30.15 L 30.15,30.15 L 30.15,5.314 L -5.313,5.314 L -5.313,-30.15
 *   L -30.15,-30.15 L -30.15,4.957 C -30.15,18.849 -18.848,30.15 -4.956,30.15 Z
 * 
 * Together they form the complete + cross mark with the brand's two-color identity.
 */
const BrandCross = ({ size, darkColor, lightColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="-35 -35 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Teal half — upper-left arm + lower-right arm */}
    <path
      d="M 4.956,-30.15 L -30.15,-30.15 L -30.15,-5.314 L 5.313,-5.314 L 5.313,30.15 L 30.15,30.15 L 30.15,-4.957 C 30.15,-18.849 18.848,-30.15 4.956,-30.15 Z"
      fill={lightColor}
    />
    {/* Dark green half — lower-right arm + upper-left arm (180° rotation) */}
    <path
      d="M -4.956,30.15 L 30.15,30.15 L 30.15,5.314 L -5.313,5.314 L -5.313,-30.15 L -30.15,-30.15 L -30.15,4.957 C -30.15,18.849 -18.848,30.15 -4.956,30.15 Z"
      fill={darkColor}
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
  const tc  = white ? '#fff'                  : '#004c3e'; // Berg/Schmidt text
  const dk  = white ? 'rgba(255,255,255,0.7)' : '#14483c'; // Dark green half of cross
  const lt  = white ? '#7dd4b8'               : '#5fc296'; // Teal half of cross
  const gc  = white ? '#7dd4b8'               : '#4cb496'; // "Animal Nutrition" text
  const dim = white ? 'rgba(255,255,255,.6)'  : '#5a7a72'; // "For extra performance"

  const fs      = s * 1.32;           // font-size for Berg / Schmidt
  const crossPx = fs * 16 * 0.82;    // cross icon size ≈ cap height

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
        <BrandCross size={crossPx} darkColor={dk} lightColor={lt} />
        <span>Schmidt</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: `${s * 0.98}rem`, color: gc, letterSpacing: '0.01em' }}>
        Animal Nutrition
      </div>
      <div style={{ fontWeight: 400, fontSize: `${s * 0.7}rem`, color: dim, marginTop: `${s * 1}px` }}>
        For extra performance.
      </div>
    </div>
  );
}
