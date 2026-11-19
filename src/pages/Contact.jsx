import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import CapIcon from '../components/CapIcon';
import './Contact.css';
import './Catalogue.css';
import usePageMeta from '../usePageMeta';

// Visible text: never the internal business-division names.
const SEGMENT_LABEL = {
  dairy: 'dairy nutrition products',
  poultry: 'poultry nutrition products',
  commodity: 'feed fats and oils',
};

// Absolute on purpose: the API lives at the site root, also under /beta.
const ENDPOINT = '/api/contact-request';
const FIELD_ERRORS = {
  name: 'Enter your name in letters, with a space after any initials.',
  email: 'Enter a valid email address.',
  phone: 'Enter a phone number with 10 to 15 digits, or leave it empty.',
  message: 'Tell us a little more (at least 10 characters).',
};
const MESSAGES = {
  too_many: 'We have already received several messages from you today. Our team will reply shortly.',
  busy: 'We are receiving a lot of messages right now. Please email us directly.',
  invalid: 'Please check your details and try again.',
  retry: 'Something went wrong on our side. Please try again in a few minutes, or email us directly.',
  network: 'Could not reach our server. Please check your connection and try again.',
};

function buildPrefillMessage({ segment, city, detail }) {
  const context = city ? ` (referred via ${city}${detail ? ` - ${detail}` : ''})` : '';
  if (segment === 'hq') {
    return `Hello,\n\nI would like to get in touch with the Berg+Schmidt India team${context}. Please let me know the best point of contact.\n\nThank you.`;
  }
  if (segment === 'hef' || segment === 'company') {
    return `Hello,\n\nI would like to get in touch about Hightech Energy Feeds manufacturing${context}. Please let me know the best point of contact.\n\nThank you.`;
  }
  const topic = SEGMENT_LABEL[segment];
  if (!topic) return '';
  return `Hello,\n\nI would like to know more about Berg+Schmidt's ${topic}${context}. Please share product details, pricing, and availability.\n\nThank you.`;
}

export default function Contact() {
  usePageMeta('Contact', "Talk to the Berg+Schmidt India team in Pune about poultry and dairy nutrition for your operation.");
  const [params] = useSearchParams();
  const segment = params.get('segment');
  const city = params.get('city') || '';
  const detail = params.get('detail') || '';

  const [form,setForm]=useState({name:'',company:'',email:'',phone:'',product:'',message:'',type:'enquiry',bsi_hp:''});
  const [state,setState]=useState({status:'idle',error:'',fields:[]});
  const opened=useRef(0);
  const resultRef=useRef(null);
  useEffect(()=>{opened.current=Date.now();},[]);
  useEffect(()=>{ if(state.status==='sent'&&resultRef.current) resultRef.current.focus(); },[state.status]);
  useEffect(()=>{ if(state.fields.length) document.getElementById(`ct-${state.fields[0]}`)?.focus(); },[state.fields]);

  // Pre-fill from query params (segment-level enquiry). Runs once per param change.
  useEffect(() => {
    if (!segment) return;
    setForm((f) => ({
      ...f,
      message: f.message || buildPrefillMessage({ segment, city, detail }),
      type: 'enquiry',
    }));
    // After paint, jump to the form so the user lands on the prefilled fields.
    const el = document.getElementById('contact-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [segment, city, detail]);

  const handleChange=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleSubmit=async e=>{
    e.preventDefault();
    if(state.status==='sending') return;
    setState({status:'sending',error:'',fields:[]});
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({...form,t:Date.now()-opened.current})});
      const j=await r.json().catch(()=>({}));
      // 'received' = stored on our side even though the email to the team
      // failed; the team sees it in the enquiries table, so it is not lost.
      if((r.ok&&j.ok)||j.code==='received') return setState({status:'sent',error:'',fields:[]});
      if(j.code==='invalid'){const fields=j.fields||[];return setState({status:'error',error:fields.length?'':MESSAGES.invalid,fields});}
      setState({status:'error',error:MESSAGES[j.code]||MESSAGES.retry,fields:[]});
    }catch{
      setState({status:'error',error:MESSAGES.network,fields:[]});
    }
  };
  const bad=f=>state.fields.includes(f);
  const fp=f=>({id:`ct-${f}`,'aria-invalid':bad(f),'aria-describedby':bad(f)?`ct-${f}-err`:undefined,className:bad(f)?'is-bad':''});
  const ferr=f=>bad(f)&&<span id={`ct-${f}-err`} className="cat-field-err">{FIELD_ERRORS[f]}</span>;
  return (
    <main className="contact-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Contact Us</h1>
        <p>Our team is here to support you - from product selection to technical guidance.</p>
      </div></div>
      <div className="ct-inner">
        <div className="ct-info">
          <div className="ct-card">
            <h3>Get in Touch</h3>
            <div className="ct-detail"><span><CapIcon name="mail" size={20}/></span><div><strong>Email</strong><a href="mailto:info@berg-schmidt.co.in">info@berg-schmidt.co.in</a></div></div>
            <div className="ct-detail"><span><CapIcon name="web" size={20}/></span><div><strong>Website</strong><a href="https://www.berg-schmidt.co.in">www.berg-schmidt.co.in</a></div></div>
          </div>
          <div className="ct-card ct-card--green">
            <h3>Technical Support</h3>
            <p>Our nutrition specialists can assist with product selection, inclusion rates, formulation support, and field-level technical queries.</p>
            <p style={{marginTop:'8px',fontSize:'var(--fs-body)',color:'rgba(255,255,255,.6)'}}>We respond to all enquiries within 1 business day.</p>
          </div>
          <div className="ct-card" style={{background:'var(--mint-light)'}}>
            <h3 style={{color:'var(--green-dark)'}}>About Berg+Schmidt India</h3>
            <p style={{fontSize:'var(--fs-body)',color:'var(--text-mid)',lineHeight:'1.7'}}>Berg+Schmidt India Pvt. Ltd. has been serving India's poultry and dairy industries since 2002, bringing world-class animal nutrition science to Indian producers.</p>
          </div>
        </div>
        <div className="ct-form-wrap">
          {state.status==='sent'?(
            <div className="ct-success">
              <div className="ct-success-icon"><CapIcon name="check" size={26}/></div>
              <h2 ref={resultRef} tabIndex={-1}>Thank you for reaching out</h2>
              <p>Your message has reached our team. We will reply to <strong>{form.email}</strong> within 1 business day.</p>
            </div>
          ):(
            <form id="contact-form" className="ct-form" onSubmit={handleSubmit}>
              <h2>Send us a message</h2>
              <div className="form-row">
                <div className="fg"><label htmlFor="ct-name">Full Name *</label><input name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={handleChange} placeholder="Your name" {...fp('name')}/>{ferr('name')}</div>
                <div className="fg"><label htmlFor="ct-company">Company / Farm</label><input id="ct-company" name="company" type="text" autoComplete="organization" maxLength={120} value={form.company} onChange={handleChange} placeholder="Organisation name"/></div>
              </div>
              <div className="form-row">
                <div className="fg"><label htmlFor="ct-email">Email Address *</label><input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={handleChange} placeholder="you@company.com" {...fp('email')}/>{ferr('email')}</div>
                <div className="fg"><label htmlFor="ct-phone">Phone / WhatsApp</label><input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" {...fp('phone')}/>{ferr('phone')}</div>
              </div>
              <div className="form-row">
                <div className="fg"><label htmlFor="ct-product">Product of Interest</label>
                  <select id="ct-product" name="product" value={form.product} onChange={handleChange}>
                    <option value=""> - Select a product - </option>
                    <optgroup label="Poultry">
                      {PRODUCTS.filter(p=>p.species.includes('poultry')).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    </optgroup>
                    <optgroup label="Dairy">
                      {PRODUCTS.filter(p=>p.species.includes('dairy')).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    </optgroup>
                    <option value="General">General / Not sure yet</option>
                  </select>
                </div>
                <div className="fg"><label htmlFor="ct-type">Enquiry Type</label>
                  <select id="ct-type" name="type" value={form.type} onChange={handleChange}>
                    <option value="enquiry">Product Enquiry</option>
                    <option value="tds">Request Technical Data Sheet</option>
                    <option value="pricing">Pricing / Availability</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Distribution / Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label htmlFor="ct-message">Message *</label>
                <textarea name="message" rows={5} required minLength={10} maxLength={3000} value={form.message} onChange={handleChange} placeholder="Tell us about your operation, species, flock/herd size, and what you are looking to achieve..." {...fp('message')}/>{ferr('message')}
              </div>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="cat-hp" aria-hidden="true">
                <label htmlFor="ct-hp">Leave empty</label>
                <input id="ct-hp" name="bsi_hp" type="text" tabIndex={-1} autoComplete="off" value={form.bsi_hp} onChange={handleChange}/>
              </div>
              <div aria-live="polite">
                {state.status==='error'&&state.error&&<p className="cat-error" role="alert">{state.error} {state.error!==MESSAGES.invalid&&<a href="mailto:info@berg-schmidt.co.in">info@berg-schmidt.co.in</a>}</p>}
              </div>
              <button type="submit" className="btn-submit" disabled={state.status==='sending'}>{state.status==='sending'?'Sending…':'Send Message'}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
