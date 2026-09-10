/* =====================================================================
   TOASTS — notifications ephemeres, empilees en haut a droite
   ===================================================================== */
const TOAST_ICON = { ok: 'checkCircle', err: 'alert', info: 'info' };

function toast(msg, type) {
  const kind = (type === 'err' || type === 'info') ? type : 'ok';
  const el = document.createElement('div');
  el.className = 'toast toast-' + kind;
  el.innerHTML = icon(TOAST_ICON[kind]) + '<span></span>';
  /* Le message passe par textContent : jamais interprete comme du HTML,
     meme s'il contient un nom de client avec des caracteres speciaux. */
  el.querySelector('span').textContent = msg;

  document.getElementById('toastBox').appendChild(el);

  setTimeout(function () {
    el.classList.add('out');
    setTimeout(function () { el.remove(); }, 260);
  }, 3000);
}
