/* =====================================================================
   THEME — clair, sombre, ou celui du systeme
   Les trois jeux de variables existent deja dans le CSS. Ce module ne
   fait que poser l'attribut data-theme sur <html> et se souvenir du
   choix, dans une cle distincte des donnees metier.
   ===================================================================== */

/* Cycle : systeme -> clair -> sombre -> systeme */
function toggleTheme() {
  const cur  = localStorage.getItem(THEME_KEY) || 'auto';
  const next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* mode prive */ }
  applyTheme();
  toast('Thème : ' + (next === 'auto' ? 'système' : next === 'light' ? 'clair' : 'sombre'), 'info');
}

function applyTheme() {
  let mode = 'auto';
  try { mode = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { /* mode prive */ }

  if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);

  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.innerHTML = icon(mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'auto');
    btn.title = 'Thème : ' + (mode === 'auto' ? 'système' : mode === 'light' ? 'clair' : 'sombre');
  }
}
