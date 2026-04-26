import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

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

  return (
    <div style={{ lineHeight: 1.15, userSelect: 'none' }}>
      {/*
        Global site wordmark: "Berg+Schmidt" — the + is directly touching both words,
        no spaces, slightly larger, in brand green.
        Font weights all 800 (black).
      */}
      <div style={{
        fontWeight: 800,
        fontSize: `${s * 1.32}rem`,
        letterSpacing: '-.02em',
        color: tc,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        <span>Berg</span>
        <span style={{
          color: gc,
          fontWeight: 800,
          /* + is slightly larger than surrounding text — exactly like global site */
          fontSize: `${s * 1.52}rem`,
          lineHeight: 1,
          /* No horizontal margin — directly touching Berg and Schmidt */
          margin: '0 1px',
        }}>+</span>
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
