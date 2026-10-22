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
const hide = img => { img.style.display = 'none'; };
document.querySelectorAll('img').forEach(img => {
  if (img.complete && img.naturalWidth === 0) hide(img);
  img.addEventListener('error', () => hide(img));
});

// Efecto máquina de escribir en el titular
(() => {
  const h1 = document.getElementById('typed');
  if (!h1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const full = h1.innerHTML;
  h1.setAttribute('aria-label', h1.textContent.trim());
  const ghost = document.createElement('span');
  ghost.style.cssText = 'visibility:hidden;display:block';
  ghost.innerHTML = full;
  const live = document.createElement('span');
  live.style.cssText = 'position:absolute;inset:0';
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = 'position:relative;display:block';
  wrap.append(ghost, live);
  h1.innerHTML = '';
  h1.append(wrap);
  const caret = '<span style="display:inline-block;width:.07em;height:.82em;margin-left:.05em;vertical-align:-.06em;background:currentColor;animation:ea-blink 1s steps(1) infinite"></span>';
  const tokens = full.match(/<[^>]+>|[^<]/g);
  let i = 0, out = '', open = 0;
  const step = () => {
    while (i < tokens.length && tokens[i].startsWith('<')) { const t = tokens[i++]; out += t; open += t.startsWith('</') ? -1 : 1; }
    if (i < tokens.length) out += tokens[i++];
    live.innerHTML = out + '</span>'.repeat(Math.max(0, open)) + caret;
    if (i < tokens.length) setTimeout(step, 40 + Math.random() * 60);
  };
  setTimeout(step, 500);
})();
