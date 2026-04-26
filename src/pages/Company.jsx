import { Link } from 'react-router-dom';
import IndiaMap from '../components/IndiaMap';
import Accent from '../components/Accent';
import './Company.css';

const CAPS = [
  {icon:'🏛️',title:'Regulatory & Industry Leadership',text:"Decades of engagement with India's animal husbandry regulatory landscape, with sustained relationships across government ministries and national industry bodies — including leadership roles in national feed industry associations."},
  {icon:'⚗️',title:'Chemical & Manufacturing Expertise',text:"Formally trained in chemical technology from premier Indian institutions, with deep knowledge of oleochemistry, emulsifier science, and feed ingredient manufacturing — ensuring product integrity at every stage."},
  {icon:'🔬',title:'Published Nutritional Science',text:"Our nutrition team includes published researchers in poultry gut health and monogastric biology. Every recommendation is grounded in field-validated science, not sales targets."},
  {icon:'🌐',title:'International Market Experience',text:"Exposure to livestock markets across Europe, Southeast Asia, and the Middle East informs how we contextualise global best practice — translating proven solutions into Indian conditions with precision."},
  {icon:'💡',title:'Research & Scientific Rigour',text:"A scientifically trained core with backgrounds in catalysis and materials science brings structured analytical thinking to product evaluation and continuous improvement across our portfolio."},
  {icon:'📈',title:'Market Development Depth',text:"Seasoned commercial professionals with on-the-ground experience across India's diverse poultry and dairy geographies — from large integrated operations to smallholder dairy clusters."},
];

export default function Company() {
  return (
    <main className="company-page">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1><Accent/>About Berg + Schmidt India</h1>
          <p>World-class animal nutrition science. Applied for India.</p>
        </div>
      </div>

      <section className="co-sec">
        <div className="co-sec-inner two-col">
          <div className="co-text">
            <h2><Accent/>Present in India Since 2001</h2>
            <p>Berg + Schmidt India Pvt. Ltd. has been operating in India since 2001, headquartered in Pune, Maharashtra. The mandate from day one has been to bring the nutritional science of a group with over 75 years of global expertise to India's poultry and dairy sectors — and to make it work for Indian producers.</p>
            <p>Over more than two decades of domestic operations, we have built a team with genuine roots in Indian animal agriculture — people who understand the breeds, the raw materials, the climate challenges, and the economics of Indian livestock production. That accumulated knowledge is what allows us to translate global science into field-level results.</p>
            <p>Today, Berg + Schmidt India serves producers, nutritionists, and feed manufacturers across the country — with a focused presence in poultry and dairy.</p>
          </div>
          <div className="co-stats">
            {[
              {num:'2001',label:'Present in India since'},
              {num:'20+',label:'Years of domestic operations'},
              {num:'75+',label:'Years of global group expertise'},
              {num:'58',label:'Locations across India'},
            ].map(s=><div className="stat-card" key={s.label}><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>)}
          </div>
        </div>
      </section>

      <section className="co-sec co-sec--mint">
        <div className="co-sec-inner">
          <div className="two-col" style={{alignItems:'center'}}>
            <div>
              <h2><Accent/>58 Locations Across India</h2>
              <p>Our field presence spans India's key livestock geographies — from the large integrated poultry operations of Andhra Pradesh and Telangana to the dairy heartlands of Gujarat, Punjab, and Maharashtra. We cover smallholder dairy clusters in Uttar Pradesh and Bihar as readily as the commercial poultry belts of Tamil Nadu and Karnataka.</p>
              <p>This breadth of presence means our technical team understands local raw material profiles, local breed characteristics, and local production challenges — and can provide support that is genuinely relevant to each region's conditions.</p>
              <div className="pres-stats">
                <div className="pstat"><span className="pstat-num">15+</span><span className="pstat-lbl">States covered</span></div>
                <div className="pstat"><span className="pstat-num">58</span><span className="pstat-lbl">Active locations</span></div>
                <div className="pstat"><span className="pstat-num">2</span><span className="pstat-lbl">Species focus areas</span></div>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'center'}}><IndiaMap/></div>
          </div>
        </div>
      </section>

      <section className="co-sec">
        <div className="co-sec-inner">
          <h2 style={{marginBottom:'24px'}}><Accent/>Global Expertise. Local Knowledge.</h2>
          <div className="gl-grid">
            <div className="gl-card gl-card--g">
              <div className="gl-head"><span className="gl-ico">🌍</span><h3>Global Expertise</h3></div>
              <p>Berg + Schmidt's group has over 75 years of experience in animal nutrition — developing and refining lipid nutrition science, phospholipid technology, and rumen-protected supplement systems used by producers across Europe, Asia, the Americas, and the Middle East.</p>
              <ul className="gl-list">
                <li>75+ years of global R&D in animal lipid nutrition</li>
                <li>Products validated in diverse global production systems</li>
                <li>Access to international nutritional research and field data</li>
                <li>Continuous product development pipeline from the global group</li>
              </ul>
            </div>
            <div className="gl-card gl-card--l">
              <div className="gl-head"><span className="gl-ico">🇮🇳</span><h3>Local Knowledge</h3></div>
              <p>Over two decades of domestic operations have given us a depth of India-specific knowledge that cannot be imported. We understand the unique challenges of Indian dairy and poultry production — and we apply that understanding every day.</p>
              <ul className="gl-list">
                <li>Indian breed genetics — crossbred and indigenous dairy; commercial broiler and layer</li>
                <li>Tropical heat and humidity effects on fat digestibility and performance</li>
                <li>Indian raw material variability and its nutritional implications</li>
                <li>Field-calibrated inclusion rates and formulation strategies</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="co-sec co-sec--dark">
        <div className="co-sec-inner">
          <h2 style={{justifyContent:'center',marginBottom:'8px',color:'#fff'}}><span className="acc-green" aria-hidden="true"/>Our Team</h2>
          <p style={{textAlign:'center',color:'rgba(255,255,255,.7)',marginBottom:'32px',fontSize:'.95rem'}}>A leadership team combining international exposure with deep, practical knowledge of Indian livestock production.</p>
          <div className="pillars-grid">
            {CAPS.map(c=><div className="pillar-card" key={c.title}>
              <div className="pillar-ico">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section className="co-cta">
        <div className="co-cta-inner">
          <h2><Accent/>Talk to Our Team</h2>
          <p>Whether you are a producer, nutritionist, or feed manufacturer — we are ready to help.</p>
          <Link to="/contact" className="btn-primary">Get In Touch</Link>
        </div>
      </section>
    </main>
  );
}
