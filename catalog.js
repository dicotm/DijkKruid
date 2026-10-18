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
    return {
      id: String(raw.id || '').replace(/[^a-z0-9-]/gi, ''),
      name: String(raw.name || ''),
      category: String(raw.category || ''),
      price: isFinite(price) && price >= 0 ? price : null,
      status: raw.status === 'soldout' || raw.status === 'hidden' ? raw.status : 'available',
      image: String(raw.image || ''),
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
          el('div', { class: 'product-visual' }, [el('img', { src: p.image, alt: p.name })]),
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
