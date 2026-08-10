/* =========================================================
   Shared prototype logic.
   NOTE: cart state here is kept in memory only (resets on
   page navigation) since this is a static HTML prototype.
   In Shopify, cart state persists automatically via the
   cart cookie + AJAX Cart API (/cart/add.js, /cart.js) —
   you won't need to port this in-memory object, just the
   UI it drives.
   ========================================================= */

const Cart = {
  items: JSON.parse(sessionStorage.getItem('proto_cart') || 'null') || [],

  add(item){
    const existing = this.items.find(i => i.id === item.id && i.size === item.size);
    if (existing) existing.qty += item.qty;
    else this.items.push(item);
    this.persist();
    this.renderAll();
  },
  remove(id, size){
    this.items = this.items.filter(i => !(i.id === id && i.size === size));
    this.persist();
    this.renderAll();
  },
  setQty(id, size, qty){
    const it = this.items.find(i => i.id === id && i.size === size);
    if (it){ it.qty = Math.max(1, qty); }
    this.persist();
    this.renderAll();
  },
  count(){ return this.items.reduce((s,i)=>s+i.qty,0); },
  subtotal(){ return this.items.reduce((s,i)=>s+i.qty*i.price,0); },
  persist(){ sessionStorage.setItem('proto_cart', JSON.stringify(this.items)); },

  renderAll(){
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = this.count());
    this.renderDrawer();
    if (document.querySelector('[data-cart-page]')) renderCartPage();
  },

  renderDrawer(){
    const body = document.querySelector('[data-drawer-body]');
    const foot = document.querySelector('[data-drawer-foot]');
    if (!body) return;
    if (this.items.length === 0){
      body.innerHTML = `<div class="empty-state" style="padding:48px 0;">
        <p style="margin-bottom:20px;">Your bag is empty.</p>
        <a href="shop.html" class="btn">Browse the collection</a>
      </div>`;
      if (foot) foot.style.display = 'none';
      return;
    }
    if (foot) foot.style.display = 'block';
    body.innerHTML = this.items.map(i => `
      <div class="cart-item">
        <img src="${i.img}" alt="${i.name}">
        <div>
          <div class="cart-item-title">${i.name}</div>
          <div class="cart-item-meta">Size ${i.size} · Qty ${i.qty}</div>
          <button class="cart-item-remove" onclick="Cart.remove('${i.id}','${i.size}')">Remove</button>
        </div>
        <div class="cart-item-price">$${(i.price*i.qty).toFixed(2)}</div>
      </div>
    `).join('');
    const foot2 = document.querySelector('[data-drawer-foot]');
    if (foot2) foot2.innerHTML = `
      <div class="summary-row total"><span>Subtotal</span><span>$${this.subtotal().toFixed(2)}</span></div>
      <a href="cart.html" class="btn btn-block" style="margin-top:16px;">View bag & checkout</a>
    `;
  }
};

function renderCartPage(){
  const listEl = document.querySelector('[data-cart-list]');
  const emptyEl = document.querySelector('[data-cart-empty]');
  const summaryEl = document.querySelector('[data-cart-summary]');
  if (!listEl) return;

  if (Cart.items.length === 0){
    listEl.style.display = 'none';
    summaryEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  listEl.style.display = 'block';
  summaryEl.style.display = 'block';
  emptyEl.style.display = 'none';

  listEl.innerHTML = Cart.items.map(i => `
    <div class="cart-item">
      <img src="${i.img}" alt="${i.name}">
      <div>
        <div class="cart-item-title">${i.name}</div>
        <div class="cart-item-meta">Size ${i.size}</div>
        <div class="qty-row cart-item-qty">
          <button aria-label="Decrease quantity" onclick="Cart.setQty('${i.id}','${i.size}', ${i.qty-1})">–</button>
          <input type="text" readonly value="${i.qty}">
          <button aria-label="Increase quantity" onclick="Cart.setQty('${i.id}','${i.size}', ${i.qty+1})">+</button>
        </div>
        <button class="cart-item-remove" style="margin-top:10px;" onclick="Cart.remove('${i.id}','${i.size}')">Remove</button>
      </div>
      <div class="cart-item-price">$${(i.price*i.qty).toFixed(2)}</div>
    </div>
  `).join('');

  const sub = Cart.subtotal();
  const shipping = sub > 150 || sub === 0 ? 0 : 12;
  summaryEl.innerHTML = `
    <h3 style="font-size:16px; margin-bottom:20px;">Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>$${sub.toFixed(2)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : '$'+shipping.toFixed(2)}</span></div>
    <div class="summary-row total"><span>Total</span><span>$${(sub+shipping).toFixed(2)}</span></div>
    <button class="btn btn-block" style="margin-top:20px;" onclick="showToast('Checkout would hand off to Shopify here')">Checkout</button>
    <p class="summary-note">Taxes calculated at checkout. Free shipping over $150.</p>
  `;
}

function showToast(msg){
  let t = document.querySelector('.toast');
  if (!t){
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=> t.classList.remove('show'), 2600);
}

function openDrawer(){
  document.querySelector('[data-drawer]')?.classList.add('open');
  document.querySelector('[data-drawer-backdrop]')?.classList.add('open');
}
function closeDrawer(){
  document.querySelector('[data-drawer]')?.classList.remove('open');
  document.querySelector('[data-drawer-backdrop]')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  Cart.renderAll();

  document.querySelector('[data-cart-open]')?.addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]')?.addEventListener('click', closeDrawer);
  document.querySelector('[data-drawer-backdrop]')?.addEventListener('click', closeDrawer);

  // quick-add buttons on grid cards
  document.querySelectorAll('[data-quickadd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const d = btn.dataset;
      Cart.add({ id:d.id, name:d.name, price:parseFloat(d.price), img:d.img, size: 'M', qty: 1 });
      showToast(`${d.name} added to bag`);
      openDrawer();
    });
  });

  // filter chips (shop page)
  const chips = document.querySelectorAll('[data-filter-chip]');
  const cards = document.querySelectorAll('[data-product-card]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const f = chip.dataset.filterChip;
      let shown = 0;
      cards.forEach(card => {
        const match = f === 'all' || card.dataset.category === f;
        card.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      const rc = document.querySelector('[data-result-count]');
      if (rc) rc.textContent = `${shown} piece${shown===1?'':'s'}`;
    });
  });

  // sort (shop page)
  document.querySelector('[data-sort]')?.addEventListener('change', (e) => {
    const grid = document.querySelector('[data-grid]');
    const arr = Array.from(grid.querySelectorAll('[data-product-card]'));
    const val = e.target.value;
    arr.sort((a,b) => {
      const pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
      if (val === 'price-asc') return pa - pb;
      if (val === 'price-desc') return pb - pa;
      if (val === 'name') return a.dataset.name.localeCompare(b.dataset.name);
      return 0;
    });
    arr.forEach(card => grid.appendChild(card));
  });

  // PDP: thumbnail switch
  document.querySelectorAll('[data-thumb]').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('[data-thumb]').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const mainImg = document.querySelector('[data-main-img]');
      if (mainImg) mainImg.src = thumb.querySelector('img').src;
    });
  });

  // PDP: size select
  document.querySelectorAll('[data-size-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('[data-size-btn]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector('[data-selected-size]').textContent = btn.textContent.trim();
      document.querySelector('[data-add-to-cart]')?.removeAttribute('disabled');
    });
  });

  // PDP: quantity stepper
  const qtyInput = document.querySelector('[data-qty-input]');
  document.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1);
  });
  document.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  // PDP: add to cart
  document.querySelector('[data-add-to-cart]')?.addEventListener('click', () => {
    const d = document.querySelector('[data-pdp]').dataset;
    const size = document.querySelector('[data-selected-size]').textContent.trim();
    const qty = parseInt(qtyInput?.value || 1);
    Cart.add({ id:d.id, name:d.name, price:parseFloat(d.price), img:d.img, size, qty });
    showToast(`${d.name} (${size}) added to bag`);
    openDrawer();
  });

  // PDP: accordion
  document.querySelectorAll('[data-accordion-trigger]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const panel = item.querySelector('.accordion-panel');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.accordion-panel').style.maxHeight = null;
      });
      if (!isOpen){
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // wishlist toggle (PDP)
  document.querySelector('[data-wishlist]')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('active');
  });

  // newsletter forms
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('You\'re on the list.');
      form.reset();
    });
  });

  // mobile hamburger
  document.querySelector('[data-hamburger]')?.addEventListener('click', () => {
    document.querySelector('[data-mobile-nav]')?.classList.toggle('open');
  });
});
