import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

// The Lottie JSON URL — self-hosted in /public/bs-logo.json
// Falls back gracefully to static wordmark if file not present
const LOTTIE_URL = '/bs-logo.json';

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
        // Scroll-driven: frames 0-60 mapped to first 90vh of scroll
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

  // Static wordmark
  const s = size === 'sm' ? 0.75 : size === 'lg' ? 1.3 : 1;
  const tc = white ? '#fff' : '#004c3e';
  const gc = white ? '#7dd4b8' : '#4cb496';
  const dc = white ? 'rgba(255,255,255,.65)' : '#5a7a72';

  return (
    <div style={{ lineHeight: 1.1, userSelect: 'none' }}>
      <div style={{ fontWeight: 800, fontSize: `${s * 1.4}rem`, letterSpacing: '-.02em', color: tc, display: 'flex', alignItems: 'center' }}>
        Berg<span style={{ color: gc, fontWeight: 800, fontSize: `${s * 1.55}rem`, margin: `0 ${s * 2}px`, lineHeight: 0.85 }}>+</span>Schmidt
      </div>
      <div style={{ fontWeight: 600, fontSize: `${s * 1.0}rem`, color: gc }}>Animal Nutrition</div>
      <div style={{ fontWeight: 400, fontSize: `${s * 0.72}rem`, color: dc, marginTop: `${s * 2}px` }}>For extra performance.</div>
    </div>
  );
}
