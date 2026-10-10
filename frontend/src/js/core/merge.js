/* =====================================================================
   FUSION — reconcilie deux etats venant de deux appareils

   Pourquoi ce fichier existe
   --------------------------
   Jusqu'ici la synchro ecrivait l'etat complet d'un bloc : le dernier
   appareil connecte ecrasait le travail des autres, et un appareil qui
   avait deja des donnees locales ne relisait jamais le cloud. Resultat :
   chaque telephone vivait sur sa propre copie, et une saisie pouvait
   disparaitre du cloud sans aucun signe.

   Le principe retenu
   ------------------
   On continue de stocker l'etat dans une seule ligne JSON (pas de
   migration de schema), mais on fusionne ENREGISTREMENT PAR
   ENREGISTREMENT :

     · chaque enregistrement porte « _up », la date ISO de sa derniere
       modification ; en cas de conflit, le plus recent gagne ;
     · chaque suppression laisse une « pierre tombale » dans S._del, pour
       qu'un appareil en retard ne fasse pas reapparaitre ce qui a ete
       supprime ailleurs ;
     · les champs scalaires (stock initial) sont horodates ensemble par
       « _stockUp ».

   Les pages metier n'ont rien a faire : stampChanges() detecte seule les
   creations, modifications et suppressions en comparant l'etat avant et
   apres, au moment du save(). Aucun appel a ajouter dans les
   formulaires.
   ===================================================================== */

/* Collections synchronisees, avec le champ qui identifie un
   enregistrement. « daily » n'a pas d'id : une ligne par date. */
const SYNC_COLLS = {
  clients:    'id',
  debts:      'id',
  expenses:   'id',
  receptions: 'id',
  sales:      'id',
  losses:     'id',
  daily:      'date'
};

/* Champs non collectionnes, horodates en bloc par _stockUp */
const SYNC_SCALARS = ['initialStock', 'initialStockDate'];

/* Duree de conservation des pierres tombales, en jours. Un appareil qui
   se synchronise au moins une fois dans cette fenetre voit passer la
   suppression ; au dela, on oublie, sinon la liste grossit sans fin. */
const TOMB_DAYS = 120;

/* --- Outils ---------------------------------------------------------- */

/* JSON a cles triees : deux valeurs equivalentes produisent la meme
   chaine, quel que soit l'ordre des proprietes.
   sansUp retire les horodatages, ce qui donne les deux comparaisons dont
   on a besoin, et qui ne sont pas interchangeables :
     · canon()    compare le CONTENU metier — c'est ce qui permet de voir
                  qu'un enregistrement a vraiment change ;
     · canonAll() compare l'etat COMPLET, horodatages inclus — c'est ce
                  qui permet de voir qu'un appareil doit adopter les
                  horodatages venus du cloud. Les confondre ferait passer
                  une difference purement temporelle pour une egalite. */
function stableStr(v, sansUp) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) || 'null';
  if (Array.isArray(v)) return '[' + v.map(function (x) { return stableStr(x, sansUp); }).join(',') + ']';
  return '{' + Object.keys(v).sort()
    .filter(function (k) { return !(sansUp && k === '_up'); })
    .map(function (k) { return JSON.stringify(k) + ':' + stableStr(v[k], sansUp); })
    .join(',') + '}';
}

function canon(v)    { return stableStr(v, true); }
function canonAll(v) { return stableStr(v, false); }

/* Vrai si a et b portent la meme donnee metier (le _up est ignore) */
function sameRecord(a, b) {
  return canon(a) === canon(b);
}

/* Les dates ISO se comparent comme des chaines. Une date absente est la
   plus ancienne possible. */
function newerStamp(a, b) {
  return (a || '') >= (b || '') ? a : b;
}

function emptyTombs() {
  const t = {};
  Object.keys(SYNC_COLLS).forEach(function (c) { t[c] = {}; });
  return t;
}

/* Complete un etat lu d'une source quelconque (cloud, import, cache
   ancien) pour qu'il porte toujours les champs de synchro attendus. */
function withSyncFields(o) {
  const d = o || {};
  if (!d._del) d._del = emptyTombs();
  Object.keys(SYNC_COLLS).forEach(function (c) {
    if (!d._del[c]) d._del[c] = {};
    if (!Array.isArray(d[c])) d[c] = [];
  });
  return d;
}

/* --- Horodatage des changements locaux ------------------------------- */

/* Compare l'etat precedemment sauvegarde (prev) a l'etat courant (S) et
   en deduit ce qui a change :
     · enregistrement nouveau ou modifie  -> _up = maintenant
     · enregistrement disparu             -> pierre tombale
     · enregistrement revenu              -> pierre tombale levee
   Appelee par save(), donc declenchee par toute saisie, sans que les
   pages aient a le savoir. */
function stampChanges(prev) {
  const now = new Date().toISOString();
  withSyncFields(S);
  const before = withSyncFields(prev ? JSON.parse(JSON.stringify(prev)) : null);

  Object.keys(SYNC_COLLS).forEach(function (coll) {
    const key   = SYNC_COLLS[coll];
    const olds  = {};
    (before[coll] || []).forEach(function (r) { if (r[key] != null) olds[r[key]] = r; });

    const liveKeys = {};
    S[coll].forEach(function (r) {
      const k = r[key];
      if (k == null) return;             /* sans cle : hors synchro */
      liveKeys[k] = true;
      const old = olds[k];
      if (!old || !sameRecord(old, r)) r._up = now;
      else if (!r._up && old._up) r._up = old._up;
      delete S._del[coll][k];            /* re-cree : la suppression ne vaut plus */
    });

    Object.keys(olds).forEach(function (k) {
      if (!liveKeys[k]) S._del[coll][k] = now;
    });
  });

  let scalarChanged = false;
  SYNC_SCALARS.forEach(function (f) {
    if (canon(before[f]) !== canon(S[f])) scalarChanged = true;
  });
  if (scalarChanged) S._stockUp = now;

  pruneTombs(S._del);
}

/* Oublie les suppressions trop anciennes (voir TOMB_DAYS) */
function pruneTombs(del) {
  const limit = new Date(Date.now() - TOMB_DAYS * 86400000).toISOString();
  Object.keys(del || {}).forEach(function (coll) {
    Object.keys(del[coll]).forEach(function (k) {
      if (del[coll][k] < limit) delete del[coll][k];
    });
  });
}

/* --- Fusion ---------------------------------------------------------- */

/* Choisit entre deux versions du meme enregistrement.
   Regles, dans l'ordre :
     1. les deux horodates  -> le plus recent ;
     2. un seul horodate    -> celui-la (l'autre vient d'avant la mise en
        place de la synchro par enregistrement) ;
     3. aucun des deux      -> le local, pour ne pas qu'un cloud plus
        pauvre efface une saisie faite sur l'appareil. */
function pickRecord(local, cloud) {
  if (local._up && cloud._up) return local._up >= cloud._up ? local : cloud;
  if (local._up) return local;
  if (cloud._up) return cloud;
  return local;
}

/* Vrai si la cle a ete supprimee apres la derniere modification connue de
   l'enregistrement. Un enregistrement modifie APRES la suppression
   gagne : c'est une re-creation volontaire. */
function isTombed(tombs, key, up) {
  const t = tombs && tombs[key];
  if (!t) return false;
  return !up || t >= up;
}

/* Fusionne l'etat local et l'etat du cloud. Symetrique a une exception
   pres : en cas d'egalite parfaite, le local est prefere. L'ordre des
   enregistrements suit le local, les nouveautes du cloud a la suite. */
function mergeStates(localRaw, cloudRaw) {
  const local = withSyncFields(JSON.parse(JSON.stringify(localRaw || {})));
  const cloud = withSyncFields(JSON.parse(JSON.stringify(cloudRaw || {})));
  const out   = Object.assign(defaults(), { _del: emptyTombs() });

  /* Pierres tombales : union, la plus recente l'emporte */
  Object.keys(SYNC_COLLS).forEach(function (coll) {
    const t = {};
    [local._del[coll], cloud._del[coll]].forEach(function (side) {
      Object.keys(side || {}).forEach(function (k) { t[k] = newerStamp(t[k], side[k]); });
    });
    out._del[coll] = t;
  });

  Object.keys(SYNC_COLLS).forEach(function (coll) {
    const key    = SYNC_COLLS[coll];
    const order  = [];        /* cles, dans l'ordre local puis cloud */
    const chosen = {};

    local[coll].forEach(function (r) {
      const k = r[key];
      if (k == null) return;
      if (!(k in chosen)) order.push(k);
      chosen[k] = r;
    });
    cloud[coll].forEach(function (r) {
      const k = r[key];
      if (k == null) return;
      if (!(k in chosen)) { order.push(k); chosen[k] = r; return; }
      chosen[k] = pickRecord(chosen[k], r);
    });

    out[coll] = order
      .filter(function (k) { return !isTombed(out._del[coll], k, chosen[k]._up); })
      .map(function (k) { return chosen[k]; });
  });

  /* Scalaires : le bloc le plus recemment horodate gagne. Sans
     horodatage de part et d'autre, une valeur renseignee bat un vide. */
  let src = local;
  if (local._stockUp && cloud._stockUp)   src = cloud._stockUp > local._stockUp ? cloud : local;
  else if (cloud._stockUp)                src = cloud;
  else if (!local._stockUp && local.initialStock == null && cloud.initialStock != null) src = cloud;
  SYNC_SCALARS.forEach(function (f) { out[f] = src[f]; });
  out._stockUp = newerStamp(local._stockUp, cloud._stockUp);

  return out;
}

/* Resume lisible d'un ecart entre deux etats — sert aux messages */
function countRecords(o) {
  const d = withSyncFields(o ? JSON.parse(JSON.stringify(o)) : null);
  return Object.keys(SYNC_COLLS).reduce(function (n, c) { return n + d[c].length; }, 0);
}
