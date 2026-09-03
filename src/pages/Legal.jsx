import { Link } from 'react-router-dom';
import './Legal.css';
import usePageMeta from '../usePageMeta';

/**
 * Imprint and Privacy Policy.
 *
 * These two routes previously did not exist, so the footer links returned a
 * 404. The routes now resolve. The legal copy itself is deliberately NOT
 * written here - Imprint (company particulars, CIN, registered office) and
 * the Privacy Policy must come from the company, approved, before publishing.
 */
const PAGES = {
  imprint: {
    title: 'Imprint',
    intro: 'Company particulars for Berg+Schmidt India Pvt. Ltd.',
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'How Berg+Schmidt India handles personal data collected through this website.',
  },
};

export default function Legal({ page }) {
  const p = PAGES[page];
  usePageMeta(p.title, p.intro);
  return (
    <main className="legal-page">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1 className="bs-mark">{p.title}</h1>
          <p>{p.intro}</p>
        </div>
      </div>
      <div className="legal-inner">
        <div className="legal-notice">
          <h2>Publication pending</h2>
          <p>
            This page is being prepared and will be published shortly. For any
            question in the meantime, please get in touch with our team.
          </p>
          <Link to="/contact" className="btn-primary">Contact Us</Link>
        </div>
      </div>
    </main>
  );
}
