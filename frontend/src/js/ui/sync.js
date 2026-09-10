/* =====================================================================
   INDICATEUR DE SYNCHRO — petit nuage en pied de sidebar
   Rend visible ce qui etait jusqu'ici invisible : le gerant sait d'un
   coup d'oeil si sa derniere saisie est bien partie dans le cloud.
   ===================================================================== */
const SYNC_ICON = { ok: 'cloudCheck', busy: 'refresh', err: 'cloudOff', off: 'cloudOff' };

/* state : 'ok' | 'busy' | 'err' | 'off' */
function setSync(state, label) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  el.className = 'sync ' + state;
  el.innerHTML = icon(SYNC_ICON[state] || 'cloud') + '<span></span>';
  el.querySelector('span').textContent = label;
  el.title = state === 'ok' && lastSync
    ? 'Dernière sauvegarde cloud à ' + lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : label;
}
