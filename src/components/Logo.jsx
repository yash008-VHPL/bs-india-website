/**
 * Berg+Schmidt Animal Nutrition logo
 * Source: extracted directly from official company PowerPoint deck
 * File: bs-logo.png (366x77px, RGBA)
 */
export default function Logo({ size = 'sm', white = false }) {
  const heights = { sm: 36, md: 48, lg: 60 };
  const h = heights[size] || 36;
  const w = Math.round(h * (366 / 77)); // maintain aspect ratio

  // On dark/transparent backgrounds use the white variant if available,
  // otherwise apply a brightness filter to lighten the dark-green text
  const style = white
    ? { filter: 'brightness(0) invert(1)', height: h, width: w, display: 'block' }
    : { height: h, width: w, display: 'block' };

  return (
    <img
      src="/bs-logo.png"
      alt="Berg+Schmidt Animal Nutrition"
      style={style}
      draggable={false}
    />
  );
}
