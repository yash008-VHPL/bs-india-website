import { useState } from 'react';
import { PRODUCTS } from '../data/products';
import Accent from '../components/Accent';
import './Contact.css';
export default function Contact() {
  const [form,setForm]=useState({name:'',company:'',email:'',phone:'',product:'',message:'',type:'enquiry'});
  const [submitted,setSubmitted]=useState(false);
  const handleChange=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleSubmit=e=>{
    e.preventDefault();
    const sub=encodeURIComponent(`Enquiry — ${form.type} — ${form.name}`);
    const body=encodeURIComponent(`Name: ${form.name}\nCompany: ${form.company}\nEmail: ${form.email}\nPhone: ${form.phone}\nProduct of Interest: ${form.product}\nEnquiry Type: ${form.type}\n\nMessage:\n${form.message}`);
    window.location.href=`mailto:info@berg-schmidt.co.in?subject=${sub}&body=${body}`;
    setSubmitted(true);
  };
  return (
    <main className="contact-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1><Accent/>Contact Us</h1>
        <p>Our team is here to support you — from product selection to technical guidance.</p>
      </div></div>
      <div className="ct-inner">
        <div className="ct-info">
          <div className="ct-card">
            <h3>Get in Touch</h3>
            <div className="ct-detail"><span>📧</span><div><strong>Email</strong><a href="mailto:info@berg-schmidt.co.in">info@berg-schmidt.co.in</a></div></div>
            <div className="ct-detail"><span>🌐</span><div><strong>Website</strong><a href="https://www.berg-schmidt.co.in">www.berg-schmidt.co.in</a></div></div>
          </div>
          <div className="ct-card ct-card--green">
            <h3>Technical Support</h3>
            <p>Our nutrition specialists can assist with product selection, inclusion rates, formulation support, and field-level technical queries.</p>
            <p style={{marginTop:'8px',fontSize:'.78rem',color:'rgba(255,255,255,.6)'}}>We respond to all enquiries within 1 business day.</p>
          </div>
          <div className="ct-card" style={{background:'var(--mint-light)'}}>
            <h3 style={{color:'var(--green-dark)'}}>About Berg + Schmidt India</h3>
            <p style={{fontSize:'.82rem',color:'var(--text-mid)',lineHeight:'1.7'}}>Berg + Schmidt India Pvt. Ltd. has been serving India's poultry and dairy industries since 2001, bringing world-class animal nutrition science to Indian producers.</p>
          </div>
        </div>
        <div className="ct-form-wrap">
          {submitted?(
            <div className="ct-success">
              <div className="ct-success-icon">✓</div>
              <h2>Thank you for reaching out!</h2>
              <p>Your email client should have opened with your message pre-filled. We will be in touch shortly.</p>
            </div>
          ):(
            <form className="ct-form" onSubmit={handleSubmit}>
              <h2>Send us a message</h2>
              <div className="form-row">
                <div className="fg"><label>Full Name *</label><input name="name" type="text" required value={form.name} onChange={handleChange} placeholder="Your name"/></div>
                <div className="fg"><label>Company / Farm</label><input name="company" type="text" value={form.company} onChange={handleChange} placeholder="Organisation name"/></div>
              </div>
              <div className="form-row">
                <div className="fg"><label>Email Address *</label><input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@company.com"/></div>
                <div className="fg"><label>Phone / WhatsApp</label><input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX"/></div>
              </div>
              <div className="form-row">
                <div className="fg"><label>Product of Interest</label>
                  <select name="product" value={form.product} onChange={handleChange}>
                    <option value="">— Select a product —</option>
                    <optgroup label="Poultry">
                      {PRODUCTS.filter(p=>p.species.includes('poultry')).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    </optgroup>
                    <optgroup label="Dairy">
                      {PRODUCTS.filter(p=>p.species.includes('dairy')).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    </optgroup>
                    <option value="General">General / Not sure yet</option>
                  </select>
                </div>
                <div className="fg"><label>Enquiry Type</label>
                  <select name="type" value={form.type} onChange={handleChange}>
                    <option value="enquiry">Product Enquiry</option>
                    <option value="tds">Request Technical Data Sheet</option>
                    <option value="pricing">Pricing / Availability</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Distribution / Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label>Message *</label>
                <textarea name="message" rows={5} required value={form.message} onChange={handleChange} placeholder="Tell us about your operation, species, flock/herd size, and what you are looking to achieve…"/>
              </div>
              <button type="submit" className="btn-submit">Send Message →</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
