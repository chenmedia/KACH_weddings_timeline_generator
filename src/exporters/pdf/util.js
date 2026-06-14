// Shared low-level helpers for the PDF exporters.

// Pack a binary-as-string PDF into bytes.
export function pdfStringToBytes(pdf) {
  const b = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) b[i] = pdf.charCodeAt(i) & 0xff;
  return b;
}

// Timeout guard so a slow/blocked resource can't freeze the export.
export function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}
