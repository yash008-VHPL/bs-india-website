/**
 * Species icons from the official Berg+Schmidt Animal Nutrition icon set
 * (icons_bsan_*_stroke). Strokes were switched to currentColor so the icon
 * inherits the surrounding text colour in both light and dark sections.
 */
const SRC = {
  poultry: '/icons/chicken.svg',
  chicken: '/icons/chicken.svg',
  cow:     '/icons/cow.svg',
  dairy:   '/icons/cow.svg',
  buffalo: '/icons/cow.svg',
};

export default function Icon({ name, size = 28, className = '', style = {} }) {
  const src = SRC[name];
  if (!src) return null;
  return (
    <span
      className={`bs-icon ${className}`}
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        flexShrink: 0,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
    />
  );
}
