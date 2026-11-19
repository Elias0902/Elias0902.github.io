(() => {
  const showreel = document.getElementById('showreel');
  if (!showreel) return;

  const status = showreel.querySelector('.sr-status');
  let requested = false;
  showreel.addEventListener('toggle', () => {
    if (!showreel.open) return;
    showreel.scrollIntoView({ block: 'start' });
    if (requested) return;

    requested = true;
    status.textContent = 'Cargando showreel…';
    const script = document.createElement('script');
    script.src = './intro.js';
    script.addEventListener('error', () => {
      script.remove();
      requested = false;
      status.textContent = 'No se pudo cargar el showreel. Ciérralo y vuelve a abrirlo para reintentar.';
    }, { once: true });
    document.head.appendChild(script);
  });
  showreel.hidden = false;
})();

// Tu número de WhatsApp (código de país + número, sin + ni espacios)
const WHATSAPP = '34604106763';
document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => { a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + WHATSAPP); });
const root = document.documentElement;
const saved = localStorage.getItem('ea-theme');
const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
if (dark) root.setAttribute('data-theme', 'dark');
const btn = document.getElementById('themeToggle');
if (btn) btn.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  if (isDark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
  localStorage.setItem('ea-theme', isDark ? 'light' : 'dark');
});
// Si falla una imagen local con data-fallback, usa la de respaldo; si no, la oculta
const hide = img => {
  if (img.dataset.fallback && img.src !== img.dataset.fallback) { img.src = img.dataset.fallback; return; }
  img.style.display = 'none';
};
document.querySelectorAll('img').forEach(img => {
  if (img.complete && img.naturalWidth === 0) hide(img);
  img.addEventListener('error', () => hide(img));
});
