// Turn a couple's name into a filename-safe slug.
export function slug(name) {
  return (
    (name || 'kach-weddings')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kach-weddings'
  );
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    /* download may be blocked in some sandboxes */
  }
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      /* ignore */
    }
  }, 4000);
}
