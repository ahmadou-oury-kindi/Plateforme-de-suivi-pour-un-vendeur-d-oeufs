/* =====================================================================
   COMPTEURS ANIMES — les chiffres cles montent de 0 a leur valeur
   Appele uniquement depuis render(), c'est-a-dire a l'arrivee sur une
   page ou au changement de mois. Un simple clic sur un filtre ne relance
   pas l'animation : elle deviendrait fatigante.
   ===================================================================== */
const COUNT_MS = 620;

function animateCounts(root) {
  if (!root) return;

  /* Respecte le reglage systeme « moins d'animations » */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  root.querySelectorAll('[data-count]').forEach(function (el) {
    const target = parseFloat(el.dataset.count);
    if (!isFinite(target) || target === 0) return;

    const finalText = el.textContent;   /* on restitue exactement ce texte a la fin */
    const fmt    = el.dataset.fmt || 'int';
    const suffix = el.dataset.suffix || '';
    const start  = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      /* easeOutCubic : rapide au debut, freine a l'arrivee */
      const v = target * (1 - Math.pow(1 - t, 3));
      if (t < 1) {
        el.textContent = (fmt === 'cfa' ? cfa(v) : fmt === 'dec' ? v.toFixed(1) : num(v)) + suffix;
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
      }
    }
    el.textContent = (fmt === 'cfa' ? cfa(0) : fmt === 'dec' ? '0.0' : '0') + suffix;
    requestAnimationFrame(frame);
  });
}
