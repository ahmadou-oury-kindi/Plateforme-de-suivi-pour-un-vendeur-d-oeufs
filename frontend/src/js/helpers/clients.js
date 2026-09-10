/* =====================================================================
   HELPERS CLIENTS — type, statut, anciennete, demande hebdomadaire
   ===================================================================== */

/* Type du client, avec repli sur « Client final » si la valeur stockee
   n'est plus reconnue (ancienne donnee, faute de frappe). */
function clientType(c) {
  return TYPES.find(function (x) { return x.v === c.type; }) || TYPES[0];
}
function typeLabel(c) { return clientType(c).l; }
function typeBadge(c) {
  const t = clientType(c);
  return '<span class="badge ' + t.b + '">' + t.l + '</span>';
}
function typeOpts(sel) {
  return TYPES.map(function (x) {
    return '<option value="' + x.v + '"' + (x.v === sel ? ' selected' : '') + '>' + x.l + '</option>';
  }).join('');
}
function countType(v) {
  return S.clients.filter(function (c) { return clientType(c).v === v; }).length;
}

/* Un client sans statut explicite est considere actif (donnees anciennes) */
function isActive(c) { return (c.status || 'actif') === 'actif'; }
function activeClients() { return S.clients.filter(isActive); }

/* Nombre de mois ecoules depuis une date. 2629800000 ms = 1 mois moyen. */
function monthsSince(d) {
  if (!d) return 0;
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d);
  if (isNaN(dt)) return 0;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / 2629800000));
}

function clientAge(c) { return monthsSince(c.since || c.createdAt); }
function isLoyal(c)   { return isActive(c) && clientAge(c) >= LOYAL_MO; }

/* Etoiles de fidelite : 3 mois, 6 mois, 1 an */
function loyaltyStars(c) {
  if (!isActive(c)) return '';
  const m = clientAge(c);
  return m >= 12 ? '★★★' : m >= 6 ? '★★' : m >= LOYAL_MO ? '★' : '';
}

function ageLabel(m) {
  if (m < 1) return '< 1 mois';
  if (m < 12) return m + ' mois';
  const y = Math.floor(m / 12), r = m % 12;
  return y + ' an' + (y > 1 ? 's' : '') + (r ? ' ' + r + ' m' : '');
}

/* Demande hebdomadaire engagee par les clients actifs */
function weeklyDemand() {
  return activeClients().reduce(function (s, c) { return s + (c.weeklyTrays || 0); }, 0);
}

/* Poids de chaque type de client dans la demande hebdomadaire.

   Le volume de tete ne compte que les clients actifs — c'est la demande
   reelle, celle qui doit etre couverte par le stock. Le volume des
   inactifs est renvoye a part : ce n'est pas de la demande d'aujourd'hui,
   mais c'est ce qu'on recupererait en les faisant revenir. */
function demandByType() {
  return TYPES.map(function (t) {
    const all = S.clients.filter(function (c) { return clientType(c).v === t.v; });
    return {
      type: t,
      clients: all.length,
      active: all.filter(isActive).length,
      trays: all.filter(isActive)
                .reduce(function (s, c) { return s + (c.weeklyTrays || 0); }, 0),
      dormant: all.filter(function (c) { return !isActive(c); })
                  .reduce(function (s, c) { return s + (c.weeklyTrays || 0); }, 0)
    };
  });
}

/* Volume « dormant » : ce que representaient les clients devenus inactifs */
function dormantDemand() {
  return S.clients
    .filter(function (c) { return !isActive(c); })
    .reduce(function (s, c) { return s + (c.weeklyTrays || 0); }, 0);
}

function dailyDemand() { return weeklyDemand() / 7; }

/* Recherche par nom ou telephone, parmi les clients actifs seulement */
function clientMatches(q) {
  q = (q || '').trim().toLowerCase();
  return activeClients()
    .filter(function (c) {
      if (!q) return true;
      return c.name.toLowerCase().includes(q)
          || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });
}

function clientOpts(q) {
  return clientMatches(q).map(function (c) {
    return '<option value="' + c.id + '">' + esc(c.name) + ' — ' + clientType(c).s
         + (c.phone ? ' — ' + esc(c.phone) : '') + '</option>';
  }).join('');
}
