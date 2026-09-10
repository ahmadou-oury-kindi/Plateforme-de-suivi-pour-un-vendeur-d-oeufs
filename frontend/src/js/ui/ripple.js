/* =====================================================================
   ONDE AU CLIC — retour visuel sur les boutons
   Un seul ecouteur pose sur le document : les boutons crees plus tard
   par les renderers en beneficient sans avoir a etre cables.
   ===================================================================== */
function initRipple() {
  document.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest('.btn, .btn-login, .pill');
    if (!btn) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const span = document.createElement('span');
    span.className = 'rip';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (e.clientX - r.left - size / 2) + 'px';
    span.style.top  = (e.clientY - r.top  - size / 2) + 'px';

    /* .pill et .btn-login n'ont pas overflow:hidden en CSS : on le pose ici
       pour que l'onde reste dans le bouton. */
    const prevPos = getComputedStyle(btn).position;
    if (prevPos === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';

    btn.appendChild(span);
    setTimeout(function () { span.remove(); }, 520);
  });
}
