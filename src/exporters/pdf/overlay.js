// In-page PDF preview overlay shown after export, so the user can download,
// open in a new tab, or print even when the automatic download is blocked.
export function showPdfOverlay(url, fname, locale) {
  const old = document.getElementById('pdfOverlay');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'pdfOverlay';
  ov.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:rgba(26,24,22,.55);display:flex;flex-direction:column;padding:20px;box-sizing:border-box;';

  const bar = document.createElement('div');
  bar.style.cssText =
    'display:flex;gap:12px;align-items:center;justify-content:space-between;background:#F6F4F1;border:1px solid #D8D4CD;padding:12px 16px;border-radius:8px 8px 0 0;flex:0 0 auto;';
  const title = document.createElement('span');
  title.textContent = locale.pdf.overlayTitle;
  title.style.cssText =
    'font-family:Montserrat,system-ui,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1A1816;';
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = fname;
  dl.textContent = locale.pdf.download;
  dl.style.cssText =
    'font-family:Montserrat,system-ui,sans-serif;font-size:13px;text-decoration:none;background:#1A1816;color:#F6F4F1;padding:8px 18px;border-radius:4px;';
  const open = document.createElement('a');
  open.href = url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = locale.pdf.openTab;
  open.style.cssText =
    'font-family:Montserrat,system-ui,sans-serif;font-size:13px;text-decoration:none;background:transparent;border:1px solid #8C877E;color:#1A1816;padding:8px 18px;border-radius:4px;';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = locale.pdf.close;
  close.style.cssText =
    'font-family:Montserrat,system-ui,sans-serif;font-size:13px;background:transparent;border:1px solid #8C877E;color:#1A1816;padding:8px 18px;border-radius:4px;cursor:pointer;';
  close.addEventListener('click', () => {
    ov.remove();
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      /* ignore */
    }
  });
  btns.appendChild(dl);
  btns.appendChild(open);
  btns.appendChild(close);
  bar.appendChild(title);
  bar.appendChild(btns);

  const hint = document.createElement('div');
  hint.textContent = locale.pdf.hint;
  hint.style.cssText =
    'font-family:Montserrat,system-ui,sans-serif;font-size:11px;color:#6B675F;background:#F6F4F1;border:1px solid #D8D4CD;border-top:none;padding:8px 16px;flex:0 0 auto;';

  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = 'PDF';
  frame.style.cssText =
    'flex:1 1 auto;width:100%;border:1px solid #D8D4CD;border-top:none;border-radius:0 0 8px 8px;background:#fff;min-height:0;';

  ov.appendChild(bar);
  ov.appendChild(hint);
  ov.appendChild(frame);
  document.body.appendChild(ov);
}
