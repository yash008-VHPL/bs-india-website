/**
 * Berg + Schmidt Animal Nutrition logo — V2.
 *
 * Web-team feedback: the header must carry the FULL lockup, i.e. the wordmark
 * plus the claim "For extra performance." (Brand Codes p.4). Pass claim={false}
 * for the collapsed, logo-only state used once the page is scrolled.
 *
 * Wordmark source: bs-logo.png (366x77), extracted from the official deck.
 * The claim is set in Geist — the corporate typeface — in Green 2.
 */
export default function Logo({ size = 'sm', white = false, claim = false }) {
  const heights = { sm: 36, md: 48, lg: 60 };
  const h = heights[size] || 36;
  const w = Math.round(h * (366 / 77)); // maintain aspect ratio

  // On dark backgrounds use a white knock-out of the two-colour wordmark
  const imgStyle = white
    ? { filter: 'brightness(0) invert(1)', height: h, width: w, display: 'block' }
    : { height: h, width: w, display: 'block' };

  return (
    <span className="bs-logo" style={{ display: 'inline-block', lineHeight: 1 }}>
      <img
        src="/bs-logo.png"
        alt="Berg + Schmidt Animal Nutrition"
        style={imgStyle}
        draggable={false}
      />
      {claim && (
        <span
          className="bs-logo-claim"
          style={{
            display: 'block',
            marginTop: Math.round(h * 0.11),
            fontSize: Math.max(9, Math.round(h * 0.245)),
            lineHeight: 1.1,
            fontWeight: 400,
            letterSpacing: '.005em',
            color: white ? 'rgba(255,255,255,.9)' : 'var(--green-dark)',
            whiteSpace: 'nowrap',
          }}
        >
          For extra performance.
        </span>
      )}
    </span>
  );
}
