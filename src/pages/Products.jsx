import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS, SPECIES } from '../data/products';
import Accent from '../components/Accent';
import './Products.css';

export default function Products() {
  const [search, setSearch] = useState('');
  const [selSp, setSelSp] = useState([]);
  const [selType, setSelType] = useState([]);
  const [spOpen, setSpOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(true);
  const allTypes = [...new Set(PRODUCTS.map(p=>p.type))];
  const togSp = s => setSelSp(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const togType = t => setSelType(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const filtered = PRODUCTS.filter(p=>{
    const q=search.toLowerCase();
    return (!q||p.name.toLowerCase().includes(q)||p.subtitle.toLowerCase().includes(q))
      &&(!selSp.length||p.species.some(s=>selSp.includes(s)))
      &&(!selType.length||selType.includes(p.type));
  });
  const reset=()=>{setSearch('');setSelSp([]);setSelType([]);};
  return (
    <main className="products-page">
      <aside className="prod-sidebar">
        <div className="sb-logo-area">
          <div className="sb-bs">Berg<span className="sb-plus">+</span>Schmidt</div>
          <div className="sb-div">Animal Nutrition</div>
          <div className="sb-tag">For extra performance.</div>
        </div>
        <div className="sb-title"><h2><Accent/>Product Finder</h2></div>
        <input className="sb-search" type="text" placeholder="Search …" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="sb-filter">
          <button className="sb-ftoggle" onClick={()=>setTypeOpen(o=>!o)}>Type <span>{typeOpen?'−':'+'}</span></button>
          {typeOpen&&<div className="sb-opts">{allTypes.map(t=><label key={t} className="sb-opt"><input type="checkbox" checked={selType.includes(t)} onChange={()=>togType(t)}/>{t}</label>)}</div>}
        </div>
        <div className="sb-filter">
          <button className="sb-ftoggle" onClick={()=>setSpOpen(o=>!o)}>Species <span>{spOpen?'−':'+'}</span></button>
          {spOpen&&<div className="sb-opts">{SPECIES.map(s=><label key={s.id} className="sb-opt"><input type="checkbox" checked={selSp.includes(s.id)} onChange={()=>togSp(s.id)}/>{s.label}</label>)}</div>}
        </div>
        <button className="sb-reset" onClick={reset}>Reset</button>
      </aside>
      <section className="prod-list">
        <div className="prod-count">Showing <strong>{filtered.length}</strong> of {PRODUCTS.length} products</div>
        {filtered.map(p=>(
          <Link to={`/products/${p.id}`} key={p.id} className="prod-row">
            <div className="prod-row-hdr">
              <h3><span className="sol-plus">+ </span>{p.name}</h3>
              <span className="prod-row-type">{p.type}</span>
            </div>
            <p className="prod-row-desc">{p.description.slice(0,180)}…</p>
            <div className="prod-row-tags">{p.species.map(s=><span key={s} className="stag">{SPECIES.find(x=>x.id===s)?.label}</span>)}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
