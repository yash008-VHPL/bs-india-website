import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRODUCTS, SPECIES } from '../data/products';
import './Species.css';
const SD = {
  poultry:{label:'Poultry',img:'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=75',headline:'Optimal Nutrition for Broilers & Layers',
    intro:"India's broiler and layer industries are among the fastest-growing in the world. Our liquid feed fats and phospholipid concentrates address the most critical performance parameters — energy density, feed conversion, weight gain, egg production and gut health.",
    ch:['Rising feed costs requiring improved feed conversion efficiency','Heat stress impacting fat digestibility and performance','Early chick gut development and nutrient absorption','Yolk quality and egg production persistence in layers','Maintaining flock uniformity and reducing mortality']},
  dairy:{label:'Dairy — Cow & Buffalo',img:'https://images.unsplash.com/photo-1741387863358-0421a7e5a085?w=800&q=75',headline:'Supporting High-Producing Dairy Cows & Buffalo',
    intro:"India's dairy sector is the largest in the world by milk production volume. Both crossbred cows and indigenous buffalo contribute significantly to national milk output, and each has distinct nutritional requirements. Our rumen-protected fat and bypass nutrient technologies deliver concentrated, bioavailable energy and essential metabolites precisely where and when they are needed.",
    ch:['Negative energy balance (NEB) in early lactation','Body condition score loss post-calving','Milk fat depression in high-producing animals','Reproductive performance and conception rates','Maximising milk solids output in peak production']},
};
export default function Species() {
  const loc=useLocation();
  useEffect(()=>{
    if(loc.hash){const el=document.getElementById(loc.hash.slice(1));if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),100);}
  },[loc]);
  return (
    <main className="sp-page">
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Species</h1>
        <p>Tailored nutritional solutions for India's poultry and dairy producers.</p>
      </div></div>
      <nav className="sp-tabs">
        {SPECIES.map(s=><a key={s.id} href={`#${s.id}`} className="sp-tab">{s.label}</a>)}
      </nav>
      {SPECIES.map(({id})=>{
        const d=SD[id]; const prods=PRODUCTS.filter(p=>p.species.includes(id));
        return (
          <section key={id} id={id} className="sp-sec">
            <div className="sp-inner">
              <div className="sp-img"><img src={d.img} alt={d.label} loading="lazy"/></div>
              <div className="sp-content">
                <h2 className="bs-mark">{d.headline}</h2>
                <p className="sp-intro">{d.intro}</p>
                <h3>Key Challenges We Address</h3>
                <ul className="ch-list">{d.ch.map((c,i)=><li key={i}><span className="ch-dot"/>{c}</li>)}</ul>
                <div className="sp-prods">
                  <h3>Our Products for {d.label}</h3>
                  {prods.map(p=><Link to={`/products/${p.id}`} key={p.id} className="sp-pl"><span className="sol-plus">+</span><div><span className="spn">{p.name}</span><span className="sps">{p.subtitle}</span></div></Link>)}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
