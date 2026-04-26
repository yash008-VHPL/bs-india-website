import { useParams, Link, Navigate } from 'react-router-dom';
import { PRODUCTS, SPECIES } from '../data/products';
import './ProductDetail.css';
export default function ProductDetail() {
  const {id}=useParams();
  const p=PRODUCTS.find(x=>x.id===id);
  if(!p) return <Navigate to="/products" replace/>;
  const others=PRODUCTS.filter(x=>x.id!==id);
  return (
    <main className="pd-page">
      <div className="pd-bread"><div className="pd-bread-inner">
        <Link to="/">Home</Link><span>›</span><Link to="/products">Products</Link><span>›</span><span>{p.name}</span>
      </div></div>
      <div className="pd-inner">
        <div className="pd-main">
          <div className="pd-meta">
            {p.species.map(s=><span key={s} className="stag">{SPECIES.find(x=>x.id===s)?.label}</span>)}
            <span className="pd-type-badge">{p.type}</span>
          </div>
          <h1><span className="sol-plus">+ </span>{p.name}</h1>
          <p className="pd-sub">{p.subtitle}</p>
          <p className="pd-tgl">"{p.tagline}"</p>
          <div className="pd-body">
            <h2>Overview</h2><p>{p.description}</p>
            <h2>Key Benefits</h2>
            <ul className="ben-list">{p.benefits.map((b,i)=><li key={i}><span className="ben-dot"/>{b}</li>)}</ul>
            <div className="pd-grid">
              <div><h2>Applications</h2><ul className="app-list">{p.applications.map((a,i)=><li key={i}>{a}</li>)}</ul></div>
              <div><h2>Packaging</h2><p className="pd-pack">{p.packaging}</p></div>
            </div>
            <div className="pd-cta">
              <Link to="/contact" className="btn-primary">Request Technical Data Sheet</Link>
              <Link to="/contact" className="btn-outline">Enquire About This Product</Link>
            </div>
          </div>
        </div>
        <aside className="pd-sidebar">
          <div className="pd-sb-card">
            <h3>Other Products</h3>
            {others.map(x=>(
              <Link to={`/products/${x.id}`} key={x.id} className="pd-sp-link">
                <span className="sol-plus">+</span>
                <div><span className="pd-sp-name">{x.name}</span><span className="pd-sp-sub">{x.subtitle}</span></div>
              </Link>
            ))}
          </div>
          <div className="pd-sb-card pd-sb-dark">
            <h3>Need Help?</h3>
            <p>Our technical team can help you choose the right product for your operation.</p>
            <Link to="/contact" className="btn-primary" style={{marginTop:'12px',display:'inline-block'}}>Contact Us</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
