import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import './Home.css';

const HERO_IMAGES = [
  { id:'poultry', label:'Poultry',  url:'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80', link:'/species#poultry' },
  { id:'cow',     label:'Cow',      url:'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80', link:'/species#dairy' },
  { id:'buffalo', label:'Buffalo',  url:'https://images.unsplash.com/photo-1741387863358-0421a7e5a085?w=600&q=80', link:'/species#dairy' },
];

export default function Home() {
  return (
    <main className="home" style={{position:"relative"}}>
      <section className="hero">
        <div className="hero-panels">
          {HERO_IMAGES.map(img=>(
            <Link to={img.link} key={img.id} className="hero-panel">
              <img src={img.url} alt={img.label} loading="lazy"/>
              <div className="hero-panel-label">{img.label}</div>
            </Link>
          ))}
        </div>
        <div className="hero-caption">
          <h1 className="bs-mark">Improving Livestock Performance<br/>Across India</h1>
        </div>
      </section>

      <nav className="species-bar">
        {[
          {id:'poultry',label:'Poultry',icon:'🐓',link:'/species#poultry'},
          {id:'cow',label:'Cow',icon:'🐄',link:'/species#dairy'},
          {id:'buffalo',label:'Buffalo',icon:'🦬',link:'/species#dairy'},
        ].map(s=>(
          <Link to={s.link} key={s.id} className="species-bar-item">
            <span>{s.icon}</span><span>{s.label}</span>
          </Link>
        ))}
      </nav>

      <section className="home-about">
        <div className="home-about-inner">
          <div className="home-about-text">
            <h2 className="bs-mark">Our Story</h2>
            <p>Berg + Schmidt India has been present in India since 2001, bringing world-class nutritional science to India's poultry and dairy sectors. With over two decades of domestic experience and the backing of a group with over 75 years of global expertise, we combine international knowledge with deep local understanding.</p>
            <p>Our team knows Indian breeds, Indian raw materials, and Indian farming conditions — and we apply that knowledge every time we make a recommendation.</p>
            <Link to="/company" className="btn-outline">Learn More →</Link>
          </div>
          <div className="home-about-visual">
            <div className="about-badge"><span className="about-badge-num">2001</span><span className="about-badge-text">Established in India</span></div>
            <div className="about-badge"><span className="about-badge-num">75+</span><span className="about-badge-text">Years of global group expertise</span></div>
            <div className="about-badge"><span className="about-badge-num">58</span><span className="about-badge-text">Locations across India</span></div>
          </div>
        </div>
      </section>

      <section className="home-products">
        <div className="home-products-header">
          <h2 className="bs-mark">Our Solutions</h2>
          <p>Science-based feed additives for India's poultry and dairy industries.</p>
        </div>
        <div className="solutions-split">
          <div className="solutions-half solutions-half--poultry">
            <img className="solutions-bg-img" src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=50" alt="" aria-hidden="true"/>
            <div className="solutions-half-content">
              <div className="solutions-half-label"><span>🐓</span>Poultry</div>
              <div className="solutions-cards">
                {PRODUCTS.filter(p=>p.species.includes('poultry')).map(p=>(
                  <Link to={`/products/${p.id}`} key={p.id} className="sol-card">
                    <div className="sol-card-type">{p.type}</div>
                    <h3><span className="sol-plus">+</span> {p.name}</h3>
                    <p className="sol-card-sub">{p.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="solutions-half solutions-half--dairy">
            <img className="solutions-bg-img" src="https://images.unsplash.com/photo-1741387863358-0421a7e5a085?w=800&q=50" alt="" aria-hidden="true"/>
            <div className="solutions-half-content">
              <div className="solutions-half-label"><span>🐄🦬</span>Dairy — Cow & Buffalo</div>
              <div className="solutions-cards">
                {PRODUCTS.filter(p=>p.species.includes('dairy')).map(p=>(
                  <Link to={`/products/${p.id}`} key={p.id} className="sol-card">
                    <div className="sol-card-type">{p.type}</div>
                    <h3><span className="sol-plus">+</span> {p.name}</h3>
                    <p className="sol-card-sub">{p.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="home-products-cta">
          <Link to="/products" className="btn-primary">View All Products →</Link>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-inner">
          <h2 className="bs-mark">Partner with Berg + Schmidt India</h2>
          <p>Get expert guidance on the right nutritional solution for your operation.</p>
          <Link to="/contact" className="btn-white">Contact Our Team →</Link>
        </div>
      </section>
    </main>
  );
}
