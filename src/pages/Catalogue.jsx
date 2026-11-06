import { useEffect, useRef, useState } from 'react';
import CapIcon from '../components/CapIcon';
import usePageMeta from '../usePageMeta';
import './Contact.css';
import './Catalogue.css';

// Absolute on purpose: the API lives at the site root, also under /beta.
const ENDPOINT = '/api/catalogue-request';

const MESSAGES = {
  invalid: 'Please check the highlighted fields.',
  too_many: 'We have already received several requests from you. Please check your inbox, or try again tomorrow.',
  unavailable: 'Thank you - we have your details. The catalogue is not available online right now; our team will email it to you.',
  send_failed: 'Thank you - we have your details, but the email could not be sent just now. Our team will email the catalogue to you.',
  network: 'Could not reach our server. Please check your connection and try again.',
};

export default function Catalogue() {
  usePageMeta('Product Catalogue', 'Request the Berg+Schmidt India product catalogue by email.');
  const opened = useRef(0);
  useEffect(() => { opened.current = Date.now(); }, []);
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '' });
  const [state, setState] = useState({ status: 'idle', error: '', fields: [] });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state.status === 'sending') return;
    setState({ status: 'sending', error: '', fields: [] });
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, t: Date.now() - opened.current }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) return setState({ status: 'sent', error: '', fields: [] });
      const code = j.error || 'send_failed';
      // Details are saved for these two - do not invite a resubmit.
      const terminal = code === 'unavailable' || code === 'send_failed';
      setState({ status: terminal ? 'received' : 'error', error: MESSAGES[code] || MESSAGES.send_failed, fields: j.fields || [] });
    } catch {
      setState({ status: 'error', error: MESSAGES.network, fields: [] });
    }
  };

  const bad = (f) => state.fields.includes(f);
  const done = state.status === 'sent' || state.status === 'received';

  return (
    <main className="contact-page catalogue-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Product Catalogue</h1>
        <p>Enter your details and we will email you our product catalogue.</p>
      </div></div>
      <div className="cat-inner">
        <div className="ct-form-wrap">
          {done ? (
            <div className="ct-success" role="status">
              <div className="ct-success-icon"><CapIcon name="check" size={26} /></div>
              {state.status === 'sent' ? (
                <>
                  <h2>Catalogue sent</h2>
                  <p>Please check your inbox at <strong>{form.email}</strong>. It can take a few minutes, and may land in spam or promotions.</p>
                </>
              ) : (
                <>
                  <h2>Request received</h2>
                  <p>{state.error}</p>
                </>
              )}
            </div>
          ) : (
            <form className="ct-form" onSubmit={onSubmit} noValidate={false}>
              <div className="fg"><label htmlFor="cat-name">Full Name *</label>
                <input id="cat-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100}
                  value={form.name} onChange={onChange} aria-invalid={bad('name')} className={bad('name') ? 'is-bad' : ''} />
              </div>
              <div className="fg"><label htmlFor="cat-email">Email Address *</label>
                <input id="cat-email" name="email" type="email" autoComplete="email" required maxLength={254}
                  value={form.email} onChange={onChange} aria-invalid={bad('email')} className={bad('email') ? 'is-bad' : ''} />
              </div>
              <div className="fg"><label htmlFor="cat-phone">Phone Number *</label>
                <input id="cat-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={30}
                  pattern="[+]?[0-9\s\-().]{10,30}" placeholder="+91"
                  value={form.phone} onChange={onChange} aria-invalid={bad('phone')} className={bad('phone') ? 'is-bad' : ''} />
              </div>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="cat-hp" aria-hidden="true">
                <label htmlFor="cat-website">Website</label>
                <input id="cat-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={onChange} />
              </div>
              {state.status === 'error' && <p className="cat-error" role="alert">{state.error}</p>}
              <button type="submit" className="btn-submit" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Email me the catalogue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
