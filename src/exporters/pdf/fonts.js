// Embed the self-hosted fonts as data URIs so the rasteriser uses Cormorant +
// Montserrat instead of falling back to a system serif.
//
// Two optimisations vs. embedding the whole stylesheet:
//  1. Only the `latin` subset is embedded (not latin-ext/cyrillic/vietnamese),
//     which is all a Norwegian/English timeline needs. Glyphs outside latin
//     simply fall back to the system font for that character.
//  2. The result is cached, so repeated PDF exports don't refetch anything.
//
// Fails silently (caller falls back to system serif) if a fetch is blocked.

let _embeddedCSS = null; // cached Promise<string>
const _b64Cache = {}; // url -> base64 woff2

export function embedFontsCSS() {
  if (!_embeddedCSS) {
    _embeddedCSS = build().catch((err) => {
      _embeddedCSS = null;
      throw err;
    });
  }
  return _embeddedCSS;
}

async function build() {
  const css = await (await fetch('/fonts/fonts.css')).text();
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  // keep only the plain `latin` subset (exclude `-latin-ext` and other subsets)
  const latin = blocks.filter((b) => /-latin\.woff2/.test(b) && !/-latin-ext\.woff2/.test(b));
  const re = /url\((['"]?)([^'")]+\.woff2)\1\)/;

  const out = [];
  for (const block of latin) {
    const m = block.match(re);
    if (!m) continue;
    const data = await fetchBase64(m[2]);
    out.push(block.replace(re, `url(data:font/woff2;base64,${data})`));
  }
  return out.join('\n');
}

async function fetchBase64(url) {
  if (_b64Cache[url]) return _b64Cache[url];
  const abs = new URL(url, location.origin).href;
  const buf = await (await fetch(abs)).arrayBuffer();
  const arr = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  _b64Cache[url] = btoa(bin);
  return _b64Cache[url];
}
