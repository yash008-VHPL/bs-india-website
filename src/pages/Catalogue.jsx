import { useEffect, useRef, useState } from 'react';
import CapIcon from '../components/CapIcon';
import usePageMeta from '../usePageMeta';
import './Contact.css';
import './Catalogue.css';

// Absolute on purpose: the API lives at the site root, also under /beta.
const ENDPOINT = '/api/catalogue-request';

const FIELD_ERRORS = {
  name: 'Enter your name in letters, with a space after any initials.',
  email: 'Enter a valid email address.',
  phone: 'Enter a phone number with 10 to 15 digits.',
};
const MESSAGES = {
  too_many: 'We have already received several requests from you. Please check your inbox, or try again tomorrow.',
  busy: 'We are receiving a lot of requests right now. Please try again tomorrow.',
  invalid: 'Please check your details and try again.',
  received: 'Thank you - we have your details. Our team will email the catalogue to you.',
  retry: 'Something went wrong on our side. Please try again in a few minutes.',
  network: 'Could not reach our server. Please check your connection and try again.',
};

export default function Catalogue() {
  usePageMeta('Product Catalogue', 'Request the Berg+Schmidt India product catalogue by email.');
  const opened = useRef(0);
  const resultRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', bsi_hp: '' });
  const [state, setState] = useState({ status: 'idle', error: '', fields: [] });

  useEffect(() => { opened.current = Date.now(); }, []);
  useEffect(() => {
    if ((state.status === 'sent' || state.status === 'received') && resultRef.current) resultRef.current.focus();
  }, [state.status]);
  // Move focus to the first field the server rejected, so screen readers announce it.
  useEffect(() => {
    if (state.fields.length) document.getElementById(`cat-${state.fields[0]}`)?.focus();
  }, [state.fields]);

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
      // Only an explicit 'received' means the details were kept. Anything
      // else - including a non-JSON error page - keeps the form open to retry.
      if (j.code === 'received') return setState({ status: 'received', error: MESSAGES.received, fields: [] });
      if (j.code === 'invalid') {
        const fields = j.fields || [];
        return setState({ status: 'error', error: fields.length ? '' : MESSAGES.invalid, fields });
      }
      setState({ status: 'error', error: MESSAGES[j.code] || MESSAGES.retry, fields: [] });
    } catch {
      setState({ status: 'error', error: MESSAGES.network, fields: [] });
    }
  };

  const bad = (f) => state.fields.includes(f);
  const fieldProps = (f) => ({
    'aria-invalid': bad(f),
    'aria-describedby': bad(f) ? `cat-${f}-err` : undefined,
    className: bad(f) ? 'is-bad' : '',
  });
  const fieldError = (f) => bad(f) && <span id={`cat-${f}-err`} className="cat-field-err">{FIELD_ERRORS[f]}</span>;
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
            <div className="ct-success">
              <div className="ct-success-icon"><CapIcon name="check" size={26} /></div>
              <h2 ref={resultRef} tabIndex={-1}>{state.status === 'sent' ? 'Catalogue sent' : 'Request received'}</h2>
              {state.status === 'sent'
                ? <p>Please check your inbox at <strong>{form.email}</strong>. It can take a few minutes, and may land in spam or promotions.</p>
                : <p>{state.error}</p>}
            </div>
          ) : (
            <form className="ct-form" onSubmit={onSubmit}>
              <div className="fg"><label htmlFor="cat-name">Full Name *</label>
                <input id="cat-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100}
                  value={form.name} onChange={onChange} {...fieldProps('name')} />
                {fieldError('name')}
              </div>
              <div className="fg"><label htmlFor="cat-email">Email Address *</label>
                <input id="cat-email" name="email" type="email" autoComplete="email" required maxLength={254}
                  value={form.email} onChange={onChange} {...fieldProps('email')} />
                {fieldError('email')}
              </div>
              <div className="fg"><label htmlFor="cat-phone">Phone Number *</label>
                <input id="cat-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={30}
                  pattern="[+]?[0-9\s\-\(\)\.]{10,30}" placeholder="+91"
                  value={form.phone} onChange={onChange} {...fieldProps('phone')} />
                {fieldError('phone')}
              </div>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="cat-hp" aria-hidden="true">
                <label htmlFor="cat-hp">Leave empty</label>
                <input id="cat-hp" name="bsi_hp" type="text" tabIndex={-1} autoComplete="off" value={form.bsi_hp} onChange={onChange} />
              </div>
              <div aria-live="polite">
                {state.status === 'error' && state.error && <p className="cat-error" role="alert">{state.error}</p>}
              </div>
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
