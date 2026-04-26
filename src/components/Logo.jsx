export default function Logo({ size = 'md', white = false }) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.3 : 1;
  const textColor = white ? '#fff' : '#004c3e';
  const greenColor = white ? '#7dd4b8' : '#4cb496';
  return (
    <div style={{ lineHeight: 1.1, userSelect: 'none' }}>
      <div style={{ fontWeight: 800, fontSize: `${scale * 1.45}rem`, letterSpacing: '-0.02em', color: textColor, display: 'flex', alignItems: 'center' }}>
        Berg<span style={{ color: greenColor, fontWeight: 800, fontSize: `${scale * 1.6}rem`, margin: `0 ${scale * 2}px`, lineHeight: 0.85 }}>+</span>Schmidt
      </div>
      <div style={{ fontWeight: 600, fontSize: `${scale * 1.05}rem`, color: greenColor }}>Animal Nutrition</div>
      <div style={{ fontWeight: 400, fontSize: `${scale * 0.75}rem`, color: white ? 'rgba(255,255,255,0.65)' : '#5a7a72', marginTop: `${scale * 2}px` }}>For extra performance.</div>
    </div>
  );
}
