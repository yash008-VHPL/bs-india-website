import { useEffect } from 'react';

/**
 * Per-page <title> and meta description.
 *
 * Every route used to serve the same title and description, which is poor for
 * search - and search was the chairman's stated reason for wanting product
 * names as readable text in the first place.
 */
const SUFFIX = 'Berg+Schmidt India';

export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | ${SUFFIX}` : `${SUFFIX} | Animal Nutrition`;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = description;
    }
  }, [title, description]);
}
