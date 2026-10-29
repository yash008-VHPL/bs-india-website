import { Link } from 'react-router-dom';
import { useCart } from './cart';
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
  return (
    <div className="shop-qty" role="group" aria-label={label || 'Quantity'}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" disabled={value <= 1}>-</button>
      <input
        type="number" min="1" max="99" inputMode="numeric" value={value}
        onChange={e => onChange(e.target.value === '' ? 1 : Number(e.target.value))}
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
        <div className="shop-sum-total"><dt>Total</dt><dd>{formatINR(subtotal)}</dd></div>
      </dl>
      <p className="shop-fine">Total shown before GST and delivery.</p>
      {children}
    </aside>
  );
}

export function DistributorLink({ className = '' }) {
  return <Link to={DISTRIBUTOR_LINK} className={`shop-dist ${className}`}>Find your regional distributor →</Link>;
}
