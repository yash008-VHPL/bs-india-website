import { Link } from 'react-router-dom';
import usePageMeta from '../usePageMeta';
import { useCart } from '../shop/context';
import { formatINR } from '../shop/demo';
import { DemoNote, ProductName, QtyStepper, Summary } from '../shop/parts';
import './Shop.css';

export default function ShopCart() {
  usePageMeta('Cart - Shop', 'Your cart.', { path: '/shop/cart', noindex: true });
  const { lines, subtotal, setQty, ready } = useCart();

  return (
    <main className="shop-page">
      <DemoNote />
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Your Cart</h1>
      </div></div>
      <section className="shop-body">
        <div className="shop-inner">
          {ready && !lines.length && (
            <div className="shop-panel shop-emptycart">
              <h2 className="shop-h">Your cart is empty</h2>
              <p>Browse the range and add products to your cart.</p>
              <Link to="/shop" className="btn-primary">Browse Products</Link>
            </div>
          )}
          {lines.length > 0 && (
            <div className="shop-cols">
              <div className="shop-panel">
                <div className="shop-lines">
                  {lines.map(({ product: p, qty, unit, total, pack }) => (
                    <div key={p.id} className="shop-line">
                      <Link to={`/shop/${p.id}`} className="shop-line-name">
                        <ProductName p={p} />
                        <span className="shop-pack">{p.subtitle}</span>
                        <span className="shop-pack">{pack} · {formatINR(unit)} each</span>
                      </Link>
                      <QtyStepper value={qty} onChange={n => setQty(p.id, Math.max(1, n))} label={`Quantity of ${p.name}`} />
                      <div className="shop-line-total">{formatINR(total)}</div>
                      <button type="button" className="shop-remove" onClick={() => setQty(p.id, 0)} aria-label={`Remove ${p.name}`}>Remove</button>
                    </div>
                  ))}
                </div>
                <Link to="/shop" className="shop-more">← Continue shopping</Link>
              </div>
              <Summary subtotal={subtotal}>
                <Link to="/shop/checkout" className="btn-primary shop-wide">Proceed to Checkout</Link>
              </Summary>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
