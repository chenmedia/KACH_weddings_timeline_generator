const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function selectedWeddingFromUrl(search = location.search) {
  const id = new URLSearchParams(search).get('wedding') || '';
  return UUID_RE.test(id) ? id : '';
}

export function pathForWedding(path, weddingId) {
  if (!UUID_RE.test(weddingId || '')) return path;
  const url = new URL(path, location.origin);
  url.searchParams.set('wedding', weddingId);
  return `${url.pathname}${url.search}`;
}

export function pathForWeddingTab(weddingId, tab = 'journey') {
  const url = new URL(pathForWedding('/journey', weddingId), location.origin);
  if (tab && tab !== 'journey') url.searchParams.set('tab', tab);
  return `${url.pathname}${url.search}`;
}

export function replaceSelectedWedding(weddingId) {
  const url = new URL(location.href);
  if (UUID_RE.test(weddingId || '')) url.searchParams.set('wedding', weddingId);
  else url.searchParams.delete('wedding');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
