/**
 * Only rendered on the /beta review build. Makes it impossible to mistake
 * the review copy for the live site.
 */
export default function BetaBanner() {
  if (import.meta.env.BASE_URL === '/') return null;
  return (
    <div className="beta-banner" role="note">
      <strong>Review copy</strong>
      <span>Not the live site. Chairman&rsquo;s corrections, August 2026.</span>
      <a href="https://www.berg-schmidt.co.in/">Go to the live site</a>
    </div>
  );
}
