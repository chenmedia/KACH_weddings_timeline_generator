// Shared DOM/component helpers used across the app shell and every feature.
// Convention: a "component" is a function (props) => HTMLElement (optionally with
// its own mount/refresh closure). Keep these dependency-free.

/**
 * Create an element. attrs special keys: class, text, html, for; everything else
 * becomes an attribute. children may be a node, string, array, or null.
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {(Node|string|null) | (Node|string|null)[]} [children]
 * @returns {any} the element (loosely typed so callers can use .value/.checked)
 */
export function el(tag, attrs = {}, children = []) {
  const n = /** @type {any} */ (document.createElement(tag));
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'for') n.htmlFor = v;
    else n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}

/** HTML-escape for string-template rendering. */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
