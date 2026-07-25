import { Link } from 'react-router-dom';
import './Group.css';

/* Manufacturing scope of the group, as published by Berg + Schmidt Animal
   Nutrition (an.berg-schmidt.com/unternehmen/stern-wywiol-gruppe). */
const CAPABILITIES = [
  'Feed additives',
  'Fat powders',
  'Lecithins',
  'Flour improvers',
  'Enzymes',
  'Baking ingredients',
  'Stabilising systems for delicatessen, milk, meat and fish products',
  'Vitamin and mineral premixes',
  'Flavourings',
  'Cosmetic ingredients',
  'Oleochemical specialities',
];

export default function Group() {
  return (
    <main className="grp-page">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <h1 className="bs-mark">Stern-Wywiol Gruppe</h1>
          <p>A strong international partner — our know-how connection.</p>
        </div>
      </div>

      <section className="grp-sec">
        <div className="grp-inner grp-two-col">
          <div>
            <h2 className="bs-mark">Part of an International Family Business</h2>
            <p>Berg + Schmidt India is part of the Stern-Wywiol Gruppe, an internationally active, owner-managed family business. Together with its 19 specialised companies, the Group is one of the most successful organisations in the Food &amp; Feed Ingredients sector, producing ingredients and functional systems for food and pet food.</p>
            <p>Berg + Schmidt India brings that group expertise to India&rsquo;s poultry and dairy sectors.</p>
          </div>
          <aside className="grp-facts">
            <div className="grp-fact"><span className="grp-fact-num">19</span><span className="grp-fact-label">Specialised companies</span></div>
            <div className="grp-fact"><span className="grp-fact-num">Family</span><span className="grp-fact-label">Owner-managed business</span></div>
            <div className="grp-fact"><span className="grp-fact-num">Global</span><span className="grp-fact-label">Food &amp; Feed Ingredients</span></div>
          </aside>
        </div>
      </section>

      <section className="grp-quote-sec">
        <div className="grp-inner">
          <blockquote className="grp-quote">
            <p>&ldquo;All over the world, nutrition plays a crucial role in the lives of humans and animals. It not only influences health and well-being but is also an expression of culture and lifestyle.&rdquo;</p>
            <cite>Torsten Wywiol — CEO, Stern-Wywiol Gruppe</cite>
          </blockquote>
        </div>
      </section>

      <section className="grp-sec grp-sec-alt">
        <div className="grp-inner">
          <h2 className="bs-mark">What the Group Manufactures</h2>
          <ul className="grp-caps">
            {CAPABILITIES.map(c => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </section>

      <section className="grp-sec">
        <div className="grp-inner grp-closing">
          <h2 className="bs-mark">Berg + Schmidt Animal Nutrition Within the Group</h2>
          <p>Within the Stern-Wywiol Gruppe, Berg + Schmidt Animal Nutrition has established itself as an expert in feed fats and additives, offering customised solutions that improve animal health and performance while delivering economic value. Berg + Schmidt India brings that expertise to Indian producers, nutritionists and feed manufacturers.</p>
          <div className="grp-actions">
            <Link to="/v2/company" className="btn-primary">About Berg + Schmidt India</Link>
            <a href="https://an.berg-schmidt.com/unternehmen/stern-wywiol-gruppe/" target="_blank" rel="noreferrer" className="btn-outline">Visit the Group page</a>
          </div>
        </div>
      </section>
    </main>
  );
}
