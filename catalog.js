/* DijkKruid productcatalogus
 * ---------------------------------------------------------------
 * Leest products.json en bouwt daaruit:
 *  - de productkaarten op de startpagina   (element #productGrid)
 *  - het overzicht + de productpagina's    (elementen #productNav en #productSections)
 * Producten, prijzen en teksten pas je aan in products.json,
 * het gemakkelijkst via beheer.html (alleen op je eigen computer).
 */
(function () {
  'use strict';

  var DATA_URL = 'products.json';
  var BADGE_ICONS = ['♧', '♡', '✿', '◌'];

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

  // **tekst** wordt vet. Er wordt nooit HTML uit het bestand geïnterpreteerd.
  function richText(str) {
    var frag = document.createDocumentFragment();
    String(str).split('**').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) frag.appendChild(el('strong', { text: part }));
      else frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }

  // Elke regel wordt een alinea. Een regel die met "~" begint wordt kleine grijze tekst.
  function paragraphs(lines) {
    return lines.map(function (line) {
      var muted = /^~\s*/.test(line);
      var p = el('p', muted ? { class: 'muted' } : null);
      p.appendChild(richText(muted ? line.replace(/^~\s*/, '') : line));
      return p;
    });
  }

  function toLines(value) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return String(value || '').split(/\n+/).filter(Boolean);
  }

  function normalize(raw) {
    var price = raw.price === '' || raw.price == null ? null : Number(raw.price);
    // Foto's: images[0] is de hoofdfoto. Producten met alleen "image" blijven werken.
    var images = Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean) : [];
    if (!images.length && raw.image) images = [String(raw.image)];
    images = images.slice(0, 8);
    return {
      id: String(raw.id || '').replace(/[^a-z0-9-]/gi, ''),
      name: String(raw.name || ''),
      category: String(raw.category || ''),
      price: isFinite(price) && price >= 0 ? price : null,
      status: raw.status === 'soldout' || raw.status === 'hidden' ? raw.status : 'available',
      image: images[0] || '',
      images: images,
      summary: toLines(raw.summary),
      lead: String(raw.lead || ''),
      intro: String(raw.intro || ''),
      badges: toLines(raw.badges),
      sections: (raw.sections || []).map(function (s) {
        return { title: String(s.title || ''), text: toLines(s.text) };
      })
    };
  }

  /* ---------- Startpagina: productkaarten ---------- */
  function renderGrid(products) {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    var staticCards = Array.prototype.slice.call(grid.querySelectorAll('[data-static]'));
    Array.prototype.slice.call(grid.children).forEach(function (c) {
      if (staticCards.indexOf(c) === -1) grid.removeChild(c);
    });
    var anchor = staticCards[0] || null;
    products.forEach(function (p) {
      var href = 'producten.html#' + p.id;
      var card = el('div', { class: 'product-card', 'data-product': p.id }, [
        el('a', { class: 'product-photo', href: href, 'aria-label': 'Bekijk productinformatie ' + p.name }, [
          el('img', { src: p.image, alt: p.name })
        ]),
        el('div', { class: 'product-copy' }, [el('h3', { text: p.name })]
          .concat(paragraphs(p.summary))
          .concat([el('a', { class: 'product-link', href: href, text: 'Bekijk productinformatie →' })]))
      ]);
      grid.insertBefore(card, anchor);
    });
  }

  /* ---------- Fotogalerij met vergroten (alleen productpagina) ---------- */
  var lightbox = null;

  function altFor(p, n) { return n === 0 ? p.name : p.name + ' \u2013 foto ' + (n + 1); }

  // Foto's die erg smal of erg breed zijn worden niet bijgesneden maar volledig getoond.
  function markFit(img) {
    function check() { var r = img.naturalWidth / img.naturalHeight; img.classList.toggle('contain', r < 0.55 || r > 1.15); }
    if (img.complete && img.naturalWidth) check(); else img.addEventListener('load', check, { once: true });
  }

  function getLightbox() {
    if (lightbox) return lightbox;
    var dlg = el('dialog', { class: 'lb', 'aria-label': 'Foto vergroot' });
    var img = el('img', { class: 'lb-img', alt: '' });
    var stage = el('div', { class: 'lb-stage' }, [img]);
    var close = el('button', { class: 'lb-close', type: 'button', 'aria-label': 'Sluiten', text: '\u00d7' });
    var prev = el('button', { class: 'lb-nav lb-prev', type: 'button', 'aria-label': 'Vorige foto', text: '\u2039' });
    var next = el('button', { class: 'lb-nav lb-next', type: 'button', 'aria-label': 'Volgende foto', text: '\u203a' });
    var count = el('span', { class: 'lb-count', 'aria-live': 'polite' });
    [stage, close, prev, next, count].forEach(function (n) { dlg.appendChild(n); });
    document.body.appendChild(dlg);

    var cur = { p: null, i: 0, onChange: null };
    function show(i) {
      var n = cur.p.images.length;
      cur.i = (i + n) % n;
      img.src = cur.p.images[cur.i]; img.alt = altFor(cur.p, cur.i);
      count.textContent = (cur.i + 1) + ' / ' + n;
    }
    function step(d) { if (cur.p.images.length > 1) show(cur.i + d); }

    close.addEventListener('click', function () { dlg.close(); });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    stage.addEventListener('click', function (e) { if (e.target === stage) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('lb-open');
      if (cur.onChange) cur.onChange(cur.i);
    });

    lightbox = {
      open: function (p, i, onChange) {
        cur.p = p; cur.onChange = onChange;
        var multi = p.images.length > 1;
        prev.hidden = next.hidden = count.hidden = !multi;
        show(i);
        document.documentElement.classList.add('lb-open');
        dlg.showModal();
      }
    };
    return lightbox;
  }

  function buildGallery(p) {
    var photos = p.images.length ? p.images : [p.image];
    var multi = photos.length > 1, i = 0;
    var root = el('div', { class: 'product-visual gallery', role: 'group', 'aria-label': 'Foto\u2019s van ' + p.name });
    var img = el('img', { src: photos[0], alt: altFor(p, 0), decoding: 'async' });
    markFit(img);
    var zoom = el('button', { class: 'gal-zoom', type: 'button', 'aria-label': 'Foto vergroten' }, [img]);
    var frame = el('div', { class: 'gal-main' }, [zoom]);
    root.appendChild(frame);

    var count, thumbs = [], strip;
    function go(n) {
      i = (n + photos.length) % photos.length;
      img.src = photos[i]; img.alt = altFor(p, i); markFit(img);
      if (!multi) return;
      count.textContent = (i + 1) + ' / ' + photos.length;
      thumbs.forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      var cur = thumbs[i];
      if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2, behavior: 'smooth' });
    }

    zoom.addEventListener('click', function () { getLightbox().open(p, i, go); });

    if (multi) {
      var prev = el('button', { class: 'gal-nav gal-prev', type: 'button', 'aria-label': 'Vorige foto', text: '\u2039' });
      var next = el('button', { class: 'gal-nav gal-next', type: 'button', 'aria-label': 'Volgende foto', text: '\u203a' });
      count = el('span', { class: 'gal-count', 'aria-live': 'polite' });
      [prev, next, count].forEach(function (n) { frame.appendChild(n); });
      prev.addEventListener('click', function () { go(i - 1); });
      next.addEventListener('click', function () { go(i + 1); });
      strip = el('div', { class: 'gal-thumbs' });
      photos.forEach(function (src, k) {
        var t = el('button', { class: 'gal-thumb', type: 'button', 'aria-label': 'Foto ' + (k + 1) + ' van ' + photos.length }, [el('img', { src: src, alt: '', loading: 'lazy', decoding: 'async' })]);
        t.addEventListener('click', function () { go(k); });
        thumbs.push(t); strip.appendChild(t);
      });
      root.appendChild(strip);
      root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'ArrowRight') go(i + 1);
      });
      count.textContent = '1 / ' + photos.length;
      thumbs[0].setAttribute('aria-current', 'true');
    }
    return root;
  }

  /* ---------- Productpagina: overzicht + secties ---------- */
  function renderProductPage(products) {
    var nav = document.getElementById('productNav');
    var host = document.getElementById('productSections');
    if (!nav || !host) return;

    nav.textContent = '';
    host.textContent = '';
    products.forEach(function (p) {
      nav.appendChild(el('a', { href: '#' + p.id }, [el('small', { text: p.category }), document.createTextNode(p.name)]));

      var copy = el('div', { class: 'product-copy' }, [
        el('span', { class: 'eyebrow', text: p.category }),
        el('h2', { text: p.name }),
        el('div', { class: 'underline' })
      ]);
      if (p.lead) copy.appendChild(el('p', { class: 'lead', text: p.lead }));
      if (p.intro) copy.appendChild(el('p', { class: 'intro', text: p.intro }));
      if (p.badges.length) {
        copy.appendChild(el('div', { class: 'badges' }, p.badges.map(function (b, i) {
          return el('div', { class: 'badge' }, [el('span', { class: 'badge-icon', text: BADGE_ICONS[i % BADGE_ICONS.length] }), document.createTextNode(b)]);
        })));
      }
      copy.appendChild(el('a', { class: 'back-link', href: '#catalog', text: '← Alle producten' }));

      var wrap = el('div', { class: 'wrap' }, [
        el('div', { class: 'product-grid' }, [
          buildGallery(p),
          copy
        ])
      ]);
      if (p.sections.length) {
        wrap.appendChild(el('div', { class: 'info-grid' }, p.sections.map(function (s) {
          return el('article', { class: 'info-card' }, [el('h3', { text: s.title })].concat(paragraphs(s.text)));
        })));
      }
      host.appendChild(el('section', { class: 'product', id: p.id, 'data-product': p.id }, [wrap]));
    });
  }

  function jumpToHash() {
    if (!location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }

  function showError() {
    ['productGrid', 'productNav'].forEach(function (id) {
      var box = document.getElementById(id);
      if (box && !box.querySelector('[data-static]')) {
        box.textContent = 'De producten kunnen nu niet worden geladen. Probeer het later opnieuw.';
      } else if (box) {
        box.insertBefore(el('p', { text: 'De producten kunnen nu niet worden geladen. Probeer het later opnieuw.' }), box.firstChild);
      }
    });
  }

  var ready = fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      var settings = data.settings || {};
      var all = (data.products || []).map(normalize).filter(function (p) { return p.id && p.name; });
      var visible = all.filter(function (p) { return p.status !== 'hidden'; });
      renderGrid(visible);
      renderProductPage(visible);
      jumpToHash();
      return { settings: settings, products: visible };
    })
    .catch(function (err) {
      console.error('products.json laden mislukt', err);
      showError();
      throw err;
    });

  // shop.js wacht hierop. Pas als de producten getekend zijn worden knoppen toegevoegd.
  window.DijkKruidCatalog = { ready: ready };
})();
