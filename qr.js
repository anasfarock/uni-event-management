/* ============================================================
   QR helper — wraps the vendored js/vendor/qrcode.min.js
   (Kazuhiko Arase's qrcode-generator, MIT licensed, bundled
   locally so this works with no internet access).
   Feature implemented: Option A — Event Registration QR.
   Each approved event gets a QR code encoding a deep link that
   opens the student portal directly on that event so a student
   can scan it with their phone to view/register.
   ============================================================ */

function eventDeepLink(eventId) {
  // Deep link back into the student portal for this specific event.
  const base = window.location.href.replace(/[^/]*$/, ""); // folder of current page
  return `${base}student.html?event=${encodeURIComponent(eventId)}`;
}

function renderEventQr(containerEl, eventId) {
  const url = eventDeepLink(eventId);
  const qr = qrcode(0, "M"); // type 0 = auto-detect smallest version, error-correction M
  qr.addData(url);
  qr.make();
  containerEl.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  return url;
}
