/**
 * Open a WhatsApp click-to-chat URL reliably.
 * Uses an anchor-element click instead of window.open to avoid popup blockers
 * (especially on mobile Safari / Chrome).
 */
export function openWhatsApp(phone: string | null | undefined, text: string): void {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  // Anchor-click approach — bypasses most popup blockers
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay (some browsers need the element alive during navigation)
  setTimeout(() => document.body.removeChild(a), 300);
}