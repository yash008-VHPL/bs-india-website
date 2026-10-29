import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './context';
import { formatINR, DISTRIBUTOR_LINK } from './demo';

export function DemoNote() {
  return (
    <div className="shop-demo-note" role="note">
      <strong>Demo store</strong>
      <span>For internal review only. Prices are dummy figures. Nothing here takes payment or places an order.</span>
    </div>
  );
}

export function QtyStepper({ value, onChange, label }) {
  // The field may be empty while typing; it commits on a valid number and
  // falls back to the current quantity when left empty.
  const [draft, setDraft] = useState(null);
  return (
    <div className="shop-qty" role="group" aria-label={label || 'Quantity'}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" disabled={value <= 1}>-</button>
      <input
        type="number" min="1" max="99" inputMode="numeric" value={draft ?? value}
        onChange={e => { const v = e.target.value; setDraft(v); if (v !== '' && Number(v) >= 1) onChange(Number(v)); }}
        onBlur={() => setDraft(null)}
        aria-label="Quantity"
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity" disabled={value >= 99}>+</button>
    </div>
  );
}

export function ProductName({ p, className = '' }) {
  return p.logo
    ? <img src={p.logo} alt={p.name} className={`shop-logo ${className}`} />
    : <span className={`shop-name ${className}`}><span className="sol-plus" aria-hidden="true" />{p.name}</span>;
}

export function CartBar() {
  const { count, subtotal } = useCart();
  // Reserve room under the footer so the fixed bar never covers it.
  useEffect(() => {
    if (!count) return;
    document.body.classList.add('has-cartbar');
    return () => document.body.classList.remove('has-cartbar');
  }, [count]);
  if (!count) return null;
  return (
    <div className="shop-cartbar">
      <div className="shop-cartbar-inner">
        <span><strong>{count}</strong> {count === 1 ? 'pack' : 'packs'} in cart · {formatINR(subtotal)}</span>
        <Link to="/shop/cart" className="btn-primary">View Cart</Link>
      </div>
    </div>
  );
}

export function Summary({ subtotal, children, lines }) {
  return (
    <aside className="shop-panel shop-summary">
      <h2 className="shop-h">Order Summary</h2>
      {lines && (
        <ul className="shop-sum-lines">
          {lines.map(l => <li key={l.product.id}><span>{l.product.name}, {l.pack} × {l.qty}</span><span>{formatINR(l.total)}</span></li>)}
        </ul>
      )}
      <dl className="shop-sum">
        <div><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
        <div><dt>GST</dt><dd>To be confirmed</dd></div>
        <div><dt>Delivery</dt><dd>To be confirmed</dd></div>
        <div className="shop-sum-total"><dt>Total before GST and delivery</dt><dd>{formatINR(subtotal)}</dd></div>
      </dl>
      {children}
    </aside>
  );
}

export function DistributorLink({ className = '' }) {
  return <Link to={DISTRIBUTOR_LINK} className={`shop-dist ${className}`}>Find your regional distributor →</Link>;
}
