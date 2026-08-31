/**
 * Berg+Schmidt Animal Nutrition logo - official primary lockup with the
 * claim "For extra performance."
 * Source: bs_animal_nutrition_logo_srgb.svg, the group's own asset from
 * an.berg-schmidt.com. Vector, so it stays crisp at any size.
 * viewBox 184.25 x 62.36  ->  aspect 2.955
 */
export default function Logo({ size = 'sm', white = false }) {
  const heights = { sm: 60, md: 72, lg: 88 };
  const h = heights[size] || 60;
  const w = Math.round(h * (184.25 / 62.36));

  // On the dark footer the two-tone green reads poorly, so knock it back to
  // solid white via a filter (the asset has no white variant published).
  const style = white
    ? { filter: 'brightness(0) invert(1)', height: h, width: w, display: 'block' }
    : { height: h, width: w, display: 'block' };

  return (
    <img
      src="/bs-logo.svg"
      alt="Berg+Schmidt Animal Nutrition - For extra performance."
      style={style}
      draggable={false}
    />
  );
}
