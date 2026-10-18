/* DijkKruid winkelmand
 * ---------------------------------------------------------------
 * Eén bestand voor de hele webshop-voorbereiding:
 *  - gebruikt de producten en prijzen uit products.json
 *  - winkelmand (onthoudt de keuze in de browser van de bezoeker)
 *  - winkelmandknop in de header + uitschuifbare winkelmand
 *  - "In winkelmand"-knoppen op de productkaarten en productpagina's
 *  - voorbereiding op afrekenen (zie CHECKOUT_ENABLED en startCheckout)
 */
(function () {
  'use strict';

  /* ============ INSTELLINGEN ============ */

  // Zet op true zodra afrekenen werkt, en vul startCheckout() hieronder in.
  var CHECKOUT_ENABLED = false;

  /* De producten en prijzen komen uit products.json (via catalog.js).
   * Pas ze aan met beheer.html. Of de webshop zichtbaar is, staat ook in
   * products.json (settings.shopEnabled). */
  var PRODUCTS = []; // wordt gevuld zodra products.json geladen is

  /* ============ HULPFUNCTIES ============ */

  var STORAGE_KEY = 'dijkkruid-cart';
  var MAX_QTY = 99;
  var memoryCart = {}; // reserve als de browser opslaan niet toestaat

  var money = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
  function fmt(cents) { return money.format(cents / 100); }

  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }

  // Alleen beschikbare producten met een prijs kunnen in de winkelmand.
  function isBuyable(p) { return !!p && p.status === 'available' && p.price != null; }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /* ============ WINKELMAND-LOGICA ============ */

  function sanitize(raw) {
    var clean = {};
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (id) {
        var qty = parseInt(raw[id], 10);
        if (isBuyable(findProduct(id)) && qty > 0) clean[id] = Math.min(qty, MAX_QTY);
      });
    }
    return clean;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return sanitize(raw ? JSON.parse(raw) : {});
    } catch (e) { return sanitize(memoryCart); }
  }

  function save(cart) {
    memoryCart = cart;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* geen opslag beschikbaar */ }
  }

  function addItem(id) {
    var cart = load();
    cart[id] = Math.min((cart[id] || 0) + 1, MAX_QTY);
    save(cart); render();
  }

  function setQty(id, qty) {
    var cart = load();
    if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, MAX_QTY);
    save(cart); render();
  }

  function clearCart() { save({}); render(); }

  function summary() {
    var cart = load(), items = [], total = 0, count = 0;
    PRODUCTS.forEach(function (p) {
      var qty = cart[p.id];
      if (!qty || !isBuyable(p)) return;
      var line = p.price * qty;
      items.push({ id: p.id, name: p.name, image: p.image, unitPrice: p.price, qty: qty, lineTotal: line });
      total += line; count += qty;
    });
    return { items: items, total: total, count: count, currency: 'EUR' };
  }

  /* ============ AFREKENEN (voorbereiding) ============ */

  /* Dit is de gegevensset die een betaaldienst later nodig heeft: per artikel
   * id, naam, stukprijs (in centen), aantal en regeltotaal, plus het totaal.
   * Prijzen worden altijd opnieuw uit PRODUCTS gehaald; de browser slaat alleen
   * id's en aantallen op. Voor een echte betaling moet de prijs ook serverside
   * gecontroleerd worden (door de betaaldienst of een klein serverprogramma). */
  function getCheckoutPayload() {
    var s = summary();
    return { currency: s.currency, items: s.items.map(function (i) {
      return { id: i.id, name: i.name, unitPrice: i.unitPrice, qty: i.qty, lineTotal: i.lineTotal };
    }), total: s.total };
  }

  function startCheckout(payload) {
    /* TODO: hier komt later het afrekenen. Mogelijkheden:
     *  - Mollie of Stripe: stuur payload naar een betaalpagina (heeft een klein
     *    serverprogramma of een dienst als Stripe Payment Links nodig)
     *  - Of een e-mailbestelling: bouw een mailto-link met de inhoud van payload
     * Zet daarna CHECKOUT_ENABLED op true. */
    console.log('Afrekenen nog niet gekoppeld', payload);
  }

  // Handig voor later, en om in de browserconsole te testen.
  window.DijkKruidShop = { getCheckoutPayload: getCheckoutPayload };

  /* ============ OPMAAK ============ */

  function injectStyles() {
    var css = [
      '.shop-buy{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:16px}',
      '.product-card .shop-buy{justify-content:space-between;flex-wrap:nowrap}',
      '.shop-soldout{font-weight:600;font-size:.9rem;color:var(--ink-soft);border:1.5px dashed rgba(47,74,60,.4);border-radius:100px;padding:8px 16px}',
      '.shop-price{font-family:"Fraunces",serif;font-weight:600;font-size:1.25rem;color:var(--heading)}',
      '.add-to-cart{background:var(--dike);color:var(--on-accent);border:0;border-radius:100px;padding:11px 20px;font:600 .92rem "Work Sans",sans-serif;cursor:pointer;transition:transform .15s ease,background .2s}',
      '.add-to-cart:hover{transform:translateY(-1px)}',
      '.add-to-cart:focus-visible,.cart-btn:focus-visible,.shop-close:focus-visible,.shop-qty button:focus-visible,.shop-remove:focus-visible,.shop-clear:focus-visible{outline:3px solid var(--sun);outline-offset:2px}',
      '.add-to-cart.added{background:var(--sun);color:#232920}',
      '.cart-btn{position:relative;background:none;border:1.5px solid rgba(47,74,60,.35);color:var(--heading);width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}',
      '.cart-btn svg{width:18px;height:18px}',
      '.cart-badge{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;padding:0 5px;border-radius:100px;background:var(--sun);color:#232920;font:700 .7rem/19px "Work Sans",sans-serif;text-align:center}',
      '.cart-badge[hidden]{display:none}',
      '.cart-badge.bump{animation:shopBump .35s ease}',
      '@keyframes shopBump{50%{transform:scale(1.3)}}',
      '.shop-overlay{position:fixed;inset:0;background:rgba(20,24,17,.5);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility .25s;z-index:998}',
      '.shop-overlay.open{opacity:1;visibility:visible}',
      '.shop-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);background:var(--linen);color:var(--ink);display:flex;flex-direction:column;transform:translateX(100%);visibility:hidden;transition:transform .3s ease,visibility .3s;z-index:999;box-shadow:-8px 0 30px rgba(0,0,0,.18)}',
      '.shop-drawer.open{transform:none;visibility:visible}',
      '.shop-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid rgba(47,74,60,.15)}',
      '.shop-head h2{font-family:"Fraunces",serif;font-size:1.4rem;color:var(--heading)}',
      '.shop-close{background:none;border:0;color:var(--heading);font-size:1.9rem;line-height:1;cursor:pointer;padding:2px 8px;border-radius:8px}',
      '.shop-body{flex:1;overflow-y:auto;padding:8px 22px}',
      '.shop-empty{padding:40px 0;text-align:center;color:var(--ink-soft)}',
      '.shop-list{list-style:none}',
      '.shop-item{display:grid;grid-template-columns:64px 1fr auto;gap:14px;align-items:center;padding:16px 0;border-bottom:1px solid rgba(47,74,60,.12)}',
      '.shop-item img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:var(--straw)}',
      '.shop-item-name{font-weight:600;font-size:.95rem;line-height:1.3;color:var(--heading)}',
      '.shop-item-price{font-size:.85rem;color:var(--ink-soft);margin-top:2px}',
      '.shop-qty{display:inline-flex;align-items:center;gap:4px;margin-top:8px}',
      '.shop-qty button{width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(47,74,60,.35);background:none;color:var(--heading);font-size:1.05rem;line-height:1;cursor:pointer}',
      '.shop-qty output{min-width:28px;text-align:center;font-weight:600}',
      '.shop-line{text-align:right;font-weight:600;color:var(--heading)}',
      '.shop-remove{display:block;margin:8px 0 0 auto;background:none;border:0;color:var(--ink-soft);font:500 .8rem "Work Sans",sans-serif;text-decoration:underline;cursor:pointer;padding:2px}',
      '.shop-foot{padding:18px 22px 22px;border-top:1px solid rgba(47,74,60,.15)}',
      '.shop-total{display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;color:var(--heading);margin-bottom:14px}',
      '.shop-checkout{width:100%;border:0;border-radius:100px;padding:14px;background:var(--dike);color:var(--on-accent);font:600 1rem "Work Sans",sans-serif;cursor:pointer}',
      '.shop-checkout:disabled{opacity:.55;cursor:not-allowed}',
      '.shop-note{margin-top:10px;font-size:.82rem;color:var(--ink-soft);text-align:center}',
      '.shop-clear{display:block;margin:12px auto 0;background:none;border:0;color:var(--ink-soft);font:500 .82rem "Work Sans",sans-serif;text-decoration:underline;cursor:pointer}',
      '.shop-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
      'html.shop-lock{overflow:hidden}',
      '@media(prefers-reduced-motion:reduce){.shop-drawer,.shop-overlay,.add-to-cart,.cart-badge.bump{transition:none;animation:none}}'
    ].join('\n');
    document.head.appendChild(el('style', { text: css }));
  }

  /* ============ ONDERDELEN OPBOUWEN ============ */

  var ui = {}; // verwijzingen naar de onderdelen
  var lastFocus = null;

  function buildCartButton() {
    var host = document.querySelector('.nav-right');
    if (!host) return;
    var svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.2 11h10.4l2-8H6.3"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>';
    var btn = el('button', { class: 'cart-btn', type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'shopDrawer' });
    btn.innerHTML = svg; // vaste, eigen markup
    ui.badge = el('span', { class: 'cart-badge', hidden: '' });
    btn.appendChild(ui.badge);
    btn.addEventListener('click', openDrawer);
    host.insertBefore(btn, host.firstChild);
    ui.cartBtn = btn;
  }

  function buildDrawer() {
    ui.overlay = el('div', { class: 'shop-overlay' });
    ui.overlay.addEventListener('click', closeDrawer);

    var close = el('button', { class: 'shop-close', type: 'button', 'aria-label': 'Winkelmand sluiten', text: '×' });
    close.addEventListener('click', closeDrawer);
    ui.close = close;

    ui.body = el('div', { class: 'shop-body' });
    ui.foot = el('div', { class: 'shop-foot' });
    ui.live = el('div', { class: 'shop-live', 'aria-live': 'polite', role: 'status' });

    ui.drawer = el('aside', { class: 'shop-drawer', id: 'shopDrawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'shopTitle', 'aria-hidden': 'true' }, [
      el('div', { class: 'shop-head' }, [el('h2', { id: 'shopTitle', text: 'Winkelmand' }), close]),
      ui.body, ui.foot
    ]);

    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.drawer);
    document.body.appendChild(ui.live);

    document.addEventListener('keydown', function (e) {
      if (!ui.drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var f = ui.drawer.querySelectorAll('button:not([disabled]),a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    ui.drawer.classList.add('open');
    ui.overlay.classList.add('open');
    ui.drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('shop-lock');
    ui.close.focus();
  }

  function closeDrawer() {
    ui.drawer.classList.remove('open');
    ui.overlay.classList.remove('open');
    ui.drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('shop-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ============ WEERGAVE VERNIEUWEN ============ */

  var previousCount = null;

  function render() {
    var s = summary();

    if (ui.badge) {
      ui.badge.textContent = s.count;
      ui.badge.hidden = s.count === 0;
      if (previousCount !== null && s.count > previousCount) {
        ui.badge.classList.remove('bump'); void ui.badge.offsetWidth; ui.badge.classList.add('bump');
      }
      ui.cartBtn.setAttribute('aria-label', 'Winkelmand, ' + s.count + (s.count === 1 ? ' artikel' : ' artikelen'));
    }
    previousCount = s.count;

    if (!ui.body) return;
    ui.body.textContent = '';
    ui.foot.textContent = '';

    if (!s.items.length) {
      ui.body.appendChild(el('p', { class: 'shop-empty', text: 'Je winkelmand is nog leeg.' }));
      return;
    }

    var list = el('ul', { class: 'shop-list' });
    s.items.forEach(function (it) {
      var minus = el('button', { type: 'button', 'aria-label': 'Minder ' + it.name, text: '−' });
      var plus = el('button', { type: 'button', 'aria-label': 'Meer ' + it.name, text: '+' });
      var remove = el('button', { class: 'shop-remove', type: 'button', text: 'Verwijder', 'aria-label': it.name + ' verwijderen' });
      minus.addEventListener('click', function () { setQty(it.id, it.qty - 1); });
      plus.addEventListener('click', function () { setQty(it.id, it.qty + 1); });
      remove.addEventListener('click', function () { setQty(it.id, 0); });

      list.appendChild(el('li', { class: 'shop-item' }, [
        el('img', { src: it.image, alt: '' }),
        el('div', null, [
          el('div', { class: 'shop-item-name', text: it.name }),
          el('div', { class: 'shop-item-price', text: fmt(it.unitPrice) + ' per stuk' }),
          el('div', { class: 'shop-qty' }, [minus, el('output', { text: String(it.qty) }), plus])
        ]),
        el('div', null, [el('div', { class: 'shop-line', text: fmt(it.lineTotal) }), remove])
      ]));
    });
    ui.body.appendChild(list);

    var checkout = el('button', { class: 'shop-checkout', type: 'button', text: CHECKOUT_ENABLED ? 'Afrekenen' : 'Afrekenen (binnenkort)' });
    if (CHECKOUT_ENABLED) checkout.addEventListener('click', function () { startCheckout(getCheckoutPayload()); });
    else checkout.disabled = true;

    var clear = el('button', { class: 'shop-clear', type: 'button', text: 'Winkelmand legen' });
    clear.addEventListener('click', clearCart);

    ui.foot.appendChild(el('div', { class: 'shop-total' }, [el('span', { text: 'Totaal' }), el('span', { text: fmt(s.total) })]));
    ui.foot.appendChild(checkout);
    if (!CHECKOUT_ENABLED) ui.foot.appendChild(el('p', { class: 'shop-note', text: 'Online afrekenen volgt binnenkort. Je winkelmand blijft bewaard op dit apparaat.' }));
    ui.foot.appendChild(clear);
  }

  /* ============ KNOPPEN OP DE PRODUCTEN ============ */

  function buyBlock(product) {
    if (product.price == null) return null;
    if (product.status === 'soldout') {
      return el('div', { class: 'shop-buy' }, [el('span', { class: 'shop-price', text: fmt(product.price) }), el('span', { class: 'shop-soldout', text: 'Tijdelijk uitverkocht' })]);
    }
    var btn = el('button', { class: 'add-to-cart', type: 'button', text: 'In winkelmand', 'aria-label': product.name + ' in winkelmand' });
    var timer;
    btn.addEventListener('click', function () {
      addItem(product.id);
      ui.live.textContent = product.name + ' is toegevoegd aan je winkelmand.';
      btn.textContent = 'Toegevoegd ✓';
      btn.classList.add('added');
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'In winkelmand'; btn.classList.remove('added'); }, 1500);
    });
    return el('div', { class: 'shop-buy' }, [el('span', { class: 'shop-price', text: fmt(product.price) }), btn]);
  }

  function mountBuyButtons() {
    // Startpagina: kaarten. Productpagina: secties. Beide krijgen data-product van catalog.js.
    document.querySelectorAll('.product-card[data-product]').forEach(function (card) {
      var copy = card.querySelector('.product-copy');
      var block = findProduct(card.getAttribute('data-product'));
      block = block && buyBlock(block);
      if (copy && block) copy.appendChild(block);
    });
    document.querySelectorAll('section.product[data-product]').forEach(function (section) {
      var copy = section.querySelector('.product-copy');
      var block = findProduct(section.getAttribute('data-product'));
      block = block && buyBlock(block);
      if (!copy || !block) return;
      var back = copy.querySelector('.back-link');
      if (back) copy.insertBefore(block, back); else copy.appendChild(block);
    });
  }

  /* ============ START ============ */

  function init() {
    if (!window.DijkKruidCatalog) return;
    window.DijkKruidCatalog.ready.then(function (data) {
      if (data.settings.shopEnabled === false) return; // webshop uitgeschakeld in products.json
      PRODUCTS = data.products.map(function (p) {
        return { id: p.id, name: p.name, image: p.image, status: p.status,
                 price: p.price == null ? null : Math.round(p.price * 100) };
      });
      injectStyles();
      buildCartButton();
      buildDrawer();
      mountBuyButtons();
      render();
      window.addEventListener('storage', function (e) { if (e.key === STORAGE_KEY) render(); });
    }).catch(function () { /* producten niet geladen: geen webshop */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
