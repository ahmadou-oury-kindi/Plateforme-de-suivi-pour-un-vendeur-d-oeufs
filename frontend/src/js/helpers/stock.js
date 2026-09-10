/* =====================================================================
   HELPERS STOCK

   Regle de calcul, valable partout :

       stock = point de depart + receptions - ventes

   Le stock n'est jamais stocke, il se deduit des mouvements. Enregistrer
   une vente le fait donc baisser tout seul, enregistrer une reception le
   fait monter : il n'y a rien a ressaisir.

   Le point de depart est le dernier inventaire physique enregistre — le
   comptage du soir. Un inventaire fait foi sur tout ce qui le precede :
   c'est la que l'on remet le compteur sur la realite du magasin, casse et
   manquants compris. A defaut d'inventaire, le point de depart est le
   stock initial saisi au demarrage du suivi.

   Consequence : un inventaire cloture sa journee. Une vente saisie apres
   coup, a une date deja inventoriee, ne rebaisse pas le stock — c'est le
   comptage qui fait foi. Les pages previennent l'utilisateur dans ce cas
   pour qu'il corrige son inventaire.
   ===================================================================== */

/* Dernier inventaire connu a une date donnee.
   strict = true : on cherche AVANT la date, sans inclure ce jour-la. */
function lastInventory(date, strict) {
  const l = S.daily
    .filter(function (d) {
      if (d.closingStock == null) return false;
      return strict ? d.date < date : d.date <= date;
    })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });
  return l[0] || null;
}

/* Inventaire d'une date precise, ou null */
function inventoryOn(date) {
  return S.daily.find(function (d) {
    return d.date === date && d.closingStock != null;
  }) || null;
}

/* Plateaux recus a une date donnee, toutes receptions confondues */
function getReceived(date) {
  return S.receptions
    .filter(function (r) { return r.date === date; })
    .reduce(function (s, r) { return s + r.quantity; }, 0);
}

/* Plateaux vendus un jour donne, d'apres les ventes enregistrees */
function getSold(date) {
  return S.sales
    .filter(function (s) { return s.date === date; })
    .reduce(function (s, x) { return s + x.quantity; }, 0);
}

/* Decomposition du calcul du stock theorique en fin de journee `date` :
   le point de depart, ce qui est entre, ce qui est sorti. Une seule
   fonction pour le calcul ET pour l'explication affichee a l'ecran —
   impossible que le detail montre a l'utilisateur diverge du total.

   Le point de depart est l'inventaire PRECEDENT, sans tenir compte d'un
   comptage fait ce jour-la : c'est justement la valeur a laquelle on
   compare ce comptage. */
function stockBasis(date) {
  const inv = lastInventory(date, true);
  let base, from, excl, label;

  if (inv) {
    base = inv.closingStock; from = inv.date; excl = true;
    label = 'Inventaire du ' + fmtD(inv.date);
  } else if (S.initialStock != null) {
    base = S.initialStock; from = S.initialStockDate; excl = false;
    label = 'Stock de départ';
  } else {
    base = 0; from = null; excl = false;
    label = 'Aucun point de départ';
  }

  function inRange(d) {
    if (d > date) return false;
    if (from == null) return true;
    return excl ? d > from : d >= from;
  }

  const received = S.receptions
    .filter(function (r) { return inRange(r.date); })
    .reduce(function (s, r) { return s + r.quantity; }, 0);
  const sold = S.sales
    .filter(function (x) { return inRange(x.date); })
    .reduce(function (s, x) { return s + x.quantity; }, 0);

  return { label: label, base: base, received: received, sold: sold,
           theo: base + received - sold };
}

/* Stock theorique en fin de journee : ce que le magasin devrait contenir
   si rien ne s'etait perdu. */
function theoreticalStock(date) {
  return stockBasis(date).theo;
}

/* Stock reel en fin de journee : le comptage du jour fait foi s'il existe */
function stockOn(date) {
  const inv = inventoryOn(date);
  return inv ? inv.closingStock : theoreticalStock(date);
}

/* Ecart releve le jour d'un inventaire : compte physique - theorique.
   Negatif = manquants (casse, oubli de saisie). null = pas d'inventaire. */
function stockGap(date) {
  const inv = inventoryOn(date);
  return inv ? inv.closingStock - theoreticalStock(date) : null;
}

/* Stock actuel, tel qu'il doit se trouver en magasin maintenant */
function getCurrentStock() {
  return stockOn(today());
}

/* Vrai si le suivi n'a pas encore de point de depart */
function needsInitialStock() {
  return S.initialStock == null && !lastInventory(today(), false);
}

/* Toutes les dates portant un mouvement ou un inventaire dans un mois,
   de la plus recente a la plus ancienne. Sert au journal quotidien : il
   ne se remplit plus a partir des seuls inventaires. */
function activeDates(mo) {
  const seen = {};
  function add(list) {
    list.forEach(function (x) { if (x.date.startsWith(mo)) seen[x.date] = true; });
  }
  add(S.receptions); add(S.sales);
  add(S.daily.filter(function (d) { return d.closingStock != null; }));
  return Object.keys(seen).sort(function (a, b) { return b.localeCompare(a); });
}

/* Derniere reception enregistree, toutes dates confondues */
function lastReception() {
  const l = [...S.receptions].sort(function (a, b) { return b.date.localeCompare(a.date); });
  return l[0] || null;
}

/* Prix de revient le plus recent, base de pre-remplissage des formulaires */
function getLatestCost() {
  const lr = lastReception();
  return lr ? lr.costPrice : 0;
}

/* Nombre de jours entre une date et aujourd'hui (positif = passe) */
function daysAgo(d) {
  return Math.round((new Date(today() + 'T12:00:00') - new Date(d + 'T12:00:00')) / 86400000);
}

function agoLabel(d) {
  const n = daysAgo(d);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'hier';
  return n > 0 ? 'il y a ' + n + ' jours' : 'dans ' + (-n) + ' jours';
}

/* Couleur d'alerte de la couverture de stock, en jours de consommation */
function coverTone(cover) {
  if (cover == null) return 'blue';
  if (cover < COVER_LOW) return 'red';
  if (cover < COVER_MID) return 'gold';
  return 'green';
}
