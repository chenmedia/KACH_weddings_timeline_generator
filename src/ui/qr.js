// QR-code data-URL helper for the couple share link. The qrcode lib is
// dynamically imported so it stays out of the initial bundle (loaded only when
// a photographer opens the share panel with sharing enabled).
export async function qrDataUrl(text, opts = {}) {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 160,
    errorCorrectionLevel: 'M',
    color: { dark: '#1a1816', light: '#ffffff' },
    ...opts,
  });
}
