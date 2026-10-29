import { useState } from 'react';
import { Link } from 'react-router-dom';
import usePageMeta from '../usePageMeta';
import { useCart } from '../shop/cart';
import { formatINR } from '../shop/demo';
import { DemoNote, Summary } from '../shop/parts';
import './Shop.css';

/*
 * Demo checkout. Nothing is sent anywhere: the form is validated in the
 * browser, the cart is cleared and a demo confirmation is shown. The real
 * build replaces onSubmit with order creation and the Razorpay checkout.
 */
const FIELDS = [
  { id: 'name',     label: 'Full name',               req: true,  auto: 'name' },
  { id: 'mobile',   label: 'Mobile number',           req: true,  auto: 'tel', type: 'tel', pattern: /^[6-9]\d{9}$/, hint: '10-digit mobile number' },
  { id: 'email',    label: 'Email',                   req: true,  auto: 'email', type: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, hint: 'A valid email address' },
  { id: 'business', label: 'Farm or business name',   req: false, auto: 'organization' },
  { id: 'gstin',    label: 'GSTIN (optional)',        req: false, pattern: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, hint: '15-character GSTIN', upper: true },
  { id: 'address',  label: 'Delivery address',        req: true,  auto: 'street-address', wide: true },
  { id: 'city',     label: 'City or town',            req: true,  auto: 'address-level2' },
  { id: 'state',    label: 'State',                   req: true,  auto: 'address-level1' },
  { id: 'pin',      label: 'PIN code',                req: true,  auto: 'postal-code', pattern: /^[1-9]\d{5}$/, hint: '6-digit PIN code', inputMode: 'numeric' },
];

export default function ShopCheckout() {
  usePageMeta('Checkout - Shop', 'Checkout.', { path: '/shop/checkout', noindex: true });
  const { lines, subtotal, clear, ready } = useCart();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const validate = () => {
    const e = {};
    for (const f of FIELDS) {
      const v = (form[f.id] || '').trim();
      if (f.req && !v) e[f.id] = 'Required';
      else if (v && f.pattern && !f.pattern.test(v)) e[f.id] = f.hint;
    }
    setErrors(e);
    return e;
  };

  const submit = ev => {
    ev.preventDefault();
    const e = validate();
    const first = FIELDS.find(f => e[f.id]);
    if (first) { document.getElementById(`co-${first.id}`)?.focus(); return; }
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    setDone({ ref: `DEMO-${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`, total: subtotal, name: form.name.trim() });
    clear();
    window.scrollTo(0, 0);
  };

  if (done) return (
    <main className="shop-page">
      <DemoNote />
      <section className="shop-body">
        <div className="shop-inner shop-narrow">
          <div className="shop-panel shop-confirm">
            <div className="shop-confirm-tick" aria-hidden="true">✓</div>
            <h1 className="bs-mark bs-mark--center">Demo Order Received</h1>
            <p>Thank you, {done.name}. In the live store this is where the customer sees the payment confirmation.</p>
            <dl className="shop-sum">
              <div><dt>Order reference</dt><dd>{done.ref}</dd></div>
              <div><dt>Amount (before GST and delivery)</dt><dd>{formatINR(done.total)}</dd></div>
            </dl>
            <p className="shop-fine">Demo only. No payment was taken, no order was placed and none of the details entered were sent anywhere.</p>
            <Link to="/shop" className="btn-primary">Back to Shop</Link>
          </div>
        </div>
      </section>
    </main>
  );

  return (
    <main className="shop-page">
      <DemoNote />
      <div className="pg-hero"><div className="pg-hero-inner">
        <h1 className="bs-mark">Checkout</h1>
      </div></div>
      <section className="shop-body">
        <div className="shop-inner">
          {ready && !lines.length && (
            <div className="shop-panel shop-emptycart">
              <h2 className="shop-h">Your cart is empty</h2>
              <p>Add products to your cart before checking out.</p>
              <Link to="/shop" className="btn-primary">Browse Products</Link>
            </div>
          )}
          {lines.length > 0 && (
            <form className="shop-cols" onSubmit={submit} noValidate>
              <div className="shop-panel">
                <h2 className="shop-h">Delivery Details</h2>
                <div className="shop-form">
                  {FIELDS.map(f => (
                    <label key={f.id} className={`shop-field${f.wide ? ' shop-field--wide' : ''}${errors[f.id] ? ' shop-field--err' : ''}`}>
                      <span>{f.label}{f.req && <em aria-hidden="true"> *</em>}</span>
                      {f.wide
                        ? <textarea id={`co-${f.id}`} rows="3" autoComplete={f.auto} value={form[f.id] || ''}
                            aria-invalid={!!errors[f.id]} onChange={e => setForm({ ...form, [f.id]: e.target.value })} />
                        : <input id={`co-${f.id}`} type={f.type || 'text'} autoComplete={f.auto} inputMode={f.inputMode}
                            value={form[f.id] || ''} aria-invalid={!!errors[f.id]}
                            onChange={e => setForm({ ...form, [f.id]: f.upper ? e.target.value.toUpperCase() : e.target.value })} />}
                      {errors[f.id] && <small role="alert">{errors[f.id]}</small>}
                    </label>
                  ))}
                </div>

                <h2 className="shop-h shop-h--gap">Payment</h2>
                <label className="shop-pay">
                  <input type="radio" name="pay" defaultChecked />
                  <span><strong>Pay online with Razorpay</strong><br />UPI, cards and net banking</span>
                </label>
                <p className="shop-fine">In this demo the payment step is simulated. No payment window opens.</p>
              </div>
              <Summary subtotal={subtotal} lines={lines}>
                <button type="submit" className="btn-primary shop-wide">Pay {formatINR(subtotal)} (Demo)</button>
                <Link to="/shop/cart" className="shop-more">← Back to cart</Link>
              </Summary>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
